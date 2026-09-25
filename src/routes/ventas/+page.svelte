<script>
    /**
     * Módulo de Punto de Venta (POS) - PERAPHONE
     * Arquitectura: Frontend desacoplado que consume /api/ventas e /api/inventario_equipos
     * Reglas cubiertas: RN-006 (Descuento de stock en venta), RN-002 (Control por roles)
     */
    import { onMount } from 'svelte';
    import { 
        ShoppingCart, 
        Search, 
        Plus, 
        Trash2, 
        CheckCircle2, 
        User, 
        CreditCard, 
        Tag,
        Smartphone,
        Receipt
    } from '@lucide/svelte';
    import NotificacionAlerta from '$lib/componentes/NotificacionAlerta.svelte';

    let usuarioSesion = $state(null);
    let celularesDisponibles = $state([]);
    let terminoBusqueda = $state('');
    let cargando = $state(true);
    let procesandoPago = $state(false);
    
    // Carrito de compras
    let carrito = $state([]);

    // Datos del Cliente y Facturación
    let nombre_cliente = $state('');
    let documento_cliente = $state('');
    let observaciones = $state('');

    // Notificaciones
    let alerta = $state({ visible: false, tipo: 'info', mensaje: '' });

    function mostrarAlerta(tipo, mensaje) {
        alerta = { visible: true, tipo, mensaje };
        setTimeout(() => alerta.visible = false, 4000);
    }

    onMount(async () => {
        const sesionStr = localStorage.getItem('peraphone_usuario');
        if (sesionStr) {
            usuarioSesion = JSON.parse(sesionStr);
            // RN-002: Verificar si tiene permisos de venta
            if (!usuarioSesion.permisos?.puede_vender && !usuarioSesion.permisos?.puede_ver_todo) {
                window.location.href = '/dashboard';
            }
        } else {
            window.location.href = '/inicio_sesion';
        }
        await cargarStock();
    });

    async function cargarStock() {
        cargando = true;
        try {
            const respuesta = await fetch('/api/inventario_equipos');
            const data = await respuesta.json();
            if (data.exito) {
                // RN-006: Solo mostrar equipos disponibles para la venta
                celularesDisponibles = data.datos.filter(c => c.estado_equipo === 'disponible');
            } else {
                mostrarAlerta('error', data.mensaje || 'Error al obtener el catálogo.');
            }
        } catch (error) {
            mostrarAlerta('error', 'Error crítico al conectar con el inventario.');
        } finally {
            cargando = false;
        }
    }

    // Filtrar catálogo (excluir los que ya están en el carrito)
    let celularesFiltrados = $derived(
        celularesDisponibles.filter(cel => {
            if (carrito.find(item => item.id_celular === cel.id_celular)) return false; 
            if (!terminoBusqueda) return true;
            const term = terminoBusqueda.toLowerCase();
            return cel.marca.toLowerCase().includes(term) || 
                   cel.modelo.toLowerCase().includes(term) || 
                   cel.numero_imei.includes(term);
        })
    );

    let totalCarrito = $derived(
        carrito.reduce((acc, item) => acc + Number(item.precio_venta_final), 0)
    );

    function agregarAlCarrito(celular) {
        carrito = [...carrito, { ...celular, precio_venta_final: celular.precio_venta }];
    }

    function removerDelCarrito(id_celular) {
        carrito = carrito.filter(item => item.id_celular !== id_celular);
    }

    async function procesarVenta(e) {
        e.preventDefault();
        
        if (carrito.length === 0) {
            mostrarAlerta('error', 'El carrito está vacío. Agrega equipos para vender.');
            return;
        }
        
        try {
            procesandoPago = true;
            
            // RN-006: Registrar cada venta individualmente y descontar stock
            const promesas = carrito.map(item => {
                return fetch('/api/ventas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_celular: item.id_celular,
                        nombre_cliente: nombre_cliente,
                        documento_cliente: documento_cliente,
                        precio_venta_final: item.precio_venta_final,
                        observaciones: observaciones,
                        id_usuario_vendedor: usuarioSesion.id_usuario
                    })
                }).then(res => res.json());
            });

            const resultados = await Promise.all(promesas);
            
            const errores = resultados.filter(r => !r.exito);
            if (errores.length > 0) {
                mostrarAlerta('error', `Hubo errores al procesar ${errores.length} equipos. Revisar consola.`);
                console.error('Errores de venta:', errores);
            } else {
                mostrarAlerta('exito', `¡Venta procesada con éxito! Se descontaron ${carrito.length} equipos del stock.`);
                
                // Generar comprobante en PDF (Formato Ticket Térmico 80mm)
                setTimeout(() => {
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
                        doc.text('Comprobante de Venta', 40, 16, { align: 'center' });
                        doc.text(new Date().toLocaleString(), 40, 21, { align: 'center' });
                        
                        doc.line(5, 25, 75, 25);
                        
                        doc.text('Cliente: ' + nombre_cliente, 5, 30);
                        doc.text('Doc/NIT: ' + documento_cliente, 5, 35);
                        if(observaciones) {
                            doc.text('Obs: ' + observaciones.substring(0,25), 5, 40);
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
                        carrito.forEach((item) => {
                            doc.text('1', 7, y);
                            let desc = (item.marca + ' ' + item.modelo).substring(0, 18);
                            doc.text(desc, 18, y);
                            doc.text('$' + Number(item.precio_venta_final).toFixed(2), 60, y);
                            y += 5;
                            doc.setFontSize(7);
                            doc.text('IMEI: ' + item.numero_imei, 18, y);
                            doc.setFontSize(9);
                            y += 6;
                        });
                        
                        doc.line(5, y, 75, y);
                        y += 5;
                        
                        doc.setFontSize(11);
                        doc.setFont('helvetica', 'bold');
                        doc.text('TOTAL A PAGAR:', 5, y);
                        doc.text('$' + totalCarrito.toFixed(2), 48, y);
                        
                        y += 10;
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'normal');
                        doc.text('¡Gracias por su compra!', 40, y, { align: 'center' });
                        doc.text('El equipo cuenta con 30 días de garantía.', 40, y + 4, { align: 'center' });
                        
                        doc.save(`Ticket_Venta_${documento_cliente}_${Date.now()}.pdf`);

                        // Limpiar formulario y carrito
                        carrito = [];
                        nombre_cliente = '';
                        documento_cliente = '';
                        observaciones = '';
                        cargarStock(); // Refrescar stock
                    });
                }, 300);
            }
        } catch (error) {
            mostrarAlerta('error', 'Error crítico al comunicarse con el servidor de ventas.');
        } finally {
            procesandoPago = false;
        }
    }
</script>

<svelte:head>
    <title>Punto de Venta (POS) | Peraphone</title>
</svelte:head>

<div class="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6">
    <!-- Panel Izquierdo: Catálogo de Productos -->
    <div class="w-full lg:w-2/3 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <!-- Buscador -->
        <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-50/50">
            <div>
                <h1 class="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Smartphone class="text-cyan-600" />
                    Catálogo de Equipos
                </h1>
                <p class="text-xs text-slate-500 mt-1">Equipos disponibles en stock (RN-006)</p>
            </div>
            
            <div class="relative w-full sm:w-72">
                <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar por IMEI, Marca o Modelo..." 
                    bind:value={terminoBusqueda}
                    class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none"
                />
            </div>
        </div>

        <!-- Grid de Productos -->
        <div class="flex-1 overflow-y-auto p-6 bg-slate-50/30">
            {#if cargando}
                <div class="flex justify-center items-center h-full">
                    <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
                </div>
            {:else if celularesFiltrados.length === 0}
                <div class="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-3">
                    <Smartphone size={48} class="opacity-20" />
                    <p class="text-sm font-medium">No hay equipos disponibles o coincidan con tu búsqueda.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {#each celularesFiltrados as celular}
                        <div class="bg-white border border-slate-200 rounded-2xl p-4 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-900/5 transition-all group flex flex-col justify-between">
                            <div>
                                <div class="flex justify-between items-start mb-2">
                                    <span class="text-xs font-bold uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2 py-1 rounded-md">
                                        {celular.marca}
                                    </span>
                                    <span class="text-lg font-black text-slate-900">
                                        ${Number(celular.precio_venta).toFixed(2)}
                                    </span>
                                </div>
                                <h3 class="font-bold text-slate-800 text-base leading-tight mb-1">{celular.modelo}</h3>
                                <p class="text-xs text-slate-500 font-mono bg-slate-100 p-1.5 rounded text-center mb-4">
                                    IMEI: {celular.numero_imei}
                                </p>
                            </div>
                            
                            <button 
                                onclick={() => agregarAlCarrito(celular)}
                                class="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-cyan-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                            >
                                <Plus size={16} />
                                Añadir a Venta
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    <!-- Panel Derecho: Carrito y Checkout -->
    <div class="w-full lg:w-1/3 flex flex-col bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden relative z-10">
        <!-- Header Carrito -->
        <div class="p-6 bg-slate-900 text-white shrink-0">
            <h2 class="text-lg font-bold flex items-center gap-2">
                <ShoppingCart class="text-cyan-400" />
                Resumen de Venta
            </h2>
            <p class="text-xs text-slate-400 mt-1">
                {carrito.length} equipo(s) en la lista
            </p>
        </div>

        <!-- Lista de Items -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {#if carrito.length === 0}
                <div class="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-3 opacity-50">
                    <ShoppingCart size={40} />
                    <p class="text-xs font-medium">El carrito está vacío</p>
                </div>
            {:else}
                {#each carrito as item}
                    <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative group">
                        <button 
                            onclick={() => removerDelCarrito(item.id_celular)}
                            class="absolute -top-2 -right-2 bg-white border border-slate-200 text-rose-500 p-1.5 rounded-full hover:bg-rose-50 hover:border-rose-200 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                            title="Remover"
                        >
                            <Trash2 size={14} />
                        </button>

                        <div>
                            <p class="text-sm font-bold text-slate-800 leading-tight">{item.marca} {item.modelo}</p>
                            <p class="text-[10px] text-slate-400 font-mono">IMEI: {item.numero_imei}</p>
                        </div>

                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-xs font-semibold text-slate-500">Precio final:</span>
                            <div class="relative flex-1">
                                <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    bind:value={item.precio_venta_final} 
                                    class="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>

        <!-- Formulario Checkout -->
        <div class="p-6 border-t border-slate-200 bg-white shrink-0">
            <form onsubmit={procesarVenta} class="space-y-4">
                
                <div class="space-y-3 border-b border-slate-100 pb-4">
                    <div class="relative">
                        <User size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            required
                            placeholder="Nombre del Cliente" 
                            bind:value={nombre_cliente}
                            class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>
                    <div class="relative">
                        <CreditCard size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            required
                            placeholder="NIT / CI / Documento" 
                            bind:value={documento_cliente}
                            class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>
                </div>

                <div class="flex justify-between items-end">
                    <span class="text-sm font-bold text-slate-500">Total a Cobrar</span>
                    <span class="text-3xl font-black text-emerald-600">${totalCarrito.toFixed(2)}</span>
                </div>

                <button 
                    type="submit" 
                    disabled={carrito.length === 0 || procesandoPago}
                    class="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 mt-2"
                >
                    {#if procesandoPago}
                        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Procesando...
                    {:else}
                        <Receipt size={18} />
                        Confirmar Venta y Cobrar
                    {/if}
                </button>
            </form>
        </div>
    </div>
</div>

<!-- Alertas Globales -->
<NotificacionAlerta 
    visible={alerta.visible} 
    tipo={alerta.tipo} 
    mensaje={alerta.mensaje} 
    alCerrar={() => alerta.visible = false} 
/>
