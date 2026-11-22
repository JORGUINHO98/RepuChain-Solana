# Arquitectura de fase 2

## Alcance

Se implementa la API de operaciones iniciales, con PostgreSQL como autoridad.
Los controladores declaran rutas, permisos y validaciones; los servicios realizan
la lógica de negocio. DatabaseService administra un único cliente Prisma con
adaptador pg y pool limitado. No se añade un repositorio que solo copie métodos
de Prisma: los servicios ya contienen las transacciones y filtros de dominio.

Hay módulos Nest separados para auth, users, roles, companies, products,
categories, brands, vehicles, suppliers, warehouses, batches, inventory,
movements y audit. Health tiene liveness y readiness independientes.

## Seguridad

El contexto de empresa se obtiene de una sesión verificada, nunca del cuerpo
de una petición. Las claves foráneas compuestas incluyen companyId para evitar
relaciones cruzadas incluso cuando se escribe directamente mediante Prisma.
Las consultas filtran empresa antes de devolver registros.

Los JWT usan HS256, issuer repuchain, audience repuchain-api y caducidad de
15 minutos. La clave se genera localmente, no se incluye en Git. La sesión
absoluta dura 7 días. Los refresh tokens son 48 bytes aleatorios en base64url:
PostgreSQL solo conserva SHA-256. Su consumo se serializa por sesión, rota el
token y detecta reutilización. Reutilizar un token consumido revoca la sesión;
los clientes deberán coordinar la renovación para evitar dos refresh simultáneos.

Cada petición comprueba que usuario y sesión continúan activos y obtiene los
permisos vigentes de la base. Desactivar usuarios o cambiar su rol revoca sus
sesiones. Logout invalida inmediatamente el acceso. Las contraseñas usan scrypt
con salt aleatorio de 16 bytes, N=32768, r=8, p=1 y comparación de tiempo constante.

Los roles son predefinidos. No hay registro público de empresas, recuperación
de contraseña ni editor de permisos en esta fase. El alta inicial se hace con
el seed local; el administrador crea los demás usuarios mediante API.

Throttler limita a 120 peticiones/minuto por ruta/IP, 10 para login y 20 para
refresh. Su almacenamiento es local al proceso: antes de múltiples réplicas
deberá utilizarse un almacén compartido. No se confía en X-Forwarded-For.
Web y móvil aún no almacenan tokens. La integración web deberá usar cookies
HttpOnly/BFF y controles CSRF; móvil, almacenamiento seguro del dispositivo.

## Inventario y concurrencia

No existe un endpoint para asignar stock directamente. Los lotes se crean sin
existencias. POST /movements requiere Idempotency-Key y valida el tipo,
cantidades enteras positivas, referencias de empresa y almacenes activos.

Dentro de una transacción Serializable:
1. Buscar un movimiento previo por empresa y clave.
2. Bloquear la fila del lote.
3. Validar lote y almacenes.
4. Descontar stock con condición quantity >= cantidad.
5. Incrementar destino y comprobar límite entero.
6. Crear movimiento y auditoría.
7. Confirmar todo junto.

Se reintentan hasta cuatro intentos para conflictos serializables. La
restricción única evita duplicados. Una misma clave con otra petición produce
409. El fingerprint tiene campos normalizados en orden fijo e incluye al actor.
Su único propósito actual es idempotencia; no se usa como evidencia Solana.

Las transferencias no alteran el total de unidades del lote. No se desactiva
un almacén con existencias ni se deja una empresa sin administradores activos.
Los movimientos y la auditoría son append-only mediante triggers. Esto no
protege frente a un administrador de PostgreSQL que deshabilite los triggers:
la detección criptográfica independiente corresponde a las fases 3 y 4.

## Versiones y entorno

Se conservan las versiones de fase 1. Se añadieron @prisma/client y
@prisma/adapter-pg 7.10.1, @nestjs/jwt 12.0.5 y @nestjs/throttler 6.8.0.
Prisma genera TypeScript CommonJS en database/src/generated (ignorado por Git).
Turbo restaura también ese directorio al recuperar una compilación de su caché.

Para resolver el bloqueo Docker se instaló PostgreSQL 16.15 del repositorio
oficial de Ubuntu 24.04. Es la misma tecnología requerida, con una versión
soportada por el adaptador. Docker/CI conservan PostgreSQL 17.7 de fase 1;
las pruebas locales aquí se ejecutaron sobre 16.15. No se ha verificado CI remota.

## Fuentes consultadas

- https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators
- https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions
- https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections
- https://docs.nestjs.com/security/authentication
