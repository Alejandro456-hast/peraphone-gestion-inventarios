<script>
    /**
     * Componente BarraNavegacion
     * Cabecera empresarial con branding de Peraphone, indicador de rol y control de sesión
     */
    import { onMount } from 'svelte';

    let usuarioActual = $state(null);

    onMount(() => {
        const sesionGuardada = localStorage.getItem('peraphone_usuario');
        if (sesionGuardada) {
            try {
                usuarioActual = JSON.parse(sesionGuardada);
            } catch (e) {
                console.error('Error al leer sesión:', e);
            }
        }
    });

    async function cerrarSesion() {
        try {
            await fetch('/api/auth_usuarios', { method: 'DELETE' });
        } catch (e) {
            console.error('Error al cerrar sesión:', e);
        }
        localStorage.removeItem('peraphone_usuario');
        window.location.href = '/inicio_sesion';
    }
</script>

<header class="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
            <!-- Logotipo y Nombre Corporativo -->
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-xl text-white shadow-md shadow-cyan-500/20">
                    P
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-lg tracking-tight text-white">PERAPHONE</span>
                        <span class="text-[10px] bg-cyan-500/20 text-cyan-300 font-semibold px-2 py-0.5 rounded-full border border-cyan-500/30">Inventario</span>
                    </div>
                    <p class="text-[11px] text-slate-400 hidden sm:block">Propiedad de Luis Baldivieso | Dev: Alejandro Paucara</p>
                </div>
            </div>

            <!-- Navegación y Perfil de Usuario -->
            <div class="flex items-center gap-3 sm:gap-6">
                <nav class="hidden md:flex items-center gap-4 text-sm font-medium">
                    <a 
                        href="/gestion_celulares" 
                        class="text-white hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700"
                    >
                        Inventario de Celulares
                    </a>
                </nav>

                {#if usuarioActual}
                    <div class="flex items-center gap-3 pl-3 border-l border-slate-800">
                        <div class="text-right hidden sm:block">
                            <p class="text-xs font-semibold text-slate-200">{usuarioActual.nombre_completo}</p>
                            <span class="text-[10px] uppercase font-bold tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                                {usuarioActual.nombre_rol}
                            </span>
                        </div>
                        <button 
                            type="button"
                            onclick={cerrarSesion}
                            class="text-xs bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white px-3 py-1.5 rounded-lg border border-rose-800/50 transition-all font-medium flex items-center gap-1.5"
                            title="Cerrar Sesión Segura"
                        >
                            <span class="hidden sm:inline">Cerrar Sesión</span>
                            <span>🚪</span>
                        </button>
                    </div>
                {:else}
                    <a 
                        href="/inicio_sesion"
                        class="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                        Iniciar Sesión
                    </a>
                {/if}
            </div>
        </div>
    </div>
</header>
