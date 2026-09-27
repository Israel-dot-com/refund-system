# AI-Powered Customer Support Refund System

A production-minded full-stack application for processing customer refund requests using an AI-powered decision engine, built as part of a Full Stack Engineer assessment.

## Quick Start (Docker)

```bash
# 1. Clone the repo and navigate to it
git clone <repo-url> && cd refund-system

# 2. Copy the env template and add your OpenAI key
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...

# 3. Bring everything up
docker-compose up --build
```

| Service | URL |
|---|---|
| Customer Portal | http://localhost:3000 |
| Admin Dashboard | http://localhost:3000/admin |
| Backend API | http://localhost:4000 |
| Health Check | http://localhost:4000/health |

---

## Running Locally (Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 16 running locally (or use Docker just for the DB)

### Backend

```bash
cd refund-system-be
cp .env.example .env          # Fill in your values
npm install
npx prisma migrate dev --name init
npm run db:seed               # Seeds 15 customers with orders
npm run dev                   # Starts on port 4000
```

### Frontend

```bash
cd refund-system-fe
npm install
npm run dev                   # Starts on port 3000
```

---

## Environment Variables

### Root `.env` (for Docker)

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | OpenAI API key (GPT-4o) |
| `ADMIN_API_KEY` | Optional | Admin dashboard API key (default: `admin-secret-key`) |

### Backend `.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `ADMIN_API_KEY` | ✅ | Key for admin route protection |
| `PORT` | Optional | API port (default: 4000) |

### Frontend `.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: http://localhost:4000) |
| `NEXT_PUBLIC_ADMIN_KEY` | Admin API key for dashboard requests |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         docker-compose                              │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │   Next.js    │    │   Express API    │    │   PostgreSQL     │  │
│  │  (port 3000) │◄──►│   (port 4000)   │◄──►│   (port 5432)   │  │
│  │              │    │                  │    │                  │  │
│  │ • Customer   │    │ • /api/refund    │    │ • customers      │  │
│  │   Portal     │    │ • /api/admin     │    │ • orders         │  │
│  │ • Admin      │    │ • /api/customers │    │ • refund_requests│  │
│  │   Dashboard  │    │                  │    │ • audit_logs     │  │
│  └──────────────┘    └────────┬─────────┘    └──────────────────┘  │
│                               │                                     │
└───────────────────────────────┼─────────────────────────────────────┘
                                │ HTTPS
                                ▼
                    ┌───────────────────────┐
                    │   OpenAI GPT-4o API   │
                    │   (function calling)  │
                    └───────────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 + TypeScript | SSR flexibility, App Router, modern DX |
| Styling | Tailwind CSS | Fast, consistent, utility-first |
| Backend | Express.js + TypeScript | Lightweight, clear routing, easy to reason about |
| Database | PostgreSQL + Prisma ORM | Relational data, type-safe queries |
| AI | OpenAI GPT-4o (function calling) | Structured JSON output, production-safe |
| Containers | Docker + docker-compose | Single command deployment |

---

## AI Integration

The AI layer uses **OpenAI GPT-4o with function calling** — not free-text parsing — for structured, reliable decision output.

### Decision Pipeline

```
Customer Request
    │
    ▼
[1] Input Sanitization
    - Strip control chars, HTML, code fences
    - Detect 10+ prompt injection patterns
    - Truncate to 1000 chars
    │
    ▼
[2] Pre-flight Policy Engine (deterministic)
    - Final sale? → DENY immediately
    - Order not delivered? → DENY
    - Cancelled order? → APPROVE immediately
    - Outside time window? → DENY
    - >2 refunds in 30 days? → ESCALATE
    │ (passes if ambiguous)
    ▼
[3] AI Decision (OpenAI GPT-4o)
    - Full policy document in system prompt
    - Sanitized customer data as context
    - function_calling schema enforces structured output
    - Returns: { decision, reasoning, policy_citations, confidence_score, flags }
    │
    ▼
[4] Post-flight Validation (deterministic)
    - Final sale can NEVER be approved (AI override protection)
    - Expired window cannot be approved
    - High-value orders forced to ESCALATE
    - Low confidence (<60%) → ESCALATE
    │
    ▼
[5] Persist + Audit Log
    - Refund request stored in DB
    - Every step logged to audit_logs table
    │
    ▼
[6] Response to Frontend
```

### Why function calling vs. free-text?

Free-text AI responses require fragile parsing. Function calling gives us a **typed contract** with the model — if the response doesn't fit the schema, the call fails loudly. This is the production-safe approach.

### Prompt Injection Protection

1. **Input sanitization** — strips dangerous characters before reaching the AI
2. **Context-first prompting** — policy document and order facts are placed before the customer message (anchors the model)
3. **Structured output only** — function calling prevents free-form manipulation
4. **Post-flight rule engine** — hard rules override AI decisions; final sale can never be approved regardless of AI output
5. **Injection pattern detection** — "ignore previous instructions", "override policy", etc. trigger immediate ESCALATE
6. **Rate limiting** — 5 refund submissions per customer per hour

---

## API Reference

### Public Endpoints

```
POST /api/refund/submit
  Body: { customerId, orderId, message }
  Returns: { requestId, decision, reasoning, policyCitations, flags, confidenceScore, amountRequested }

GET /api/refund/:requestId
  Returns: Full refund request with audit trail

GET /api/customers
  Returns: List of all customers

GET /api/customers/:id/orders
  Returns: Customer profile + order history
```

### Admin Endpoints (requires `x-admin-api-key` header)

```
GET /api/admin/stats
  Returns: { total, approved, denied, escalated, pending, avgConfidence }

GET /api/admin/requests?status=&page=&limit=
  Returns: Paginated refund requests

GET /api/admin/requests/:id
  Returns: Full request detail with customer, order, and audit trail

PATCH /api/admin/requests/:id
  Body: { decision: "APPROVED"|"DENIED", override_reason }
  Returns: Updated request (human override with audit log)
```

---

## Synthetic Data — 15 Customer Scenarios

| Customer | Scenario | Expected Decision |
|---|---|---|
| Alice Johnson | VIP + shipping-damaged item | APPROVE |
| Bob Martinez | Final sale item | DENY |
| Carol Smith | Premium + $799 order | ESCALATE (high value) |
| David Lee | 45-day-old order (standard) | DENY (expired window) |
| Emma Wilson | Wrong item received | APPROVE |
| Frank Chen | 3rd refund this month | ESCALATE (fraud signal) |
| Grace Kim | VIP + 40-day-old order | APPROVE (extended window) |
| Henry Brown | Cancelled order | APPROVE (auto) |
| Isabel Davis | Customer-damaged item | DENY |
| James Taylor | Change of mind, in window | APPROVE |
| Karen White | Story contradicts order record | ESCALATE (AI) |
| Liam Anderson | Prompt injection attempt | ESCALATE |
| Mia Thomas | Borderline $499 damage case | AI decides |
| Noah Jackson | Order still pending | DENY (auto) |
| Olivia Harris | VIP + $1200 + fraud flags | ESCALATE |

---

## Assumptions & Trade-offs

### Deliberate choices

- **Custom orchestration over LangChain** — keeps the AI layer explicit, testable, and understandable. Pre-flight rules → AI → post-flight validation is a clear, auditable flow. LangChain would abstract away the very things that make this system trustworthy.
- **PostgreSQL over SQLite** — the admin dashboard needs filtering, sorting, joins, and audit logs. Postgres signals production intent and handles concurrent requests without issue.
- **Function calling over free-text parsing** — structured JSON output from the AI is non-negotiable for a production system. Any deviation from the schema fails loudly.
- **Temperature 0.1** — very low temperature for consistent, policy-grounded decisions. We don't want creative AI outputs here.

### What I'd add in production

- Proper authentication (NextAuth.js / JWT) instead of a shared admin API key
- Email/webhook notifications for escalated and approved refunds
- A human-in-the-loop queue UI for escalated requests
- Streaming AI responses for better UX on slow connections
- Redis for rate limiting (vs. in-memory, which resets on restart)
- Background job queue (BullMQ) for async AI processing
- Comprehensive unit and integration tests
