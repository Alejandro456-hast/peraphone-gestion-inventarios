<script>
    import { onMount } from 'svelte';
    import { Receipt, Download, Calendar, Search } from '@lucide/svelte';

    let historial = $state([]);
    let cargando = $state(true);
    let terminoBusqueda = $state('');

    onMount(async () => {
        const sesionStr = localStorage.getItem('peraphone_usuario');
        if (!sesionStr) {
            window.location.href = '/inicio_sesion';
            return;
        }
        await cargarHistorial();
    });

    async function cargarHistorial() {
        try {
            const res = await fetch('/api/ventas');
            const data = await res.json();
            if (data.exito) {
                historial = data.datos;
            }
        } catch (e) {
            console.error(e);
        } finally {
            cargando = false;
        }
    }

    function reImprimirTicket(venta) {
        import('jspdf').then(({ jsPDF }) => {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [80, 200]
            });

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('PERAPHONE', 40, 10, { align: 'center' });
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Copia - Comprobante de Venta', 40, 16, { align: 'center' });
            doc.text(new Date(venta.fecha_venta).toLocaleString(), 40, 21, { align: 'center' });
            
            doc.line(5, 25, 75, 25);
            
            doc.text('Cliente: ' + venta.nombre_cliente, 5, 30);
            doc.text('Doc/NIT: ' + venta.documento_cliente, 5, 35);
            if(venta.observaciones) {
                doc.text('Obs: ' + venta.observaciones.substring(0,25), 5, 40);
                doc.line(5, 43, 75, 43);
            } else {
                doc.line(5, 40, 75, 40);
            }
            
            doc.setFont('helvetica', 'bold');
            doc.text('CANT', 5, 47);
            doc.text('DESCRIPCION', 18, 47);
            doc.text('TOTAL', 60, 47);
            
            doc.setFont('helvetica', 'normal');
            doc.line(5, 49, 75, 49);
            
            let y = 54;
            
            doc.text('1', 7, y);
            let desc = ((venta.marca || '') + ' ' + (venta.modelo || 'Equipo')).substring(0, 18);
            doc.text(desc, 18, y);
            doc.text('$' + Number(venta.precio_venta_final).toFixed(2), 60, y);
            y += 5;
            doc.setFontSize(7);
            doc.text('IMEI: ' + (venta.numero_imei || 'N/A'), 18, y);
            doc.setFontSize(9);
            y += 6;
            
            doc.line(5, y, 75, y);
            y += 5;
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL:', 5, y);
            doc.text('$' + Number(venta.precio_venta_final).toFixed(2), 55, y);
            
            y += 10;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('¡Gracias por su compra!', 40, y, { align: 'center' });
            doc.text('El equipo cuenta con 30 días de garantía.', 40, y + 4, { align: 'center' });
            doc.text('Atendido por: ' + (venta.vendedor || 'Admin'), 40, y + 8, { align: 'center' });
            
            doc.save(`Copia_Ticket_${venta.documento_cliente}_${venta.id_venta}.pdf`);
        });
    }

    let historialFiltrado = $derived(
        terminoBusqueda === '' 
            ? historial 
            : historial.filter(v => 
                v.nombre_cliente.toLowerCase().includes(terminoBusqueda.toLowerCase()) || 
                v.documento_cliente.includes(terminoBusqueda) ||
                (v.numero_imei && v.numero_imei.includes(terminoBusqueda))
            )
    );
</script>

<svelte:head>
    <title>Historial de Ventas | Peraphone</title>
</svelte:head>

<div class="max-w-7xl mx-auto space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-4">
            <div class="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                <Receipt size={28} />
            </div>
            <div>
                <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Historial de Ventas</h1>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Consulta de facturas y re-impresión de tickets PDF</p>
            </div>
        </div>

        <div class="relative w-full sm:max-w-xs">
            <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
                type="text" 
                placeholder="Buscar cliente, CI o IMEI..." 
                bind:value={terminoBusqueda}
                class="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
            />
        </div>
    </div>

    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table class="w-full text-left border-collapse text-sm">
            <thead>
                <tr class="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th class="py-3 px-4">ID Venta / Fecha</th>
                    <th class="py-3 px-4">Cliente</th>
                    <th class="py-3 px-4">Equipo (IMEI)</th>
                    <th class="py-3 px-4">Total</th>
                    <th class="py-3 px-4 text-right">Acción</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                {#if cargando}
                    <tr><td colspan="5" class="py-8 text-center text-slate-500">Cargando historial...</td></tr>
                {:else if historialFiltrado.length === 0}
                    <tr><td colspan="5" class="py-8 text-center text-slate-500">No se encontraron ventas registradas.</td></tr>
                {:else}
                    {#each historialFiltrado as venta}
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td class="py-3 px-4">
                                <span class="font-bold text-slate-900 dark:text-white">#VTA-{venta.id_venta}</span>
                                <div class="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                    <Calendar size={12} />
                                    {new Date(venta.fecha_venta).toLocaleString()}
                                </div>
                            </td>
                            <td class="py-3 px-4">
                                <p class="font-bold text-slate-800 dark:text-slate-200">{venta.nombre_cliente}</p>
                                <p class="text-[11px] text-slate-500 font-mono">Doc: {venta.documento_cliente}</p>
                            </td>
                            <td class="py-3 px-4">
                                <p class="font-medium text-slate-700 dark:text-slate-300">{venta.marca} {venta.modelo}</p>
                                <p class="text-[11px] text-slate-400 font-mono tracking-wider">{venta.numero_imei}</p>
                            </td>
                            <td class="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">
                                ${Number(venta.precio_venta_final).toFixed(2)}
                            </td>
                            <td class="py-3 px-4 text-right">
                                <button 
                                    type="button" 
                                    onclick={() => reImprimirTicket(venta)}
                                    class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                >
                                    <Download size={14} />
                                    Ticket
                                </button>
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>
