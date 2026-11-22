# Fase 6 · Aplicación móvil

## Objetivo y estado

Navegación móvil autenticada, cámara QR, consulta de repuestos y lotes, existencias por almacén, evidencias de trazabilidad y registro autorizado de entradas, salidas y transferencias.

Implementado en React Native y Expo Router. La exportación JavaScript para Android e iOS y las pruebas automatizadas pasan. No se ha instalado ni probado en un teléfono. El usuario eligió Android para la prueba física. La cámara, los permisos del sistema, la persistencia nativa de SecureStore y la presentación visual quedan pendientes de esa prueba. No se ha generado APK/AAB ni publicado en una tienda.

## Arquitectura y archivos

- apps/mobile/app: rutas de acceso, grupo protegido, inicio, repuestos, inventario, escáner, lote y movimientos.
- apps/mobile/src/modules/auth: proveedor de sesión.
- apps/mobile/src/services/session-core.ts: cliente HTTP comprobable sin módulos nativos, restauración, renovación rotativa compartida entre solicitudes, cierre y revocación.
- apps/mobile/src/services/api.ts: adaptación a Expo SecureStore.
- apps/mobile/src/services/movement-draft.ts: recuperación validada del envío pendiente, ligada a usuario, empresa y API.
- apps/mobile/src/modules/movements: formulario y recuperación de envíos.
- apps/mobile/src/components: componentes visuales y selector de lotes/almacenes.
- packages/shared-types/src/mobile.ts: contratos de lectura compartidos.
- packages/utils/src/qr.ts: formato QR y lector estricto compartidos.
- API batches: detalle y etiqueta QR protegidos por inventory:read.
- apps/web/src/components/panel/qr-label.tsx: visualización y descarga SVG desde Lotes → Ver QR.
- tests/integration/mobile.test.ts y tests/e2e/phase6.test.ts: pruebas de sesión, QR y aislamiento.

No hay lógica blockchain en los componentes móviles. La app consulta los estados que verifica el worker de fase 4. Abrir Explorer está disponible solo para evidencias confirmadas en Devnet. Escanear un identificador no certifica la autenticidad física del repuesto.

## Autenticación y reintentos

Los tokens se guardan como un registro en SecureStore con WHEN_UNLOCKED_THIS_DEVICE_ONLY. Nunca se almacena la contraseña. El cliente conserva el origen de la API y descarta credenciales guardadas para otra dirección.

El acceso vence a los 15 minutos. La app renueva el token, con una sola petición compartida si coinciden varias consultas. Si se pierde la respuesta de renovación, elimina la sesión local y pide volver a entrar; no reutiliza un refresh token que pudo haberse consumido.

El cierre normal revoca la sesión en la API y elimina el registro local. Sin conexión, elimina el registro local y avisa de que no pudo confirmar la revocación remota.

Antes de enviar un movimiento, guarda su cuerpo validado y UUID de idempotencia. Reintentar conserva ambos, incluso después de reiniciar la app. Los pendientes se separan por usuario y empresa, y se rechazan si cambió la API. Los conflictos quedan pendientes para que el usuario revise el historial; no se cambia silenciosamente la clave. No hay cola de envíos automáticos sin conexión.

## QR

Formato versión 1:

```text
repuchain://batch/<UUID_LOTE>?company=<UUID_EMPRESA>&v=1
```

El lector acepta exclusivamente este formato y valida ambos UUID. Rechaza URLs externas y parámetros extra; no abre enlaces obtenidos del escaneo. El identificador de empresa debe coincidir con la sesión y la API vuelve a comprobar la pertenencia del lote.

Rutas añadidas:
- GET /api/v1/batches/:id: producto, proveedor, existencias por almacén y contenido QR.
- GET /api/v1/batches/:id/qr: contenido QR y SVG generado localmente.

El QR no incluye precios, proveedores, credenciales ni firmas personales. No necesita cambiar cada vez que hay un movimiento: identifica el lote y la consulta obtiene su estado actual. El escaneo se hace dentro de RepuChain; no se garantiza recuperar un destino si se abre un enlace externo estando desconectado.

## Dependencias

Expo seleccionó versiones compatibles con SDK 58:
- expo-camera ~58.0.14.
- expo-secure-store ~58.0.3.
- expo-crypto ~58.0.8.
- API: qrcode 1.5.4 y tipos @types/qrcode 1.5.6.

El plugin de cámara activa lectura de códigos. La app no solicita grabación de audio. La cámara se desmonta al abandonar la pantalla o pasar a segundo plano. Hay linterna, consulta manual y manejo de permiso denegado.

Documentación consultada: [Camera SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/camera/), [SecureStore SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/), [node-qrcode](https://github.com/soldair/node-qrcode).

## Probar en Android

### 1. API accesible

La variable EXPO_PUBLIC_API_URL de apps/mobile/.env debe apuntar a la API que el teléfono pueda alcanzar, terminando en /api/v1.

- Emulador Android: http://10.0.2.2:4000/api/v1, cuando el host y la red de WSL permiten el acceso.
- Android físico: dirección accesible del equipo en la red local o un endpoint HTTPS de desarrollo.
- 127.0.0.1 en el teléfono apunta al propio teléfono; no al PC.

Para usar la red local, la API necesita escuchar en una interfaz accesible. En una terminal WSL, después de detener la instancia que ya ocupa el puerto:

```bash
cd ~/projects/repu-chain
source ~/.nvm/nvm.sh
HOST=0.0.0.0 pnpm dev:api
```

No se cambiaron reglas de firewall ni red de Windows. WSL con NAT puede requerir reenvío de puertos; con red reflejada debe comprobarse igualmente el firewall. Antes de iniciar sesión, abrir desde el navegador del Android la ruta /api/v1/health/ready de la dirección elegida y comprobar que responde. Para una distribución fuera del entorno local, usar HTTPS.

### 2. Servidor Expo

En otra terminal:

```bash
cd ~/projects/repu-chain
source ~/.nvm/nvm.sh
pnpm dev:mobile
```

Instalar una versión de Expo Go compatible con SDK 58 en Android y escanear el QR del servidor Expo. Ese QR abre la aplicación; es distinto del QR de un lote.

El teléfono debe alcanzar tanto Metro como la API. El modo túnel de Expo resuelve la conexión con Metro, pero no publica automáticamente la API. Reiniciar Expo después de cambiar EXPO_PUBLIC_API_URL.

Referencias: [preparar el entorno](https://docs.expo.dev/get-started/set-up-your-environment/) e [iniciar el desarrollo](https://docs.expo.dev/get-started/start-developing/).

### 3. Recorrido de aceptación pendiente

1. Iniciar sesión con la empresa demo y las credenciales locales de database/.env.
2. Consultar repuestos y lotes; verificar que muestran los datos del panel web.
3. Abrir Lotes → Ver QR en la web y escanearlo desde RepuChain móvil.
4. Denegar el permiso de cámara y comprobar la búsqueda manual.
5. Registrar una entrada de una unidad en un lote de prueba; comprobar el nuevo stock y su movimiento.
6. Intentar una salida mayor al stock y comprobar el rechazo.
7. Interrumpir la conexión durante un envío, cerrar y abrir la app, y reintentar el pendiente; comprobar un solo movimiento.
8. Iniciar sesión como VIEWER: consultar lotes y comprobar que no permite registrar movimientos.
9. Cerrar sesión y comprobar que volver atrás no permite acceder a pantallas protegidas.
10. Probar segundo plano y retorno, linterna, textos largos, teclado y lector de pantalla.

Estas pruebas alteran inventario cuando registran movimientos: realizarlas con lotes destinados a prueba.

## APK y distribución

apps/mobile/eas.json define un perfil preview para APK interno y production para AAB. Requiere configurar una API HTTPS alcanzable y EXPO_PUBLIC_API_URL en el entorno de construcción, además de un proyecto/cuenta EAS. No se ejecutó ninguna construcción remota ni se generaron credenciales de firma. El perfil no sustituye la validación física.

## Verificaciones realizadas

- pnpm check: tipos correctos, 25 pruebas de lógica, esquema Prisma válido y compilación web/API/paquetes; exportación Android e iOS.
- pnpm test:integration: 44 pruebas HTTP sobre PostgreSQL, incluidas cuatro nuevas de fase 6.
- pnpm mobile:check: dependencias compatibles.
- expo config --type public: plugins de cámara y almacenamiento seguro reconocidos.
- No se requieren migraciones nuevas.
- No se enviaron fondos ni nuevas transacciones a Solana.

La siguiente fase es la 7: pruebas completas y entrega. Antes de dar por validada la experiencia móvil debe ejecutarse el recorrido en Android.
