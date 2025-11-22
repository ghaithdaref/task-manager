# API Reference

Base URL (development): `http://localhost:4000`

All endpoints (unless noted) require a Bearer access token obtained via the auth endpoints. Send the token in the `Authorization: Bearer <access>` header. Refresh tokens are stored in the `refresh_token` HTTP-only cookie.

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create a new account and return access + refresh tokens |
| POST | `/auth/login` | Authenticate a user and return tokens |
| POST | `/auth/refresh` | Issue a new access token using the refresh cookie |
| POST | `/auth/logout` | Revoke the refresh token and clear the cookie |
| POST | `/auth/change-password` | Update the current user password (requires auth) |

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "name": "Ava Focus",
  "email": "ava@example.com",
  "password": "Sup3r$ecret"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "ava@example.com",
  "password": "Sup3r$ecret"
}
```

Response for both register/login:
```json
{
  "accessToken": "...",
  "user": { "id": "uuid", "name": "Ava Focus", "email": "ava@example.com" }
}
```

### Refresh Access Token
```http
POST /auth/refresh
Cookie: refresh_token=<token>
```
Response:
```json
{ "accessToken": "..." }
```

### Change Password
```http
POST /auth/change-password
Authorization: Bearer <access>

{
  "currentPassword": "Sup3r$ecret",
  "newPassword": "N3w$ecret123"
}
```

## Tasks

All task routes require authentication.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks` | List current user tasks (supports `status`, `priority`, `search`, `from`, `to` query params) |
| POST | `/tasks` | Create a task |
| PATCH | `/tasks/:id` | Update a task (partial updates allowed) |
| DELETE | `/tasks/:id` | Delete a task |

### Create Task
```http
POST /tasks
Authorization: Bearer <access>
Content-Type: application/json

{
  "title": "Deep work block",
  "description": "Ship focus mode",
  "dueDate": "2025-11-21",
  "status": "pending",
  "priority": "high"
}
```

### Update Task Status
```http
PATCH /tasks/c2c3...
Authorization: Bearer <access>

{ "status": "completed" }
```

## Recurring Rules

| Method | Path | Description |
|--------|------|-------------|
| GET | `/recurring` | List recurrence rules |
| POST | `/recurring` | Create a rule (`title`, `priority`, `type`, `interval`, optional `endDate`, `enabled`) |
| PATCH | `/recurring/:id` | Update a rule |
| DELETE | `/recurring/:id` | Delete a rule |
| POST | `/recurring/generate` | Generate the next 30 days of tasks from enabled rules |

### Create Rule Example
```http
POST /recurring
Authorization: Bearer <access>

{
  "title": "Weekly review",
  "priority": "medium",
  "type": "weekly",
  "interval": 1,
  "enabled": true
}
```

## Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/summary` | Returns `{ totalCompleted, avgPerDay, productivity }` for the last 30 days |

---

### Error Format
Most endpoints return structured errors:
```json
{
  "error": "invalid_input",
  "message": "Human readable message",
  "details": { ...optional validation info... }
}
```

Use the HTTP status code and `error` string to branch UI logic.

