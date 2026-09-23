<script>
    /**
     * Vista Principal: Gestión de Celulares e Inventario - PERAPHONE
     * Arquitectura: Frontend desacoplado que consume /api/inventario_equipos y /api/gestion_retornos
     * Reglas cubiertas: RN-001 a RN-009
     */
    import { onMount } from 'svelte';
    import BarraNavegacion from '$lib/componentes/BarraNavegacion.svelte';
    import InsigniaEstado from '$lib/componentes/InsigniaEstado.svelte';
    import TarjetaMetrica from '$lib/componentes/TarjetaMetrica.svelte';
    import ModalFormulario from '$lib/componentes/ModalFormulario.svelte';
    import ModalTrazabilidad from '$lib/componentes/ModalTrazabilidad.svelte';
    import NotificacionAlerta from '$lib/componentes/NotificacionAlerta.svelte';

    // Estados reactivos (Svelte 5 Runes)
    let listaCelulares = $state([]);
    let metricas = $state({
        total_inventario: 0,
        total_disponibles: 0,
        total_en_revision: 0,
        total_en_reparacion: 0,
        total_vendidos: 0
    });
    let cargando = $state(true);
    let terminoBusqueda = $state('');
    let filtroEstado = $state('');
    let modalRegistroAbierto = $state(false);
    let modalTrazabilidadAbierto = $state(false);
    let imeiSeleccionadoTrazabilidad = $state('');

    // Modal de Devolución Rápida (RN-007)
    let modalDevolucionAbierto = $state(false);
    let datosDevolucion = $state({
        numero_imei: '',
        nombre_cliente: '',
        contacto_cliente: '',
        motivo_devolucion: ''
    });

    // Modal de Evaluación Técnica (RN-008)
    let modalEvaluacionAbierto = $state(false);
    let datosEvaluacion = $state({
        id_celular: null,
        marca_modelo: '',
        numero_imei: '',
        dictamen_final: 'disponible',
        diagnostico_detallado: ''
    });

    // Modal de Registro de Ventas (RN-006 - Vendedor)
    let modalVentaAbierto = $state(false);
    let datosVenta = $state({
        id_celular: null,
        marca_modelo: '',
        numero_imei: '',
        precio_venta_final: '',
        nombre_cliente: '',
        documento_cliente: '',
        observaciones: ''
    });

    // Alertas globales
    let alerta = $state({ visible: false, tipo: 'exito', mensaje: '' });
    let usuarioSesion = $state(null);

    onMount(() => {
        // Verificar sesión activa
        const sesion = localStorage.getItem('peraphone_usuario');
        if (sesion) {
            try {
                usuarioSesion = JSON.parse(sesion);
            } catch (e) {}
        }
        cargarInventario();
    });

    // Cargar inventario consumiendo el microservicio REST
    async function cargarInventario() {
        cargando = true;
        try {
            const parametros = new URLSearchParams();
            if (terminoBusqueda) parametros.set('busqueda', terminoBusqueda);
            if (filtroEstado) parametros.set('estado', filtroEstado);

            const respuesta = await fetch(`/api/inventario_equipos?${parametros.toString()}`);
            const resultado = await respuesta.json();

            if (resultado.exito) {
                listaCelulares = resultado.datos;
                if (resultado.metricas) {
                    metricas = resultado.metricas;
                }
            } else {
                mostrarAlerta('error', resultado.mensaje || 'Error al cargar inventario.');
            }
        } catch (error) {
            mostrarAlerta('error', 'Error al conectar con el microservicio de inventario. Verifica XAMPP.');
        } finally {
            cargando = false;
        }
    }

    function mostrarAlerta(tipo, mensaje) {
        alerta = { visible: true, tipo, mensaje };
        setTimeout(() => {
            if (alerta.mensaje === mensaje) alerta.visible = false;
        }, 5000);
    }

    function abrirTrazabilidad(imei) {
        imeiSeleccionadoTrazabilidad = imei;
        modalTrazabilidadAbierto = true;
    }

    function abrirModalDevolucion(celular) {
        datosDevolucion = {
            numero_imei: celular.numero_imei,
            nombre_cliente: '',
            contacto_cliente: '',
            motivo_devolucion: ''
        };
        modalDevolucionAbierto = true;
    }

    async function procesarDevolucion(e) {
        e.preventDefault();
        try {
            const respuesta = await fetch('/api/gestion_retornos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...datosDevolucion,
                    id_usuario_receptor: usuarioSesion?.id_usuario || 1
                })
            });

            const resultado = await respuesta.json();
            if (resultado.exito) {
                mostrarAlerta('exito', resultado.mensaje);
                modalDevolucionAbierto = false;
                cargarInventario();
            } else {
                mostrarAlerta('error', resultado.mensaje);
            }
        } catch (e) {
            mostrarAlerta('error', 'Error al procesar la devolución.');
        }
    }

    function abrirModalEvaluacion(celular) {
        datosEvaluacion = {
            id_celular: celular.id_celular,
            marca_modelo: `${celular.marca} ${celular.modelo}`,
            numero_imei: celular.numero_imei,
            dictamen_final: 'disponible',
            diagnostico_detallado: ''
        };
        modalEvaluacionAbierto = true;
    }

    async function procesarEvaluacion(e) {
        e.preventDefault();
        try {
            const respuesta = await fetch('/api/gestion_retornos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_celular: datosEvaluacion.id_celular,
                    dictamen_final: datosEvaluacion.dictamen_final,
                    diagnostico_detallado: datosEvaluacion.diagnostico_detallado,
                    id_usuario_tecnico: usuarioSesion?.id_usuario || 1
                })
            });

            const resultado = await respuesta.json();
            if (resultado.exito) {
                mostrarAlerta('exito', resultado.mensaje);
                modalEvaluacionAbierto = false;
                cargarInventario();
            } else {
                mostrarAlerta('error', resultado.mensaje);
            }
        } catch (e) {
            mostrarAlerta('error', 'Error al procesar el dictamen técnico.');
        }
    }

    function abrirModalVenta(celular) {
        datosVenta = {
            id_celular: celular.id_celular,
            marca_modelo: `${celular.marca} ${celular.modelo}`,
            numero_imei: celular.numero_imei,
            precio_venta_final: celular.precio_venta,
            nombre_cliente: '',
            documento_cliente: '',
            observaciones: ''
        };
        modalVentaAbierto = true;
    }

    async function procesarVenta(e) {
        e.preventDefault();
        try {
            const respuesta = await fetch('/api/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...datosVenta,
                    id_usuario_vendedor: usuarioSesion?.id_usuario || 1
                })
            });

            const resultado = await respuesta.json();
            if (resultado.exito) {
                mostrarAlerta('exito', resultado.mensaje);
                modalVentaAbierto = false;
                cargarInventario();
            } else {
                mostrarAlerta('error', resultado.mensaje);
            }
        } catch (error) {
            mostrarAlerta('error', 'Error al procesar la venta.');
        }
    }
</script>

<svelte:head>
    <title>Gestión de Celulares | Peraphone</title>
</svelte:head>

<div class="min-h-screen bg-slate-100 flex flex-col font-sans">
    <BarraNavegacion />

    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <!-- Encabezado de la Vista -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Inventario de Celulares
                </h1>
                <p class="text-xs sm:text-sm text-slate-500 mt-1">
                    Control de stock, lotes (RN-004) y trazabilidad inmutable de equipos (RN-009)
                </p>
            </div>

            <!-- Botón de Registro Rápido: Solo visible para Personal de Inventario o Administrador (RN-002) -->
            {#if usuarioSesion?.permisos?.puede_registrar_inventario}
                <button 
                    type="button"
                    onclick={() => modalRegistroAbierto = true}
                    class="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-md shadow-cyan-600/30 transition-all cursor-pointer"
                >
                    <span class="text-base font-black">+</span>
                    <span>Registrar Nuevo Celular</span>
                </button>
            {:else if usuarioSesion?.nombre_rol === 'Vendedor'}
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    <span>🏷️ Vista de Ventas: Consulta de stock disponible</span>
                </div>
            {:else if usuarioSesion?.nombre_rol === 'Servicio Técnico'}
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                    <span>🔧 Vista de Servicio Técnico: Diagnóstico de retornos</span>
                </div>
            {/if}
        </div>

        <!-- Tarjetas de Métricas Ejecutivas (KPIs Peraphone) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <TarjetaMetrica 
                titulo="Total en Inventario" 
                valor={metricas.total_inventario} 
                icono="📱" 
                colorFondo="bg-slate-100" 
                colorTexto="text-slate-900"
                subtitulo="Catálogo general activo"
            />
            <TarjetaMetrica 
                titulo="Disponibles para Venta" 
                valor={metricas.total_disponibles} 
                icono="✅" 
                colorFondo="bg-emerald-50" 
                colorTexto="text-emerald-700"
                subtitulo="Stock físico para entrega"
            />
            <TarjetaMetrica 
                titulo="En Revisión (Retornos)" 
                valor={metricas.total_en_revision} 
                icono="⚠️" 
                colorFondo="bg-amber-50" 
                colorTexto="text-amber-700"
                subtitulo="Bloqueados para venta (RN-007)"
            />
            <TarjetaMetrica 
                titulo="Total Vendidos" 
                valor={metricas.total_vendidos} 
                icono="🏷️" 
                colorFondo="bg-blue-50" 
                colorTexto="text-blue-700"
                subtitulo="Descontados de stock (RN-006)"
            />
        </div>

        <!-- Panel de Filtros y Búsqueda Reactiva -->
        <div class="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div class="flex flex-col md:flex-row gap-4 justify-between items-center">
                <!-- Buscador de IMEI / Marca / Modelo -->
                <div class="relative w-full md:max-w-md">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        🔍
                    </span>
                    <input 
                        type="text" 
                        placeholder="Buscar por IMEI, Marca o Modelo..."
                        bind:value={terminoBusqueda}
                        oninput={() => { setTimeout(cargarInventario, 300); }}
                        class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm text-slate-800 placeholder-slate-400"
                    />
                </div>

                <!-- Filtros por Estado del Celular -->
                <div class="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                    <button 
                        type="button" 
                        onclick={() => { filtroEstado = ''; cargarInventario(); }}
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {filtroEstado === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
                    >
                        Todos
                    </button>
                    <button 
                        type="button" 
                        onclick={() => { filtroEstado = 'disponible'; cargarInventario(); }}
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {filtroEstado === 'disponible' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
                    >
                        Disponibles
                    </button>
                    <button 
                        type="button" 
                        onclick={() => { filtroEstado = 'en_revision'; cargarInventario(); }}
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {filtroEstado === 'en_revision' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
                    >
                        En Revisión
                    </button>
                    <button 
                        type="button" 
                        onclick={() => { filtroEstado = 'en_reparacion'; cargarInventario(); }}
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {filtroEstado === 'en_reparacion' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
                    >
                        En Reparación
                    </button>
                    <button 
                        type="button" 
                        onclick={() => { filtroEstado = 'vendido'; cargarInventario(); }}
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {filtroEstado === 'vendido' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
                    >
                        Vendidos
                    </button>
                </div>
            </div>

            <!-- Tabla de Inventario Responsiva -->
            <div class="overflow-x-auto rounded-xl border border-slate-200">
                <table class="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr class="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th class="py-3 px-4">IMEI (Equipo)</th>
                            <th class="py-3 px-4">Marca y Modelo</th>
                            <th class="py-3 px-4">Lote (RN-004)</th>
                            <th class="py-3 px-4">Detalles</th>
                            <th class="py-3 px-4">P. Venta</th>
                            <th class="py-3 px-4">Estado</th>
                            <th class="py-3 px-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        {#if cargando}
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-500 text-xs font-medium">
                                    <span class="inline-block animate-spin text-xl mb-1">⌛</span>
                                    <p>Consultando microservicio /api/inventario_equipos...</p>
                                </td>
                            </tr>
                        {:else if listaCelulares.length === 0}
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400 text-xs font-medium">
                                    No se encontraron celulares con los filtros especificados.
                                </td>
                            </tr>
                        {:else}
                            {#each listaCelulares as celular}
                                <tr class="hover:bg-slate-50/80 transition-colors">
                                    <!-- IMEI -->
                                    <td class="py-3.5 px-4 font-mono font-bold text-slate-800 text-xs tracking-wider">
                                        {celular.numero_imei}
                                    </td>

                                    <!-- Marca y Modelo -->
                                    <td class="py-3.5 px-4">
                                        <p class="font-bold text-slate-900">{celular.marca} {celular.modelo}</p>
                                        <p class="text-[11px] text-slate-400">Ingreso: {celular.fecha_ingreso ? celular.fecha_ingreso.slice(0, 10) : 'N/A'}</p>
                                    </td>

                                    <!-- Lote -->
                                    <td class="py-3.5 px-4">
                                        {#if celular.codigo_lote}
                                            <span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
                                                📦 {celular.codigo_lote}
                                            </span>
                                        {:else}
                                            <span class="text-xs text-slate-400 italic">Individual (Sin Lote)</span>
                                        {/if}
                                    </td>

                                    <!-- Color y Memoria -->
                                    <td class="py-3.5 px-4 text-xs text-slate-600">
                                        {celular.color} • {celular.capacidad_almacenamiento}
                                    </td>

                                    <!-- Precio Venta -->
                                    <td class="py-3.5 px-4 font-bold text-slate-900 text-xs">
                                        ${Number(celular.precio_venta).toFixed(2)}
                                    </td>

                                    <!-- Estado del Equipo -->
                                    <td class="py-3.5 px-4">
                                        <InsigniaEstado estado={celular.estado_equipo} />
                                    </td>

                                    <!-- Acciones Operativas -->
                                    <td class="py-3.5 px-4 text-right">
                                        <div class="inline-flex items-center gap-1.5">
                                            <!-- Ver Trazabilidad Inmutable (RN-009) -->
                                            <button 
                                                type="button" 
                                                onclick={() => abrirTrazabilidad(celular.numero_imei)}
                                                class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                                title="Ver historial inmutable (RN-009)"
                                            >
                                                📜 Historial
                                            </button>

                                            <!-- Venta si está disponible: Solo Vendedor o Administrador (RN-002, RN-006) -->
                                            {#if celular.estado_equipo === 'disponible' && usuarioSesion?.permisos?.puede_vender}
                                                <button 
                                                    type="button" 
                                                    onclick={() => abrirModalVenta(celular)}
                                                    class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                                                    title="Registrar venta y descontar stock (RN-006)"
                                                >
                                                    🏷️ Vender
                                                </button>
                                            {/if}

                                            <!-- Dictamen Técnico si está en revisión: Solo Servicio Técnico o Administrador (RN-002, RN-008) -->
                                            {#if celular.estado_equipo === 'en_revision' && usuarioSesion?.permisos?.puede_evaluar_tecnico}
                                                <button 
                                                    type="button" 
                                                    onclick={() => abrirModalEvaluacion(celular)}
                                                    class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                                                    title="Emitir dictamen de servicio técnico (RN-008)"
                                                >
                                                    🔧 Evaluar
                                                </button>
                                            {/if}

                                            <!-- Devolución a revisión: Solo si no está en revisión ni desechado (RN-007) -->
                                            {#if celular.estado_equipo !== 'en_revision' && celular.estado_equipo !== 'desechado' && (usuarioSesion?.permisos?.puede_vender || usuarioSesion?.permisos?.puede_ver_todo)}
                                                <button 
                                                    type="button" 
                                                    onclick={() => abrirModalDevolucion(celular)}
                                                    class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                                                    title="Registrar devolución a revisión (RN-007)"
                                                >
                                                    ↩️ Devolver
                                                </button>
                                            {/if}
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        </div>
    </main>
</div>

<!-- Modal para Registrar Nuevo Celular (RN-003, RN-004, RN-005) -->
<ModalFormulario 
    abierto={modalRegistroAbierto}
    alCerrar={() => modalRegistroAbierto = false}
    alGuardarExitoso={(msj) => {
        mostrarAlerta('exito', msj);
        cargarInventario();
    }}
/>

<!-- Modal para Trazabilidad Inmutable (RN-009) -->
<ModalTrazabilidad 
    abierto={modalTrazabilidadAbierto}
    numeroImei={imeiSeleccionadoTrazabilidad}
    alCerrar={() => modalTrazabilidadAbierto = false}
/>

<!-- Modal para Registro de Devolución de Cliente (RN-007) -->
{#if modalDevolucionAbierto}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-2">
                    <span class="text-xl">↩️</span>
                    <h3 class="font-bold text-slate-900 text-base">Registrar Devolución (RN-007)</h3>
                </div>
                <button type="button" onclick={() => modalDevolucionAbierto = false} class="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p class="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                ⚠️ El celular pasará automáticamente a estado <strong>"En Revisión"</strong> y no podrá ser vendido hasta que Servicio Técnico emita su dictamen.
            </p>

            <form onsubmit={procesarDevolucion} class="space-y-3.5">
                <div>
                    <label for="imei_dev_input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">IMEI del Celular</label>
                    <input id="imei_dev_input" type="text" readonly bind:value={datosDevolucion.numero_imei} class="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-300 font-mono text-xs font-bold text-slate-700" />
                </div>

                <div>
                    <label for="cliente_dev_input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre del Cliente *</label>
                    <input id="cliente_dev_input" type="text" required placeholder="Ej. Juan Pérez" bind:value={datosDevolucion.nombre_cliente} class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500" />
                </div>

                <div>
                    <label for="contacto_dev_input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Teléfono o Contacto</label>
                    <input id="contacto_dev_input" type="text" placeholder="+591 7xxxxxxx" bind:value={datosDevolucion.contacto_cliente} class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500" />
                </div>

                <div>
                    <label for="motivo_dev_input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Motivo de Devolución *</label>
                    <textarea id="motivo_dev_input" required rows="3" placeholder="Describa el motivo o falla que reporta el cliente..." bind:value={datosDevolucion.motivo_devolucion} class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"></textarea>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick={() => modalDevolucionAbierto = false} class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
                    <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm">Confirmar Retorno a Revisión</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Modal para Dictamen de Servicio Técnico (RN-008) -->
{#if modalEvaluacionAbierto}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-2">
                    <span class="text-xl">🔧</span>
                    <h3 class="font-bold text-slate-900 text-base">Dictamen de Servicio Técnico (RN-008)</h3>
                </div>
                <button type="button" onclick={() => modalEvaluacionAbierto = false} class="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><strong>Equipo:</strong> {datosEvaluacion.marca_modelo}</p>
                <p><strong>IMEI:</strong> <span class="font-mono">{datosEvaluacion.numero_imei}</span></p>
            </div>

            <form onsubmit={procesarEvaluacion} class="space-y-3.5">
                <div>
                    <label for="dictamen_select" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Decisión Técnica *</label>
                    <select id="dictamen_select" bind:value={datosEvaluacion.dictamen_final} class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500 font-semibold text-slate-800">
                        <option value="disponible">🟢 Disponible (Equipo reparado/óptimo, vuelve a stock para venta)</option>
                        <option value="en_reparacion">🟠 En Reparación (Permanece en taller para cambio de repuestos)</option>
                        <option value="desechado">🔴 Desechado (Baja definitiva / No tiene reparación)</option>
                    </select>
                </div>

                <div>
                    <label for="diagnostico_textarea" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Diagnóstico Detallado *</label>
                    <textarea id="diagnostico_textarea" required rows="4" placeholder="Detalle las pruebas realizadas, componentes revisados y justificación del dictamen..." bind:value={datosEvaluacion.diagnostico_detallado} class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"></textarea>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick={() => modalEvaluacionAbierto = false} class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
                    <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm">Aplicar Dictamen Técnico</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Modal para Registrar Venta y Descontar Stock (RN-006 - Vendedor) -->
{#if modalVentaAbierto}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-2">
                    <span class="text-xl">🏷️</span>
                    <h3 class="font-bold text-slate-900 text-base">Registrar Venta (RN-006)</h3>
                </div>
                <button type="button" onclick={() => modalVentaAbierto = false} class="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                <p><strong>Equipo a Vender:</strong> {datosVenta.marca_modelo}</p>
                <p><strong>IMEI:</strong> <span class="font-mono">{datosVenta.numero_imei}</span></p>
                <p><strong>Precio Catálogo:</strong> <span class="font-bold text-emerald-800">${Number(datosVenta.precio_venta_final).toFixed(2)}</span></p>
            </div>

            <form onsubmit={procesarVenta} class="space-y-3.5">
                <div>
                    <label for="venta_cliente_input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Completo del Cliente *</label>
                    <input id="venta_cliente_input" type="text" required placeholder="Ej. Roberto Morales" bind:value={datosVenta.nombre_cliente} class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500" />
                </div>

                <div>
                    <label for="venta_doc_input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Documento de Identidad / CI / NIT *</label>
                    <input id="venta_doc_input" type="text" required placeholder="Ej. CI-7891234" bind:value={datosVenta.documento_cliente} class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500" />
                </div>

                <div>
                    <label for="venta_precio_input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Precio Final de Venta ($ USD) *</label>
                    <input id="venta_precio_input" type="number" step="0.01" required bind:value={datosVenta.precio_venta_final} class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500" />
                </div>

                <div>
                    <label for="venta_obs_input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Observaciones</label>
                    <input id="venta_obs_input" type="text" placeholder="Ej. Pago en efectivo con garantía de 1 año" bind:value={datosVenta.observaciones} class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500" />
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick={() => modalVentaAbierto = false} class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
                    <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5">
                        <span>Confirmar Venta y Descontar Stock</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Notificaciones Emergentes -->
<NotificacionAlerta 
    visible={alerta.visible} 
    tipo={alerta.tipo} 
    mensaje={alerta.mensaje} 
    alCerrar={() => alerta.visible = false} 
/>
