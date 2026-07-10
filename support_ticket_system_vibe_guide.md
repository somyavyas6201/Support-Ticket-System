# Vibe Coding Guide — HelpDesk Pro Customer Support Ticket System
This guide contains a series of **11 sequential prompts** designed for students to build a full-stack customer support / help desk system with the **MERN stack** (MongoDB, Express, React, Node.js), Socket.IO for real-time chat/updates, JWT authentication, and Stripe for billing.

By feeding these prompts to an AI coding assistant (like Gemini, Claude, or ChatGPT) step-by-step, students can construct the exact architecture, functionalities, and interactive pages of the app, while customizing the colors, style, and branding to their liking.

---

## Technical Architecture & Setup Rules

To ensure students do not run into common MERN, real-time, or auth bugs, the prompts incorporate specific guardrails for these known pain points:
1. **Monorepo Structure**: Use a `/client` (React + Vite) and `/server` (Express + Node) folder split, with a root `package.json` using `concurrently` to run both dev servers together.
2. **Environment Variables**: Never hardcode secrets. Use `.env` in `/server` (MONGO_URI, JWT_SECRET, STRIPE_SECRET_KEY, CLIENT_URL) and `.env` in `/client` (VITE_API_URL, VITE_SOCKET_URL). Provide a `.env.example` for both.
3. **CORS & Cookies**: Configure `cors` middleware in Express with `credentials: true` and matching `origin`, since JWT will be stored in an httpOnly cookie to prevent XSS token theft.
4. **Socket.IO Auth Handshake**: Attach the JWT to the Socket.IO handshake (`auth` payload) and verify it server-side in a connection middleware before allowing a client to join ticket-specific rooms (`ticket_<id>`).
5. **Mongoose Schema Validation**: Use `enum` fields for `status`, `priority`, and `role` so invalid values are rejected at the database layer, not just the frontend.
6. **Keyless Payments (Sandbox Simulator)**: Allow testing billing flows locally without real Stripe keys by detecting placeholder keys (`sk_test_yourkeyhere`) and falling back to a mock checkout simulator modal, mirroring how real Stripe Checkout would behave.
7. **React State Sync**: Use React Context + `useReducer` for global ticket/chat state, and keep Socket.IO listeners in a single custom hook (`useSocket.js`) to avoid duplicate event bindings on re-render.

---

# Prompt Sequence

### Step 1: Monorepo Scaffolding, Theme & Global Styles
> **Student Action**: Copy and paste the prompt below to start the project. Tell the AI what custom colors you want to use.

```text
Initialize a MERN stack project in the current folder with this structure:
- Root: package.json using `concurrently` to run client + server together with `npm run dev`.
- `/server`: Express + Node app with ES modules, nodemon for dev.
- `/client`: React app scaffolded with Vite (JavaScript, not TypeScript), no CSS framework — we want clean, modern vanilla CSS for full design control.

Let's set up the design system:
1. Install server dependencies: `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `cors`, `cookie-parser`, `dotenv`, `socket.io`, `stripe`, `zod`.
2. Install client dependencies: `react-router-dom`, `axios`, `socket.io-client`, `lucide-react`, `recharts`.
3. Create `client/src/index.css`. Set up CSS custom properties (variables) for a clean, professional support-desk theme: calm blues/teals for trust, a clear accent for urgency/priority colors (low/medium/high/critical), card backgrounds, borders, and typography. Add subtle micro-animations (fade-ins, status badge pulse for "urgent", smooth hover transitions) — keep it minimal and smooth, not flashy.
4. Create reusable utility classes: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.badge` (with status/priority color variants), `.card`, responsive `.container` and grid classes.
5. Set up `client/src/App.jsx` with React Router routes (placeholders for now) and a root layout with responsive styling.
6. Create `server/server.js` with a basic Express app, CORS config, JSON body parsing, cookie-parser, and a health-check route `/api/health`.

Once done, print Tasks Finished.
```

---

### Step 2: Database Schema (MongoDB & Mongoose)
> **Student Action**: Run this prompt next to build the data models.

```text
Let's build the MongoDB schema using Mongoose for our support ticket system.
Connect to MongoDB in `server/config/db.js` using `MONGO_URI` from `.env`.
Create the following models in `server/models/`:
1. `User.js` (name, email [unique], password [hashed], role [enum: 'customer', 'agent', 'admin', default 'customer'], company, avatarUrl, timestamps).
2. `Ticket.js` (subject, description, category [enum], priority [enum: low/medium/high/critical], status [enum: open/in_progress/waiting_on_customer/resolved/closed], customer [ref User], assignedAgent [ref User], customFields [Mixed/Map], slaDeadline [Date], resolvedAt, csatRating [Number 1-5], csatComment, channel [enum: web/email/chat], timestamps).
3. `TicketResponse.js` (ticket [ref], author [ref User], message, isInternalNote [Boolean], attachments [Array of strings], timestamps).
4. `CannedResponse.js` (title, body, category, createdBy [ref User]).
5. `KnowledgeBaseArticle.js` (title, slug [unique], content, category, tags [Array], viewCount, timestamps).
6. `SLARecord.js` (ticket [ref], priority, responseDeadline, resolutionDeadline, breached [Boolean], escalatedAt).
7. `Invoice.js` (client [ref User], billingPeriodStart, billingPeriodEnd, ticketCount, agentSeats, amountDue, status [enum: pending/paid/overdue], stripeInvoiceId, lineItems [Array]).
8. `ChatMessage.js` (ticket [ref], sender [ref User], message, timestamps).

Add appropriate indexes (e.g. on `status`, `priority`, `assignedAgent`, `customer`) for fast dashboard queries.

Once done, print Tasks Finished.
```

---

### Step 3: Database Seeding
> **Student Action**: Run this prompt to populate the database with sample data for demoing.

```text
Create a seed script `server/seed.js` (runnable via `node seed.js`) that connects to MongoDB and populates:
1. 3 Admin/Agent users and 6 Customer users with hashed passwords (print the plaintext test credentials to the console at the end).
2. 20+ sample Tickets spread across all statuses and priorities, with realistic subjects/descriptions across categories (Billing, Technical, Account, Feature Request, Bug Report), some assigned to agents and some unassigned.
3. 2-4 TicketResponses per ticket (mix of customer and agent messages, a few marked `isInternalNote`).
4. 10+ KnowledgeBaseArticle entries covering common support topics.
5. 6+ CannedResponse templates for common scenarios (refund request, password reset, delayed shipment, etc).
6. A few SLARecord entries, including at least one intentionally breached record to demo escalation.
7. 2 sample Invoice records for enterprise clients.
Clear existing collections before reseeding. Log a summary count of created documents when done.

Once done, print Tasks Finished.
```

---

### Step 4: Authentication & Route Protection
> **Student Action**: Run this prompt to set up JWT auth on the backend and protected routes on the frontend.

```text
Let's implement JWT-based authentication:
1. Create `server/controllers/authController.js` with `register`, `login`, `logout`, and `getMe` handlers. On login, hash-compare the password with `bcryptjs`, sign a JWT (with `id` and `role` in the payload) using `JWT_SECRET`, and set it as an httpOnly, secure cookie.
2. Create `server/middleware/auth.js` exporting `protect` (verifies the JWT cookie, attaches `req.user`) and `authorize(...roles)` (restricts routes by role).
3. Create `server/routes/authRoutes.js` wiring up `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
4. On the client, create `client/src/context/AuthContext.jsx` that fetches `/api/auth/me` on load, exposes `user`, `login()`, `logout()`, `register()`, and a `loading` state.
5. Create `client/src/components/ProtectedRoute.jsx` that redirects unauthenticated users to `/login`, and a role-based variant that redirects non-agents/admins away from `/agent/*` routes to `/portal`.
6. Configure axios in `client/src/api/axios.js` with `withCredentials: true` and the base URL from `VITE_API_URL`.

Once done, print Tasks Finished.
```

---

### Step 5: Auth UI Pages (Login & Register)
> **Student Action**: Create the forms for customer and agent signups.

```text
Create clean, professional Authentication pages:
1. `client/src/pages/Login.jsx`: A centered card layout with email/password fields, client-side validation with inline error states, a loading spinner on submit, and a link to Register. On success, redirect customers to `/portal` and agents/admins to `/agent`.
2. `client/src/pages/Register.jsx`: Fields for Name, Email, Password, Confirm Password, and Company (optional). Default new signups to the `customer` role.
3. Add smooth fade/slide-in animations on page load and subtle input focus transitions. Keep the visual language calm and trustworthy (this is a support tool, not a marketing site) — avoid anything gimmicky.
4. Add a simple toast/notification component (`client/src/components/Toast.jsx`) for success/error feedback across the app.

Once done, print Tasks Finished.
```

---

### Step 6: Ticket Submission & Customer Portal
> **Student Action**: Build the customer-facing side of the app.

```text
Let's build the customer portal:
1. **Ticket Submission Form** (`client/src/pages/SubmitTicket.jsx`): Fields for Subject, Category (dropdown), Priority (dropdown), Description (textarea), and optional file attachment inputs (store as filenames/URLs for now, real upload handling optional). On submit, POST to `/api/tickets` which also creates an SLARecord based on priority (e.g. critical = 1hr response / 4hr resolution, low = 24hr / 72hr).
   - As the customer types the Subject/Description, call a debounced `/api/kb/suggest?q=...` endpoint that full-text searches KnowledgeBaseArticle titles/content and shows 2-3 relevant article suggestions inline ("You might find this helpful").
2. **Customer Dashboard** (`client/src/pages/CustomerDashboard.jsx`): List all of the customer's tickets with status badges, priority indicators, and last-updated time. Include filters for status.
3. **Ticket Detail / Tracking Page** (`client/src/pages/CustomerTicketDetail.jsx`): Show the full response thread (excluding internal notes), a status progress indicator ("Open → In Progress → Resolved"), an SLA countdown, a reply box, and — once status is `resolved` — a CSAT star rating + comment prompt.
4. Wire up React Router: `/portal`, `/portal/tickets/new`, `/portal/tickets/:id`.

Once done, print Tasks Finished.
```

---

### Step 7: Agent Dashboard — Queue, Assignment & Status Management
> **Student Action**: Build the agent-facing ticket queue and management tools.

```text
Let's build the agent workspace:
1. **Agent Layout** (`client/src/pages/agent/AgentLayout.jsx`): Sidebar navigation with links to Queue, My Tickets, Knowledge Base, Analytics, and (admin-only) Billing.
2. **Ticket Queue** (`client/src/pages/agent/Queue.jsx`): A filterable, sortable table/list of all tickets — filter by status, priority, category, and assigned/unassigned. Sort by SLA deadline (soonest first) and highlight breached/at-risk SLAs in red/amber.
3. **Assignment**: Allow an agent to "Claim" an unassigned ticket, or an admin to assign/reassign a ticket to a specific agent via a dropdown.
4. **Agent Ticket Detail** (`client/src/pages/agent/AgentTicketDetail.jsx`):
   - Full response thread, with a toggle to add either a customer-visible reply or an `isInternalNote` (visually distinct, e.g. yellow background) for team collaboration.
   - A "Canned Responses" dropdown that inserts a pre-written template into the reply box, editable before sending.
   - Status dropdown (Open/In Progress/Waiting on Customer/Resolved/Closed) with validation (e.g. can't go from Closed back to Open without admin role).
   - A "Custom Fields" panel showing/editing any industry-specific key-value fields on the ticket.
   - Show which other agents are currently viewing/collaborating on the ticket (simple presence indicator).

Once done, print Tasks Finished.
```

---

### Step 8: Real-Time Chat & Live Updates (Socket.IO)
> **Student Action**: Add real-time chat and live ticket updates.

```text
Let's add real-time functionality with Socket.IO:
1. On the server, set up Socket.IO in `server/server.js` with a connection middleware that verifies the JWT from the handshake auth payload before allowing connection.
2. Implement room-based events: clients join `ticket_<id>` when viewing a ticket. Emit `new_message` when a chat message or reply is sent (persist to `ChatMessage`/`TicketResponse` first, then broadcast), and `ticket_updated` when status/priority/assignment changes (broadcast to the queue view too, via a global `agents` room).
3. On the client, create `client/src/hooks/useSocket.js` — a single hook that establishes the connection once (using the auth token), exposes `emit`/`on` helpers, and cleans up listeners on unmount to avoid duplicate bindings.
4. Add a **Live Chat widget** (`client/src/components/LiveChatWidget.jsx`): a small floating chat bubble/panel available on customer ticket detail pages for real-time back-and-forth with the assigned agent, separate from the formal reply thread. Show a typing indicator and smooth message slide-in animation.
5. Update the Agent Queue to live-update ticket rows (new tickets appearing, statuses changing) without a full page refresh when a `ticket_updated`/`new_ticket` event is received.

Once done, print Tasks Finished.
```

---

### Step 9: SLA Tracking, Escalation & Knowledge Base Management
> **Student Action**: Build automated SLA monitoring and the full knowledge base.

```text
Let's build SLA automation and the knowledge base:
1. **SLA Escalation Job** (`server/jobs/slaCheck.js`): A function run on an interval (`setInterval`, e.g. every 60 seconds for demo purposes) that scans open SLARecords, marks `breached: true` if the deadline has passed, and auto-escalates by bumping priority and reassigning to a senior agent/admin queue. Emit a `sla_breach` socket event so agents see a live alert.
2. **SLA Badge Component**: A reusable countdown badge (`client/src/components/SLABadge.jsx`) showing time remaining, turning amber under 25% time-left and red/pulsing when breached.
3. **Knowledge Base Pages**:
   - Public/customer-facing searchable KB (`client/src/pages/KnowledgeBase.jsx`) with category filters and a search bar.
   - Agent-only KB management (`client/src/pages/agent/KBManage.jsx`) with create/edit/delete for articles (simple rich-text or markdown textarea is fine).
4. Wire the KB suggestion endpoint from Step 6 to also surface suggestions to agents on the ticket detail page ("Suggested articles for this ticket").

Once done, print Tasks Finished.
```

---

### Step 10: Analytics Dashboard
> **Student Action**: Build the reporting view for admins/agents.

```text
Let's build an analytics dashboard using `recharts`:
1. Create `server/controllers/analyticsController.js` with aggregation-pipeline endpoints: average resolution time, ticket volume over time (daily/weekly), tickets by category/priority breakdown, tickets by status, and per-agent performance (tickets resolved, average CSAT, average response time).
2. Create `client/src/pages/agent/Analytics.jsx` (admin + agent visible, some cards admin-only):
   - Line/area chart: ticket volume over the last 30 days.
   - Bar chart: tickets by category and by priority.
   - Pie/donut chart: ticket status distribution.
   - A leaderboard table: agent performance (resolved count, avg CSAT, avg resolution time).
   - Summary stat cards at the top (open tickets, breached SLAs today, avg CSAT this month).
3. Add smooth number count-up animations on the stat cards and fade-in on chart mount.

Once done, print Tasks Finished.
```

---

### Step 11: Billing — Stripe Payments, Usage-Based Billing & Auto Invoices
> **Student Action**: Implement this prompt to build the billing workflow with a keyless fallback simulator.

```text
Let's set up billing for premium support plans and enterprise usage-based invoicing, supporting both real Stripe transactions and a mock/development sandbox simulator:
1. Create `server/lib/stripe.js` that instantiates the Stripe client using `process.env.STRIPE_SECRET_KEY`, and detects if it's a placeholder value (e.g. `sk_test_yourkeyhere`).
2. **One-time paid support session / premium plan checkout**:
   - `POST /api/billing/create-checkout-session`: if keys are placeholders, return `{ isMock: true, mockSessionId, amount }`. If real, create an actual Stripe Checkout Session and return its URL.
   - Client `client/src/pages/Billing.jsx`: if `isMock`, open a glassmorphism-free but polished **Sandbox Simulator modal** showing the plan/amount with "Simulate Successful Payment" and "Cancel" buttons, which calls `/api/billing/verify-mock` to mark the purchase active. If real, redirect the browser to the Stripe Checkout URL.
3. **Usage-Based Billing for enterprise clients**:
   - `server/jobs/monthlyBilling.js`: at the end of each billing cycle (simulate with a manually-triggerable admin endpoint `POST /api/billing/run-cycle` for demo purposes), calculate each enterprise client's ticket volume and agent seat count for the period, and create an `Invoice` document with computed `amountDue` and itemized `lineItems`.
4. **Auto Invoice Generation & Sending**:
   - Generate a simple HTML/PDF-style invoice summary (a clean printable React invoice component is fine — real PDF generation is optional/bonus) and expose `GET /api/billing/invoices/:id`.
   - `client/src/pages/agent/InvoiceList.jsx` (admin-only): list all invoices with status badges (pending/paid/overdue) and a "Mark as Paid" / "Resend" action.
5. Add a `client/src/pages/CustomerBilling.jsx` view for enterprise customers to see their own invoice history and current plan.

Once done, print Tasks Finished.
```

---

## Tips for Success (Vibe Coding)

* **Customize Colors**: Adjust the CSS custom properties in `client/src/index.css` to instantly re-theme the whole app.
* **Keep It Calm**: This is a professional tool — favor subtle transitions (fades, gentle slides, soft pulses on urgent badges) over flashy effects.
* **Troubleshooting Sockets**: If real-time updates aren't showing up, check that the client is joining the correct room name and that the server middleware is actually attaching `socket.user` before your event handlers run.
* **Database Reset**: To wipe MongoDB and reseed fresh demo data, drop the database (or relevant collections) and re-run:
  ```bash
  node server/seed.js
  ```
* **Testing Roles**: Use the seeded test credentials (printed by the seed script) to log in as a customer, an agent, and an admin to verify each dashboard's permissions separately.
