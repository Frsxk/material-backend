# Material Forms Backend

REST API for [Material Forms](https://material-forms.netlify.app), a form-builder application. Built with **ElysiaJS**, **Prisma**, and **PostgreSQL**, running on the **Bun** runtime.

## Features

- JWT authentication (register, login, session)
- Form CRUD with publish/close lifecycle
- Public form submission with required-field validation
- Per-form analytics and CSV export
- Rate limiting on submissions
- OpenAPI documentation (Scalar UI at `/openapi`)

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- PostgreSQL database

## Setup

1. **Clone and install dependencies**

```bash
git clone https://github.com/Frsxk/material-backend.git
cd material-backend
bun install
```

2. **Configure environment variables**

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/material_forms"
JWT_SECRET="your-secret-key"
```

3. **Run database migrations**

```bash
bunx prisma migrate deploy
```

4. **Start the development server**

```bash
bun run dev
```

The API will be available at `http://localhost:5000`.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server with watch mode |
| `bun test` | Run integration tests |
| `bunx prisma migrate dev` | Create a new migration |
| `bunx prisma migrate deploy` | Apply pending migrations |