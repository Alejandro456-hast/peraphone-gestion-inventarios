<script>
    /**
     * Módulo de Gestión de Lotes - PERAPHONE
     * RN-004: Agrupación y trazabilidad de lotes recibidos.
     * RN-002: Exclusivo para Personal de Inventario y Administrador.
     */
    import { onMount } from 'svelte';
    import { Boxes, PackagePlus, Box, Search, PlusCircle, Smartphone, Edit2, Trash2, CheckCircle2 } from '@lucide/svelte';
    import NotificacionAlerta from '$lib/componentes/NotificacionAlerta.svelte';
    import ModalFormulario from '$lib/componentes/ModalFormulario.svelte';

    let usuarioSesion = $state(null);
    let lotes = $state([]);
    let cargando = $state(true);
    let terminoBusqueda = $state('');

    // Modal para Registrar Celulares en un Lote
    let modalRegistroEquipoAbierto = $state(false);
    let loteSeleccionadoParaEquipo = $state('');

    // Modal para Registrar/Editar Lote
    let modalLoteAbierto = $state(false);
    let modoEdicionLote = $state(false);
    let loteActual = $state({
        id_lote: null,
        codigo_lote: '',
        proveedor: '',
        descripcion: '',
        estado_lote: 'abierto'
    });
    let guardandoLote = $state(false);

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
            if (!usuarioSesion.permisos?.puede_registrar_inventario && !usuarioSesion.permisos?.puede_ver_todo) {
                window.location.href = '/dashboard';
            }
        } else {
            window.location.href = '/inicio_sesion';
        }
        await cargarLotes();
    });

    async function cargarLotes() {
        cargando = true;
        try {
            const respuesta = await fetch('/api/lotes');
            const data = await respuesta.json();
            if (data.exito) {
                lotes = data.datos;
            } else {
                mostrarAlerta('error', data.mensaje);
            }
        } catch (error) {
            mostrarAlerta('error', 'Error al cargar los lotes de inventario.');
        } finally {
            cargando = false;
        }
    }

    let lotesFiltrados = $derived(
        lotes.filter(l => {
            if (!terminoBusqueda) return true;
            const term = terminoBusqueda.toLowerCase();
            return l.codigo_lote.toLowerCase().includes(term) || 
                   l.proveedor.toLowerCase().includes(term);
        })
    );

    function abrirModalNuevoLote() {
        modoEdicionLote = false;
        loteActual = { id_lote: null, codigo_lote: '', proveedor: '', descripcion: '', estado_lote: 'abierto' };
        modalLoteAbierto = true;
    }

    function abrirModalEditarLote(lote) {
        modoEdicionLote = true;
        loteActual = { ...lote };
        modalLoteAbierto = true;
    }

    async function guardarLote(e) {
        e.preventDefault();
        if (!loteActual.codigo_lote || !loteActual.proveedor) return;
        
        guardandoLote = true;
        try {
            const url = '/api/lotes';
            const metodo = modoEdicionLote ? 'PUT' : 'POST';
            
            const respuesta = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...loteActual,
                    id_usuario_responsable: usuarioSesion.id_usuario
                })
            });
            const data = await respuesta.json();
            if (data.exito) {
                mostrarAlerta('exito', data.mensaje);
                modalLoteAbierto = false;
                await cargarLotes();
            } else {
                mostrarAlerta('error', data.mensaje);
            }
        } catch (error) {
            mostrarAlerta('error', 'Error al procesar la solicitud.');
        } finally {
            guardandoLote = false;
        }
    }

    async function eliminarLote(id_lote, codigo_lote) {
        if (!confirm(`¿Estás seguro que deseas eliminar el lote ${codigo_lote}?\nEsta acción no se puede deshacer.`)) return;

        try {
            const respuesta = await fetch(`/api/lotes?id=${id_lote}&id_usuario=${usuarioSesion.id_usuario}`, {
                method: 'DELETE'
            });
            const data = await respuesta.json();
            
            if (data.exito) {
                mostrarAlerta('exito', data.mensaje);
                await cargarLotes();
            } else {
                mostrarAlerta('error', data.mensaje);
            }
        } catch (error) {
            mostrarAlerta('error', 'Error interno al comunicarse con el servidor para eliminar.');
        }
    }

    function abrirModalRegistroEquipo(idLote) {
        loteSeleccionadoParaEquipo = idLote;
        modalRegistroEquipoAbierto = true;
    }
</script>

<svelte:head>
    <title>Gestión de Lotes | Peraphone</title>
</svelte:head>

<div class="space-y-6 max-w-7xl mx-auto">
    <!-- Encabezado -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div class="flex items-center gap-4">
            <div class="p-3 bg-cyan-100 text-cyan-600 rounded-xl">
                <Boxes size={28} />
            </div>
            <div>
                <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Control de Lotes</h1>
                <p class="text-sm text-slate-500 mt-0.5">Ingreso y administración de envíos de proveedores (RN-004)</p>
            </div>
        </div>

        <div class="flex items-center gap-3">
            <div class="relative w-full sm:w-64">
                <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar lote o proveedor..." 
                    bind:value={terminoBusqueda}
                    class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                />
            </div>
            <button 
                type="button"
                onclick={abrirModalNuevoLote}
                class="flex items-center shrink-0 gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-xl shadow-md shadow-cyan-600/20 transition-all"
            >
                <PackagePlus size={18} />
                <span class="hidden sm:inline">Nuevo Lote</span>
            </button>
        </div>
    </div>

    <!-- Grid de Lotes -->
    {#if cargando}
        <div class="flex justify-center items-center py-20">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
        </div>
    {:else if lotesFiltrados.length === 0}
        <div class="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Box size={48} class="mx-auto text-slate-300 mb-3" />
            <p class="text-slate-500 font-medium">No se encontraron lotes registrados.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each lotesFiltrados as lote}
                <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-cyan-300 transition-colors relative">
                    <!-- Controles de Edición -->
                    <div class="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onclick={() => abrirModalEditarLote(lote)}
                            class="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                            title="Editar Lote"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onclick={() => eliminarLote(lote.id_lote, lote.codigo_lote)}
                            class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar Lote"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>

                    <div>
                        <div class="flex justify-between items-start mb-4 pr-16">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                <Box size={14} class="text-cyan-600" />
                                {lote.codigo_lote}
                            </span>
                        </div>
                        
                        <div class="flex items-center justify-between mb-1">
                            <h3 class="font-bold text-slate-800 text-lg line-clamp-1">{lote.proveedor}</h3>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full 
                                {lote.estado_lote === 'abierto' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
                                {lote.estado_lote === 'abierto' ? 'ABIERTO' : 'CERRADO'}
                            </span>
                        </div>
                        
                        {#if lote.descripcion}
                            <p class="text-xs text-slate-500 line-clamp-2 mb-4">{lote.descripcion}</p>
                        {:else}
                            <div class="h-4 mb-4"></div>
                        {/if}

                        <div class="flex items-center justify-between text-sm py-3 border-t border-b border-slate-100 mb-4 bg-slate-50 px-3 rounded-lg">
                            <div class="flex items-center gap-2 text-slate-600">
                                <Smartphone size={16} class="text-cyan-600" />
                                <span class="font-bold text-slate-900">{lote.total_equipos}</span> equipos
                            </div>
                            <div class="text-xs text-slate-400 font-medium">
                                {lote.fecha_recepcion !== '0000-00-00' ? new Date(lote.fecha_recepcion).toLocaleDateString() : 'Pendiente'}
                            </div>
                        </div>
                    </div>

                    <button 
                        type="button"
                        disabled={lote.estado_lote !== 'abierto'}
                        onclick={() => abrirModalRegistroEquipo(lote.id_lote)}
                        class="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-cyan-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
                    >
                        <PlusCircle size={16} />
                        Ingresar Equipo al Lote
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>

<!-- Modal para Registrar/Editar Lote -->
{#if modalLoteAbierto}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-2">
                    {#if modoEdicionLote}
                        <Edit2 class="text-cyan-600" size={24} />
                        <h3 class="font-bold text-slate-900 text-lg">Modificar Lote</h3>
                    {:else}
                        <PackagePlus class="text-cyan-600" size={24} />
                        <h3 class="font-bold text-slate-900 text-lg">Registrar Nuevo Lote</h3>
                    {/if}
                </div>
                <button type="button" onclick={() => modalLoteAbierto = false} class="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onsubmit={guardarLote} class="space-y-4">
                <div>
                    <label for="codigo_lote" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Código del Lote *</label>
                    <input id="codigo_lote" type="text" required placeholder="Ej. LOTE-NOV-2026-A" bind:value={loteActual.codigo_lote} class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500 outline-none uppercase font-mono font-bold" />
                </div>
                <div>
                    <label for="proveedor" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Proveedor / Origen *</label>
                    <input id="proveedor" type="text" required placeholder="Ej. Samsung Distribuidor Oficial" bind:value={loteActual.proveedor} class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500 outline-none" />
                </div>
                
                {#if modoEdicionLote}
                <div>
                    <label for="estado_lote" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Estado de Recepción</label>
                    <select id="estado_lote" bind:value={loteActual.estado_lote} class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500 outline-none font-bold">
                        <option value="abierto">Abierto (Permite ingresar equipos)</option>
                        <option value="cerrado">Cerrado (Recepciones finalizadas)</option>
                    </select>
                </div>
                {/if}

                <div>
                    <label for="desc_lote" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descripción (Opcional)</label>
                    <textarea id="desc_lote" rows="2" placeholder="Detalles de la importación..." bind:value={loteActual.descripcion} class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"></textarea>
                </div>

                <div class="flex justify-end gap-2 pt-4">
                    <button type="button" onclick={() => modalLoteAbierto = false} class="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
                    <button type="submit" disabled={guardandoLote} class="px-5 py-2.5 rounded-xl text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 disabled:opacity-50 transition-all flex items-center gap-2">
                        {#if guardandoLote}
                            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {:else if modoEdicionLote}
                            <CheckCircle2 size={16} />
                        {:else}
                            <PackagePlus size={16} />
                        {/if}
                        {modoEdicionLote ? 'Actualizar Lote' : 'Guardar Lote'}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Modal para Registrar Nuevo Celular (Reutilizado) -->
<ModalFormulario 
    abierto={modalRegistroEquipoAbierto}
    idLotePredeterminado={loteSeleccionadoParaEquipo}
    alCerrar={() => {
        modalRegistroEquipoAbierto = false;
        cargarLotes(); // Refrescar para ver aumento de cantidad
    }}
    alGuardarExitoso={(msj) => {
        mostrarAlerta('exito', msj);
        modalRegistroEquipoAbierto = false;
        cargarLotes(); // Para actualizar el conteo de equipos en el lote
    }}
/>

<NotificacionAlerta 
    visible={alerta.visible} 
    tipo={alerta.tipo} 
    mensaje={alerta.mensaje} 
    alCerrar={() => alerta.visible = false} 
/>
