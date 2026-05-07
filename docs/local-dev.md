# Local Development Guide

## Prerequisites

- Java 21 (recommend SDKMAN: `sdk install java 21-tem`)
- Node.js 20+ and npm 10+
- Docker and Docker Compose
- Git

## Quick Start

### 1. Start Infrastructure

```bash
cd infra
docker compose up -d
```

This starts:
- **PostgreSQL** on port 5433 (db: marketsuite, user: marketsuite, pass: marketsuite)
- **pgAdmin** on port 5050 (email: admin@avyukt.com, pass: admin)

> Port 5433 is used to avoid conflicts with a local PostgreSQL installation.
> Override with `PG_HOST_PORT=5432 docker compose up -d` if you prefer 5432.

### 2. Run Backend

```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=dev'
```

Backend starts on http://localhost:8080

- Swagger UI: http://localhost:8080/swagger-ui
- API Docs: http://localhost:8080/api-docs
- Actuator: http://localhost:8080/actuator

Flyway runs migrations automatically, including seed data.

### 3. Run Frontend

```bash
cd frontend
npm install
npm start
```

Frontend starts on http://localhost:4200

### Dev Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@avyukt.com | password | ADMIN |
| analyst@avyukt.com | password | ANALYST |

## Docker Compose (Full Stack)

To run everything in containers:

```bash
cd infra
docker compose --profile full up --build
```

## Useful Commands

```bash
# Backend tests
cd backend && ./gradlew test

# Format code
cd backend && ./gradlew spotlessApply

# Frontend tests
cd frontend && npm test

# Frontend lint
cd frontend && npm run lint
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | localhost | PostgreSQL host |
| DB_PORT | 5433 | PostgreSQL port |
| DB_NAME | marketsuite | Database name |
| DB_USER | marketsuite | Database user |
| DB_PASS | marketsuite | Database password |
| JWT_SECRET | (dev default) | JWT signing key |
| ENCRYPTION_KEY | (dev default) | AES encryption key |
