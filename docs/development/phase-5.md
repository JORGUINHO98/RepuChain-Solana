# Fase 5 · Panel web y operaciones comerciales

Implementación local sobre Next.js y la API Nest existente. No se publicó un servicio externo.

## Pantallas

- Inicio de sesión por empresa, correo y contraseña.
- Dashboard: referencias activas, unidades, lotes, estados de evidencia, entradas y salidas de siete días UTC, distribución por almacén, últimos movimientos y alertas de stock mínimo.
- Catálogo: altas y edición de repuestos, precios, mínimos, categorías, marcas y compatibilidad vehicular.
- Inventario por lote y almacén, recepción de lotes, entradas, salidas y transferencias.
- Compras y ventas: documentos de hasta 20 lotes, cantidades y precios por línea, total decimal exacto, detalle del registro.
- Trazabilidad: estados reales de la cola, detalle del contenido, hashes y firma. Enlace a Explorer solo para transacciones confirmadas en Devnet. Reintento de evidencias fallidas reservado a administración.
- Proveedores, almacenes, categorías, marcas, vehículos, equipo y auditoría.
- Navegación por permisos, tablas paginadas, búsqueda donde la API la admite, estados de carga y error.
- CSS adaptable a pantallas pequeñas, menú lateral móvil y formularios en diálogo nativo.

## Documentos comerciales

POST /api/v1/purchases y POST /api/v1/sales requieren Idempotency-Key UUID. La misma clave con el mismo contenido devuelve el documento registrado; un contenido distinto produce conflicto.

La transacción serializable registra documento, líneas, movimientos, stock, auditoría y evidencias. Si cualquier línea falla, toda la operación se revierte. No permite stock negativo ni lotes repetidos. La compra valida proveedor y almacén activos de la empresa; un lote con proveedor asignado debe coincidir.

Los documentos y sus líneas son históricos e inmutables. Son registros internos; no implementan facturación fiscal, impuestos, descuentos, cuentas por cobrar, devoluciones ni anulaciones. Los importes usan la moneda configurada en la empresa; no hay conversión de divisas.

La migración 202611210002_trade_documents agrega las tablas, relaciones por empresa, restricciones, protección del historial y permisos purchases/sales. ADMIN y MANAGER pueden registrar; OPERATOR y VIEWER solo consultan.

## Sesión web

El navegador usa /api/session y /api/backend/* de Next. El servidor transmite el JWT a la API. La cookie repuchain_access es HttpOnly y SameSite=Strict, con Secure cuando la petición usa HTTPS. El token no se devuelve al JavaScript cliente ni se guarda en localStorage.

Las escrituras verifican Origin frente al Host recibido y el protocolo de la petición. El proxy limita recursos, métodos y segmentos de ruta. Las respuestas de API no se almacenan en caché. Un cierre normal revoca la sesión en la API; si no hay conexión, se elimina la cookie local.

La sesión dura 15 minutos. El frontend pide iniciar sesión de nuevo al vencer; todavía no renueva automáticamente. API_INTERNAL_URL configura la dirección privada de la API, por defecto http://127.0.0.1:4000/api/v1.

Los formularios comerciales y de movimientos conservan el contenido y la clave de idempotencia durante un reintento de conexión en el mismo diálogo. Cerrar el diálogo o recargar la página pierde esa clave: debe revisarse el historial antes de repetir. Las altas de catálogo no tienen la garantía transaccional de idempotencia de documentos y movimientos.

## Ejecución y comprobaciones

En WSL, desde /home/user23/projects/repu-chain:

```bash
source ~/.nvm/nvm.sh
pnpm db:migrate
pnpm dev
```

Abrir http://127.0.0.1:3000. La empresa inicial es demo. El usuario y la contraseña locales están en database/.env como SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD; no se incluyen credenciales en el código ni en este documento.

```bash
pnpm check
pnpm test:integration
# Con API y web iniciadas, usando la empresa demo:
pnpm test:web
```

Resultados de esta implementación:
- pnpm check: tipos, 12 pruebas unitarias, validación Prisma y compilación de todos los paquetes correctos. La exportación móvil existente también compila; esto no implementa la fase 6.
- pnpm test:integration: 40 pruebas HTTP correctas sobre PostgreSQL de pruebas; 10 son nuevas de fase 5.
- pnpm test:web: cookie HttpOnly, rechazo de origen ajeno, acceso autenticado, rutas web, bloqueo de recursos no permitidos y revocación de sesión comprobados.
- La migración se aplicó a las bases de desarrollo y pruebas.
- El navegador integrado falló al iniciar su entorno de ejecución. No se afirma revisión visual, prueba interactiva de formularios ni comprobación visual móvil.
- No se volvió a desplegar el programa ni se enviaron fondos o transacciones a Solana en esta fase. El worker de fase 4 debe estar activo para procesar evidencias; pendientes no equivale a confirmadas.

Las pruebas HTTP usan empresas nuevas y mantienen su historial. test:web abre y cierra una sesión de demo sin imprimir contraseñas ni tokens y sin crear documentos comerciales.
