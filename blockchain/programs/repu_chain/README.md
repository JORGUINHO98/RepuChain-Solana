# RepuChain — programa Anchor

Programa implementado en fase 3. Contiene initialize_company, register_batch,
record_movement, transfer_custody, authorize_operator, revoke_operator y
verify_batch.

Desde la raíz del monorepo:

```bash
pnpm blockchain:test
```

Las pruebas LiteSVM cargan el archivo SBF real de target/deploy; no sustituyen
el programa por funciones simuladas. Hay 17 escenarios de ejecución y
3 vectores criptográficos Rust contrastados con Node.

Diseño y formato de evidencias: docs/blockchain/phase-3.md.
Estado del despliegue: docs/development/phase-3-report.md.
No se debe asumir que una dirección configurada ya está desplegada.
