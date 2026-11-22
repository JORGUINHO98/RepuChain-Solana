# Modelo de datos de fase 2

El esquema ejecutable está en database/prisma/schema.prisma. Las migraciones
202611200001_initial y 202611200002_constraints crean tablas, índices, claves
foráneas y restricciones. Se aplicaron a repuchain y repuchain_test.

## Entidades implementadas

| Tabla | Responsabilidad |
| --- | --- |
| companies | Empresa, slug único y moneda |
| users | Identidad, contraseña cifrada mediante hash, rol y estado |
| roles | Roles predefinidos por empresa |
| permissions | Catálogo de permisos |
| role_permissions | Asignación normalizada de permisos a roles |
| sessions | Sesiones revocables con expiración absoluta |
| refresh_tokens | Hashes de renovación y marca de consumo |
| categories | Categorías por empresa |
| brands | Marcas por empresa |
| products | SKU, precio decimal, stock mínimo y estado |
| vehicle_models | Marca/modelo e intervalo de años |
| product_compatibilities | Relación producto–modelo vehicular |
| suppliers | Proveedores por empresa |
| warehouses | Almacenes por empresa |
| inventory_batches | Identidad del lote, producto y proveedor |
| stock | Existencias por empresa, lote y almacén |
| inventory_movements | Historial de entradas, salidas y transferencias |
| audit_logs | Actor, operación, entidad, fecha y metadatos mínimos |

Las tablas auxiliares de permisos y sesiones responden a necesidades reales de
RBAC y rotación de tokens. No duplican información de productos ni saldos.

## Invariantes

- UUID como identificadores. Email único por empresa; mismo email puede existir
  en empresas distintas y el login exige companySlug.
- Relaciones entre entidades de empresa mediante (id, companyId).
- SKU, código de almacén, proveedor y lote únicos dentro de cada empresa.
- Stock con clave (companyId, batchId, warehouseId), cantidad >= 0.
- Cantidades enteras positivas en movimientos; origen/destino según tipo.
- Precio Decimal(12,2) y stock mínimo no negativos.
- Restricción única (companyId, idempotencyKey).
- Restricciones de rango de años y expiración de sesiones.
- Triggers impiden modificar o borrar movimientos y registros de auditoría.
- Índices por empresa, lote, almacén y fecha para consultas habituales.

Las entidades históricas no tienen borrado en la API. Productos, usuarios,
proveedores y almacenes se desactivan. Los lotes nacen sin stock.

## Evolución del esquema completo

Las entidades restantes del prompt se diseñan sobre estas relaciones y se
materializarán con sus flujos, sin crear tablas vacías únicamente para completar
una lista:

- purchases: cabecera por empresa, proveedor, estado y moneda;
  purchase_details: producto, cantidad y coste Decimal. La recepción relacionará
  cada lote con su detalle y generará movimientos idempotentes.
- sales: cabecera y estado por empresa; sale_details: producto, cantidad,
  precio y referencias de salida. La asignación de lotes debe preservar el
  rastro del movimiento.
- returns: referencia al detalle original, lote, motivo, estado y movimiento
  compensatorio. No se reescribe una salida previa.
- warranties: referencia al detalle de venta/lote, vigencia y estado del caso.
- blockchain_records y Outbox: evidencia por evento, secuencia por lote, hash
  canónico y anterior, estado, intentos, firma y confirmación. Se incorporarán
  al definir el contrato de evidencias en fases 3–4.

La fase 2 no expone endpoints de compras, ventas, devoluciones o garantías ni
afirma disponer de anclaje blockchain.

## Seed

El seed crea la empresa demo, roles, administrador, un producto, proveedor,
categoría, marca, dos almacenes y un lote. No añade existencias ni reemplaza
contraseñas existentes. Cada ejecución registra seed.run en la auditoría.
