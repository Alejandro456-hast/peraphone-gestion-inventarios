<script>
    /**
     * Componente ModalFormulario
     * Ventana modal interactiva para registro de equipos celulares (RN-003, RN-004, RN-005)
     */
    import { onMount } from 'svelte';

    let { 
        abierto = false, 
        idLotePredeterminado = '',
        alCerrar = () => {}, 
        alGuardarExitoso = () => {} 
    } = $props();

    let listaLotes = $state([]);
    let guardando = $state(false);
    let mensajeError = $state('');

    // Estado reactivo del formulario
    let nuevoEquipo = $state({
        numero_imei: '',
        marca: '',
        modelo: '',
        color: 'Negro',
        capacidad_almacenamiento: '128GB',
        estado_equipo: 'disponible',
        precio_costo: '',
        precio_venta: '',
        id_lote: idLotePredeterminado
    });
    
    // Si cambia el prop mientras el componente está montado (Runes)
    $effect(() => {
        if (abierto && idLotePredeterminado && !nuevoEquipo.numero_imei) {
            nuevoEquipo.id_lote = idLotePredeterminado;
        }
    });

    onMount(async () => {
        try {
            const respuesta = await fetch('/api/lotes');
            const resultado = await respuesta.json();
            if (resultado.exito) {
                listaLotes = resultado.datos;
            }
        } catch (e) {
            console.error('Error al cargar lotes:', e);
        }
    });

    async function enviarFormulario(e) {
        e.preventDefault();
        mensajeError = '';

        // Validación de IMEI de 15 dígitos en frontend
        if (!/^[0-9]{15}$/.test(nuevoEquipo.numero_imei.trim())) {
            mensajeError = 'El IMEI debe tener exactamente 15 dígitos numéricos.';
            return;
        }

        if (!nuevoEquipo.marca.trim() || !nuevoEquipo.modelo.trim()) {
            mensajeError = 'La marca y el modelo son obligatorios.';
            return;
        }

        guardando = true;

        try {
            const usuarioGuardado = localStorage.getItem('peraphone_usuario');
            let idUsuarioResponsable = 1;
            if (usuarioGuardado) {
                const u = JSON.parse(usuarioGuardado);
                idUsuarioResponsable = u.id_usuario;
            }

            const respuesta = await fetch('/api/inventario_equipos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...nuevoEquipo,
                    id_usuario_responsable: idUsuarioResponsable
                })
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok || !resultado.exito) {
                mensajeError = resultado.mensaje || 'Error al guardar el equipo.';
            } else {
                // Limpiar formulario y notificar
                nuevoEquipo = {
                    numero_imei: '',
                    marca: '',
                    modelo: '',
                    color: 'Negro',
                    capacidad_almacenamiento: '128GB',
                    estado_equipo: 'disponible',
                    precio_costo: '',
                    precio_venta: '',
                    id_lote: ''
                };
                alGuardarExitoso(resultado.mensaje);
                alCerrar();
            }
        } catch (error) {
            mensajeError = 'Error de conexión con el microservicio de inventario.';
        } finally {
            guardando = false;
        }
    }
</script>

{#if abierto}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <!-- Cabecera del Modal -->
            <div class="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-lg">
                        📱
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-slate-900">Registrar Nuevo Celular</h2>
                        <p class="text-xs text-slate-500">Ingreso de equipo individual o vinculado a un lote (RN-003, RN-004)</p>
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

            <!-- Cuerpo del Formulario -->
            <form onsubmit={enviarFormulario} class="p-6 space-y-5">
                {#if mensajeError}
                    <div class="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{mensajeError}</span>
                    </div>
                {/if}

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- IMEI (Soporte lector de código de barras) -->
                    <div class="sm:col-span-2">
                        <label for="numero_imei" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Número de IMEI (15 Dígitos) *
                        </label>
                        <input 
                            id="numero_imei"
                            type="text" 
                            maxlength="15"
                            placeholder="Ej. 863245041234567 (compatible con lector láser)"
                            bind:value={nuevoEquipo.numero_imei}
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 font-mono text-sm tracking-wider"
                            required 
                        />
                        <span class="text-[11px] text-slate-500 mt-1 block">Compatible con pistola lectora de código de barras USB/Bluetooth.</span>
                    </div>

                    <!-- Marca -->
                    <div>
                        <label for="marca_equipo" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Marca *
                        </label>
                        <input 
                            id="marca_equipo"
                            type="text" 
                            placeholder="Ej. Xiaomi, Samsung, Apple"
                            bind:value={nuevoEquipo.marca}
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 text-sm"
                            required 
                        />
                    </div>

                    <!-- Modelo -->
                    <div>
                        <label for="modelo_equipo" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Modelo *
                        </label>
                        <input 
                            id="modelo_equipo"
                            type="text" 
                            placeholder="Ej. Redmi Note 13 Pro 5G"
                            bind:value={nuevoEquipo.modelo}
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 text-sm"
                            required 
                        />
                    </div>

                    <!-- Color -->
                    <div>
                        <label for="color_equipo" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Color
                        </label>
                        <input 
                            id="color_equipo"
                            type="text" 
                            placeholder="Ej. Azul Océano, Negro, Blanco"
                            bind:value={nuevoEquipo.color}
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 text-sm"
                        />
                    </div>

                    <!-- Capacidad de Almacenamiento -->
                    <div>
                        <label for="capacidad_equipo" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Almacenamiento
                        </label>
                        <select 
                            id="capacidad_equipo"
                            bind:value={nuevoEquipo.capacidad_almacenamiento}
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 text-sm"
                        >
                            <option value="64GB">64GB</option>
                            <option value="128GB">128GB</option>
                            <option value="256GB">256GB</option>
                            <option value="512GB">512GB</option>
                            <option value="1TB">1TB</option>
                        </select>
                    </div>

                    <!-- Agrupación por Lote (RN-004) -->
                    <div class="sm:col-span-2">
                        <label for="id_lote_select" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Lote de Recepción (RN-004)
                        </label>
                        <select 
                            id="id_lote_select"
                            bind:value={nuevoEquipo.id_lote}
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 text-sm"
                        >
                            <option value="">-- Sin Lote (Registro Individual) --</option>
                            {#each listaLotes as lote}
                                <option value={lote.id_lote}>
                                    {lote.codigo_lote} ({lote.proveedor} - {lote.fecha_recepcion})
                                </option>
                            {/each}
                        </select>
                    </div>

                    <!-- Estado Inicial (RN-003) -->
                    <div>
                        <label for="estado_equipo_select" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Estado Inicial del Equipo
                        </label>
                        <select 
                            id="estado_equipo_select"
                            bind:value={nuevoEquipo.estado_equipo}
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 text-sm"
                        >
                            <option value="disponible">Disponible (Para Venta Inmediata)</option>
                            <option value="pendiente_recepcion">Pendiente de Recepción</option>
                            <option value="en_revision">Defectuoso (Enviar a Servicio Técnico)</option>
                        </select>
                    </div>

                    <!-- Precio Costo -->
                    <div>
                        <label for="precio_costo_input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Precio de Costo ($ USD)
                        </label>
                        <input 
                            id="precio_costo_input"
                            type="number" 
                            step="0.01" 
                            placeholder="0.00"
                            bind:value={nuevoEquipo.precio_costo}
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 text-sm"
                        />
                    </div>

                    <!-- Precio Venta -->
                    <div>
                        <label for="precio_venta_input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Precio de Venta ($ USD)
                        </label>
                        <input 
                            id="precio_venta_input"
                            type="number" 
                            step="0.01" 
                            placeholder="0.00"
                            bind:value={nuevoEquipo.precio_venta}
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 text-sm"
                        />
                    </div>
                </div>

                <!-- Botones de Acción -->
                <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button 
                        type="button" 
                        onclick={alCerrar}
                        class="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold transition-colors"
                        disabled={guardando}
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        class="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all shadow-md shadow-cyan-600/30 flex items-center gap-2"
                        disabled={guardando}
                    >
                        {#if guardando}
                            <span class="animate-spin text-sm">⌛</span>
                            <span>Guardando en Peraphone...</span>
                        {:else}
                            <span>Confirmar e Ingresar Equipo</span>
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
