<script>
    /**
     * Vista de Inicio de Sesión Corporativo - PERAPHONE
     * Autenticación Estricta (RN-001) y Asignación de Roles (RN-002)
     */
    import NotificacionAlerta from '$lib/componentes/NotificacionAlerta.svelte';

    let nombreUsuario = $state('');
    let contrasena = $state('');
    let cargando = $state(false);
    let alerta = $state({ visible: false, tipo: 'error', mensaje: '' });

    async function manejarInicioSesion(e) {
        e.preventDefault();
        alerta.visible = false;
        cargando = true;

        try {
            const respuesta = await fetch('/api/auth_usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre_usuario: nombreUsuario.trim(),
                    contrasena: contrasena
                })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.exito) {
                alerta = {
                    visible: true,
                    tipo: 'error',
                    mensaje: datos.mensaje || 'Error al iniciar sesión.'
                };
            } else {
                // Guardar datos del usuario activo para la sesión
                localStorage.setItem('peraphone_usuario', JSON.stringify(datos.usuario));
                alerta = {
                    visible: true,
                    tipo: 'exito',
                    mensaje: datos.mensaje
                };

                // Redirección inmediata al panel de inventario
                setTimeout(() => {
                    window.location.href = '/gestion_celulares';
                }, 700);
            }
        } catch (error) {
            alerta = {
                visible: true,
                tipo: 'error',
                mensaje: 'No se pudo conectar con el microservicio de autenticación. Verifica que XAMPP MySQL esté iniciado.'
            };
        } finally {
            cargando = false;
        }
    }

    // Facilidad de prueba rápida para Alejandro Paucara y Luis Baldivieso
    function cargarCredencialesDemo(usuario, clave) {
        nombreUsuario = usuario;
        contrasena = clave;
    }
</script>

<svelte:head>
    <title>Iniciar Sesión | Peraphone Inventarios</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
    <!-- Fondos decorativos modernos -->
    <div class="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <!-- Logotipo Peraphone -->
        <div class="flex justify-center">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-3xl text-white shadow-xl shadow-cyan-500/20 ring-4 ring-cyan-500/10">
                P
            </div>
        </div>
        <h1 class="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            PERAPHONE
        </h1>
        <p class="mt-2 text-center text-xs text-slate-400">
            Sistema Empresarial de Gestión de Inventarios y Trazabilidad
        </p>
        <p class="text-center text-[11px] text-cyan-400 font-medium">
            Propiedad de Luis Baldivieso • Desarrollado por Alejandro Paucara
        </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div class="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-800">
            
            <form onsubmit={manejarInicioSesion} class="space-y-5">
                <!-- Nombre de Usuario -->
                <div>
                    <label for="campo_usuario" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                        Usuario o Correo Electrónico
                    </label>
                    <div class="relative">
                        <input 
                            id="campo_usuario"
                            type="text" 
                            bind:value={nombreUsuario}
                            required
                            placeholder="admin, mariana.inventario, etc."
                            class="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm transition-all"
                        />
                    </div>
                </div>

                <!-- Contraseña -->
                <div>
                    <label for="campo_clave" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                        Contraseña
                    </label>
                    <input 
                        id="campo_clave"
                        type="password" 
                        bind:value={contrasena}
                        required
                        placeholder="••••••••"
                        class="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm transition-all"
                    />
                </div>

                <!-- Botón de Ingreso -->
                <button 
                    type="submit" 
                    disabled={cargando}
                    class="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
                >
                    {#if cargando}
                        <span class="animate-spin mr-2">⌛</span>
                        <span>Verificando credenciales...</span>
                    {:else}
                        <span>Acceder al Sistema</span>
                    {/if}
                </button>
            </form>

            <!-- Acceso Rápido de Prueba (Demo Roles) -->
            <div class="mt-8 pt-6 border-t border-slate-800/80">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
                    Cuentas de Prueba Preconfiguradas (RN-002):
                </p>
                <div class="grid grid-cols-2 gap-2">
                    <button 
                        type="button"
                        onclick={() => cargarCredencialesDemo('admin', 'admin123')}
                        class="text-left p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
                    >
                        <p class="text-xs font-bold text-cyan-400">Administrador</p>
                        <p class="text-[10px] text-slate-400">admin / admin123</p>
                    </button>

                    <button 
                        type="button"
                        onclick={() => cargarCredencialesDemo('mariana.inventario', 'inventario123')}
                        class="text-left p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
                    >
                        <p class="text-xs font-bold text-purple-400">Inventario</p>
                        <p class="text-[10px] text-slate-400">mariana.inventario</p>
                    </button>

                    <button 
                        type="button"
                        onclick={() => cargarCredencialesDemo('jorge.tecnico', 'tecnico123')}
                        class="text-left p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
                    >
                        <p class="text-xs font-bold text-amber-400">Servicio Técnico</p>
                        <p class="text-[10px] text-slate-400">jorge.tecnico</p>
                    </button>

                    <button 
                        type="button"
                        onclick={() => cargarCredencialesDemo('carlos.vendedor', 'vendedor123')}
                        class="text-left p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
                    >
                        <p class="text-xs font-bold text-emerald-400">Vendedor</p>
                        <p class="text-[10px] text-slate-400">carlos.vendedor</p>
                    </button>
                </div>
            </div>

            <!-- Información técnica -->
            <div class="mt-6 text-center">
                <span class="text-[10px] text-slate-500 font-mono">
                    MySQL XAMPP • SvelteKit Full-Stack • Tailwind CSS
                </span>
            </div>
        </div>
    </div>
</div>

<NotificacionAlerta 
    visible={alerta.visible} 
    tipo={alerta.tipo} 
    mensaje={alerta.mensaje} 
    alCerrar={() => alerta.visible = false} 
/>
