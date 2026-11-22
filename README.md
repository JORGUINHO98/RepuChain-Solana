# RepuChain

Cada repuesto tiene una historia. Cada movimiento deja una huella.

**Fase 6 implementada: aplicación móvil con autenticación, escáner QR y movimientos autorizados.** Incluye consulta de repuestos, lotes, stock y evidencias; conserva envíos pendientes para reintentarlos con la misma clave. El panel web permite descargar etiquetas QR.

La web de fase 5 y la integración Solana de fase 4 siguen disponibles. El worker blockchain se ejecuta por separado. La exportación móvil Android/iOS y las pruebas automatizadas pasan; falta validar cámara, almacenamiento seguro e interfaz en un dispositivo Android.

Consulta la [guía de fase 6 y prueba en Android](docs/development/phase-6.md) y el [alcance de fase 5](docs/development/phase-5.md).

## Entrega Advanced Bootcamp — Solana Engineering Track

**Proyecto:** RepuChain · Inventario y trazabilidad automotriz.
**Categoría propuesta:** aplicaciones empresariales / trazabilidad (seleccionar la opción equivalente disponible en el formulario).
**Repositorio público:** https://github.com/JORGUINHO98/RepuChain-Solana

**Program ID en Solana Devnet:**
~~~
3hgkgx5V7UgU1Dac8R6ZCx2ZYs1PeHPUphFgRmG52GWv
~~~
Corresponde a declare_id! en [lib.rs](blockchain/programs/repu_chain/src/lib.rs).
[Ver programa en Explorer](https://explorer.solana.com/address/3hgkgx5V7UgU1Dac8R6ZCx2ZYs1PeHPUphFgRmG52GWv?cluster=devnet).

### Evidencia verificable
La demostración utiliza datos sintéticos. El comprobante conserva hashes, cuentas y firmas verificadas el 21 de noviembre de 2026:
[comprobante de la demostración](blockchain/deployments/phase-4-demo.json).

- [Recepción del lote en Devnet](https://explorer.solana.com/tx/cq35KsK8wCfNjRHFSUFRJrCKknB8PTcqNgobkLBMoPeiwjiFj2Xvk68H4dWhBEfU8PiskpDFsMWPyJD3ZC3TEzt?cluster=devnet).
- [Movimiento del lote en Devnet](https://explorer.solana.com/tx/4i5s9haKoQtdNv2FL6xZQdmqGrHmVsSdJ5X8FgqG9sZjH8qdQ2grxkL6voDFTq1vvMaF5bBv3VQkDp3SvnxQADZW?cluster=devnet).

PostgreSQL conserva el inventario y los datos comerciales. Una cola transaccional registra evidencias en Solana con hashes encadenados y secuencia; el worker verifica la cuenta y transacción antes de marcar CONFIRMED. El programa controla autoridades y custodia. Las pruebas incluyen alteración de hashes, cuentas de otra empresa, revocación, doble envío y recuperación de respuestas RPC perdidas.

La batería local de fase 7 pasó 92 pruebas: 25 de lógica, 44 HTTP, 20 Rust y 3 de integración con validador local. Véase [guía de entrega](docs/development/phase-7.md) para reproducirlas.
La publicación web en Vercel y la prueba física Android están pendientes. No se requiere publicar claves privadas para verificar estas evidencias.

## Entrega

Fase 7: 92 pruebas correctas y preparación para GitHub/Vercel. Consulta [la guía de entrega](docs/development/phase-7.md). La publicación y la prueba física Android siguen pendientes.

## Acceso para el jurado

En la pantalla inicial, elegir **Crear cuenta para probar**. Introducir nombre, nombre e identificador único de empresa, correo y contraseña de al menos 12 caracteres. Al terminar se inicia sesión y se abre el panel.

Cada registro crea una empresa vacía con su propio administrador. No permite acceder al inventario de otras empresas. Conservar el identificador elegido para futuros inicios de sesión. No se envía correo de verificación ni se ha implementado recuperación de contraseña.

La nueva empresa permite probar el catálogo y los movimientos; sus evidencias quedan pendientes hasta configurar un worker autorizado para ella. Para comprobar blockchain ya confirmada, usar las transacciones de demostración enlazadas arriba.

Las contraseñas demo locales no se publican. El registro requiere API y base de datos disponibles: GitHub contiene el código, no ejecuta la aplicación. La URL pública de la web aún está pendiente de despliegue.

## Arranque en WSL2

En este equipo PostgreSQL 16.15 está instalado directamente en Ubuntu.
Docker sigue siendo una alternativa, no es necesario para el entorno actual.

```bash
cd ~/projects/repu-chain
source ~/.nvm/nvm.sh
nvm use
sudo service postgresql start
pnpm install --frozen-lockfile
pnpm setup:env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://127.0.0.1:3000
- API: http://127.0.0.1:4000/api/v1
- Salud del proceso: /api/v1/health
- Conexión PostgreSQL: /api/v1/health/ready

En otra terminal, `pnpm demo:api` inicia sesión con las credenciales locales,
consulta los datos de demostración y cierra la sesión sin imprimir tokens.
La empresa es `demo` y el usuario inicial `admin@repuchain.local`.
La contraseña aleatoria se conserva en `database/.env` como
`SEED_ADMIN_PASSWORD`. El seed no cambia la contraseña de usuarios existentes.

## Funcionalidades de la API

- JWT de 15 minutos, refresh tokens rotativos y sesiones de 7 días.
- Roles ADMIN, MANAGER, OPERATOR y VIEWER; permisos verificados en cada petición.
- Aislamiento por empresa en consultas y relaciones PostgreSQL.
- Productos con SKU, precios decimales, categorías, marcas y compatibilidad vehicular.
- Proveedores, almacenes y lotes; altas y modificaciones donde corresponde.
- Entradas, salidas y transferencias con transacciones, idempotencia y auditoría.
- Restricciones contra stock negativo e historial protegido contra UPDATE/DELETE.
- Consultas paginadas y validación estricta de entradas.

El stock inicial es cero. Solo cambia mediante movimientos autorizados.
El hash requestHash identifica reintentos: no constituye evidencia blockchain.

## Verificaciones

```bash
pnpm check
pnpm test:integration
pnpm smoke
pnpm db:check
pnpm mobile:check
```

Las pruebas HTTP usan `repuchain_test`, separada de la base de desarrollo.
`pnpm setup:env` prepara `.env.test`. Ver [guía WSL2](docs/development/wsl2.md)
para crear esa base en una instalación nueva. La prueba exige un nombre terminado
en `_test`, usa empresas nuevas por ejecución y conserva el historial de pruebas.

`pnpm build` compila web/API/paquetes y exporta JavaScript móvil para Android/iOS.
No produce APK/IPA ni verifica un dispositivo físico.
`pnpm dev:mobile` inicia Expo; la configuración del teléfono está en la guía de fase 6.

## Programa blockchain

Requiere Rust 1.100.0, Anchor CLI 1.2.2 y Solana CLI 4.1.2 en WSL.

```bash
pnpm blockchain:test
pnpm blockchain:smoke:local
pnpm blockchain:deploy:devnet
```

La prueba local inicia su propio validador, despliega el binario probado,
comprueba la confirmación y compara el programa descargado. Al terminar cierra
el validador y conserva el comprobante en `target/localnet-deployment-receipt.json`.
Necesita la clave local del programa en `blockchain/.keys/program.json`.

El comando Devnet comprueba red, claves, pruebas y saldo antes de desplegar.
El despliegue quedó confirmado el 21 de noviembre de 2026. El comprobante está
en [blockchain/deployments/devnet.json](blockchain/deployments/devnet.json).
[Ver programa en Solana Explorer](https://explorer.solana.com/address/3hgkgx5V7UgU1Dac8R6ZCx2ZYs1PeHPUphFgRmG52GWv?cluster=devnet).

## Integración y evidencias

```bash
pnpm test:integration
pnpm test:blockchain:integration
```

El worker se inicia por separado con una empresa y un firmante configurados.
La [guía de fase 4](docs/blockchain/phase-4.md) explica el arranque, backfill,
reintentos y endpoints. `pnpm blockchain:demo:devnet` ejecuta o recupera una
demostración con datos sintéticos; utiliza SOL de prueba de la wallet local.

Comprobante real: [demo Devnet](blockchain/deployments/phase-4-demo.json).

## Estructura y documentación

- [Integración blockchain de fase 4](docs/blockchain/phase-4.md)
- [Resultados de fase 4](docs/development/phase-4-report.md)
- [Programa blockchain de fase 3](docs/blockchain/phase-3.md)
- [Resultados de fase 3](docs/development/phase-3-report.md)
- [Arquitectura de fase 2](docs/architecture/phase-2.md)
- [Modelo de datos](docs/database/phase-2.md)
- [Contrato y ejemplos de API](docs/api/phase-2.md)
- [Variables de entorno](docs/development/environment.md)
- [Instalación WSL2](docs/development/wsl2.md)
- [Resultados y entrega](docs/development/phase-2-report.md)
- [Contribuir](CONTRIBUTING.md)

La CI está configurada, pero no se ha ejecutado en GitHub. El programa se ha
desplegado y verificado en un validador local y en Devnet.
