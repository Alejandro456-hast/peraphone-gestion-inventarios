<script>
    import './layout.css';
    import favicon from '$lib/assets/favicon.svg';
    import { page } from '$app/stores';
    import BarraLateral from '$lib/componentes/BarraLateral.svelte';

    let { children } = $props();

    // No mostrar la barra lateral en la página de inicio de sesión
    let isLogin = $derived($page.url.pathname === '/inicio_sesion' || $page.url.pathname === '/');
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

{#if isLogin}
    {@render children()}
{:else}
    <div class="flex h-screen bg-slate-50 overflow-hidden font-sans">
        <!-- Sidebar Global Empresarial -->
        <BarraLateral />

        <!-- Área de Contenido Principal -->
        <div class="flex-1 flex flex-col overflow-hidden relative">
            
            <!-- Encabezado superior global opcional (Breadcrumbs, notificaciones, etc) -->
            <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
                <div class="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <!-- Migajas de pan básicas -->
                    <span>PERAPHONE</span>
                    <span class="text-slate-300">/</span>
                    <span class="text-slate-900 capitalize capitalize-first">
                        {$page.url.pathname.replace('/', '').replace('_', ' ') || 'Dashboard'}
                    </span>
                </div>
            </header>

            <!-- Contenido scrolleable de cada módulo -->
            <main class="flex-1 overflow-y-auto bg-slate-100 p-6 relative">
                <div class="max-w-7xl mx-auto">
                    {@render children()}
                </div>
            </main>
        </div>
    </div>
{/if}
