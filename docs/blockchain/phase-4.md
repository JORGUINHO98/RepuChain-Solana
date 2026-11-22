# Integración blockchain — Fase 4

## Flujo de datos

La API escribe el lote o movimiento, la auditoría y su evidencia Outbox en la
misma transacción PostgreSQL. Si falla cualquiera, todo se revierte. Las
peticiones de inventario no esperan a Solana y nunca afirman que una evidencia
pendiente esté confirmada.

Un worker separado procesa una empresa seleccionada por configuración. La API
no carga claves privadas. El worker utiliza un firmante de servicio: el usuario
de negocio queda identificado dentro del payload, pero no firma con su wallet.
Las transferencias entre almacenes se anclan como record_movement; no son
transferencias de custodia entre wallets. El cliente exporta también las
instrucciones de custodia y administración para integraciones posteriores.

## Contrato de hashes

Formato canónico propio, versión 1: objetos con claves ordenadas por unidades
UTF-16, arrays en su orden original, strings exactos codificados como JSON y
UTF-8, booleanos, null y enteros seguros de JavaScript. Se rechazan undefined,
números fraccionarios, NaN, infinito, -0 y objetos ajenos a JSON. Las fechas se
guardan como strings UTC ISO-8601. No se normaliza Unicode ni se transforma
el texto después de generar la evidencia. No se presenta como RFC 8785.

La recepción contiene domain REPUCHAIN_BATCH_RECEIPT, version 1, companyId,
batchId, productId, supplierId, code, receivedAt y createdAt.

El movimiento contiene domain REPUCHAIN_INVENTORY_MOVEMENT, version 1,
companyId, batchId, eventId, actorId, type, quantity, sourceWarehouseId,
destinationWarehouseId, reason y createdAt.

payloadHash es SHA-256 del JSON canónico. El programa Anchor calcula después
receiptHash o evidenceHash con el formato binario de fase 3. Estos hashes son
distintos del requestHash usado exclusivamente para idempotencia HTTP.
Solo hashes e identificadores se envían a Solana; el texto comercial queda
en PostgreSQL. La confirmación de un hash no prueba la autenticidad física.

## Persistencia y recuperación

- evidence_outbox: payload inmutable, secuencia por lote, estado e intentos.
- evidence_transactions: bytes firmados, firma y vencimiento, guardados antes
  de enviar. Los intentos permanecen disponibles para reconciliación.
- blockchain_bindings: empresa, red, programa y autoridad fijados al iniciar
  su worker. No se permite cambiar esa vinculación silenciosamente.
- inventory_batches.evidenceSequence: siguiente posición lógica de eventos.

Estados: PENDING, PROCESSING, CONFIRMED y FAILED. La recepción tiene secuencia
cero. Un evento espera a que todos sus predecesores estén confirmados.
FOR UPDATE SKIP LOCKED y leases de 120 segundos impiden reclamaciones simultáneas;
el lease se renueva cada 20 segundos. Las actualizaciones exigen el token del
lease, para que un proceso antiguo no sobrescriba al que lo recuperó.

Los reintentos usan espera exponencial desde 4 segundos hasta 300 segundos,
con un máximo de diez intentos antes de FAILED. Un conflicto de identidad o
contenido requiere revisión y queda FAILED inmediatamente. Los errores
almacenados son códigos, sin secretos ni respuestas RPC completas.

Si sigue vigente el blockhash, se reenvían los mismos bytes y firma. Si expiró
o falló la transacción, se prepara otro intento. Antes de confirmar se exige
una firma conocida con estado confirmed/finalized sin error y una cuenta del
programa con identidad, payload y hash encadenado correctos. Un timeout nunca
se convierte por sí solo en confirmación. Las PDAs únicas impiden repetir un
evento incluso si el proceso se interrumpe después de enviarlo.

Las comparaciones SQL de leases usan UTC explícito, independientemente de la
zona horaria configurada en PostgreSQL.

## Historial anterior

Los lotes nuevos encolan su recepción automáticamente. Al registrar un nuevo
movimiento de un lote anterior a fase 4, se incorpora primero su recepción y
su historial existente, una sola vez y bajo el bloqueo del lote.
El orden histórico recuperado es createdAt, id; no puede reconstruir un orden
original que nunca se guardó si hay fechas iguales. Los eventos nuevos usan
una secuencia asignada dentro de la transacción.

También se puede preparar todo el historial de una empresa con backfill.
Ese comando solo crea pendientes; no firma ni envía transacciones.

## API autenticada

- GET /api/v1/blockchain/evidence?batchId=UUID&page=1&limit=20
- GET /api/v1/blockchain/evidence/:id
- POST /api/v1/blockchain/evidence/:id/retry

La lectura exige inventory:read y filtra siempre por la empresa de la sesión.
El detalle devuelve el JSON canónico y la vinculación blockchain. No devuelve
bytes firmados ni claves. El reintento exige users:manage, solo acepta FAILED
y deja auditoría. Una evidencia confirmada no puede editarse ni reiniciarse.

## Operación

Desde la raíz del repositorio, con Node 24 y las herramientas de fase 3:

```bash
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=@repuchain/api
pnpm db:migrate
export BLOCKCHAIN_COMPANY_ID=UUID_DE_LA_EMPRESA
pnpm blockchain:backfill
export BLOCKCHAIN_SIGNER_PATH=/ruta/privada/firmante.json
chmod 600 "$BLOCKCHAIN_SIGNER_PATH"
export BLOCKCHAIN_RPC_URL=https://api.devnet.solana.com
pnpm blockchain:worker
```

El worker lee DATABASE_URL de database/.env o del entorno. --once procesa
como máximo una evidencia disponible; sin ese argumento permanece activo
hasta SIGINT/SIGTERM. No hay arranque automático al iniciar la API.

Devnet se verifica por genesis hash. Localnet solo se admite explícitamente
con BLOCKCHAIN_NETWORK=localnet, NODE_ENV=test y un RPC en loopback.
Mainnet no está habilitada. Conservar claves exclusivamente fuera del código
versionado y no asignarlas a NEXT_PUBLIC o EXPO_PUBLIC.

## Pruebas

```bash
pnpm test
pnpm test:integration
pnpm blockchain:test
pnpm test:blockchain:integration
```

La última prueba requiere target/deploy/repu_chain.so y solana-test-validator.
Crea un ledger local aislado, carga el SBF real, usa PostgreSQL de pruebas y
cierra sus procesos al terminar. Las pruebas de cola usan también un gateway
controlado para reproducir cortes, vencimientos y concurrencia.

## Referencias RPC

- https://solana.com/docs/rpc/http/sendtransaction
- https://solana.com/developers/cookbook/transactions/retry
- Tipos de @solana/kit 8.6.0 e IDL del programa inspeccionados en el workspace.
