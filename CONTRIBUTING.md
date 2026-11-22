# Contribuir a RepuChain

Usar Node y pnpm fijados en el repositorio, siempre dentro de WSL2/Linux.
Ejecutar `pnpm install --frozen-lockfile`, `pnpm setup:env` y `pnpm check`.
`pnpm smoke` comprueba respuestas HTTP reales tras compilar.
No incorporar secretos, archivos .env, keypairs ni artefactos generados.

Crear módulos con controladores separados de servicios. Compartir contratos
en packages y evitar dependencias web en móvil. Cada fase debe documentar
su alcance, comandos, resultados y pendientes; no marcar pruebas como realizadas
sin haberlas ejecutado. Los cambios de negocio requieren pruebas de invariantes.

No crear funciones vacías ni transacciones simuladas para aparentar integración.
Una exportación móvil no equivale a una prueba nativa; la salud del proceso API
no equivale a disponibilidad de la base de datos o de Solana.
