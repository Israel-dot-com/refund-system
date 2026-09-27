# AI-Powered Customer Refund System

A production-ready full-stack application that processes customer refund requests through an AI decision engine, built for the WORKNOON Full Stack Engineer assessment.

## Quick Start

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd refund-system

# 2. Copy the env template and add your DeepSeek key
cp .env.example .env
# Edit .env → set DEEPSEEK_API_KEY=sk-...

# 3. Start everything
docker compose up --build
```

| Service           | URL                        |
|-------------------|----------------------------|
| Customer Portal   | http://localhost:3000       |
| Admin Dashboard   | http://localhost:3000/admin |
| Backend API       | http://localhost:4000       |

---

## Running Locally (without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 16

### Backend

```bash
cd refund-system-be
cp .env.example .env          # Fill in DATABASE_URL and DEEPSEEK_API_KEY
npm install
npx prisma db push
npm run db:seed
npm run dev                   # → http://localhost:4000
```

### Frontend

```bash
cd refund-system-fe
npm install
npm run dev                   # → http://localhost:3000
```

---

## Environment Variables

### Root `.env` (used by Docker Compose)

| Variable           | Required | Description                        |
|--------------------|----------|------------------------------------|
| `DEEPSEEK_API_KEY` | ✅        | DeepSeek API key (`sk-...`)        |
| `ADMIN_API_KEY`    | Optional | Admin dashboard key (default shown)|

### Backend `.env`

| Variable           | Required | Description                              |
|--------------------|----------|------------------------------------------|
| `DATABASE_URL`     | ✅        | PostgreSQL connection string             |
| `DEEPSEEK_API_KEY` | ✅        | DeepSeek API key                         |
| `ADMIN_API_KEY`    | ✅        | Key sent in `x-admin-api-key` header     |
| `PORT`             | Optional | API port (default: `4000`)               |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      docker-compose                      │
│                                                          │
│  ┌─────────────┐   ┌──────────────────┐   ┌──────────┐  │
│  │  Next.js 16 │   │  Express + TS    │   │ Postgres │  │
│  │  :3000      │──▶│  :4000           │──▶│  :5432   │  │
│  └─────────────┘   └────────┬─────────┘   └──────────┘  │
│                             │ HTTPS                      │
└─────────────────────────────┼────────────────────────────┘
                              ▼
                   ┌────────────────────┐
                   │  DeepSeek Chat API │
                   │  (function calling)│
                   └────────────────────┘
```

### Tech Stack

| Layer      | Technology                        | Rationale                                  |
|------------|-----------------------------------|--------------------------------------------|
| Frontend   | Next.js 16 + TypeScript           | App Router, SSR-ready, fast dev experience |
| Styling    | Tailwind CSS v4                   | Utility-first, no runtime overhead         |
| Backend    | Express.js + TypeScript           | Lightweight, explicit routing              |
| Database   | PostgreSQL 16 + Prisma ORM        | Relational integrity, type-safe queries    |
| AI         | DeepSeek Chat (function calling)  | Structured JSON output, cost-effective     |
| Containers | Docker + Docker Compose           | Single-command deployment                  |

---

## AI Decision Pipeline

Every refund request goes through a 5-step pipeline. The AI only runs for genuinely ambiguous cases — hard policy rules are enforced deterministically before and after.

```
Customer Message
     │
     ▼
[1] Input Sanitisation
     · Strip HTML / control chars
     · Detect 10+ prompt injection patterns
     · Truncate to 1,000 chars
     │
     ▼
[2] Pre-flight Policy Engine  ← deterministic
     · Final sale?            → DENY (immediate)
     · Order not delivered?   → DENY (immediate)
     · Cancelled order?       → APPROVE (immediate)
     · Outside time window?   → DENY (immediate)
     · >2 refunds / 30 days?  → ESCALATE (fraud signal)
     │ (passes if ambiguous)
     ▼
[3] DeepSeek Chat — function calling
     · Full policy document injected as system prompt
     · Returns: { decision, reasoning, policy_citations,
                  confidence_score, flags }
     │
     ▼
[4] Post-flight Validation    ← deterministic override
     · Final sale cannot be approved regardless of AI output
     · Expired window cannot be approved
     · High-value orders (>$500 std / >$750 premium+VIP) → ESCALATE
     · Low confidence (<60%) → ESCALATE
     │
     ▼
[5] Persist + Audit Log
     · RefundRequest written to DB
     · Every step appended to audit_logs table
```

### Why function calling instead of free-text?

Function calling gives a **typed contract** with the model — if the response doesn't match the schema, the call fails loudly. Free-text parsing is fragile and untestable. This is the production-safe approach.

### Prompt Injection Protection

1. **Input sanitisation** — strips dangerous characters before the AI ever sees the message  
2. **Context-first prompting** — policy document and verified order data are anchored before the customer message  
3. **Structured output only** — function calling prevents free-form text manipulation  
4. **Post-flight rule engine** — hard rules always override AI; final sale can never be approved  
5. **Pattern detection** — phrases like "ignore previous instructions" or "override policy" trigger immediate ESCALATE  
6. **Rate limiting** — 5 submissions per IP per hour  

---

## API Reference

### Public

```
GET  /api/customers
     → List all customers (for portal dropdown)

GET  /api/customers/:id/orders
     → Customer profile + order history

POST /api/refund/submit
     Body: { customerId, orderId, message }
     → { requestId, decision, reasoning, policyCitations,
          flags, confidenceScore, amountRequested }

GET  /api/refund/:requestId
     → Full request detail with audit trail
```

### Admin (requires `x-admin-api-key` header)

```
GET   /api/admin/stats
      → { total, approved, denied, escalated, pending, avgConfidence }

GET   /api/admin/requests?status=&page=&limit=
      → Paginated refund requests with customer + order data

GET   /api/admin/requests/:id
      → Full detail: customer, order, AI reasoning, audit trail

PATCH /api/admin/requests/:id
      Body: { decision: "APPROVED"|"DENIED", override_reason }
      → Human override with audit log entry
```

---

## Synthetic Seed Data — 15 Scenarios

| # | Customer | Scenario | Expected Decision |
|---|----------|----------|-------------------|
| 1 | Alice Johnson | VIP + shipping-damaged | APPROVE |
| 2 | Bob Martinez | Final sale item | DENY |
| 3 | Carol Smith | Premium + $799 order | ESCALATE (high value) |
| 4 | David Lee | 45-day-old order (standard) | DENY (expired window) |
| 5 | Emma Wilson | Wrong item received | APPROVE |
| 6 | Frank Chen | 3rd refund this month | ESCALATE (fraud signal) |
| 7 | Grace Kim | VIP + 40-day-old order | APPROVE (extended window) |
| 8 | Henry Brown | Cancelled order | APPROVE (auto) |
| 9 | Isabel Davis | Customer-damaged item | DENY |
| 10 | James Taylor | Change of mind, in window | APPROVE |
| 11 | Karen White | Story contradicts order record | ESCALATE (AI) |
| 12 | Liam Anderson | Prompt injection attempt | ESCALATE |
| 13 | Mia Thomas | Borderline $499 damage case | AI decides |
| 14 | Noah Jackson | Order still pending | DENY (auto) |
| 15 | Olivia Harris | VIP + $1,200 + fraud flags | ESCALATE |

---

## Design Decisions & Trade-offs

**Custom orchestration over LangChain**  
The pipeline is explicit: sanitise → pre-flight → AI → post-flight → persist. Every step is readable, testable, and auditable. LangChain would abstract away the exact points where trustworthiness is established.

**DeepSeek Chat over GPT-4o**  
DeepSeek's API is OpenAI-compatible (same SDK, same function calling API) so the integration is identical. It offers comparable reasoning quality at significantly lower cost — a practical production consideration.

**PostgreSQL over SQLite**  
The admin dashboard relies on filtering, sorting, joins, and concurrent writes. Postgres signals production intent and handles this without issue. SQLite would have been a shortcut.

**Temperature 0.1**  
Very low temperature for consistent, policy-grounded decisions. We explicitly do not want creative AI outputs in a refund processing context.

**What I'd add in production**  
- Proper authentication (JWT / NextAuth) instead of a shared header key  
- Email / webhook notifications for approved and escalated requests  
- Redis for rate limiting (in-memory resets on restart)  
- Background job queue (BullMQ) for async AI processing under load  
- Comprehensive unit + integration tests  
