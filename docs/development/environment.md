# Variables de entorno

pnpm setup:env copia ejemplos sin sobrescribir archivos locales. Añade las
variables nuevas que faltan y sustituye placeholders REPLACE_ por secretos
aleatorios. No muestra sus valores. Los .env se excluyen de Git.

| Archivo | Variable | Uso |
| --- | --- | --- |
| .env | POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT | PostgreSQL vía Docker |
| database/.env | DATABASE_URL | Conexión de Prisma y scripts |
| database/.env | SEED_ADMIN_EMAIL | Email del administrador demo |
| database/.env | SEED_ADMIN_PASSWORD | Contraseña inicial; el seed no la reemplaza |
| apps/api/.env | DATABASE_URL | Conexión de la API |
| apps/api/.env | JWT_SECRET | Secreto HS256 de al menos 64 caracteres; generado localmente |
| apps/api/.env | NODE_ENV | development, test o production |
| apps/api/.env | HOST, PORT | Dirección y puerto; 127.0.0.1:4000 por defecto |
| apps/api/.env | WEB_ORIGIN | Origen permitido por CORS |
| apps/web/.env | NEXT_PUBLIC_API_URL | API pública, incluye /api/v1 |
| apps/mobile/.env | EXPO_PUBLIC_API_URL | API accesible desde el dispositivo |
| .env.test | TEST_DATABASE_URL | Base dedicada con nombre terminado en _test |

Si se cambia el usuario, contraseña, host o puerto PostgreSQL, sincronizar
database/.env y apps/api/.env. La configuración Docker no cambia el usuario
PostgreSQL instalado de forma nativa.

Las variables NEXT_PUBLIC_* y EXPO_PUBLIC_* se incluyen en el bundle: no deben
contener secretos. El test de integración genera su propio JWT_SECRET temporal.
No hay PROGRAM_ID ni claves privadas Solana en el backend.

## Worker blockchain (Fase 4)

Estas variables pertenecen al proceso worker, no al navegador ni a Expo:

- BLOCKCHAIN_COMPANY_ID: UUID de la empresa autorizada para este proceso.
- BLOCKCHAIN_SIGNER_PATH: ruta del archivo de clave de servicio, con permisos 600.
- BLOCKCHAIN_RPC_URL: HTTPS de Devnet; por defecto https://api.devnet.solana.com.
- BLOCKCHAIN_NETWORK: devnet por defecto; localnet solo para NODE_ENV=test.
- DATABASE_URL: conexión PostgreSQL; también se lee de database/.env.

El programa está fijado a la dirección publicada en fase 3. El worker comprueba
la red por genesis hash. No lee claves de MetaMask ni incluye claves en la API.