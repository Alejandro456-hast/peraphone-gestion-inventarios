<script>
    /**
     * Componente BarraLateral (Sidebar Empresarial)
     * Navegación principal del ERP basada en Roles (RN-002)
     */
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { 
        LayoutDashboard, 
        Package, 
        ShoppingCart, 
        Wrench, 
        Users, 
        LogOut,
        Boxes,
        Receipt
    } from '@lucide/svelte';

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

    // Navegación basada en roles (RN-002)
    let enlacesNav = $derived.by(() => {
        const permisos = usuarioActual?.permisos || {};
        
        return [
            { 
                titulo: 'Dashboard', 
                ruta: '/dashboard', 
                icono: LayoutDashboard,
                mostrar: permisos.puede_ver_todo // Administrador
            },
            { 
                titulo: 'Punto de Venta', 
                ruta: '/ventas', 
                icono: ShoppingCart,
                mostrar: permisos.puede_vender || permisos.puede_ver_todo // Vendedor y Admin
            },
            { 
                titulo: 'Historial de Ventas', 
                ruta: '/historial_ventas', 
                icono: Receipt,
                mostrar: permisos.puede_vender || permisos.puede_ver_todo // Vendedor y Admin
            },
            { 
                titulo: 'Inventario de Celulares', 
                ruta: '/gestion_celulares', 
                icono: Package,
                mostrar: true // Todos los roles ven el inventario base
            },
            { 
                titulo: 'Control de Lotes', 
                ruta: '/gestion_lotes', 
                icono: Boxes,
                mostrar: permisos.puede_registrar_inventario || permisos.puede_ver_todo // Admin o Inventario
            },
            { 
                titulo: 'Servicio Técnico', 
                ruta: '/servicio_tecnico', 
                icono: Wrench,
                mostrar: permisos.puede_evaluar_tecnico || permisos.puede_ver_todo // Técnico o Admin
            },
            { 
                titulo: 'Usuarios y Seguridad', 
                ruta: '/gestion_usuarios', 
                icono: Users,
                mostrar: permisos.puede_ver_todo // Solo Administrador
            }
        ].filter(link => link.mostrar);
    });

    let rutaActual = $derived($page.url.pathname);
</script>

<aside class="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-full shrink-0 shadow-xl z-20">
    <!-- Logo / Header de Sidebar -->
    <div class="h-16 flex items-center px-6 border-b border-slate-800 shrink-0 bg-slate-950/50">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-lg text-white shadow-md shadow-cyan-500/20">
                P
            </div>
            <div>
                <span class="font-bold text-lg tracking-tight text-white leading-none block">PERAPHONE</span>
                <span class="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider block">ERP System</span>
            </div>
        </div>
    </div>

    <!-- Navegación principal -->
    <nav class="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Menú Principal</div>
        
        {#each enlacesNav as enlace}
            {@const Icono = enlace.icono}
            <a 
                href={enlace.ruta}
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 {rutaActual === enlace.ruta ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 group'}"
            >
                <Icono 
                    size={20} 
                    strokeWidth={rutaActual === enlace.ruta ? 2.5 : 2}
                    class={rutaActual === enlace.ruta ? 'text-cyan-100' : 'text-slate-500 group-hover:text-slate-300 transition-colors'} 
                />
                <span class="text-sm">{enlace.titulo}</span>
            </a>
        {/each}

        {#if usuarioActual?.nombre_rol === 'Administrador'}
            <div class="mt-6 mb-2 px-3">
                <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Seguridad</span>
            </div>
            
            <a 
                href="/gestion_usuarios" 
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 {rutaActual === '/gestion_usuarios' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 group'}"
            >
                <Users 
                    size={20} 
                    strokeWidth={rutaActual === '/gestion_usuarios' ? 2.5 : 2}
                    class={rutaActual === '/gestion_usuarios' ? 'text-purple-100' : 'text-slate-500 group-hover:text-slate-300 transition-colors'} 
                />
                <span class="text-sm">Usuarios y Roles</span>
            </a>
        {/if}
    </nav>

    <!-- Perfil de usuario (Bottom) -->
    {#if usuarioActual}
        <div class="p-4 border-t border-slate-800 bg-slate-950/80">
            <div class="flex items-center gap-3 mb-4 px-2">
                <div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                    {usuarioActual.nombre_completo.charAt(0)}
                </div>
                <div class="overflow-hidden">
                    <p class="text-sm font-bold text-white truncate">{usuarioActual.nombre_completo}</p>
                    <p class="text-[10px] uppercase font-bold text-cyan-400 truncate tracking-wide">{usuarioActual.nombre_rol}</p>
                </div>
            </div>
            
            <button 
                type="button"
                onclick={cerrarSesion}
                class="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/80 border border-transparent hover:border-rose-900/50 transition-colors"
            >
                <LogOut size={16} strokeWidth={2.5} />
                Cerrar Sesión
            </button>
        </div>
    {/if}
</aside>
