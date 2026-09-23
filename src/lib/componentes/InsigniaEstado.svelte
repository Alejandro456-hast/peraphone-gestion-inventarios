<script>
    /**
     * Componente InsigniaEstado
     * Muestra una etiqueta cromática según el estado del celular (RN-003, RN-006, RN-008)
     */
    let { estado = 'disponible' } = $props();

    const configuracionEstados = {
        disponible: {
            texto: 'Disponible',
            clases: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
            punto: 'bg-emerald-500'
        },
        en_revision: {
            texto: 'En Revisión (Retorno)',
            clases: 'bg-amber-50 text-amber-800 border-amber-200 ring-amber-500/20',
            punto: 'bg-amber-500'
        },
        en_reparacion: {
            texto: 'En Reparación',
            clases: 'bg-orange-50 text-orange-800 border-orange-200 ring-orange-500/20',
            punto: 'bg-orange-500'
        },
        vendido: {
            texto: 'Vendido',
            clases: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
            punto: 'bg-blue-500'
        },
        pendiente_recepcion: {
            texto: 'Pendiente Recepción',
            clases: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/20',
            punto: 'bg-purple-500'
        },
        desechado: {
            texto: 'Desechado (Baja)',
            clases: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
            punto: 'bg-rose-500'
        }
    };

    let datosEstado = $derived(
        configuracionEstados[estado] || {
            texto: estado,
            clases: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/20',
            punto: 'bg-slate-500'
        }
    );
</script>

<span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ring-1 ring-inset shadow-xs {datosEstado.clases}">
    <span class="w-1.5 h-1.5 rounded-full {datosEstado.punto}"></span>
    {datosEstado.texto}
</span>
