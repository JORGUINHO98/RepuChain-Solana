# WSL2 Ubuntu — fase 2

## Instalación utilizada

En este equipo se instaló PostgreSQL 16.15 desde Ubuntu 24.04 para resolver la
ausencia de integración Docker. La base real es repuchain; las pruebas usan
repuchain_test. Ambas pertenecen al rol local repuchain.

En una instalación nueva de Ubuntu:

```bash
sudo apt-get update
sudo apt-get install postgresql-16 postgresql-client-16
sudo service postgresql start
cd ~/projects/repu-chain
sudo cat scripts/bootstrap-postgres.sql | sudo -u postgres psql -v ON_ERROR_STOP=1
sudo cat scripts/bootstrap-test-db.sql | sudo -u postgres psql -v ON_ERROR_STOP=1
source ~/.nvm/nvm.sh
nvm install
nvm use
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm setup:env
pnpm db:migrate
pnpm db:seed
pnpm check
pnpm test:integration
pnpm dev
```

Los scripts SQL solo crean recursos ausentes; no resetean bases ni roles.
Usan la contraseña local de ejemplo, sin privilegios de superusuario para la
API. No reutilizar esas credenciales en un despliegue público.

Si repuchain_test ya existe, pnpm db:test:init confirma su existencia.
Crear una base nueva exige permiso CREATEDB: con la instalación nativa usar
el script SQL como postgres, sin conceder ese permiso a la API.

## Alternativa Docker

Activar Docker Desktop → Settings → Resources → WSL Integration → Ubuntu.
En una máquina que use Docker, no iniciar también PostgreSQL nativo en el mismo
puerto. pnpm db:up levanta PostgreSQL 17.7 según compose.yaml. Después ejecutar
setup:env, db:migrate y db:seed. La CI usa esta imagen; la verificación local
de esta entrega se realizó con PostgreSQL nativo 16.15.

## Ejecución y demostración

- pnpm dev: API y pantalla web.
- pnpm demo:api: login local, consultas de demostración y logout.
- pnpm dev:mobile: Metro/Expo; configurar IP accesible en EXPO_PUBLIC_API_URL.
- pnpm smoke: procesos temporales en puertos libres, sin ocupar los de desarrollo.
- pnpm test:integration: migraciones y pruebas HTTP en la base de prueba.

La API escucha en loopback. Para dispositivos LAN, ajustar HOST, firewall y
red de WSL conscientemente. La integración móvil operativa corresponde a fase 6.

## Rust y Solana

Se mantienen Rust 1.100.0, Anchor 1.2.2 y Solana CLI 4.1.2 de fase 1.
No se ejecuta anchor deploy ni se crean wallets durante fase 2.
