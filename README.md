# Inteli -Safe

SaaS completo de gestión de usuarios y roles con autenticación JWT, dashboard administrativo y CRUD completo.

## Stack tecnológico

| Capa       | Tecnología                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, Bootstrap 5         |
| Backend    | Node.js, Express 4                  |
| Base de datos | MongoDB 7                        |
| Auth       | JWT (jsonwebtoken)                  |
| Contenedores | Docker, Docker Compose            |

## Estructura del proyecto

```
Inteli PDE/
├── backend/
│   ├── src/
│   │   ├── config/        # Conexión a MongoDB
│   │   ├── controllers/   # Lógica de negocio
│   │   ├── middleware/    # Auth JWT y validación
│   │   ├── models/        # Modelos Mongoose (User, Role)
│   │   ├── routes/        # Rutas de la API
│   │   ├── utils/         # Utilidades (JWT)
│   │   ├── index.js       # Entry point
│   │   └── seed.js        # Datos iniciales
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Navbar, Layout, etc.
│   │   ├── context/       # AuthContext
│   │   ├── pages/         # Login, Dashboard, Users, Roles
│   │   └── services/      # Cliente API (axios)
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Funcionalidades

- **Autenticación**: Registro e inicio de sesión con JWT
- **Dashboard**: Estadísticas de usuarios y roles
- **Usuarios**: CRUD completo (solo admin)
- **Roles**: CRUD completo con permisos (solo admin)
- **Autorización**: Rutas protegidas por rol (admin / user)

## Inicio rápido con Docker

```bash
# Clonar e ingresar al proyecto
cd "Inteli PDE"

# Definir un secreto único (32+ caracteres) antes de levantar los servicios
export JWT_SECRET="reemplazar-por-un-secreto-largo-y-aleatorio"

# Levantar todos los servicios
docker compose up -d --build

# Cargar datos demo (destructivo: elimina usuarios y roles existentes)
ALLOW_DESTRUCTIVE_SEED=true docker compose --profile seed run --rm seed

# Acceder a la aplicación
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000/api
```

### Credenciales demo

| Rol   | Email                  | Contraseña |
|-------|------------------------|------------|
| Admin | admin@intelipde.com    | admin123   |
| User  | user@intelipde.com     | user123    |

## Desarrollo local (sin Docker)

### Requisitos

- Node.js 20+
- MongoDB 7+ corriendo localmente

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed    # Cargar datos iniciales
npm run dev     # http://localhost:5000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev     # http://localhost:3000
```

## API Endpoints

### Auth (público)

| Método | Ruta              | Descripción        |
|--------|-------------------|--------------------|
| POST   | /api/auth/register | Registro          |
| POST   | /api/auth/login    | Login             |
| GET    | /api/auth/me       | Usuario actual    |

### Dashboard (autenticado)

| Método | Ruta                    | Descripción     |
|--------|-------------------------|-----------------|
| GET    | /api/dashboard/stats    | Estadísticas    |

### Usuarios (admin)

| Método | Ruta            | Descripción       |
|--------|-----------------|-------------------|
| GET    | /api/users      | Listar usuarios   |
| GET    | /api/users/:id  | Obtener usuario   |
| POST   | /api/users      | Crear usuario     |
| PUT    | /api/users/:id  | Actualizar usuario|
| DELETE | /api/users/:id  | Eliminar usuario  |

### Roles (lectura: autenticado, escritura: admin)

| Método | Ruta            | Descripción    |
|--------|-----------------|----------------|
| GET    | /api/roles      | Listar roles   |
| GET    | /api/roles/:id  | Obtener rol    |
| POST   | /api/roles      | Crear rol      |
| PUT    | /api/roles/:id  | Actualizar rol |
| DELETE | /api/roles/:id  | Eliminar rol   |

## Variables de entorno

### Backend (`backend/.env`)

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/inteli_pde
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
COOKIE_SECURE=false
TRUST_PROXY=false
```

### Frontend (`frontend/.env`)

```
VITE_API_URL=http://localhost:5000/api
```

En producción, configurá `COOKIE_SECURE=true`, un `JWT_SECRET` único de al menos 32 caracteres y `CORS_ORIGINS` con los orígenes HTTPS permitidos separados por coma. La sesión principal usa una cookie `HttpOnly`; el soporte Bearer se conserva para clientes existentes.

## Verificación

```bash
cd backend && npm test
cd ../frontend && npm run build
```

## Despliegue en Vercel

La aplicación se despliega desde este monorepo como dos proyectos de Vercel y usa MongoDB Atlas:

1. Creá el proyecto de backend con `backend` como **Root Directory**.
2. Configurá `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN=7d`, `NODE_ENV=production`,
   `COOKIE_SECURE=true`, `TRUST_PROXY=true` y `CORS_ORIGINS` con la URL del frontend.
3. Opcionalmente configurá `OPENAI_API_KEY` y `OPENAI_MODEL` para habilitar las funciones de IA.
4. Creá el proyecto de frontend con `frontend` como **Root Directory**.
5. Configurá `VITE_API_URL` con la URL del backend seguida de `/api`, y volvé a desplegar.

El `vercel.json` del frontend conserva las rutas de la SPA y Vercel detecta el entrypoint
Express del backend de forma nativa. Docker Compose continúa disponible para desarrollo local o VPS.

La arquitectura y el contrato del botón **Analizar con IA** están documentados en [docs/AI_BUILDING_ANALYSIS.md](docs/AI_BUILDING_ANALYSIS.md).

El ciclo de vista previa, edición, rechazo y aceptación de la propuesta está documentado en [docs/AI_EVACUATION_PROPOSAL.md](docs/AI_EVACUATION_PROPOSAL.md).

La fórmula de completitud y las reglas condicionales del informe PDF están documentadas en [docs/PDF_REPORT_CALCULATION.md](docs/PDF_REPORT_CALCULATION.md).

## Comandos Docker útiles

```bash
# Ver logs
docker compose logs -f

# Detener servicios
docker compose down

# Detener y eliminar volúmenes
docker compose down -v

# Reconstruir un servicio
docker compose up -d --build backend
```

## Licencia

MIT
