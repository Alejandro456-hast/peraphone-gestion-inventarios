<script>
    /**
     * Módulo de Taller y Laboratorio de Servicio Técnico
     * RN-007: Procesamiento de equipos devueltos o dañados.
     * RN-008: Evaluación técnica, dictamen y resolución.
     * RN-002: Exclusivo para Técnico y Administrador.
     */
    import { onMount } from 'svelte';
    import { Wrench, Search, Smartphone, AlertTriangle, CheckCircle2, Trash2, ShieldAlert, Activity } from '@lucide/svelte';
    import NotificacionAlerta from '$lib/componentes/NotificacionAlerta.svelte';

    let usuarioSesion = $state(null);
    let celularesTaller = $state([]);
    let cargando = $state(true);
    let terminoBusqueda = $state('');

    // Modal de Dictamen Técnico
    let modalAbierto = $state(false);
    let guardandoDictamen = $state(false);
    let equipoSeleccionado = $state(null);
    let formularioDictamen = $state({
        nuevo_estado: 'en_reparacion',
        diagnostico: ''
    });

    let alerta = $state({ visible: false, tipo: 'info', mensaje: '' });
    function mostrarAlerta(tipo, mensaje) {
        alerta = { visible: true, tipo, mensaje };
        setTimeout(() => alerta.visible = false, 4000);
    }

    onMount(async () => {
        const sesionStr = localStorage.getItem('peraphone_usuario');
        if (sesionStr) {
            usuarioSesion = JSON.parse(sesionStr);
            // RN-002: Control de acceso
            if (!usuarioSesion.permisos?.puede_evaluar_tecnico && !usuarioSesion.permisos?.puede_ver_todo) {
                window.location.href = '/dashboard';
            }
        } else {
            window.location.href = '/inicio_sesion';
        }
        await cargarEquiposEnTaller();
    });

    async function cargarEquiposEnTaller() {
        cargando = true;
        try {
            const respuesta = await fetch('/api/inventario_equipos');
            const data = await respuesta.json();
            if (data.exito) {
                // RN-007: Solo equipos en revisión o en reparación
                celularesTaller = data.datos.filter(c => 
                    c.estado_equipo === 'en_revision' || c.estado_equipo === 'en_reparacion'
                );
            } else {
                mostrarAlerta('error', data.mensaje);
            }
        } catch (error) {
            mostrarAlerta('error', 'Error al cargar los equipos del laboratorio.');
        } finally {
            cargando = false;
        }
    }

    let equiposFiltrados = $derived(
        celularesTaller.filter(c => {
            if (!terminoBusqueda) return true;
            const term = terminoBusqueda.toLowerCase();
            return c.numero_imei.includes(term) || 
                   c.marca.toLowerCase().includes(term) ||
                   c.modelo.toLowerCase().includes(term);
        })
    );

    function abrirModalDictamen(equipo) {
        equipoSeleccionado = equipo;
        formularioDictamen = {
            nuevo_estado: equipo.estado_equipo === 'en_revision' ? 'en_reparacion' : 'disponible',
            diagnostico: ''
        };
        modalAbierto = true;
    }

    async function registrarDictamen(e) {
        e.preventDefault();
        if (!formularioDictamen.diagnostico) {
            mostrarAlerta('error', 'Debes ingresar un diagnóstico técnico obligatorio.');
            return;
        }

        guardandoDictamen = true;
        try {
            const respuesta = await fetch('/api/servicio_tecnico', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_celular: equipoSeleccionado.id_celular,
                    nuevo_estado: formularioDictamen.nuevo_estado,
                    diagnostico: formularioDictamen.diagnostico,
                    id_usuario_tecnico: usuarioSesion.id_usuario
                })
            });
            const data = await respuesta.json();
            
            if (data.exito) {
                mostrarAlerta('exito', data.mensaje);
                modalAbierto = false;
                await cargarEquiposEnTaller(); // Refrescar lista
            } else {
                mostrarAlerta('error', data.mensaje);
            }
        } catch (error) {
            mostrarAlerta('error', 'Error interno al enviar el dictamen.');
        } finally {
            guardandoDictamen = false;
        }
    }
</script>

<svelte:head>
    <title>Laboratorio Técnico | Peraphone</title>
</svelte:head>

<div class="space-y-6 max-w-7xl mx-auto">
    <!-- Encabezado -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
        <div class="flex items-center gap-4">
            <div class="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <Wrench size={28} />
            </div>
            <div>
                <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Laboratorio Técnico</h1>
                <p class="text-sm text-slate-500 mt-0.5">Diagnóstico y reparación de equipos (RN-007, RN-008)</p>
            </div>
        </div>

        <div class="relative w-full sm:w-72">
            <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
                type="text" 
                placeholder="Buscar por IMEI, Marca, Modelo..." 
                bind:value={terminoBusqueda}
                class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
            />
        </div>
    </div>

    <!-- Grid de Equipos -->
    {#if cargando}
        <div class="flex justify-center items-center py-20">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
        </div>
    {:else if equiposFiltrados.length === 0}
        <div class="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
            <ShieldAlert size={48} class="mx-auto text-slate-300 mb-3" />
            <p class="text-slate-500 font-medium">No hay equipos pendientes de revisión o reparación.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {#each equiposFiltrados as equipo}
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-lg hover:border-amber-300 transition-all group">
                    <div class="p-5 flex-1">
                        <div class="flex justify-between items-start mb-4">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                <Smartphone size={14} class="text-amber-600" />
                                {equipo.marca}
                            </span>
                            
                            <span class="text-[10px] font-bold px-2.5 py-1 rounded-full border 
                                {equipo.estado_equipo === 'en_revision' 
                                    ? 'bg-rose-50 text-rose-600 border-rose-200' 
                                    : 'bg-amber-50 text-amber-600 border-amber-200'}">
                                {equipo.estado_equipo === 'en_revision' ? 'REQUIERE REVISIÓN' : 'EN REPARACIÓN'}
                            </span>
                        </div>
                        
                        <h3 class="font-bold text-slate-900 text-xl line-clamp-1 mb-1">{equipo.modelo}</h3>
                        <p class="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded border border-slate-100 font-mono text-center">
                            IMEI: {equipo.numero_imei}
                        </p>
                    </div>

                    <button 
                        type="button"
                        onclick={() => abrirModalDictamen(equipo)}
                        class="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-amber-500 text-white text-sm font-bold transition-colors"
                    >
                        <Activity size={16} />
                        Evaluar y Emitir Dictamen
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>

<!-- Modal de Dictamen Técnico -->
{#if modalAbierto && equipoSeleccionado}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 text-lg leading-tight">Dictamen Técnico</h3>
                        <p class="text-xs text-slate-500 font-mono">IMEI: {equipoSeleccionado.numero_imei}</p>
                    </div>
                </div>
                <button type="button" onclick={() => modalAbierto = false} class="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onsubmit={registrarDictamen} class="space-y-5">
                <!-- Información visual del equipo -->
                <div class="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <Smartphone size={32} class="text-slate-400" />
                    <div>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">{equipoSeleccionado.marca}</p>
                        <p class="text-base font-black text-slate-800">{equipoSeleccionado.modelo}</p>
                    </div>
                </div>

                <div>
                    <label for="nuevo_estado" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Resolución / Nuevo Estado *</label>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <!-- Opciones como Radio Buttons estilo tarjetas -->
                        <label class="cursor-pointer">
                            <input type="radio" bind:group={formularioDictamen.nuevo_estado} value="disponible" class="peer sr-only" />
                            <div class="rounded-xl border border-slate-200 p-3 flex flex-col items-center gap-2 text-center peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 hover:bg-slate-50 transition-colors">
                                <CheckCircle2 size={20} class={formularioDictamen.nuevo_estado === 'disponible' ? 'text-emerald-600' : 'text-slate-400'} />
                                <span class="text-xs font-bold">Reparado (Disponible)</span>
                            </div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" bind:group={formularioDictamen.nuevo_estado} value="en_reparacion" class="peer sr-only" />
                            <div class="rounded-xl border border-slate-200 p-3 flex flex-col items-center gap-2 text-center peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-700 hover:bg-slate-50 transition-colors">
                                <Wrench size={20} class={formularioDictamen.nuevo_estado === 'en_reparacion' ? 'text-amber-600' : 'text-slate-400'} />
                                <span class="text-xs font-bold">Requiere Repuestos</span>
                            </div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" bind:group={formularioDictamen.nuevo_estado} value="desechado" class="peer sr-only" />
                            <div class="rounded-xl border border-slate-200 p-3 flex flex-col items-center gap-2 text-center peer-checked:border-rose-500 peer-checked:bg-rose-50 peer-checked:text-rose-700 hover:bg-slate-50 transition-colors">
                                <Trash2 size={20} class={formularioDictamen.nuevo_estado === 'desechado' ? 'text-rose-600' : 'text-slate-400'} />
                                <span class="text-xs font-bold">Inviable (Desechar)</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div>
                    <label for="diagnostico" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Notas del Diagnóstico Técnico *</label>
                    <textarea 
                        id="diagnostico" 
                        rows="3" 
                        required
                        placeholder="Detalles de la falla, componentes cambiados, razón de desecho..." 
                        bind:value={formularioDictamen.diagnostico} 
                        class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                    ></textarea>
                </div>

                <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onclick={() => modalAbierto = false} class="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
                    <button type="submit" disabled={guardandoDictamen} class="px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center gap-2">
                        {#if guardandoDictamen}
                            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {:else}
                            <Activity size={16} />
                        {/if}
                        Guardar Dictamen
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<NotificacionAlerta 
    visible={alerta.visible} 
    tipo={alerta.tipo} 
    mensaje={alerta.mensaje} 
    alCerrar={() => alerta.visible = false} 
/>
