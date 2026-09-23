<script>
    /**
     * Redirección inteligente de Peraphone
     * Si existe sesión previa en localStorage redirige a /gestion_celulares; si no, a /inicio_sesion
     */
    import { onMount } from 'svelte';

    onMount(() => {
        const sesion = localStorage.getItem('peraphone_usuario');
        if (sesion) {
            window.location.href = '/gestion_celulares';
        } else {
            window.location.href = '/inicio_sesion';
        }
    });
</script>

<div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
    <div class="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-2xl animate-pulse">
        P
    </div>
    <p class="mt-4 text-sm text-slate-400 font-medium">Cargando sistema Peraphone...</p>
</div>
