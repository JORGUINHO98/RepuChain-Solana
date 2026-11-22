# Entrega de Fase 4 — 21 de noviembre de 2026

## Resultado

Cliente TypeScript y generación de hashes implementados. La API encola
evidencias de lotes y movimientos dentro de sus transacciones de inventario.
El worker separado firma, conserva intentos, envía y verifica las cuentas de
Solana. Incluye reintentos, recuperación tras interrupciones y consulta
autenticada del estado.

El recorrido completo se ejecutó contra el programa real en localnet y Devnet.
La demostración Devnet usa exclusivamente datos sintéticos y la wallet de
desarrollo existente. No se empleó la wallet MetaMask.

## Evidencia Devnet

Comprobante: blockchain/deployments/phase-4-demo.json.
Verificado el 21 de noviembre de 2026 a las 19:12 (America/La_Paz).

- Empresa sintética: f02c2abe-d277-4a8c-ac61-f57ba36484f2.
- Lote: 39c9648b-3503-4fd4-89d3-afcd8d71e490.
- Movimiento: 05875fd7-624a-418a-8c1e-edce10194fd8.
- [Recepción confirmada](https://explorer.solana.com/tx/cq35KsK8wCfNjRHFSUFRJrCKknB8PTcqNgobkLBMoPeiwjiFj2Xvk68H4dWhBEfU8PiskpDFsMWPyJD3ZC3TEzt?cluster=devnet).
- [Movimiento confirmado](https://explorer.solana.com/tx/4i5s9haKoQtdNv2FL6xZQdmqGrHmVsSdJ5X8FgqG9sZjH8qdQ2grxkL6voDFTq1vvMaF5bBv3VQkDp3SvnxQADZW?cluster=devnet).

El worker comprobó firma sin error, propietario y formato de cuenta, identidad,
secuencia, payload y hash encadenado. El programa Anchor desplegado en fase 3
no se modificó ni se volvió a desplegar.

## Cambios principales

- packages/blockchain-client/src: JSON canónico, hashes compatibles con Rust,
  PDAs, siete constructores de instrucciones, decodificación y cliente RPC.
- database/prisma: migración aditiva para Outbox, intentos firmados y
  vinculación de empresa; triggers de inmutabilidad y restricciones.
- apps/api/src/modules/blockchain: encolado, worker, backfill, consulta y retry.
- apps/api/src/common/transaction.ts: reintento de conflictos PostgreSQL
  reportados por el adaptador Prisma en consultas SQL directas.
- scripts/demo-blockchain.mjs: demostración reanudable, con API temporal.
- .github/workflows/blockchain.yml: controles de integración local en CI.

## Verificación

Controles finales aprobados: pnpm check (tipos, validación Prisma y compilación
de aplicaciones/paquetes), 12 pruebas unitarias, 30 pruebas HTTP/PostgreSQL y
3 pruebas contra Solana local. Total: 45 pruebas TypeScript correctas.

Los controles finales y su salida se conservan localmente bajo target:
phase4-check.log, phase4-http-tests.log y phase4-chain-tests.log.

Las pruebas cubren hashes e IDL; rollback e idempotencia; acceso por empresa;
leases y concurrencia; firma guardada antes de un envío fallido; transacciones
vencidas y fallidas; confirmación recuperada; inmutabilidad y carga del historial.
Las pruebas con Solana local ejecutan el SBF real, confirman firmas y detectan
alteraciones de payload. Se simuló perder la respuesta después de que el nodo
aceptara una transacción y se recuperó sin crear un segundo intento.

Incidencias corregidas:
- Comparación de timestamps UTC con la zona de PostgreSQL.
- Error 40001 anidado en driverAdapterError.cause de Prisma.
- El validador instalado descartaba los mensajes v0 de esta integración en
  parsing/sanitization aunque RPC los aceptaba. Se eligió el formato legacy,
  suficiente para estas instrucciones y confirmado tanto localmente como en
  Devnet. No se atribuye ese comportamiento a una causa externa no demostrada.

## Operación y límites

Consultar docs/blockchain/phase-4.md para configuración, API y comandos.
El worker requiere una empresa explícita y una clave de servicio; no se inicia
automáticamente con la API. Los datos de demostración y su historial se conservan.
El servidor temporal de la demostración y los validadores de prueba se cerraron.

La identidad que firma es el servicio. El actor de negocio está dentro del
payload; esta fase no incorpora firma de cada usuario desde MetaMask.
Una transferencia de almacén no transfiere custodia entre wallets.
El historial anterior se ordena por createdAt e id cuando aún no tenía secuencia.
La CI está configurada; no se ejecutó en GitHub. El dashboard corresponde a fase 5.
