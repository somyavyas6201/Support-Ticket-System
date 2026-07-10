# HelpDesk Pro — Customer Support Ticket System

A comprehensive, full-stack customer support ticket system with an agent dashboard, live chat, knowledge base, SLA tracking, CSAT surveys, and integrated Stripe billing.

## Features

- **Ticket Submission**: Customers can easily submit and track support tickets.
- **Agent Dashboard**: A dedicated interface for support agents to manage, assign, and resolve tickets.
- **Live Chat**: Real-time messaging powered by Socket.IO for instant support.
- **Knowledge Base**: Self-service articles to help customers find answers quickly.
- **SLA Tracking**: Automated SLA (Service Level Agreement) deadlines and alerts for urgent issues.
- **CSAT Surveys**: Customer Satisfaction ratings after ticket resolution.
- **Analytics**: Dashboards for tracking agent performance, ticket volume, and resolution times.
- **Stripe Billing**: Fully functional billing system for premium support plans and usage-based enterprise invoicing (includes a built-in sandbox simulator).

## Tech Stack

- **Frontend**: React, CSS (Vanilla, Vibe-designed), Vite
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Real-time**: Socket.IO
- **Payments**: Stripe

## Project Structure

```text
/client   - React frontend application
/server   - Node.js & Express backend application
```

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/somyavyas6201/Support-Ticket-System.git
cd Support-Ticket-System
```

### 2. Install Dependencies
Install dependencies for both the root, client, and server:
```bash
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

### 3. Environment Variables
Create `.env` files in both the `/server` and `/client` directories using the provided `.env.example` as a template (if available).

**Server `.env`**:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/support_ticket_system
JWT_SECRET=your_jwt_secret_key_here
STRIPE_SECRET_KEY=sk_test_yourkeyhere
CLIENT_URL=http://localhost:5173
```

**Client `.env`**:
```env
VITE_API_URL=http://localhost:5000
```

### 4. Database Seeding
To populate the database with initial data (users, tickets, articles), run the seed script:
```bash
node server/seed.js
```

**Test Credentials:**
- **Customer**: `john@example.com` / `password123`
- **Agent**: `agent@example.com` / `password123`
- **Admin**: `admin@example.com` / `password123`

### 5. Start the Application
You can run both the client and server concurrently from the root directory:
```bash
npm run dev
```
- Frontend will be available at `http://localhost:5173`
- Backend will be available at `http://localhost:5000`

## Tech Highlights

- **JWT Authentication**: Secure role-based access control (Admin, Agent, Customer).
- **Socket.IO Real-time Updates**: Instantaneous ticket updates and live chat capabilities.
- **Keyless Stripe Sandbox Simulator**: A sophisticated mock checkout flow for testing enterprise billing locally without real Stripe API keys.

## License

MIT License
