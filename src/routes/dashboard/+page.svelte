<script>
    import { onMount } from 'svelte';
    import { BarChart3, Smartphone, Wrench, PackageSearch, Activity, CalendarDays } from '@lucide/svelte';
    import NotificacionAlerta from '$lib/componentes/NotificacionAlerta.svelte';

    let usuarioSesion = $state(null);
    let kpis = $state({
        stock_disponible: 0,
        equipos_taller: 0,
        lotes_abiertos: 0,
        movimientos_hoy: 0
    });
    let ultimosMovimientos = $state([]);
    let cargando = $state(true);
    let alerta = $state({ visible: false, tipo: 'info', mensaje: '' });

    function mostrarAlerta(tipo, mensaje) {
        alerta = { visible: true, tipo, mensaje };
        setTimeout(() => alerta.visible = false, 4000);
    }

    onMount(async () => {
        const sesionStr = localStorage.getItem('peraphone_usuario');
        if (sesionStr) {
            usuarioSesion = JSON.parse(sesionStr);
            await cargarMetricas();
        } else {
            window.location.href = '/inicio_sesion';
        }
    });

    async function cargarMetricas() {
        try {
            const res = await fetch('/api/dashboard_metricas');
            const data = await res.json();
            if (data.exito) {
                kpis = data.kpis;
                ultimosMovimientos = data.ultimosMovimientos;
            } else {
                mostrarAlerta('error', data.mensaje);
            }
        } catch (e) {
            mostrarAlerta('error', 'Error al conectar con las métricas.');
        } finally {
            cargando = false;
        }
    }
</script>

<svelte:head>
    <title>Dashboard | Peraphone</title>
</svelte:head>

<div class="space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-900/10 text-white relative overflow-hidden">
        <div class="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
                <h1 class="text-3xl sm:text-4xl font-black tracking-tight mb-2">
                    Hola, {usuarioSesion?.nombre_completo.split(' ')[0] || 'Usuario'} 👋
                </h1>
                <p class="text-slate-400 text-sm font-medium">
                    Bienvenido al sistema de gestión. Tienes rol de <span class="text-cyan-400">{usuarioSesion?.nombre_rol}</span>.
                </p>
            </div>
            
            <div class="flex items-center gap-2 bg-slate-800/50 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/50">
                <CalendarDays size={18} class="text-cyan-400" />
                <span class="text-sm font-bold text-slate-200">
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
            </div>
        </div>
        
        <!-- Elemento decorativo de fondo -->
        <div class="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
    </div>

    <!-- KPIs -->
    {#if cargando}
        <div class="flex justify-center items-center py-20">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
        </div>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Stock Disponible -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 hover:border-emerald-300 transition-colors">
                <div class="p-4 bg-emerald-100 text-emerald-600 rounded-2xl">
                    <Smartphone size={28} />
                </div>
                <div>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Stock Venta</p>
                    <p class="text-3xl font-black text-slate-900">{kpis.stock_disponible}</p>
                </div>
            </div>

            <!-- Taller -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 hover:border-amber-300 transition-colors">
                <div class="p-4 bg-amber-100 text-amber-600 rounded-2xl">
                    <Wrench size={28} />
                </div>
                <div>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">En Taller</p>
                    <p class="text-3xl font-black text-slate-900">{kpis.equipos_taller}</p>
                </div>
            </div>

            <!-- Lotes Abiertos -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 hover:border-blue-300 transition-colors">
                <div class="p-4 bg-blue-100 text-blue-600 rounded-2xl">
                    <PackageSearch size={28} />
                </div>
                <div>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Lotes Activos</p>
                    <p class="text-3xl font-black text-slate-900">{kpis.lotes_abiertos}</p>
                </div>
            </div>

            <!-- Movimientos Hoy -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 hover:border-purple-300 transition-colors">
                <div class="p-4 bg-purple-100 text-purple-600 rounded-2xl">
                    <Activity size={28} />
                </div>
                <div>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Trazabilidad</p>
                    <p class="text-3xl font-black text-slate-900">{kpis.movimientos_hoy} <span class="text-xs text-slate-400 font-medium">hoy</span></p>
                </div>
            </div>
        </div>

        <!-- Trazabilidad Reciente -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div class="flex items-center gap-3 mb-6">
                <BarChart3 class="text-slate-400" size={24} />
                <h2 class="text-xl font-bold text-slate-900">Actividad Reciente (Auditoría)</h2>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead>
                        <tr class="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th class="py-3 px-4 rounded-tl-lg">Equipo (Modelo)</th>
                            <th class="py-3 px-4">IMEI</th>
                            <th class="py-3 px-4">Motivo del Movimiento</th>
                            <th class="py-3 px-4">Responsable</th>
                            <th class="py-3 px-4 rounded-tr-lg">Fecha</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        {#each ultimosMovimientos as mov}
                            <tr class="hover:bg-slate-50/50">
                                <td class="py-3 px-4 font-bold text-slate-900">{mov.modelo}</td>
                                <td class="py-3 px-4 font-mono text-slate-500 text-xs">{mov.numero_imei}</td>
                                <td class="py-3 px-4">
                                    <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-lg border 
                                        {mov.tipo_movimiento === 'ENTRADA' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                                         mov.tipo_movimiento === 'SALIDA' ? 'bg-rose-50 border-rose-200 text-rose-700' : 
                                         'bg-slate-100 border-slate-200 text-slate-700'}">
                                        {mov.tipo_movimiento}: {mov.motivo}
                                    </span>
                                </td>
                                <td class="py-3 px-4 text-slate-600">{mov.responsable}</td>
                                <td class="py-3 px-4 text-slate-400 text-xs">{new Date(mov.fecha_hora).toLocaleString()}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
                {#if ultimosMovimientos.length === 0}
                    <p class="text-center text-slate-500 py-6">No hay movimientos registrados recientes.</p>
                {/if}
            </div>
        </div>
    {/if}
</div>

<NotificacionAlerta 
    visible={alerta.visible} 
    tipo={alerta.tipo} 
    mensaje={alerta.mensaje} 
    alCerrar={() => alerta.visible = false} 
/>
