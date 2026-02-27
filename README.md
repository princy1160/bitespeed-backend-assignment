# Bitespeed Backend Assignment

Identity reconciliation service that tracks customer contacts across multiple purchases using email and phone number.

**Live API**: https://identity-reconciliation-api-vwtg.onrender.com

## Live API Testing

Health Check:
```bash
curl https://identity-reconciliation-api-vwtg.onrender.com/health
```

Identify Endpoint:
```bash
curl -X POST https://identity-reconciliation-api-vwtg.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","phoneNumber":"123456"}'
```

## Tech Stack
- Node.js + TypeScript
- Express.js
- PostgreSQL

## API Endpoint

### POST /identify

Request:
```json
{
  "email": "test@example.com",
  "phoneNumber": "123456"
}
```

Response:
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["test@example.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

## How it works

- If email or phone is new → creates primary contact
- If email/phone matches existing → creates secondary contact linked to primary
- If request links two primaries → older one stays primary, newer becomes secondary
- Returns consolidated list of all emails and phones

## Setup

1. Install dependencies:
```bash
npm install
```

2. Setup PostgreSQL database and create `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=identity_db
DB_USER=postgres
DB_PASSWORD=yourpassword
PORT=3000
```

3. Initialize database:
```bash
npm run init-db
```

4. Run server:
```bash
npm run dev
```

## Database Schema

```sql
CREATE TABLE Contact (
  id SERIAL PRIMARY KEY,
  phoneNumber VARCHAR(50),
  email VARCHAR(255),
  linkedId INTEGER REFERENCES Contact(id),
  linkPrecedence VARCHAR(20),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP
);
```

## Testing

Use the `test-requests.http` file with REST Client extension or use curl:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","phoneNumber":"123456"}'
```
