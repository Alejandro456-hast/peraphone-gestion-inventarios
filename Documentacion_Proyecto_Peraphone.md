# MANUAL TÉCNICO Y OPERATIVO DEL SISTEMA "PERAPHONE"
**Sistema Empresarial de Gestión de Inventarios y Trazabilidad**
**Propietario:** Luis Baldivieso | **Desarrollador Principal:** Alejandro Paucara

---

## 1. INTRODUCCIÓN Y OBJETIVO DEL PROYECTO
El sistema "Peraphone" es una plataforma web Full-Stack diseñada para gestionar el ciclo de vida completo de los equipos celulares en una empresa. Su objetivo principal es erradicar el descontrol en los inventarios mediante un sistema de **trazabilidad inmutable**. Desde que un celular entra en un lote desde el proveedor, hasta que se vende, se devuelve o entra a servicio técnico, el sistema registra quién, cuándo y por qué se movió el equipo.

## 2. ARQUITECTURA Y TECNOLOGÍAS UTILIZADAS
El proyecto fue desarrollado utilizando un stack tecnológico moderno, rápido y escalable:
* **Frontend y Backend (Full-Stack):** Desarrollado con **SvelteKit** (usando Svelte 5 y su sistema reactivo de Runes). Esto permite que la interfaz y el servidor vivan en el mismo proyecto, logrando tiempos de respuesta casi instantáneos.
* **Diseño UI/UX:** Construido con **Tailwind CSS v4**, implementando un diseño moderno, responsivo (adaptable a celulares y computadoras) y con soporte nativo para Modo Oscuro (Dark Mode).
* **Base de Datos:** **MySQL** relacional, estructurada bajo la 3ra Forma Normal para evitar redundancias y proteger la integridad de los datos financieros y de stock.
* **Generación de Documentos:** Uso de librerías para la emisión de recibos y facturas en formato PDF al momento de la venta.

---

## 3. MÓDULOS DEL SISTEMA Y SU FUNCIONAMIENTO

### 3.1. Módulo de Autenticación y Seguridad (Roles)
El sistema cuenta con un control de acceso estricto basado en cuatro roles principales:
* **Administrador:** Acceso total al sistema, estadísticas financieras y auditoría.
* **Personal de Inventario:** Capaz de registrar nuevos lotes, ingresar celulares y ver el stock. No puede realizar ventas.
* **Vendedor:** Tiene acceso al Punto de Venta (POS). Puede vender equipos, ver el historial de sus ventas e imprimir recibos.
* **Servicio Técnico:** Solo puede acceder al Laboratorio Técnico para revisar equipos defectuosos y emitir dictámenes.

### 3.2. Módulo de Dashboard y Analíticas
Al iniciar sesión, el usuario es recibido por un panel de control interactivo que muestra:
* **Tarjetas de Resumen:** Total de ventas, stock actual, equipos en revisión y lotes activos.
* **Alertas Inteligentes:** Un sistema de advertencias (color amarillo/rojo) que notifica si el stock de una marca o modelo específico está bajando de un límite seguro, previniendo el desabastecimiento.
* **Gráficos Visuales:** Estadísticas de rendimiento generadas dinámicamente con los datos de la base de datos.

### 3.3. Módulo de Gestión de Inventario y Lotes
Este es el corazón del sistema, donde se soluciona el problema de la entrada masiva de mercancía:
* **Agrupación Visual:** La interfaz agrupa los miles de celulares en "Lotes" (estilo acordeón). El usuario no ve una lista interminable y desordenada; ve el lote "Cajas de Xiaomi" y al hacer clic, se despliegan los equipos que lo componen.
* **Automatización de IMEIs:** Cuando el encargado de inventario recibe, por ejemplo, 50 celulares de un mismo modelo, ya no tiene que registrarlos uno por uno. El sistema tiene un campo "Cantidad". Al poner "50", el backend genera automáticamente 50 registros individuales con números IMEI únicos de 15 dígitos (empezando en "86"), ahorrando horas de trabajo manual.

### 3.4. Módulo de Punto de Venta (POS)
Diseñado para que la venta en mostrador sea rápida y a prueba de errores:
* **Búsqueda por IMEI o Modelo:** El vendedor escanea o teclea el equipo. Si el celular ya fue vendido, el sistema bloquea la venta inmediatamente y lanza una alerta roja, impidiendo ventas duplicadas.
* **Recibo PDF Automático:** Al concretar la venta (registrando los datos y el CI del cliente), el celular pasa de estado `disponible` a `vendido`, y el sistema descarga automáticamente una nota de entrega profesional en formato PDF con el logo de Peraphone.

### 3.5. Módulo de Laboratorio Técnico y Devoluciones
Si un cliente devuelve un equipo por garantía:
* Se registra la devolución y el celular cambia su estado a `en_revision`.
* El equipo aparece en la pantalla del "Técnico", quien realiza el diagnóstico.
* Tras revisar, el técnico emite un "Dictamen". Si lo arregla, el equipo vuelve al inventario como `disponible`; si no tiene arreglo, pasa a `desechado`.

### 3.6. Módulo de Historial y Auditoría (Trazabilidad)
Cada vez que ocurre CUALQUIER acción en el sistema (una venta, un ingreso, una reparación), se guarda un registro inmutable y automático en la tabla de **movimientos**. 
El administrador puede entrar a la pestaña "Historial" y ver exactamente la línea de tiempo de un celular: "Ingresó el Lunes por Carlos -> Se vendió el Martes por Luis -> Entró a garantía el Jueves". Esto evita robos, pérdidas de inventario o modificaciones fraudulentas.

---

## 4. CUMPLIMIENTO DE LAS REGLAS DE NEGOCIO (RN)
El sistema fue construido cumpliendo a cabalidad las 9 Reglas de Negocio exigidas por el propietario:

* **RN-001 (Autenticación Obligatoria):** Nadie puede ver ninguna ruta ni realizar operaciones sin iniciar sesión y sin que su token sea validado en el servidor.
* **RN-002 (Control de Acceso Basado en Roles):** Se bloquean las funciones según el usuario. Un técnico no puede hacer ventas. Un vendedor no puede auditar el inventario.
* **RN-003 (Estados Mutuamente Excluyentes):** Un celular no puede estar `vendido` y `disponible` al mismo tiempo. El código garantiza la transición estricta de estados.
* **RN-004 (Trazabilidad desde el Lote):** Todo equipo nuevo debe obligatoriamente pertenecer a un lote o proveedor, garantizando el seguimiento del origen de la mercancía.
* **RN-005 (Registro Inmutable):** Las tablas de historial de movimientos no tienen opción de edición ni borrado en la interfaz. Lo que sucede, queda registrado de forma permanente.
* **RN-006 (Proceso de Venta Condicionado):** El sistema bloquea en el backend cualquier intento de vender un celular cuyo estado no sea `disponible`.
* **RN-007 (Devoluciones con Cambio de Estado):** Al registrar una queja/devolución, el celular sale del mostrador y su ubicación cambia automáticamente a "Taller".
* **RN-008 (Laboratorio Técnico Restringido):** Solo el personal de Servicio Técnico puede aprobar el cambio de estado de un equipo defectuoso.
* **RN-009 (Auditoría Administrativa):** Las correcciones manuales de inventario (por mermas o robos) exigen registrar un "motivo" y quedan grabadas a nombre del administrador que lo autorizó.

---

## 5. CONCLUSIÓN
Peraphone es un sistema robusto y completo que moderniza la gestión de la empresa. Al automatizar la creación de lotes, obligar a que todo equipo pase por estados estrictos, y proteger las rutas mediante roles, la empresa se asegura de tener un inventario 100% confiable, una atención al cliente ágil mediante PDFs instantáneos, y cero pérdidas económicas por descontrol de almacén.
