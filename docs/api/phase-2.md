# API RepuChain — fase 2

Base local: http://127.0.0.1:4000/api/v1

Todas las rutas requieren Authorization: Bearer <accessToken>, salvo salud,
login y refresh. El cuerpo se valida estrictamente: propiedades adicionales
producen 400. Nunca enviar companyId ni actorId en operaciones.

## Rutas

| Método | Ruta | Permiso |
| --- | --- | --- |
| GET | /health, /health/ready | Público |
| POST | /auth/login, /auth/refresh | Público, limitado por IP |
| GET | /auth/me | Sesión activa |
| POST | /auth/logout | Sesión activa |
| GET | /companies/me | Sesión activa |
| GET | /roles | users:manage |
| GET, POST | /users | users:manage |
| PATCH | /users/:id | users:manage |
| GET, POST | /products | catalog:read / catalog:write |
| GET, PATCH | /products/:id | catalog:read / catalog:write |
| GET, POST | /categories, /brands, /vehicles | catalog:read / catalog:write |
| GET, POST | /products/:id/compatibilities | catalog:read / catalog:write |
| GET, POST | /suppliers | suppliers:read / suppliers:write |
| GET, PATCH | /suppliers/:id | suppliers:read / suppliers:write |
| GET, POST | /warehouses | warehouses:read / warehouses:write |
| GET, PATCH | /warehouses/:id | warehouses:read / warehouses:write |
| GET, POST | /batches | inventory:read / inventory:write |
| GET | /inventory | inventory:read |
| GET, POST | /movements | inventory:read / inventory:write |
| GET | /audit | audit:read |

Listas principales: ?page=1&limit=20&search=texto, límite máximo 100.
Responden {items,total,page,limit}. Inventory y movements admiten warehouseId
y batchId. Roles devuelve la lista fija de roles; compatibilities devuelve
hasta 100 asociaciones. No se implementa edición libre de permisos en esta fase.

ADMIN tiene todos los permisos. MANAGER tiene todos salvo users:manage.
OPERATOR consulta catálogo/proveedores/almacenes/inventario y registra
movimientos. VIEWER solo consulta esos módulos.

## Autenticación

POST /auth/login:

```json
{
  "companySlug": "demo",
  "email": "admin@repuchain.local",
  "password": "<SEED_ADMIN_PASSWORD de database/.env>"
}
```

Respuesta: accessToken, refreshToken, tokenType=Bearer, expiresIn=900.
No imprimir ni persistir los tokens en logs. El cliente envía el refreshToken
a POST /auth/refresh y reemplaza ambos tokens con la nueva respuesta. Reutilizar
uno consumido revoca la sesión. Coordinar los refresh desde un único flujo.
POST /auth/logout no necesita cuerpo.

Para una consulta local sin copiar contraseñas ni tokens: pnpm demo:api.

## Crear un producto

POST /products:

```json
{
  "sku": "FIL-002",
  "name": "Filtro de aceite",
  "description": "Repuesto de prueba",
  "unitPrice": "125.50",
  "minimumStock": 5
}
```

categoryId y brandId son UUID opcionales. Los importes se envían como cadenas
decimales y se devuelven como cadenas, sin garantizar ceros finales. La moneda
proviene de la empresa. SKU se normaliza a mayúsculas. PATCH admite solo campos
suministrados y opcionalmente active; nunca asigna cantidades de inventario.

## Crear un lote y registrar una entrada

POST /batches: {code, productId, supplierId?}. El lote queda inicialmente vacío.

POST /movements requiere el encabezado Idempotency-Key con un UUID nuevo para
cada operación lógica. Reutilizarlo únicamente para reintentar la misma
operación con el mismo usuario.

```json
{
  "batchId": "<UUID del lote>",
  "type": "IN",
  "quantity": 10,
  "destinationWarehouseId": "<UUID del almacén>",
  "reason": "Recepción inicial"
}
```

OUT exige sourceWarehouseId y no admite destino. TRANSFER exige origen y destino
distintos. El usuario, la fecha y el fingerprint se determinan en el servidor.
Un reintento correcto devuelve el movimiento original; la respuesta sigue
siendo 201. Una clave usada con otra petición devuelve 409.

## Otros cuerpos

- Usuario: name, email, password (12–128 caracteres), roleId.
- PATCH usuario: name, roleId, active. Cambiar rol o desactivar revoca sesiones.
- Categoría o marca: name.
- Vehículo: make, model, yearFrom, yearTo.
- Compatibilidad: vehicleModelId.
- Proveedor: code, name, email?, phone?; PATCH añade active.
- Almacén: code, name, address?; PATCH añade active.
- Lote: code, productId, supplierId?.

## Errores

400: validación, UUID o dirección de movimiento incorrectos.  
401: token ausente, inválido, expirado o sesión revocada.  
403: permiso insuficiente.  
404: registro inexistente o ajeno a la empresa.  
409: duplicado, stock insuficiente, conflicto o regla de administración.  
429: límite de peticiones.  
503: base no disponible en readiness.

La salud del proceso no representa una confirmación de Solana. En esta fase
no se generan firmas, estados CONFIRMED ni hashes de evidencia blockchain.
