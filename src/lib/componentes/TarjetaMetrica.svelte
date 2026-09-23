<script>
    /**
     * Componente TarjetaMetrica
     * Muestra indicadores clave de rendimiento (KPIs) con Tailwind CSS
     */
    let { 
        titulo = '', 
        valor = 0, 
        icono = '📦', 
        colorFondo = 'bg-blue-50',
        colorTexto = 'text-blue-700',
        subtitulo = ''
    } = $props();
</script>

<div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex items-center justify-between">
    <div class="space-y-1">
        <p class="text-xs font-medium tracking-wider text-slate-500 uppercase">{titulo}</p>
        <p class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{valor}</p>
        {#if subtitulo}
            <p class="text-xs text-slate-500 font-normal">{subtitulo}</p>
        {/if}
    </div>
    <div class="w-12 h-12 rounded-xl {colorFondo} flex items-center justify-center text-xl shadow-inner">
        {icono}
    </div>
</div>
