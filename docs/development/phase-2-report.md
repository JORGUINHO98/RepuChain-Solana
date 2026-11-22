# Entrega de fase 2 — 20 de noviembre de 2026

## Objetivo y resultado

Implementar la base de datos y el backend inicial de RepuChain. Se crearon
18 tablas normalizadas y dos migraciones. La API implementa autenticación,
usuarios y roles predefinidos, catálogo, proveedores, almacenes, lotes,
inventario y movimientos auditados.

La fase no incluye panel administrativo, aplicación móvil operativa, compras,
ventas, devoluciones, garantías ni contratos blockchain. La web se actualizó
para mostrar el estado real de fase 2.

## Arquitectura y archivos

- database/prisma/schema.prisma: esquema completo del alcance de fase 2.
- database/prisma/migrations: estructura inicial y restricciones de integridad.
- database/src: Prisma Client, adaptador pg y aprovisionamiento de empresa.
- database/prisma/seed.ts: datos demo idempotentes, sin stock inventado.
- packages/security: scrypt, tokens aleatorios y SHA-256 para idempotencia.
- packages/validation y shared-types: contratos y validaciones compartidas.
- apps/api/src/modules: módulos independientes y controladores/servicios separados.
- apps/api/src/common: validación, contexto autenticado, errores y reintentos.
- tests/integration: pruebas de configuración, validación y contraseñas.
- tests/e2e: API real, PostgreSQL separado y escenarios concurrentes.
- scripts: entorno, comprobación HTTP, pruebas y demostración.
- .github/workflows/ci.yml: CI con migraciones y base de pruebas.
- docs: arquitectura, esquema, API, entorno e instalación.

El código completo está en estos archivos. Los manifiestos y pnpm-lock.yaml
registran dependencias directas y transitivas.

## Dependencias añadidas

@prisma/client 7.10.1, @prisma/adapter-pg 7.10.1,
@nestjs/jwt 12.0.5 y @nestjs/throttler 6.8.0.
Se utiliza scrypt nativo de Node, sin una biblioteca de contraseñas adicional.
PostgreSQL 16.15 se instaló desde los repositorios oficiales de Ubuntu.

## Comandos ejecutados

```bash
apt-get update
apt-get install postgresql-16 postgresql-client-16
service postgresql start
pnpm install
pnpm --filter @repuchain/database format
pnpm --filter @repuchain/database generate
pnpm --filter @repuchain/database exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/phase2-initial.sql
pnpm setup:env
pnpm db:migrate
pnpm db:seed
pnpm db:check
pnpm test
pnpm test:integration
pnpm check
```

También se ejecutaron los scripts bootstrap-postgres.sql y bootstrap-test-db.sql
como usuario postgres. No se borraron bases ni se restablecieron contraseñas.

## Pruebas y resultados

- 8 pruebas unitarias correctas.
- 18 pruebas HTTP con PostgreSQL real correctas.
- Typecheck: 16 tareas correctas.
- Build: 10 tareas correctas.
- Prisma validate: esquema válido.
- Dos migraciones aplicadas en desarrollo y pruebas.
- Seed y conexión PostgreSQL correctos.
- Exportación JavaScript Android/iOS correcta; no equivale a prueba nativa.

Las pruebas verificaron aislamiento entre empresas, referencias cruzadas,
RBAC, credenciales, privacidad de hashes, actualización parcial sin borrar
campos, duplicados, idempotencia concurrente, protección contra stock negativo,
transferencias atómicas, historial inmutable, último administrador, revocación
por cambios de usuario, rotación/reutilización de refresh tokens y rate limiting.

## Incidencias y soluciones

- Docker sin integración WSL: PostgreSQL instalado nativamente.
- El usuario postgres no podía leer la carpeta personal: se transmitió el SQL
  por entrada estándar sin cambiar permisos de la carpeta.
- Tipado de promisify(scrypt): se sustituyó por Promise tipada conservando
  los parámetros de derivación.
- Headers de Nest no admite pipes como segundo argumento: se añadió un
  decorador específico para validar Idempotency-Key.
- Defaults de Zod en PATCH podían restablecer campos omitidos: las validaciones
  de actualización ahora excluyen esos defaults y tienen prueba de regresión.
- Generación Prisma concurrente entre build/typecheck: typecheck depende de
  build y Turbo conserva el código generado en su caché.
- Una revisión automática temporal falló por límite de uso. Tras la indicación
  del usuario de continuar, el reintento permitió completar los archivos pendientes.

## Límites y siguiente fase

La limitación de peticiones usa memoria de un proceso. Las tablas de compras,
ventas y evidencias se incorporarán con sus flujos, según docs/database/phase-2.md.
La auditoría local todavía no está anclada en Solana. No se han realizado
pruebas nativas, despliegue público, CI remota ni revisión visual en navegador.
No se afirma que ninguna transacción blockchain esté confirmada.

Siguiente fase prevista: programa Anchor, PDAs, autoridades y pruebas de
instrucciones. No se avanza automáticamente a fase 3.

## Verificación final de arranque

- pnpm smoke: API real, contrato HTTP, CORS, 404 y página Next de producción correctos.
- pnpm db:test:init: reconoce la base existente sin alterar sus datos.
- pnpm demo:api: login, consulta de empresa/productos/almacenes/lotes/inventario y logout correctos.
- API de desarrollo reiniciada desde la instancia anterior para cargar fase 2.
- Desde Windows: GET /api/v1/health/ready devuelve base disponible; web HTTP 200.
- pnpm install --frozen-lockfile: instalación reproducible correcta.
- git check-ignore: secretos locales y Prisma generado excluidos de Git.

La web y la API quedan iniciadas en 127.0.0.1:3000 y 127.0.0.1:4000.