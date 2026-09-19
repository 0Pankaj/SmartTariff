# SmartTariff Backend (Node.js + Express + Prisma)

This is the Node.js foundation of the SmartTariff backend, migrating from FastAPI + SQLite to Express + PostgreSQL + Prisma ORM.

## Project Structure
```text
backend-node/
├── src/
│   ├── config/          # Environment and database singleton configuration
│   ├── controllers/     # Route request/response handlers
│   ├── middleware/      # Centralized error handling and security
│   ├── routes/          # API route modules
│   ├── services/        # Business logic and ML integration
│   ├── utils/           # Helper functions and response envelope formatters
│   ├── app.js           # Express app setup and middleware chain
│   └── server.js        # Server listener and bootstrap
├── prisma/
│   └── schema.prisma    # PostgreSQL Prisma schema definition
├── scripts/             # Utility and migration scripts
├── tests/               # Automated unit and integration tests
├── .env.example         # Environment variables template
├── package.json
└── README.md
```

## Setup & Running
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate Prisma Client:
   ```bash
   npm run prisma:generate
   ```
4. Start development server:
   ```bash
   npm run dev
   ```
5. Check health:
   ```bash
   curl http://localhost:5000/health
   ```
