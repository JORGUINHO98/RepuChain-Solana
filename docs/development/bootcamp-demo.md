# Demo local para evaluación

Ruta: proyecto propio de inventario y trazabilidad. No requiere hosting.

## Preparar la aplicación
Seguir el README para instalar dependencias, configurar PostgreSQL y aplicar migraciones. Ejecutar `pnpm build` y luego `pnpm dev`. Abrir http://127.0.0.1:3000 en Brave. En Configuración > Web3 seleccionar **Brave Wallet** como cartera predeterminada de Solana.

Pulsar **Conectar Brave Wallet**, autorizar la conexión y firmar el mensaje. La firma de acceso no envía fondos. La primera firma crea una empresa propia. No reutilizar una wallet de producción para una demostración.

## Conectar el espacio con Devnet
1. Con la sesión abierta, visitar http://127.0.0.1:3000/api/backend/companies/me y copiar el campo `id`. Es el identificador de la empresa, no el Program ID.
2. Preparar un archivo local de firmante técnico de Solana con SOL de Devnet y permisos 600. No subirlo a GitHub. No utilizar la frase de recuperación de Brave Wallet.
3. En otra terminal, desde la raíz del repositorio, sustituir los valores de ejemplo y ejecutar:

```bash
BLOCKCHAIN_COMPANY_ID=UUID_DE_LA_EMPRESA \
BLOCKCHAIN_SIGNER_PATH=/ruta/privada/firmante.json \
BLOCKCHAIN_NETWORK=devnet \
BLOCKCHAIN_RPC_URL=https://api.devnet.solana.com \
pnpm blockchain:worker
```

El worker usa PostgreSQL según database/.env. Al procesar la primera evidencia inicializa la cuenta de empresa si corresponde. Una vinculación ya existente exige mantener la misma autoridad. No cambiar claves para eludir esa comprobación.

## Flujo visible
1. Crear un proveedor y un almacén.
2. Crear un repuesto y un lote.
3. Registrar una compra de dos unidades; comprobar stock 2.
4. Registrar una venta de una unidad; comprobar stock 1.
5. Intentar otra venta de dos unidades; comprobar rechazo por stock insuficiente y que el stock continúa en 1.
6. Abrir Trazabilidad y actualizar hasta que las evidencias estén CONFIRMED. Conservar firma, cuenta y hashes del detalle.
7. Abrir la transacción en Explorer con cluster=devnet. Contrastar su éxito y su cuenta con la aplicación.

Si el worker no está configurado, no tiene fondos de Devnet o el RPC no responde, la evidencia puede quedar pendiente o fallida. No presentar ese estado como confirmación.

## Autoridad, pertenencia y baja
Ejecutar `pnpm blockchain:test`. Las pruebas Rust comprueban revocación efectiva, restauración solo por la autoridad y rechazo de autorrevocación. También cubren custodia, pertenencia, secuencias y hashes alterados.

La baja de operador es lógica (`active=false`), conserva la cuenta y el historial. No hay cierre físico de cuenta ni devolución de rent. Las instrucciones de administración se implementan en Rust y el cliente; no se simula una pantalla que no existe.

## Pruebas y evidencias entregadas
- `pnpm check`: tipos, pruebas de aplicación, Prisma y compilación.
- `pnpm test:integration`: API con PostgreSQL aislado.
- `pnpm smoke`: web/API con firma efímera, sesión, cookies y revocación.
- `pnpm blockchain:test`: programa SBF, IDL, reglas Rust y vectores de hash.
- `pnpm test:blockchain:integration`: API, PostgreSQL y programa en validador local.

El README enlaza las transacciones históricas reales de Devnet. Los resultados del validador local no se presentan como transacciones Devnet nuevas.

Para repetir la demo sintética por terminal existe `pnpm blockchain:demo:devnet`; requiere database/.env y blockchain/.keys/deployer.json. Su proceso API local usa NODE_ENV=test para los fixtures sintéticos. No publicar esa API ni habilitar ese modo en un servidor público.

La certificación y la aceptación de la equivalencia de baja lógica corresponden al equipo del Bootcamp.
