# Acceso solo con wallet

La web usa **Conectar wallet**. No pide correo ni contraseña. El primer acceso crea una empresa vacía; la misma dirección vuelve a esa empresa. Las empresas anteriores se conservan, pero no se vinculan automáticamente a una wallet.

## Flujo
1. Seleccionar una wallet Solana detectada mediante Wallet Standard, o MetaMask mediante su conector Solana.
2. Autorizar la conexión y firmar el mensaje de RepuChain.
3. El servidor comprueba la firma Ed25519 y abre una sesión.

El reto contiene dirección, origen, nonce aleatorio y caducidad de cinco minutos. Se consume una sola vez. La web exige además una cookie de reto y el mismo origen. La sesión usa una cookie HttpOnly, SameSite Strict y Secure en HTTPS. La firma no envía una transacción ni necesita SOL.

Solo se aceptan firmas del mensaje UTF-8 exacto. Una cuenta Ethereum 0x no sirve. La compatibilidad depende de que la wallet permita firmar mensajes Solana; las extensiones reales y dispositivos físicos quedan pendientes de prueba manual.

## Configuración
Aplicar `pnpm db:migrate` y generar el cliente con `pnpm db:generate`.

En la API, configurar `WALLET_AUTH_ORIGINS` con los orígenes exactos autorizados, separados por comas, sin barra final. Por ejemplo: `https://tu-app.vercel.app`. Si se omite, se usa `WEB_ORIGIN`. No se permiten comodines. En desarrollo también se permiten localhost y 127.0.0.1 en el puerto 3000.

Las rutas de correo de la API devuelven 403 fuera de NODE_ENV=test. El entorno test mantiene los fixtures históricos de permisos. Nunca publicar la API con NODE_ENV=test. La ruta web anterior devuelve 403 en todos los entornos.

## Límites
- Cada wallet nueva tiene un espacio independiente. No se implementó vinculación de wallets a empresas antiguas, invitaciones ni recuperación por pérdida de wallet.
- El usuario administrador creado por wallet pertenece solo a su empresa. La wallet no obtiene autoridad sobre el programa Solana.
- Las empresas nuevas necesitan configurar su worker y autoridad blockchain para confirmar evidencias.
- La app Expo muestra un aviso y puede abrir EXPO_PUBLIC_WEB_URL. La autenticación wallet nativa está pendiente.
- Los retos quedan guardados en PostgreSQL; programar su eliminación por antigüedad en el alojamiento de producción.

## Verificación
`tests/e2e/wallet.test.ts` verifica firmas, caducidad, origen, reutilización y continuidad del espacio. `pnpm smoke` verifica el flujo HTTP completo con una clave efímera de prueba, cookies y revocación. Esto no sustituye la prueba manual de conexión con una extensión.

Para la prueba manual: abrir la web, conectar y firmar; comprobar el panel; cerrar sesión; repetir con la misma wallet y comprobar que conserva el espacio. Cancelar una firma debe dejar al usuario fuera del panel.
