# API de Mercado de Valores

API REST para consultar información del mercado de valores argentino, portfolio de usuarios y crear ordenes de compra y venta de activos.

## Estructura del proyecto

- **src/api/** - Endpoints y rutas de la API (health, instruments, orders, users)
- **src/db/** - Capa de acceso a datos (DAOs y configuración de Drizzle ORM)
- **src/domain/** - Lógica de negocio (entities, services, types)
- **src/shared/** - Constantes y utilidades compartidas
- **tests/** - Tests funcionales y unitarios
- **dist/** - Código JavaScript compilado (generado)

## Requisitos

- Node.js 20.19.0 o superior
- npm
- Docker y Docker Compose

## Configuración

La aplicación se conecta a una base de datos PostgreSQL remota. 
Es necesario configurar las variables de entorno en el archivo `.env`:

```bash
DATABASE_URL=postgresql://user:password@host:port/dbname
PORT=3000
```

## Cómo ejecutar la aplicación

### Sin Docker

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

### Con Docker

```bash
# Construir y ejecutar con docker-compose
docker-compose up --build
```

La API estará disponible en `http://localhost:3000`

## Endpoints disponibles

IMPORTANTE: puede encontrar a una colección de Postman lista para importar en `postman-collection.json`

### 1. Health Check
Verifica que la API esté funcionando correctamente.

**Ejemplo con curl:**
```bash
curl http://localhost:3000/health
```

### 2. Buscar instrumento
Retorna el listado de activos similares a la busqueda realizada dentro del mercado. Soporta busqueda por ticker o nombre a través del parametro `search`.

**Ejemplo con curl:**
```bash
curl http://localhost:3000/instruments?search=YPFD
```

**Respuesta exitosa (200):**
```json
[
  {
    "id": 1,
    "ticker": "YPFD",
    "name": "YPF S.A.",
    "type": "ACCIONES",
  },
  ...
]
```

### 3. Obtener portfolio del usuario
Obtiene el portfolio de inversiones de un usuario específico `userId`. El endpoint retorna el total de la cuenta de un usuario, sus pesos disponibles para operar y el listado de activos que posee.

**Ejemplo con curl:**
```bash
curl http://localhost:3000/users/123/portfolio
```

**Respuesta exitosa (200):**
```json
{
  "userId": "123",
  "cash": {
    "amount": 4000,
    "currency": "ARS"
  },
  "instruments": [
    {
      "id": 1,
      "ticker": "YPFD",
      "name":"YPF S.A.", 
      "quantity": 10,
      "total_position": 100,
      "total_return_pct": 25,
    }
  ]
```

**Atributos relevantes en respuesta:**
* `cash`: indica los pesos disponibles para operar.

* `total_position`: indica el valor monetario total de la posicion.

* `total_return_pct`: indica el rendimiento total porcentual. Para el calculo se utilizó el algoritmo de *método de costo promedio ponderado móvil*.

### 4. Crear una orden
Crea una nueva orden de compra o venta.

**Ejemplo con curl:**

Para orden del tipo **MARKET** con cantidad de instrumentos (`size`)
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123",
    "instrumentId": 1,
    "side": "BUY",
    "type": "MARKET",
    "size": 5,
  }'
```

Para orden del tipo **MARKET** con monto total de inversion (`amount`)
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123",
    "instrumentId": 1,
    "side": "BUY",
    "type": "MARKET",
    "amount": 5000,
  }'
```

Para orden del tipo **LIMIT** con cantidad de instrumentos (`size`) y precio limite unitario para ejecutar una orden en mercado (`limitPrice`)
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123",
    "instrumentId": 1,
    "side": "BUY",
    "type": "LIMIT",
    "size": 10,
    "limitPrice": 50,
  }'
```

El usuario tiene la posibilidad de realizar ingreso (`"side": "CASH_IN"`) y retiros (`"side": "CASH_OUT"`) de dinero para operar a través del siguiente request:
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123",
    "instrumentId": 66,
    "side": "CASH_IN",
    "type": "MARKET",
    "amount": 5000,
  }'
```

Para operaciones de `CASH_IN/CASH_OUT` se debe usar el `instrumentId` 66 (ARS - tipo MONEDA)

**Respuesta exitosa (201):**
```json
{
  "orderId": "456",
  "userId": "123",
  "ticker": "YPFD",
  "type": "BUY",
  "quantity": 5,
  "price": 20500.00,
  "status": "PENDING",
  "createdAt": "2024-01-15T14:30:00Z"
}
```

Tenga en cuenta que se llevan a cabo una serie de validaciones sobre la solicitud de creacion de ordenes. Puede encontrar todas las validaciones en: `src/api/orders/orders.validators.ts`

## Consideraciones tecnicas
- La API fue desarrollada con el framework Express.js, el codigo base se encuentra integramente escrito en TypeScript y se utilizó Drizzle ORM para la interaccion con modelos de base de datos.
- La API se conecta a una base de datos PostgreSQL remota.
- Se creo una tabla adicional para almacenar la posicion de un determinado activo para un Usuario de la plataforma. Puede encontrar la migración en el siguiente archivo `src/db/drizzle/migrations/0001_wide_sally_floyd.sql`. La información se almacena utilizando una PK compuesta por [userId, instrumentId] y se actualiza la información cada vez que un usuario (`userId`) realiza una compra o venta del instrumento (`instrumentId`). Con esto nos evitamos recorrer todas las ordenes de un usuario al momento de realizar el cálculo de tenencias.
- 

## Consideraciones funcionales
- El calculo de rendimiento total de un activo se realiza utilizando el algoritmo de `método de costo promedio ponderado móvil`.
- Los precios están expresados en pesos argentinos (ARS) por defecto

### Calculo de retorno porcentual
A continuación dejamos un ejemplo del calculo de `total_return_pct` en el recurso que retorna el portfolio de un usuario:

* Si se compran 10 acciones `ABC` a $100 → costo base = $1000 | cantidad de activos = 10
* Si luego se compran 5 acciones `ABC` más a $120 → nuevo costo base = $1600 | cantidad de activos = 15
* Si vendo 6 acciones `ABC` a $130 → nuevo costo base = costo base - (costo promedio unitario * cantidad vendida) = $1600 − ($106,67 * 6) = $960

Entonces, si el valor unitario del activo `ABC` en el mercado es $120, y en portfolio cuento con 9 activos `ABC`, puedo calcular el retorno porcentual de la siguiente forma:

*((cantidad de instrumentos * ultimo precio del mercado - costo base) / costo base ) * 100 =* 

$((9 * 120 - 960) / 960) * 100 =  0,125 * 100 = 12,5%$

## Tests
Se generó un test funcional para validar el flujo completo de compra, venta y calculo de retornos en: `tests/functional.test.ts`. El mismo se puede ejecturar localmente con el comando `npm test`

Los test corren utilizando una base de datos PostgresSQL que corre en un container aislado dedicado a la ejecucion de pruebas. Para esto se utilizó la librería `@testcontainers/postgresql`.

## Mejoras pendientes
* Implementar autenticación de usuarios
* Implementar workflow de ordenes para transicionar ordenes NEW a COMPLETED/REJECTED
* Implementar paginación en endpoint de portfolio
* Implementar índices en base de datos para tabla `orders` para consultas frecuentes: `user_id` y `instrument_id`. También en tabla `stock_positions` para consultas por `user_id`.
* Evaluar caché local o distribuida para almacenar información de activos en consulta por id.
* Generar tabla adicional o reutilizar `stock_positions` para almacenar dinero disponible del usuario. La forma en la que hacemos el calculo hoy en día no escala.
* Implementar un pool de conexiones adecuado para el caso de uso.
* Manejo de errores y logging centralizado.
* Implementacion de alguna solucion para almacenar variables del tipo "secrets", como el password de la DB.
* Incluir test unitarios.
