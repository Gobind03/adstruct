# Marketing Suite

AI-driven Digital Marketing Suite for managing conversational ad campaigns across platforms like ChatGPT and Perplexity.

## Architecture

- **Backend**: Java 21, Spring Boot 3.4, PostgreSQL 16, Flyway
- **Frontend**: Angular 17, Angular Material, SCSS
- **Infrastructure**: Docker Compose, pgAdmin

See [docs/architecture.md](docs/architecture.md) for details.

## Quick Start

### Prerequisites
- Java 21, Node.js 20+, Docker

### 1. Start database
```bash
cd infra && docker compose up -d
```

### 2. Start backend
```bash
cd backend && ./gradlew bootRun --args='--spring.profiles.active=dev'
```

### 3. Start frontend
```bash
cd frontend && npm install && npm start
```

### Access
- Frontend: http://localhost:4200
- Backend API: http://localhost:8080/api/v1
- Swagger UI: http://localhost:8080/swagger-ui
- pgAdmin: http://localhost:5050

### Dev Login
- **Admin**: admin@avyukt.com / password
- **Analyst**: analyst@avyukt.com / password

## Documentation
- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Local Development](docs/local-dev.md)

## Project Structure
```
marketing-suite/
├── backend/          # Spring Boot API
│   ├── src/main/java/com/avyukt/marketsuite/
│   │   ├── auth/         # Authentication
│   │   ├── identity/     # Orgs, workspaces, users
│   │   ├── integration/  # Platform integrations
│   │   ├── campaign/     # Campaigns, targeting, approvals
│   │   ├── measurement/  # Events and analytics
│   │   ├── common/       # Shared utilities
│   │   ├── config/       # Spring configuration
│   │   └── security/     # JWT and security
│   └── src/main/resources/
│       └── db/migration/ # Flyway SQL
├── frontend/         # Angular SPA
│   └── src/app/
│       ├── core/         # Services, guards, interceptors
│       ├── features/     # Feature modules
│       ├── shared/       # Shared components
│       └── layout/       # App shell
├── infra/            # Docker Compose
└── docs/             # Documentation
```
