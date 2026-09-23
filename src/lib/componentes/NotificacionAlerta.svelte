<script>
    /**
     * Componente NotificacionAlerta
     * Toast flotante para feedback de operaciones (éxito, error, advertencia)
     */
    let { 
        visible = false, 
        tipo = 'exito', // 'exito' | 'error' | 'advertencia'
        mensaje = '', 
        alCerrar = () => {} 
    } = $props();

    const estilos = {
        exito: {
            fondo: 'bg-emerald-900/90 text-white border-emerald-700',
            icono: '✓'
        },
        error: {
            fondo: 'bg-rose-900/90 text-white border-rose-700',
            icono: '✕'
        },
        advertencia: {
            fondo: 'bg-amber-900/90 text-white border-amber-700',
            icono: '⚠'
        }
    };

    let estiloActual = $derived(estilos[tipo] || estilos.exito);
</script>

{#if visible}
    <div class="fixed bottom-5 right-5 z-50 max-w-md w-full animate-bounce-short">
        <div class="flex items-center gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl {estiloActual.fondo}">
            <div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">
                {estiloActual.icono}
            </div>
            <div class="text-sm font-medium flex-1">
                {mensaje}
            </div>
            <button 
                type="button"
                onclick={alCerrar}
                class="text-white/70 hover:text-white text-base px-1.5 py-0.5 rounded-md hover:bg-white/10 transition-colors"
                aria-label="Cerrar notificación"
            >
                ✕
            </button>
        </div>
    </div>
{/if}
