-- ==============================================================================
-- SISTEMA DE GESTION DE INVENTARIOS "PERAPHONE"
-- Propietario: Luis Baldivieso | Desarrollador Principal: Alejandro Paucara
-- Base de Datos Relacional para MySQL / XAMPP (phpMyAdmin)
-- Motor: InnoDB | Codificación: utf8mb4_unicode_ci
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `peraphone_db`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `peraphone_db`;

-- Desactivar temporalmente revisión de llaves foráneas para reinicio limpio
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `logs_auditoria`;
DROP TABLE IF EXISTS `evaluaciones_tecnicas`;
DROP TABLE IF EXISTS `devoluciones`;
DROP TABLE IF EXISTS `ventas`;
DROP TABLE IF EXISTS `movimientos`;
DROP TABLE IF EXISTS `celulares`;
DROP TABLE IF EXISTS `lotes`;
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 1. TABLA: roles (RN-002)
-- ==============================================================================
CREATE TABLE `roles` (
    `id_rol` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre_rol` VARCHAR(50) NOT NULL UNIQUE,
    `descripcion` VARCHAR(255) NOT NULL,
    `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 2. TABLA: usuarios (RN-001, RN-002)
-- ==============================================================================
CREATE TABLE `usuarios` (
    `id_usuario` INT AUTO_INCREMENT PRIMARY KEY,
    `id_rol` INT NOT NULL,
    `nombre_completo` VARCHAR(100) NOT NULL,
    `nombre_usuario` VARCHAR(50) NOT NULL UNIQUE,
    `correo_electronico` VARCHAR(100) NOT NULL UNIQUE,
    `contrasena_hash` VARCHAR(255) NOT NULL,
    `estado` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`id_rol`) 
        REFERENCES `roles` (`id_rol`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 3. TABLA: lotes (RN-004)
-- ==============================================================================
CREATE TABLE `lotes` (
    `id_lote` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo_lote` VARCHAR(50) NOT NULL UNIQUE,
    `descripcion` VARCHAR(255) NOT NULL,
    `proveedor` VARCHAR(100) NOT NULL,
    `fecha_recepcion` DATE NOT NULL,
    `estado_lote` ENUM('abierto', 'cerrado') NOT NULL DEFAULT 'abierto',
    `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 4. TABLA: celulares (RN-003, RN-004, RN-006, RN-008)
-- ==============================================================================
CREATE TABLE `celulares` (
    `id_celular` INT AUTO_INCREMENT PRIMARY KEY,
    `id_lote` INT NULL,
    `numero_imei` VARCHAR(15) NOT NULL UNIQUE,
    `marca` VARCHAR(50) NOT NULL,
    `modelo` VARCHAR(50) NOT NULL,
    `color` VARCHAR(30) NOT NULL DEFAULT 'Negro',
    `capacidad_almacenamiento` VARCHAR(20) NOT NULL DEFAULT '128GB',
    `estado_equipo` ENUM(
        'pendiente_recepcion',
        'disponible',
        'vendido',
        'en_revision',
        'en_reparacion',
        'desechado'
    ) NOT NULL DEFAULT 'disponible',
    `precio_costo` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `precio_venta` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `fecha_ingreso` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_celular_lote` FOREIGN KEY (`id_lote`) 
        REFERENCES `lotes` (`id_lote`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices de alto rendimiento para búsquedas en inventario
CREATE INDEX `idx_celular_estado` ON `celulares` (`estado_equipo`);
CREATE INDEX `idx_celular_marca_modelo` ON `celulares` (`marca`, `modelo`);

-- ==============================================================================
-- 5. TABLA: movimientos (RN-005, RN-009) - Trazabilidad Inmutable
-- ==============================================================================
CREATE TABLE `movimientos` (
    `id_movimiento` INT AUTO_INCREMENT PRIMARY KEY,
    `id_celular` INT NOT NULL,
    `tipo_movimiento` ENUM('ENTRADA', 'SALIDA', 'TRASLADO', 'AJUSTE') NOT NULL,
    `motivo` VARCHAR(255) NOT NULL,
    `fecha_hora` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `id_usuario_responsable` INT NOT NULL,
    `ubicacion_origen` VARCHAR(100) NULL,
    `ubicacion_destino` VARCHAR(100) NULL,
    `es_automatico` BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT `fk_movimiento_celular` FOREIGN KEY (`id_celular`) 
        REFERENCES `celulares` (`id_celular`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_movimiento_usuario` FOREIGN KEY (`id_usuario_responsable`) 
        REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_movimiento_celular` ON `movimientos` (`id_celular`, `fecha_hora`);

-- ==============================================================================
-- 6. TABLA: ventas (RN-006)
-- ==============================================================================
CREATE TABLE `ventas` (
    `id_venta` INT AUTO_INCREMENT PRIMARY KEY,
    `id_celular` INT NULL,
    `id_usuario_vendedor` INT NOT NULL,
    `nombre_cliente` VARCHAR(100) NOT NULL,
    `documento_cliente` VARCHAR(30) NOT NULL,
    `precio_venta_final` DECIMAL(10,2) NOT NULL,
    `es_preventa` BOOLEAN NOT NULL DEFAULT FALSE,
    `fecha_venta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `observaciones` TEXT NULL,
    CONSTRAINT `fk_venta_celular` FOREIGN KEY (`id_celular`) 
        REFERENCES `celulares` (`id_celular`) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT `fk_venta_vendedor` FOREIGN KEY (`id_usuario_vendedor`) 
        REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 7. TABLA: devoluciones (RN-007)
-- ==============================================================================
CREATE TABLE `devoluciones` (
    `id_devolucion` INT AUTO_INCREMENT PRIMARY KEY,
    `id_celular` INT NOT NULL,
    `id_usuario_receptor` INT NOT NULL,
    `nombre_cliente` VARCHAR(100) NOT NULL,
    `contacto_cliente` VARCHAR(50) NOT NULL,
    `motivo_devolucion` TEXT NOT NULL,
    `fecha_devolucion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `estado_resolucion` ENUM('pendiente_evaluacion', 'resuelto') NOT NULL DEFAULT 'pendiente_evaluacion',
    CONSTRAINT `fk_devolucion_celular` FOREIGN KEY (`id_celular`) 
        REFERENCES `celulares` (`id_celular`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_devolucion_receptor` FOREIGN KEY (`id_usuario_receptor`) 
        REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 8. TABLA: evaluaciones_tecnicas (RN-008)
-- ==============================================================================
CREATE TABLE `evaluaciones_tecnicas` (
    `id_evaluacion` INT AUTO_INCREMENT PRIMARY KEY,
    `id_devolucion` INT NULL,
    `id_celular` INT NOT NULL,
    `id_usuario_tecnico` INT NOT NULL,
    `dictamen_final` ENUM('disponible', 'en_reparacion', 'desechado') NOT NULL,
    `diagnostico_detallado` TEXT NOT NULL,
    `fecha_evaluacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_evaluacion_devolucion` FOREIGN KEY (`id_devolucion`) 
        REFERENCES `devoluciones` (`id_devolucion`) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT `fk_evaluacion_celular` FOREIGN KEY (`id_celular`) 
        REFERENCES `celulares` (`id_celular`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_evaluacion_tecnico` FOREIGN KEY (`id_usuario_tecnico`) 
        REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 9. TABLA: logs_auditoria (RN-009)
-- ==============================================================================
CREATE TABLE `logs_auditoria` (
    `id_log` INT AUTO_INCREMENT PRIMARY KEY,
    `id_usuario_admin` INT NOT NULL,
    `accion` VARCHAR(50) NOT NULL,
    `tabla_afectada` VARCHAR(50) NOT NULL,
    `id_registro_afectado` INT NOT NULL,
    `valores_anteriores` JSON NULL,
    `valores_nuevos` JSON NULL,
    `motivo_correccion` TEXT NOT NULL,
    `fecha_hora` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_auditoria_admin` FOREIGN KEY (`id_usuario_admin`) 
        REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- DATOS SEMILLA (ROLES, USUARIOS INICIALES Y CATÁLOGO DE PRUEBA)
-- ==============================================================================

-- Roles oficiales requeridos (RN-002)
INSERT INTO `roles` (`id_rol`, `nombre_rol`, `descripcion`) VALUES
(1, 'Administrador', 'Acceso total y autorización de correcciones de auditoría'),
(2, 'Vendedor', 'Gestión de ventas, preventas y consulta de stock disponible'),
(3, 'Personal de Inventario', 'Recepción de lotes, registro de equipos y control de almacén'),
(4, 'Servicio Técnico', 'Diagnóstico y dictamen de equipos en revisión o retorno');

-- Usuarios iniciales (Contraseñas iniciales encriptadas con SHA-256: "admin123", "vendedor123", "inventario123", "tecnico123")
INSERT INTO `usuarios` (`id_usuario`, `id_rol`, `nombre_completo`, `nombre_usuario`, `correo_electronico`, `contrasena_hash`, `estado`) VALUES
(1, 1, 'Luis Baldivieso (Admin)', 'admin', 'luis.baldivieso@peraphone.com', SHA2('admin123', 256), 'activo'),
(2, 1, 'Alejandro Paucara (Lead Dev)', 'alejandro', 'alejandro.paucara@peraphone.com', SHA2('admin123', 256), 'activo'),
(3, 2, 'Carlos Mendoza', 'carlos.vendedor', 'carlos.mendoza@peraphone.com', SHA2('vendedor123', 256), 'activo'),
(4, 3, 'Mariana Rojas', 'mariana.inventario', 'mariana.rojas@peraphone.com', SHA2('inventario123', 256), 'activo'),
(5, 4, 'Jorge Gutierrez', 'jorge.tecnico', 'jorge.tecnico@peraphone.com', SHA2('tecnico123', 256), 'activo');

-- Lotes iniciales para demostración (RN-004)
INSERT INTO `lotes` (`id_lote`, `codigo_lote`, `descripcion`, `proveedor`, `fecha_recepcion`, `estado_lote`) VALUES
(1, 'LOTE-2024-001', 'Lote Importación Xiaomi Redmi & Poco', 'Xiaomi Global Corp', '2024-09-01', 'cerrado'),
(2, 'LOTE-2024-002', 'Lote Gama Alta Samsung & Apple', 'Distribuidores Unidos S.A.', '2024-09-15', 'abierto');

-- Celulares iniciales con variedad de estados (RN-003, RN-004)
INSERT INTO `celulares` (`id_celular`, `id_lote`, `numero_imei`, `marca`, `modelo`, `color`, `capacidad_almacenamiento`, `estado_equipo`, `precio_costo`, `precio_venta`) VALUES
(1, 1, '863245041234567', 'Xiaomi', 'Redmi Note 13 Pro', 'Azul Océano', '256GB', 'disponible', 180.00, 249.99),
(2, 1, '863245041234568', 'Xiaomi', 'Poco X6 Pro', 'Amarillo', '512GB', 'disponible', 240.00, 319.99),
(3, 2, '359874109876543', 'Samsung', 'Galaxy S24 Ultra', 'Titanio Gris', '256GB', 'disponible', 750.00, 999.99),
(4, 2, '359874109876544', 'Samsung', 'Galaxy A55 5G', 'Azul Hielo', '128GB', 'en_revision', 210.00, 299.99),
(5, NULL, '352147098123456', 'Apple', 'iPhone 15 Pro Max', 'Titanio Natural', '256GB', 'disponible', 900.00, 1199.99),
(6, NULL, '352147098123457', 'Motorola', 'Edge 50 Ultra', 'Negro', '512GB', 'en_reparacion', 450.00, 599.99),
(7, 1, '863245041234569', 'Xiaomi', 'Redmi 13C', 'Verde Trébol', '128GB', 'vendido', 95.00, 139.99);

-- Movimientos automáticos iniciales correspondientes a los equipos registrados (RN-005)
INSERT INTO `movimientos` (`id_celular`, `tipo_movimiento`, `motivo`, `id_usuario_responsable`, `ubicacion_origen`, `ubicacion_destino`, `es_automatico`) VALUES
(1, 'ENTRADA', 'RECEPCION_INICIAL_LOTE_1', 4, 'Proveedor', 'Almacén Central', TRUE),
(2, 'ENTRADA', 'RECEPCION_INICIAL_LOTE_1', 4, 'Proveedor', 'Almacén Central', TRUE),
(3, 'ENTRADA', 'RECEPCION_INICIAL_LOTE_2', 4, 'Proveedor', 'Almacén Central', TRUE),
(4, 'ENTRADA', 'RECEPCION_INICIAL_LOTE_2', 4, 'Proveedor', 'Almacén Central', TRUE),
(4, 'TRASLADO', 'DEVOLUCION_CLIENTE_A_REVISION', 3, 'Tienda Peraphone', 'Taller Servicio Técnico', TRUE),
(5, 'ENTRADA', 'RECEPCION_INDIVIDUAL_DIRECTA', 4, 'Proveedor Directo', 'Vitrina Principal', TRUE),
(6, 'ENTRADA', 'RECEPCION_INDIVIDUAL_DIRECTA', 4, 'Proveedor Directo', 'Taller Servicio Técnico', TRUE),
(7, 'ENTRADA', 'RECEPCION_INICIAL_LOTE_1', 4, 'Proveedor', 'Almacén Central', TRUE),
(7, 'SALIDA', 'VENTA_MOSTRADOR_FACTURA_001', 3, 'Vitrina Principal', 'Cliente Final', TRUE);

-- Registro de la devolución del celular #4 (RN-007)
INSERT INTO `devoluciones` (`id_devolucion`, `id_celular`, `id_usuario_receptor`, `nombre_cliente`, `contacto_cliente`, `motivo_devolucion`, `estado_resolucion`) VALUES
(1, 4, 3, 'Fernando Morales', '+591 71234567', 'El altavoz emite un leve zumbido al subir volumen al 100%', 'pendiente_evaluacion');

-- Registro de la venta del celular #7 (RN-006)
INSERT INTO `ventas` (`id_venta`, `id_celular`, `id_usuario_vendedor`, `nombre_cliente`, `documento_cliente`, `precio_venta_final`, `es_preventa`, `observaciones`) VALUES
(1, 7, 3, 'Valeria Gomez', 'CI-8492014', 139.99, FALSE, 'Venta al contado en tienda física');
