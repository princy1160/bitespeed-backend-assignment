# Identity Reconciliation API

Bitespeed Backend Task: A web service for identifying and reconciling customer identities across multiple purchases.

## 🚀 Live API

**Base URL:** `[Your Render deployment URL]`

**Endpoints:**
- `POST /identify` - Identify and consolidate contacts
- `GET /health` - Health check

## 📖 API Documentation

### POST /identify

Identifies and consolidates contact information across multiple purchases.

**Request:**
```bash
curl -X POST https://your-app.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "phoneNumber": "123456"}'
```

**Request Body:**
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```
*Note: At least one field is required*

**Response (200):**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["user@example.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

### GET /health

**Request:**
```bash
curl https://your-app.onrender.com/health
```

**Response (200):**
```json
{
  "status": "OK",
  "message": "Identity Reconciliation Service is running"
}
```

## 🎯 How It Works

The service intelligently links customer identities by:

1. **New Customer**: Creates a primary contact when neither email nor phone exists
2. **Returning Customer**: Creates a secondary contact when new info shares email/phone with existing contact
3. **Merging Contacts**: When two primary contacts are linked, the oldest remains primary
4. **Consolidation**: Returns all linked emails, phones, and secondary contact IDs

**Example Scenario:**
- Purchase 1: `email=user1@test.com, phone=111` → Creates primary contact (ID: 1)
- Purchase 2: `email=user2@test.com, phone=111` → Creates secondary contact (ID: 2) linked to ID: 1
- Purchase 3: `email=user1@test.com, phone=111` → Returns consolidated: emails=[user1@test.com, user2@test.com], phones=[111], secondaryContactIds=[2]

## 🛠 Technology Stack

- **Backend**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Hosting**: Render.com (Free Tier)

## 🚀 Deployment to Render

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/identity-reconciliation-api.git
git push -u origin main
```

### Step 2: Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - Name: `identity-reconciliation-db`
   - Database: `identity_db`
   - User: `identity_user`
   - Plan: **Free**
4. Click **"Create Database"**
5. Save the connection details (Host, Port, Database, User, Password)

### Step 3: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - Name: `identity-reconciliation-api`
   - Runtime: **Node**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: **Free**

### Step 4: Set Environment Variables

Add these in the **"Environment"** section:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DB_HOST` | *(from Render PostgreSQL - Internal Host)* |
| `DB_PORT` | `5432` |
| `DB_NAME` | *(from Render PostgreSQL)* |
| `DB_USER` | *(from Render PostgreSQL)* |
| `DB_PASSWORD` | *(from Render PostgreSQL)* |

### Step 5: Initialize Database

After deployment completes:

1. Go to your web service → **Shell** tab
2. Run: `npm run init-db`
3. Verify: "Database initialized successfully"

### Step 6: Test Your Deployment

```bash
# Health check
curl https://your-app.onrender.com/health

# Test identify endpoint
curl -X POST https://your-app.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","phoneNumber":"123456"}'
```

## 💡 Examples

### Example 1: First Purchase
```bash
curl -X POST https://your-app.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"lorraine@hillvalley.edu","phoneNumber":"123456"}'
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

### Example 2: Same Phone, New Email
```bash
curl -X POST https://your-app.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"mcfly@hillvalley.edu","phoneNumber":"123456"}'
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

### Example 3: Linking Two Primary Contacts
```bash
# Assumes george@hillvalley.edu (ID: 11) and biffsucks@hillvalley.edu (ID: 27) exist separately
curl -X POST https://your-app.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"george@hillvalley.edu","phoneNumber":"717171"}'
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 11,
    "emails": ["george@hillvalley.edu", "biffsucks@hillvalley.edu"],
    "phoneNumbers": ["919191", "717171"],
    "secondaryContactIds": [27]
  }
}
```

## 🏃 Running Locally

1. **Clone & Install:**
   ```bash
   git clone <your-repo-url>
   cd identity-reconciliation-api
   npm install
   ```

2. **Setup Database:**
   ```bash
   # Create PostgreSQL database
   createdb identity_db
   
   # Initialize schema
   npm run init-db
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your local database credentials
   ```

4. **Run:**
   ```bash
   npm run dev  # Development mode with hot reload
   npm start    # Production mode
   ```

## 📝 Database Schema

```sql
CREATE TABLE Contact (
  id SERIAL PRIMARY KEY,
  phoneNumber VARCHAR(50),
  email VARCHAR(255),
  linkedId INTEGER REFERENCES Contact(id),
  linkPrecedence VARCHAR(20) CHECK (linkPrecedence IN ('primary', 'secondary')),
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP WITH TIME ZONE
);
```

## ⚠️ Important Notes

- **Free Tier Limitations**: Service spins down after 15 minutes of inactivity; first request may take 30-60 seconds
- **Database Size**: Free PostgreSQL limited to 1GB
- **Request Format**: Use JSON body, not form-data
- **Response Typo**: `primaryContatctId` is intentional (matches specification)

## 📞 Testing Tools

- **cURL** (command line)
- **Postman** (GUI client)
- **Thunder Client** (VS Code extension)
- **test-requests.http** (included with REST Client extension)

## 👥 Author

Created for Bitespeed Backend Task - Identity Reconciliation

## 📄 License

MIT
