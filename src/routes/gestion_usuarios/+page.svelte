<script>
    import { onMount } from 'svelte';
    import { Users, ShieldCheck, UserPlus, Power, Settings2 } from '@lucide/svelte';
    import NotificacionAlerta from '$lib/componentes/NotificacionAlerta.svelte';

    let usuarioSesion = $state(null);
    let usuarios = $state([]);
    let rolesDisponibles = [
        { id: 1, nombre: 'Administrador' },
        { id: 2, nombre: 'Vendedor' },
        { id: 3, nombre: 'Personal de Inventario' },
        { id: 4, nombre: 'Servicio Técnico' }
    ];

    let cargando = $state(true);
    let modalAbierto = $state(false);
    let modalEdicionAbierto = $state(false);
    
    let nuevoUsuario = $state({
        nombre_completo: '',
        nombre_usuario: '',
        correo_electronico: '',
        contrasena: '',
        id_rol: 2
    });

    let usuarioEditando = $state(null);
    let alerta = $state({ visible: false, tipo: 'info', mensaje: '' });

    function mostrarAlerta(tipo, mensaje) {
        alerta = { visible: true, tipo, mensaje };
        setTimeout(() => alerta.visible = false, 4000);
    }

    onMount(async () => {
        const sesionStr = localStorage.getItem('peraphone_usuario');
        if (sesionStr) {
            usuarioSesion = JSON.parse(sesionStr);
            if (!usuarioSesion.permisos?.puede_ver_todo) {
                window.location.href = '/dashboard';
            } else {
                await cargarUsuarios();
            }
        } else {
            window.location.href = '/inicio_sesion';
        }
    });

    async function cargarUsuarios() {
        cargando = true;
        try {
            const res = await fetch(`/api/usuarios?id_usuario_admin=${usuarioSesion.id_usuario}`);
            const data = await res.json();
            if (data.exito) {
                usuarios = data.datos;
            } else {
                mostrarAlerta('error', data.mensaje);
            }
        } catch (e) {
            mostrarAlerta('error', 'Error de red.');
        } finally {
            cargando = false;
        }
    }

    async function guardarNuevoUsuario(e) {
        e.preventDefault();
        try {
            const res = await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...nuevoUsuario, id_usuario_admin: usuarioSesion.id_usuario })
            });
            const data = await res.json();
            if (data.exito) {
                mostrarAlerta('exito', data.mensaje);
                modalAbierto = false;
                cargarUsuarios();
            } else {
                mostrarAlerta('error', data.mensaje);
            }
        } catch (e) {
            mostrarAlerta('error', 'Error al procesar la solicitud.');
        }
    }

    async function cambiarEstadoORol(usuario, nuevoEstado, nuevoRolId) {
        try {
            const res = await fetch('/api/usuarios', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_usuario_admin: usuarioSesion.id_usuario,
                    id_usuario: usuario.id_usuario,
                    estado: nuevoEstado,
                    id_rol: nuevoRolId
                })
            });
            const data = await res.json();
            if (data.exito) {
                mostrarAlerta('exito', data.mensaje);
                cargarUsuarios();
                modalEdicionAbierto = false;
            } else {
                mostrarAlerta('error', data.mensaje);
            }
        } catch (e) {
            mostrarAlerta('error', 'Error al actualizar usuario.');
        }
    }
</script>

<svelte:head>
    <title>Seguridad y Usuarios | Peraphone</title>
</svelte:head>

<div class="space-y-6 max-w-7xl mx-auto">
    <!-- Encabezado -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-purple-600">
        <div class="flex items-center gap-4">
            <div class="p-3 bg-purple-100 text-purple-700 rounded-xl">
                <ShieldCheck size={28} />
            </div>
            <div>
                <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Seguridad y Usuarios</h1>
                <p class="text-sm text-slate-500 mt-0.5">Control de Accesos (RBAC) y Seguridad (RN-001, RN-002)</p>
            </div>
        </div>

        <button 
            type="button"
            onclick={() => modalAbierto = true}
            class="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
        >
            <UserPlus size={18} />
            Registrar Usuario
        </button>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table class="w-full text-left border-collapse text-sm">
            <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th class="py-3 px-4">Usuario</th>
                    <th class="py-3 px-4">Rol Asignado</th>
                    <th class="py-3 px-4">Estado</th>
                    <th class="py-3 px-4 text-right">Acciones</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                {#if cargando}
                    <tr><td colspan="4" class="py-8 text-center text-slate-500">Cargando usuarios...</td></tr>
                {:else}
                    {#each usuarios as u}
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="py-3 px-4">
                                <p class="font-bold text-slate-900">{u.nombre_completo}</p>
                                <p class="text-[11px] text-slate-500">{u.correo_electronico} • @{u.nombre_usuario}</p>
                            </td>
                            <td class="py-3 px-4">
                                <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                    {u.nombre_rol}
                                </span>
                            </td>
                            <td class="py-3 px-4">
                                <span class="px-2.5 py-1 text-xs font-bold rounded-full 
                                    {u.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                                    {u.estado === 'activo' ? 'ACTIVO' : 'SUSPENDIDO'}
                                </span>
                            </td>
                            <td class="py-3 px-4 text-right">
                                <button 
                                    type="button" 
                                    onclick={() => { usuarioEditando = {...u}; modalEdicionAbierto = true; }}
                                    class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                                >
                                    <Settings2 size={16} />
                                </button>
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>

<!-- Modal Nuevo Usuario -->
{#if modalAbierto}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <h3 class="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">Registrar Usuario</h3>
            <form onsubmit={guardarNuevoUsuario} class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                    <input type="text" required bind:value={nuevoUsuario.nombre_completo} class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Username</label>
                        <input type="text" required bind:value={nuevoUsuario.nombre_usuario} class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Rol</label>
                        <select bind:value={nuevoUsuario.id_rol} class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm">
                            {#each rolesDisponibles as rol}
                                <option value={rol.id}>{rol.nombre}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                    <input type="email" required bind:value={nuevoUsuario.correo_electronico} class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Contraseña</label>
                    <input type="password" required bind:value={nuevoUsuario.contrasena} class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div class="flex justify-end gap-2 pt-3">
                    <button type="button" onclick={() => modalAbierto = false} class="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm">Cancelar</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold text-sm">Guardar Usuario</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Modal Edición Usuario -->
{#if modalEdicionAbierto && usuarioEditando}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5">
            <h3 class="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">Editar Usuario</h3>
            <p class="font-bold">{usuarioEditando.nombre_completo}</p>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Modificar Rol</label>
                    <select bind:value={usuarioEditando.id_rol} class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm">
                        {#each rolesDisponibles as rol}
                            <option value={rol.id}>{rol.nombre}</option>
                        {/each}
                    </select>
                </div>
                
                <div class="flex gap-2 pt-3 border-t border-slate-100">
                    {#if usuarioEditando.estado === 'activo'}
                        <button onclick={() => cambiarEstadoORol(usuarioEditando, 'inactivo', usuarioEditando.id_rol)} class="flex-1 py-2 rounded-xl bg-rose-100 text-rose-700 font-bold text-sm">Suspender Acceso</button>
                    {:else}
                        <button onclick={() => cambiarEstadoORol(usuarioEditando, 'activo', usuarioEditando.id_rol)} class="flex-1 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm">Restaurar Acceso</button>
                    {/if}
                    <button onclick={() => cambiarEstadoORol(usuarioEditando, usuarioEditando.estado, usuarioEditando.id_rol)} class="flex-1 py-2 rounded-xl bg-purple-600 text-white font-bold text-sm">Guardar Rol</button>
                </div>
                <button onclick={() => modalEdicionAbierto = false} class="w-full py-2 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl">Cerrar</button>
            </div>
        </div>
    </div>
{/if}

<NotificacionAlerta 
    visible={alerta.visible} 
    tipo={alerta.tipo} 
    mensaje={alerta.mensaje} 
    alCerrar={() => alerta.visible = false} 
/>
