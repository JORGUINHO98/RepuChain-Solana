# Entrega de fase 3 — completada el 21 de noviembre de 2026

## Objetivo

Crear el programa Anchor de trazabilidad, sus PDAs y autorizaciones, probarlo
y desplegarlo en Solana Devnet. Código, pruebas y despliegue verificado completos.

## Arquitectura y archivos

El workspace Cargo se trasladó a la raíz para coincidir con Anchor.toml.
blockchain/programs/repu_chain contiene archivos separados para cada instrucción,
las cuatro cuentas, errores, eventos y cálculo de evidencias. La IDL pública
queda en blockchain/idl/repu_chain.json tras pasar las pruebas.

scripts/test-blockchain.mjs compila, prueba, verifica vectores y guarda el
hash del binario probado. scripts/deploy-devnet.mjs solo admite Devnet y
verifica la transacción y el binario antes de registrar el despliegue.

Las claves exclusivas de desarrollo se guardan en blockchain/.keys, con
permisos restringidos y exclusión Git. No se usó una wallet personal ni se
añadieron claves a NestJS.

## Dependencias

- Anchor CLI y anchor-lang: 1.2.2.
- Solana CLI: 4.1.2.
- Rust host: 1.100.0.
- Compilador SBF seleccionado por las herramientas: platform-tools v1.57,
  Rust 1.95.0, sbpfv3-solana-solana.
- LiteSVM: 0.18.2.
- solana-sha256-hasher: 3.1.0.
- Resolución exacta de dependencias de pruebas: Cargo.lock.
- anchor-lang se compila con solana-v4 para alinear los tipos del SDK.
- No se añadieron dependencias npm para el contrato.

## Pruebas realizadas

20 pruebas Rust correctas: 17 escenarios del programa SBF y 3 vectores de hashes.
También se comprobaron los tres vectores por separado con node:crypto.

Casos: creación de PDAs, recepción y cadena de eventos; payload alterado;
hash y secuencia incorrectos; duplicados y reinicialización; revocación y
reactivación; protección de la autoridad; firma del actor; wallet no registrada;
dos firmas para custodia; custodio anterior; destinatario revocado; transferencia
a sí mismo; verificación sin modificar estado; aislamiento entre empresas;
identificadores cero y reintentos tras una cabeza de cadena obsoleta.

Las pruebas se ejecutan sobre el binario SBF en LiteSVM. No equivalen a
transacciones en Devnet. La generación de IDL también terminó correctamente.

## Comandos ejecutados

```bash
solana-keygen new --silent --no-bip39-passphrase --outfile blockchain/.keys/deployer.json
solana-keygen new --silent --no-bip39-passphrase --outfile target/deploy/repu_chain-keypair.json
cargo fmt --all
anchor build
anchor idl build -o target/idl/repu_chain.json -t target/types/repu_chain.ts
cargo test --locked -p repu-chain -- --test-threads=1
node scripts/check-evidence-vectors.mjs
solana genesis-hash --url devnet
solana airdrop 2 --url devnet --keypair blockchain/.keys/deployer.json
```

Los comandos de compilación posteriores usan CARGO_BUILD_JOBS=2 para moderar
el consumo de recursos. No se imprimieron frases de recuperación ni claves.

## Incidencias resueltas

- La versión fijada inicialmente de solana-message no satisfacía la dependencia
  transitiva de LiteSVM. Se permitió la familia compatible y Cargo.lock fija
  la resolución real.
- El primer build produjo el SBF pero no completó IDL. Se ejecutó la generación
  de IDL por separado, conservando log y limitando compilaciones concurrentes.
- Hubo un error transitorio Wsl/Service/ERROR_OPERATION_ABORTED al guardar
  automatización. Se comprobaron los archivos y se escribieron nuevamente
  los que faltaban.
- Cargo emitió un aviso de dependencia anchor-lang no usada durante un objetivo
  de pruebas generado; el programa la utiliza y la compilación/pruebas pasaron.

## Despliegue en Devnet

Programa desplegado: 3hgkgx5V7UgU1Dac8R6ZCx2ZYs1PeHPUphFgRmG52GWv.  
Wallet exclusiva de desarrollo: 8FreXnhKCs7VeTtWz8BhqDsEzREASeWDFj1zZLV7ZCqv.

El despliegue se confirmó el 21 de noviembre de 2026 a las 08:13 (America/La_Paz).
Se utilizó la wallet de desarrollo ya configurada y financiada por el usuario.
La wallet MetaMask no se usó para firmar el despliegue.

- Firma: `2uPv2CzKHcEHVpLqDjar4GSMmuoRb4vgNRJ8ZNvnV2dSXJBXjU1pY8YatybMw3AL66WDTnAUJs5WMEW3XHT2D98b`.
- Confirmación verificada por RPC: confirmed.
- Cuenta del programa ejecutable: verificada.
- Binario descargado de Devnet: idéntico al binario probado, 254328 bytes.
- Comprobante: `blockchain/deployments/devnet.json`.
- [Transacción en Explorer](https://explorer.solana.com/tx/2uPv2CzKHcEHVpLqDjar4GSMmuoRb4vgNRJ8ZNvnV2dSXJBXjU1pY8YatybMw3AL66WDTnAUJs5WMEW3XHT2D98b?cluster=devnet).

El primer envío por RPC falló por límites de peticiones (HTTP 429).
Se cambió el envío a `--use-tpu-client`, conservando la clave del programa y
el buffer para reanudar. El segundo intento completó las verificaciones.
La autoridad de actualización permanece en la wallet de desarrollo.

La integración API/Outbox, UI de wallets y anclaje de movimientos reales siguen
pendientes de fase 4. No se inició esa fase ni se enviaron datos comerciales.

## Verificación de despliegue local

Se ejecutó `node scripts/smoke-localnet.mjs` con un validador Solana local
independiente. La transacción quedó confirmada y la cuenta del programa es
ejecutable. Se descargó el binario desplegado y coincide con el binario probado.
El validador se cerró al terminar; su ledger queda bajo target, excluido de Git.

- Binario: 254328 bytes.
- SHA-256: `9d26e2238c4e71fa46e533ea357b71ca9bacfed2650bd3b0f64b8440e2cb57a8`.
- Firma local: `5W46oxpmKxad8cNyNyddBy5frxj6Q295zGTdNVhVM8dwoEpURcsuPDQoWtC1wkUhEMY6qnKDgjQnB3fMY5atUgd`.
- Comprobante: `target/localnet-deployment-receipt.json`.
- Repetición: `pnpm blockchain:smoke:local`, después de `pnpm blockchain:test`.

Esta firma pertenece exclusivamente al ledger local. No puede consultarse como
una transacción Devnet. Antes de financiar la wallet, el preflight calculó 2.596 SOL de prueba necesarios
para este binario y encontró saldo cero. El faucet también rechazó un segundo
intento de 1 SOL. Ese bloqueo quedó resuelto con el despliegue documentado arriba.

La CI blockchain compila, ejecuta pruebas y comprueba la IDL; está configurada,
pero todavía no se ejecutó en GitHub. La prueba de despliegue local se ejecutó
en este equipo y está disponible como comando independiente.