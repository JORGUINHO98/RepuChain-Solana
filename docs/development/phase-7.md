# Fase 7 · Entrega y despliegue

## Resultados locales
El 22 de noviembre de 2026 pasaron:
- pnpm check: tipos, 25 pruebas, validación Prisma y compilación web/API/móvil.
- pnpm test:integration: 44 pruebas HTTP.
- pnpm blockchain:test: 20 pruebas Rust y vectores independientes SHA-256.
- pnpm test:blockchain:integration: 3 pruebas con validador local y firmas reales.
- pnpm smoke: API y Next de producción en puertos libres, CORS, rutas, cookie HttpOnly, origen y revocación.
- pnpm mobile:check y pnpm db:check.

Total: 92 pruebas enumeradas, además de las comprobaciones de arranque y configuración. Android físico queda aplazado por el usuario. No hay prueba visual completa ni ensayo de carga. No se afirma auditoría independiente ni publicación.

## Cambios
El smoke test conservaba textos de fase 1. Se actualizó para el panel vigente y ahora arranca la web conectada a su propia API de prueba y ejecuta test-web-session.mjs. Los procesos se cierran al finalizar.
CI prepara la cuenta demo mediante db:seed antes del smoke. El workflow está configurado; no se ha ejecutado en GitHub.
scripts/verify-release.mjs permite repetir las verificaciones y guarda un informe JSON sin secretos en reports/release-check.json. Se detiene en el primer error.

## Repetir
Desde WSL, preparar PostgreSQL y los archivos locales mediante setup:env, db:migrate, db:seed y db:test:init. Ejecutar:
    node scripts/verify-release.mjs --blockchain

Omitir --blockchain para no requerir Rust/Anchor/Solana. Se necesita instalar primero con pnpm install --frozen-lockfile. El informe no sustituye la prueba física.

## GitHub
Repositorio público: https://github.com/JORGUINHO98/RepuChain-Solana. Código y documentación subidos a main.
Revisar los archivos antes del primer commit. .env, blockchain/.keys, archivos keypair, dependencias y compilados están excluidos. Nunca incluir claves privadas ni contraseñas.
Subir el monorepo completo, incluido pnpm-lock.yaml y los paquetes compartidos; no subir únicamente apps/web.
El workflow de GitHub valida la aplicación y PostgreSQL. Las pruebas Solana se ejecutan con el comando local separado.

## Vercel: web
Se agregó apps/web/vercel.json para construir solamente la web y sus dependencias.
Al importar el repositorio:
1. Seleccionar Next.js y Root Directory: apps/web.
2. Habilitar acceso a archivos fuera del directorio raíz para los paquetes compartidos.
3. Usar Node 24 compatible con el proyecto y pnpm fijado en package.json.
4. Configurar API_INTERNAL_URL con la URL HTTPS alcanzable de Nest, terminando en /api/v1.
5. Separar entornos Preview y Production y desplegar.
6. Comprobar inicio/cierre de sesión, consultas, origen de las peticiones y permisos en la URL publicada.

La configuración se preparó y su comando se validó localmente; falta validarla en Vercel. No usar localhost como API de una web publicada.
Referencias: https://vercel.com/docs/monorepos y https://vercel.com/docs/environment-variables.

## API, base y worker
La aplicación actual usa Nest como proceso persistente y un worker continuo por empresa. Este despliegue propone alojarlos en un servidor o servicio de procesos, junto a PostgreSQL administrado o propio. Subir la web a Vercel no aloja automáticamente estos servicios. No se ha adaptado el worker a funciones bajo demanda.

API: DATABASE_URL, JWT_SECRET, NODE_ENV, HOST, PORT, WEB_ORIGIN.
Web: API_INTERNAL_URL.
Móvil: EXPO_PUBLIC_API_URL con HTTPS antes de construir.
Worker: DATABASE_URL, BLOCKCHAIN_COMPANY_ID, BLOCKCHAIN_SIGNER_PATH, BLOCKCHAIN_NETWORK=devnet, BLOCKCHAIN_RPC_URL.

Antes de migrar: respaldar PostgreSQL y probar restauración en una base separada. Instalar con lockfile, compilar, aplicar db:migrate y arrancar API/web bajo supervisión. No ejecutar el seed demo en producción. Usar credenciales propias.
El firmante técnico del worker debe estar fuera del repositorio con permisos 600. No usar una clave personal.
Comprobar /api/v1/health/ready, autenticación y una operación antes de arrancar el worker. Supervisar errores y evidencias pendientes/fallidas.

Ante un fallo, no borrar historial ni revertir migraciones destructivamente. Revertir la aplicación solo si la versión anterior es compatible con el esquema. Una restauración debe contemplar las evidencias ya registradas en Solana.

## Demostración y límites
En una empresa de prueba: crear repuesto/lote, registrar compra y venta, comprobar existencias, rechazar salida superior al stock, consultar evidencia y descargar QR; mostrar restricciones de VIEWER.
Las confirmaciones se presentan únicamente cuando el worker las verifica.
No se enviaron fondos ni transacciones nuevas a Devnet en esta fase.
No hay APK, publicación en tiendas, facturación fiscal, devoluciones ni garantías. Esas funciones del objetivo general permanecen fuera de la implementación actual.
Falta definir el alojamiento de API/base/worker y publicar la web.
