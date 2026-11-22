# Arquitectura inicial

## Objetivo y límites

Preparar un monorepo ejecutable con separación de presentación, servicios,
persistencia y evidencias. En esta fase solo se implementa salud del proceso;
los módulos de dominio y el programa Anchor se desarrollan después.

## Versiones fijadas

Consultadas el 20 de noviembre de 2026 en el registro npm, en la configuración
oficial bundledNativeModules de Expo y en las herramientas presentes en WSL.

| Componente | Versión |
| --- | --- |
| Node | 24.22.3 |
| pnpm | 10.34.9 |
| Turborepo | 2.11.13 |
| TypeScript | 5.9.3 |
| Next.js | 16.4.6 |
| React / React DOM | 19.3.0 |
| NestJS | 12.6.0 |
| Expo | 58.0.26 |
| Expo Router | 58.0.32 |
| React Native | 0.88.1 |
| Prisma CLI | 7.10.1 |
| PostgreSQL | 17.7, imagen bookworm |
| Solana Kit | 8.6.0 |
| Anchor CLI / futura dependencia Rust | 1.2.2 |
| Solana CLI | 4.1.2 |
| Rust host | 1.100.0 |
| Tailwind / PostCSS | 4.3.5 |
| Zod | 4.6.7 |
| Vitest | 5.1.1 |

Las dependencias directas se fijan sin rangos. pnpm-lock.yaml fija las transitivas.
Prisma 8 estaba marcado como release candidate: se usa Prisma 7 estable.
Prisma Client y su adaptador PostgreSQL se incorporarán en fase 2 al definir
modelos; generar un cliente vacío no aportaría un acceso de datos funcional.

## Compatibilidad y decisiones

1. **React web/móvil.** Expo fija React Native y React. Next admite React 19;
   ambas aplicaciones usan 19.3.0. UI web usa DOM/Radix y no se importa en móvil.
2. **TS y compilación.** Nest usa NodeNext/CommonJS con decoradores. Next y Expo
   usan sus bundlers. Los paquetes compartidos emiten JS/declaraciones y Turbo
   los construye antes de sus consumidores. No se obliga a usar el mismo tsconfig
   para entornos con requisitos distintos.
3. **Metro.** Se usa expo/metro-config con detección nativa de workspaces.
   No se fuerzan aliases de node_modules ni versiones móviles ajenas al SDK.
4. **Prisma 7.** La URL se configura en prisma.config.ts; el schema contiene
   únicamente el datasource. No se crean tablas sin modelo de dominio.
5. **Rust/SBF.** El compilador Rust del host no es el compilador SBF de Solana.
   Se fijan las CLI; compilar y probar el programa corresponde a fase 3.
   El workspace Anchor no tiene miembros hasta entonces. No contiene un ID falso.
6. **Kit/Anchor.** El paquete blockchain-client ofrece únicamente un constructor
   RPC de lectura Devnet. Los codecs se generarán desde una IDL real en fase 3.
   No se presupone compatibilidad entre objetos de web3.js y Kit.
7. **WSL2.** Todo se instala en /home/user23/projects/repu-chain y se ejecuta
   con Node Linux. Evitar npm/pnpm de Windows al trabajar con WSL.
8. **Contenedores.** PostgreSQL usa un volumen y puerto ligado a 127.0.0.1.
   La API escucha en loopback por defecto. No se despliega infraestructura remota.

## Responsabilidades compartidas

- shared-types: contrato HTTP de salud, independiente de Nest/React.
- validation: validación de entorno y respuestas HTTP con Zod.
- ui: componente Button con Radix, CVA y Tailwind; solo web.
- config: base TS estricta sin imponer un runtime.
- utils: nombre y eslogan compartidos.
- blockchain-client: conexión RPC Kit; sin claves, firma ni lógica visual.

Los módulos del prompt se reservan en sus ubicaciones. Sus archivos internos
solo se crearán cuando exista una implementación real. Tampoco se implementan
autenticación, permisos, Outbox o confirmaciones de transacciones en esta fase.

## Diseño previsto para las siguientes fases

La API será la autoridad de las operaciones comerciales y del aislamiento por
empresa. PostgreSQL conservará operaciones e historial; cada transacción de
negocio añadirá su mensaje Outbox en el mismo commit. Un worker procesará el
mensaje con idempotencia y confirmación RPC antes de marcar CONFIRMED. La
serialización canónica, la secuencia por lote y los hashes quedarán definidos y
probados antes de anclar evidencias. La interfaz nunca decidirá si una evidencia
está confirmada.

## Fuentes

- https://docs.expo.dev/guides/monorepos/
- https://unpkg.com/expo@58.0.26/bundledNativeModules.json
- https://nextjs.org/docs/app/getting-started/installation
- https://docs.nestjs.com/first-steps
- https://www.anchor-lang.com/docs/installation
- https://www.anchor-lang.com/docs/references/anchor-toml
- Metadatos npm de cada versión fijada (peerDependencies y engines).
