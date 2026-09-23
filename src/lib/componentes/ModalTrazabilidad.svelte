<script>
    /**
     * Componente ModalTrazabilidad
     * Muestra la cronología inmutable de movimientos y auditoría de un celular (RN-005, RN-009)
     */
    import InsigniaEstado from './InsigniaEstado.svelte';

    let { 
        abierto = false, 
        numeroImei = '', 
        alCerrar = () => {} 
    } = $props();

    let cargando = $state(false);
    let errorCarga = $state('');
    let celular = $state(null);
    let historial = $state([]);

    $effect(() => {
        if (abierto && numeroImei) {
            cargarTrazabilidad(numeroImei);
        }
    });

    async function cargarTrazabilidad(imei) {
        cargando = true;
        errorCarga = '';
        celular = null;
        historial = [];

        try {
            const respuesta = await fetch(`/api/inventario_equipos?imei_trazabilidad=${imei}`);
            const resultado = await respuesta.json();
            if (resultado.exito) {
                celular = resultado.celular;
                historial = resultado.historial_movimientos;
            } else {
                errorCarga = resultado.mensaje || 'Error al obtener historial.';
            }
        } catch (e) {
            errorCarga = 'Error al conectar con el servidor de trazabilidad.';
        } finally {
            cargando = false;
        }
    }
</script>

{#if abierto}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <!-- Cabecera -->
            <div class="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-lg">
                        📜
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-slate-900">Trazabilidad Inmutable (RN-009)</h2>
                        <p class="text-xs text-slate-500">Historial forense del equipo IMEI: <span class="font-mono font-bold text-slate-800">{numeroImei}</span></p>
                    </div>
                </div>
                <button 
                    type="button" 
                    onclick={alCerrar} 
                    class="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                    ✕
                </button>
            </div>

            <!-- Contenido -->
            <div class="p-6 space-y-6">
                {#if cargando}
                    <div class="py-12 text-center text-slate-500">
                        <span class="inline-block animate-spin text-2xl mb-2">⌛</span>
                        <p class="text-sm">Recuperando registros inmutables de auditoría...</p>
                    </div>
                {:else if errorCarga}
                    <div class="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                        {errorCarga}
                    </div>
                {:else}
                    {#if celular}
                        <!-- Resumen del Equipo -->
                        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 class="font-bold text-slate-900 text-base">{celular.marca} {celular.modelo}</h3>
                                <p class="text-xs text-slate-500 font-mono mt-0.5">Color: {celular.color} | Memoria: {celular.capacidad_almacenamiento}</p>
                                {#if celular.codigo_lote}
                                    <p class="text-[11px] text-cyan-700 font-medium mt-1">📦 Lote: {celular.codigo_lote}</p>
                                {/if}
                            </div>
                            <div>
                                <InsigniaEstado estado={celular.estado_equipo} />
                            </div>
                        </div>
                    {/if}

                    <!-- Línea de Tiempo de Movimientos -->
                    <div>
                        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Línea de Tiempo de Movimientos (RN-005)</h4>

                        {#if historial.length === 0}
                            <p class="text-xs text-slate-400 italic">No hay movimientos registrados para este equipo.</p>
                        {:else}
                            <div class="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                {#each historial as mov}
                                    <div class="relative">
                                        <!-- Punto indicador -->
                                        <div class="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-cyan-600 shadow-sm"></div>

                                        <div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-1.5">
                                            <div class="flex items-center justify-between gap-2">
                                                <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                                                    {mov.tipo_movimiento}
                                                </span>
                                                <span class="text-[11px] text-slate-400 font-mono">
                                                    {mov.fecha_hora}
                                                </span>
                                            </div>

                                            <p class="text-xs font-semibold text-slate-800">{mov.motivo}</p>

                                            <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                                <span>👤 Responsable: <strong class="text-slate-700">{mov.responsable}</strong> ({mov.rol_responsable})</span>
                                                {#if mov.ubicacion_origen && mov.ubicacion_destino}
                                                    <span>• Ruta: {mov.ubicacion_origen} ➔ {mov.ubicacion_destino}</span>
                                                {/if}
                                            </div>

                                            {#if mov.es_automatico}
                                                <div class="pt-1">
                                                    <span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold">
                                                        ⚙️ Movimiento Automatizado del Sistema
                                                    </span>
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>

            <!-- Pie del Modal -->
            <div class="p-4 border-t border-slate-100 flex justify-end">
                <button 
                    type="button" 
                    onclick={alCerrar}
                    class="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                >
                    Cerrar Trazabilidad
                </button>
            </div>
        </div>
    </div>
{/if}
