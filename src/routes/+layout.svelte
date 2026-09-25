<script>
    import './layout.css';
    import favicon from '$lib/assets/favicon.svg';
    import { page } from '$app/stores';
    import BarraLateral from '$lib/componentes/BarraLateral.svelte';
    import { onMount } from 'svelte';
    import { Moon, Sun } from '@lucide/svelte';

    let { children } = $props();

    let isLogin = $derived($page.url.pathname === '/inicio_sesion' || $page.url.pathname === '/');
    let modoOscuro = $state(false);

    onMount(() => {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            modoOscuro = true;
            document.documentElement.classList.add('dark');
        } else {
            modoOscuro = false;
            document.documentElement.classList.remove('dark');
        }
    });

    function toggleModoOscuro() {
        modoOscuro = !modoOscuro;
        if (modoOscuro) {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        }
    }
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

{#if isLogin}
    {@render children()}
{:else}
    <div class="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-200">
        <!-- Sidebar Global Empresarial -->
        <BarraLateral />

        <!-- Área de Contenido Principal -->
        <div class="flex-1 flex flex-col overflow-hidden relative">
            
            <!-- Encabezado superior global -->
            <header class="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 transition-colors duration-200">
                <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                    <span>PERAPHONE</span>
                    <span class="text-slate-300 dark:text-slate-600">/</span>
                    <span class="text-slate-900 dark:text-slate-100 capitalize capitalize-first">
                        {$page.url.pathname.replace('/', '').replace('_', ' ') || 'Dashboard'}
                    </span>
                </div>

                <!-- Toggle Modo Oscuro -->
                <button 
                    onclick={toggleModoOscuro}
                    class="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Alternar Modo Oscuro"
                >
                    {#if modoOscuro}
                        <Sun size={20} />
                    {:else}
                        <Moon size={20} />
                    {/if}
                </button>
            </header>

            <!-- Contenido scrolleable de cada módulo -->
            <main class="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-6 relative transition-colors duration-200 text-slate-900 dark:text-slate-100">
                <div class="max-w-7xl mx-auto">
                    {@render children()}
                </div>
            </main>
        </div>
    </div>
{/if}
