# Programa RepuChain — fase 3

## Alcance

Programa Rust/Anchor con siete instrucciones, cuatro cuentas PDA, evidencias
encadenadas y custodia firmada. La API de inventario de fase 2 no envía todavía
estas instrucciones: Outbox, serialización canónica de datos comerciales,
wallets de usuarios e integración de confirmaciones corresponden a fase 4.

ID del programa: 3hgkgx5V7UgU1Dac8R6ZCx2ZYs1PeHPUphFgRmG52GWv.
Un ID generado no implica que exista un despliegue. El estado de Devnet se
documenta en phase-3-report.md y, solo tras confirmación, en
blockchain/deployments/devnet.json.

## Cuentas y semillas

| Cuenta | Semillas, en orden | Contenido |
| --- | --- | --- |
| Company | company, autoridad (32 bytes), company_id (16 bytes) | Autoridad, ID externo, fecha, bump |
| Operator | operator, Company PDA, wallet | Empresa, wallet, activo, bump |
| Batch | batch, Company PDA, batch_id (16 bytes) | Recepción, cabeza de cadena, custodio, secuencia y último movimiento |
| Movement | movement, Batch PDA, event_id (16 bytes) | Payload hash, anterior, evidencia, secuencia, actor, custodia y enlace anterior |

Los textos de semillas son UTF-8 literal. Las direcciones se codifican como
32 bytes, no como cadenas base58. Los UUID son los 16 bytes de su representación
hexadecimal sin guiones. Todos los bumps se validan mediante restricciones Anchor.

La autoridad forma parte de la semilla Company para impedir que otra wallet
reserve la PDA legítima de una empresa. Dos autoridades pueden registrar el
mismo UUID en espacios distintos: el sistema debe conservar y comprobar el
mapeo empresa–autoridad/PDA. El contrato no certifica identidad legal.

Movement usa el ID del evento para impedir registrar el mismo evento otra vez
en ese lote, incluso con otra secuencia o tipo. La secuencia también se almacena
y debe ser consecutiva. last_movement y previous_movement permiten recorrer
el historial. Cada cuenta Movement requiere rent; no se implementa cierre.

## Instrucciones

### initialize_company(company_id)

La autoridad firma y paga Company y su propio Operator. Los IDs cero se
rechazan. La autoridad queda activa como operador inicial. init impide
reinicializar una empresa.

### authorize_operator(wallet)

Solo la autoridad de Company puede crear o reactivar un Operator de esa
empresa. init_if_needed se usa únicamente aquí, con PDA determinista, payer
autorizado y sin instrucciones de cierre. Se rechaza la wallet cero.

### revoke_operator(wallet)

Solo la autoridad puede desactivar al operador. La cuenta permanece para
evitar recreaciones no autorizadas. La autoridad no puede revocarse a sí misma.
El operador revocado no registra lotes/eventos ni recibe custodia.

### register_batch(batch_id, receipt_payload_hash)

Un operador activo firma. Crea una PDA Batch única, guarda el hash de recepción
y calcula el compromiso inicial. La secuencia comienza en 0 y el custodio es
el firmante. No se almacenan precios, cantidades, facturas ni fotografías.

### record_movement(event_id, sequence, payload_hash, previous_hash)

Un operador activo de la empresa firma. La secuencia debe ser exactamente la
actual más uno y previous_hash debe coincidir con head_hash. El programa
calcula la evidencia, crea Movement y actualiza Batch en la misma transacción.
No cambia el custodio. Un operador autorizado puede registrar eventos aunque
otra wallet autorizada sea el custodio.

No existe reintento silencioso en cadena: si la cuenta del evento ya existe,
init falla. El cliente de fase 4 deberá consultar la cuenta y comparar el
contenido antes de tratar un reintento como resuelto.

### transfer_custody(event_id, sequence, payload_hash, previous_hash)

Exige firma del custodio actual y del destinatario. Ambos deben ser operadores
activos de la misma empresa. No se permite transferir a la misma wallet.
Crea un evento de tipo 1 y actualiza la custodia y cabeza de cadena
atómicamente. Representa custodia de trazabilidad, no transfiere tokens ni
certifica propiedad legal. Transferencias entre empresas quedan fuera de esta versión.

### verify_batch(receipt_payload_hash, head_hash, sequence)

Lectura pública sin autoridad especial. Compara las expectativas con Batch y
emite un evento si coinciden; falla si no. No modifica cuentas. La consulta RPC
de Batch puede usarse para comprobar datos sin pagar una transacción.
Para comprobar un documento privado, el cliente debe recalcular su hash
canónico y contrastarlo con la evidencia almacenada.

## Formato criptográfico V1

SHA-256 de la concatenación exacta de los siguientes campos; no hay separadores
adicionales. Los tamaños fijos hacen inequívoca la codificación.

Recepción:
- UTF-8 REPUCHAIN_RECEIPT_V1.
- Company PDA (32), Batch PDA (32), batch_id (16).
- receipt_payload_hash (32), actor (32).

Evento:
- UTF-8 REPUCHAIN_EVENT_V1.
- Batch PDA (32), event_id (16), sequence (8, little-endian).
- kind (1 byte: 0 registro, 1 transferencia).
- payload_hash (32), previous_hash (32), actor (32).
- from_custodian (32), to_custodian (32).

El tiempo registrado se toma de Clock de Solana; es metadato de la cuenta y
no forma parte de este compromiso. La recepción actúa como hash previo del
primer evento. La custodia se incluye incluso cuando no cambia.

Vectores reproducibles: tests/hash_vectors.rs y
scripts/check-evidence-vectors.mjs. Rust y Node calculan los mismos valores.

## Seguridad y límites

Account<T> valida propietario y tipo. Las cuentas enlazan company y batch;
seeds, bumps, has_one y Signer impiden mezclar empresas o sustituir operadores.
Los enteros usan incremento comprobado y el build habilita overflow-checks.
Una operación fallida revierte tanto la cuenta nueva como el cambio de Batch.

Esta versión no expone edición ni cierre de movimientos. La autoridad de
actualización del programa conserva capacidad para cambiar el código; no se
ha hecho irreversible el programa. Las pruebas cubren controles conocidos,
pero no constituyen una auditoría externa.

El registro prueba qué hash presentó una wallet autorizada y su orden. No
demuestra que un repuesto físico, una factura o una declaración sean auténticos.
El contrato tampoco valida la veracidad de un hash proporcionado.

## Artefactos y comandos

- Cargo.toml y Cargo.lock: workspace y resolución Rust reproducible.
- blockchain/programs/repu_chain/src: instrucciones, cuentas, errores y eventos.
- target/deploy/repu_chain.so: binario SBF generado.
- blockchain/idl/repu_chain.json: IDL copiada después de pasar las pruebas.
- target/blockchain-test-receipt.json: SHA-256 del binario probado.
- blockchain/.keys: claves locales de desarrollo, excluidas de Git.

```bash
source ~/.nvm/nvm.sh
pnpm blockchain:build
pnpm blockchain:test
pnpm blockchain:smoke:local
pnpm blockchain:deploy:devnet
```

El último comando exige un comprobante de pruebas para el mismo binario,
verifica el genesis hash de Devnet, la correspondencia de claves y el saldo.
Solo escribe un registro confirmado después de comprobar la firma, la cuenta
ejecutable y que el binario descargado coincide con el probado.

No copiar claves a la API ni a variables NEXT_PUBLIC/EXPO_PUBLIC. Conservar
una copia privada de blockchain/.keys/program.json y deployer.json; no dependen
de target, que puede borrarse al limpiar artefactos.

## Fuentes de implementación

- https://www.anchor-lang.com/docs/references/account-constraints
- https://www.anchor-lang.com/docs/references/anchor-toml
- https://www.anchor-lang.com/docs/testing/litesvm
- APIs de anchor-lang 1.2.2 y litesvm 0.18.2 inspeccionadas en los crates instalados.
