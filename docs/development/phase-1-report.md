# Entrega de fase 1 — 20 de noviembre de 2026

## Objetivo

Configurar el monorepo RepuChain para WSL2 sin implementar todavía inventario
ni contratos. Se crearon tres aplicaciones, seis paquetes compartidos, un
workspace de base de datos y configuración Anchor/Rust.

## Implementado y comprobado

- Instalación de 797 paquetes, lockfile de pnpm y repetición con --frozen-lockfile.
- TypeScript: 12 tareas correctas, incluyendo builds de dependencias compartidas.
- Vitest: 3 pruebas correctas de entorno y contrato de salud.
- Prisma: datasource y configuración válidos.
- Build: 8 tareas correctas. Next genera / y /_not-found; Nest compila.
- Expo: exportación Android e iOS correcta (1222 y 1219 módulos).
- Expo install --check: dependencias compatibles.
- Smoke HTTP: inicia procesos reales en puertos libres, comprueba salud,
  contrato JSON, CORS permitido/no permitido, 404 y página Next en producción.
  Cierra únicamente los procesos que creó.
- Git inicializado con rama main; sin commit, remoto ni publicación.
- Archivos .env locales preparados mediante copia no destructiva.

## Comandos ejecutados

```bash
corepack enable pnpm
pnpm install
pnpm setup:env
git init -b main
pnpm check
pnpm mobile:check
pnpm smoke
pnpm test
pnpm install --frozen-lockfile
pnpm db:check
```

Los manifiestos package.json contienen todas las dependencias directas exactas;
pnpm-lock.yaml registra las transitivas. La matriz de versiones, decisiones y
fuentes está en ../architecture/phase-1.md. Las variables se describen en
environment.md. El código completo está en los archivos del repositorio.

## Pendiente de verificación

**PostgreSQL local bloqueado por el entorno.** Docker no está integrado con
Ubuntu y db:check devuelve ECONNREFUSED 127.0.0.1:5432. No hay datos ni
migraciones aplicadas. Activar Docker Desktop → Resources → WSL Integration →
Ubuntu, ejecutar pnpm db:up y luego pnpm db:check. La imagen Compose y su
healthcheck no han podido ejecutarse localmente.

La CI incluye un servicio PostgreSQL y db:check, pero aún no se ejecutó en GitHub.
No se ha probado en dispositivo móvil ni se generaron APK/IPA.
No se ha realizado una revisión visual en navegador.
La configuración Rust/Anchor no equivale a un programa compilado: el workspace
no tiene contratos en fase 1. No se ejecutaron anchor build/test/deploy ni se
crearon claves o transacciones.

## Incidencias resueltas

- El ejecutor aislado no iniciaba en la ruta UNC de WSL. Las operaciones se
  ejecutaron desde PowerShell con wsl -d Ubuntu; los archivos permanecen en WSL.
- pnpm inicialmente apuntaba al ejecutable Windows. Se habilitó Corepack en
  Node Linux para garantizar que los scripts usan pnpm Linux.
- Vitest advertía sobre configuración ESM en extensión .ts bajo CommonJS.
  Se cambió a vitest.config.mts y las pruebas volvieron a pasar.
- Los comandos dev usan Turbo para construir paquetes compartidos antes de
  arrancar las aplicaciones, también en una instalación nueva.
- Usar pnpm run doctor explícitamente: pnpm doctor puede resolver al comando
  incorporado del gestor en lugar del script del proyecto.

## Siguiente fase

La fase 1 tiene su código compilado y comprobado, con PostgreSQL pendiente.
No se avanza automáticamente. Después de validar la conexión local, fase 2:
modelo multialmacén/multiempresa, migraciones, autenticación, RBAC y catálogo.

## Comprobaciones adicionales

- pnpm blockchain:check: Devnet respondió mediante @solana/kit a getVersion.
  Es conectividad RPC de lectura; no prueba contratos ni confirmaciones.
- pnpm dev: web y API arrancadas para revisión local.
- HTTP desde WSL: web 200 y API con respuesta de salud correcta.
- HTTP desde Windows: http://127.0.0.1:3000 devolvió 200; API accesible.
  La primera petición a localhost agotó el tiempo de espera; IPv4 explícito pasó.
- Rust 1.100.0 instalado con rustup, rustfmt y clippy. El alias stable existente
  no satisfacía por sí solo el nombre exacto de rust-toolchain.toml.
- Los archivos .env fueron comprobados con git check-ignore.

No se generaron evidencias criptográficas de movimientos en esta fase.
