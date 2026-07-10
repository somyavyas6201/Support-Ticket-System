import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import Mongoose Connection Helper
import connectDB from './config/db.js';

// Import Schemas
import User from './models/User.js';
import Ticket from './models/Ticket.js';
import TicketResponse from './models/TicketResponse.js';
import CannedResponse from './models/CannedResponse.js';
import KnowledgeBaseArticle from './models/KnowledgeBaseArticle.js';
import SLARecord from './models/SLARecord.js';
import Invoice from './models/Invoice.js';
import ChatMessage from './models/ChatMessage.js';

// Absolute path to the local .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const seedDatabase = async () => {
  try {
    // 1. Establish DB Connection
    await connectDB();
    console.log('Clearing database collections...');

    // 2. Clear all tables
    await User.deleteMany({});
    await Ticket.deleteMany({});
    await TicketResponse.deleteMany({});
    await CannedResponse.deleteMany({});
    await KnowledgeBaseArticle.deleteMany({});
    await SLARecord.deleteMany({});
    await Invoice.deleteMany({});
    await ChatMessage.deleteMany({});

    console.log('Database collections cleared. Starting seeding...');

    // 3. Hash Passwords
    const salt = await bcrypt.genSalt(10);
    const hashPassword = async (pwd) => await bcrypt.hash(pwd, salt);

    const adminPwd = await hashPassword('admin123');
    const agentPwd = await hashPassword('agent123');
    const customerPwd = await hashPassword('customer123');

    // 4. Create Users (3 Admins/Agents, 6 Customers)
    const usersData = [
      // Admins/Agents
      { name: 'Admin Chief', email: 'admin@helpdesk.com', password: adminPwd, role: 'admin', company: 'HelpDesk Pro Staff', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
      { name: 'Agent Sarah', email: 'sarah@helpdesk.com', password: agentPwd, role: 'agent', company: 'HelpDesk Pro Staff', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
      { name: 'Agent Alex', email: 'alex@helpdesk.com', password: agentPwd, role: 'agent', company: 'HelpDesk Pro Staff', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
      
      // Customers
      { name: 'John Doe', email: 'john@acme.com', password: customerPwd, role: 'customer', company: 'Acme Corp', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' },
      { name: 'Alice Smith', email: 'alice@bobcorp.com', password: customerPwd, role: 'customer', company: 'Bob Corp', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80' },
      { name: 'Charlie Brown', email: 'charlie@delta.com', password: customerPwd, role: 'customer', company: 'Delta LLC', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80' },
      { name: 'David Miller', email: 'david@epsilon.com', password: customerPwd, role: 'customer', company: 'Epsilon Inc', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80' },
      { name: 'Emma Wilson', email: 'emma@omega.com', password: customerPwd, role: 'customer', company: 'Omega Ltd', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80' },
      { name: 'Frank Wright', email: 'frank@zeta.com', password: customerPwd, role: 'customer', company: 'Zeta Co', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80' }
    ];

    const users = await User.insertMany(usersData);
    console.log(`Successfully seeded ${users.length} Users.`);

    // Extract users references
    const adminUser = users[0];
    const agentSarah = users[1];
    const agentAlex = users[2];
    
    const custJohn = users[3];
    const custAlice = users[4];
    const custCharlie = users[5];
    const custDavid = users[6];
    const custEmma = users[7];
    const custFrank = users[8];

    const customersList = [custJohn, custAlice, custCharlie, custDavid, custEmma, custFrank];
    const agentsList = [agentSarah, agentAlex];

    // 5. Seed KB Articles (10+)
    const kbArticlesData = [
      {
        title: 'Troubleshooting 504 Gateway Timeout errors',
        slug: 'troubleshooting-504-gateway-timeout',
        content: 'A 504 Gateway Timeout Error indicates that one server on the internet did not receive a timely response from another server it was accessing while attempting to load the web page. To resolve this: \n1. Check your webhook payload speeds. \n2. Optimize backend database queries. \n3. Verify keep-alive connection configurations in nginx settings.',
        category: 'Technical Support',
        tags: ['504', 'timeout', 'network', 'gateway'],
        viewCount: 42
      },
      {
        title: 'Configuring Stripe Webhooks securely',
        slug: 'configuring-stripe-webhooks-securely',
        content: 'To prevent replay attacks and secure your payment hooks: \n1. Always verify Stripe request signatures using `stripe.webhooks.constructEvent()`. \n2. Retrieve the raw payload body rather than the parser body. \n3. Restrict incoming network calls to official Stripe IP addresses.',
        category: 'Billing',
        tags: ['stripe', 'webhooks', 'security', 'api'],
        viewCount: 104
      },
      {
        title: 'Resetting your 2FA Authentication Device',
        slug: 'resetting-your-2fa-device',
        content: 'If you have lost access to your multi-factor authentication (MFA/2FA) code generator: \n1. Click "Use recovery keys" on the sign-in prompt. \n2. Paste one of the 8-digit codes downloaded during setup. \n3. If recovery keys are lost, contact your administrator to reset credentials manually.',
        category: 'Account Setup',
        tags: ['2fa', 'mfa', 'security', 'login'],
        viewCount: 15
      },
      {
        title: 'Understanding usage-based billing metrics',
        slug: 'understanding-usage-based-billing',
        content: 'Enterprise subscriptions calculate dues based on active support seat counts and total tickets generated. Billings occur at 00:00 UTC on the 1st of every month. Review the Invoices section inside the client billing page for itemized summaries.',
        category: 'Billing',
        tags: ['billing', 'invoice', 'enterprise', 'pricing'],
        viewCount: 88
      },
      {
        title: 'Websocket connection authentication guidelines',
        slug: 'websocket-connection-auth-guidelines',
        content: 'HelpDesk Pro relies on Socket.IO for real-time ticket updates. You must attach your JWT token to the socket connection handshake payload. Example:\n`const socket = io(URL, { auth: { token: "your-jwt-here" } });` \nExpired tokens result in handshake rejection.',
        category: 'API Integrations',
        tags: ['websocket', 'socket.io', 'jwt', 'auth'],
        viewCount: 56
      },
      {
        title: 'How to change your primary account email',
        slug: 'change-primary-account-email',
        content: 'To update your account email: \n1. Go to Account Settings. \n2. Enter the new email address. \n3. Check the confirmation email sent to the new address. \n4. Confirm the modification. Note: Corporate emails must match the registered workspace domain.',
        category: 'Account Setup',
        tags: ['account', 'profile', 'email'],
        viewCount: 9
      },
      {
        title: 'Database indexing guidelines for query speeds',
        slug: 'database-indexing-guidelines-speeds',
        content: 'Slow dashboards are usually caused by unindexed lookups. We recommend adding single-field indexes to query filters like `status` and `priority`. For relational queries, build composite compound indexes containing `assignedAgent_1_status_1`.',
        category: 'Technical Support',
        tags: ['mongodb', 'indexes', 'performance', 'database'],
        viewCount: 73
      },
      {
        title: 'SLA Response Targets & Support Tiers',
        slug: 'sla-response-targets-support-tiers',
        content: 'Support SLA limits vary based on ticket priority: \n- Critical: 1h response, 4h resolution. \n- High: 4h response, 12h resolution. \n- Medium: 8h response, 24h resolution. \n- Low: 24h response, 72h resolution.',
        category: 'General Queries',
        tags: ['sla', 'escalation', 'support-levels'],
        viewCount: 112
      },
      {
        title: 'Holiday schedule & availability times',
        slug: 'holiday-schedule-availability-times',
        content: 'Standard agent support runs 24/7/365 for Enterprise tiers. Essential/Developer accounts receive standard support Monday to Friday from 09:00 to 18:00 EST. Emergency lines remain open for critical priorities during holidays.',
        category: 'General Queries',
        tags: ['hours', 'support', 'holiday', 'schedule'],
        viewCount: 22
      },
      {
        title: 'How to update your corporate credit card',
        slug: 'update-corporate-credit-card',
        content: 'Navigate to Billing settings on the portal. Under payment options, select "Update Card". We securely transact payments via Stripe Checkout, preventing storage of credit card files on local servers.',
        category: 'Billing',
        tags: ['stripe', 'creditcard', 'payment'],
        viewCount: 31
      }
    ];

    const kbArticles = await KnowledgeBaseArticle.insertMany(kbArticlesData);
    console.log(`Successfully seeded ${kbArticles.length} KB Articles.`);

    // 6. Seed Canned Responses (6+)
    const cannedResponsesData = [
      { title: 'Refund Request Template', body: 'Thank you for reaching out. We have initiated a refund for transaction ID {ID}. This credit should reflect in your banking account within 5-10 business days.', category: 'Billing', createdBy: agentSarah._id },
      { title: 'Password Reset Steps', body: 'To reset your account password, go to the login screen and click "Forgot Password". Provide your email, and a secure reset token link will arrive shortly. Make sure to complete the update in 15 minutes.', category: 'Account', createdBy: agentSarah._id },
      { title: 'Delayed Shipment Alert', body: 'We apologize for the inconvenience. Due to heavy supply chain delays, shipment {ID} has been postponed. We have upgraded your shipping class to express free of charge.', category: 'General', createdBy: agentAlex._id },
      { title: 'SLA Escalation Alert', body: 'Your support ticket has breached the SLA target response limit. We have escalated this ticket to a senior engineer and updated the priority rating to critical.', category: 'SLA', createdBy: adminUser._id },
      { title: 'Code Debug Guidelines', body: 'To help debug your technical query, please provide: \n1. The request payload body \n2. Target endpoint URL \n3. Exact console log stacktrace.', category: 'Technical', createdBy: agentAlex._id },
      { title: 'CSAT Survey Followup', body: 'We resolved this ticket thread! We would highly appreciate if you could rate our assistance by selecting a star level (1 to 5) and leaving feedback on the portal dashboard.', category: 'General', createdBy: agentSarah._id }
    ];

    const cannedResponses = await CannedResponse.insertMany(cannedResponsesData);
    console.log(`Successfully seeded ${cannedResponses.length} Canned Responses.`);

    // 7. Seed 20+ Tickets
    const ticketCategories = ['Billing', 'Technical', 'Account', 'Feature Request', 'Bug Report'];
    const ticketPriorities = ['low', 'medium', 'high', 'critical'];
    const ticketStatuses = ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'];

    // Specific realistic tickets data
    const ticketTemplates = [
      { subject: 'Billing billing: Double charge on invoice #901', category: 'Billing', priority: 'high', status: 'open', desc: 'I was charged twice on my corporate card. Transaction receipts attached. Please refund the secondary charge.' },
      { subject: '504 Gateway Timeout during webhook push', category: 'Technical', priority: 'critical', status: 'in_progress', desc: 'When pushing event logs, our webhooks fail with a 504 status. Gateway times out after 10 seconds of processing.' },
      { subject: 'Add customer avatar support in dashboard', category: 'Feature Request', priority: 'low', status: 'open', desc: 'We would love to allow customers to upload avatars in their dashboard profile page. Is this in your roadmap?' },
      { subject: 'Application crash when editing user permissions', category: 'Bug Report', priority: 'critical', status: 'open', desc: 'The backend crashed and nodemon exited with exception: cannot read property role of undefined when saving profile role settings.' },
      { subject: 'Enterprise license upgrade query', category: 'Account', priority: 'medium', status: 'waiting_on_customer', desc: 'Our team is expanding. We want to know the pricing limits and seat margins for adding 50 more engineers.' },
      { subject: 'Stripe webhook verification fails on localhost', category: 'Technical', priority: 'medium', status: 'resolved', desc: 'The signature verification check returns invalid signature warning. I suspect the endpoint webhook secret is mismatched.' },
      { subject: 'Change account administrator owner', category: 'Account', priority: 'high', status: 'closed', desc: 'Our CTO has left the company. We need to transfer administrative ownership to admin@newcorp.com immediately.' },
      { subject: 'API documentation is missing response examples', category: 'Feature Request', priority: 'low', status: 'resolved', desc: 'The GET /tickets response shape details are incomplete. Please add examples of raw JSON schemas.' },
      { subject: 'Incorrect invoice amount calculated for June', category: 'Billing', priority: 'medium', status: 'closed', desc: 'Our June bill reflects 15 active seats but we only registered 10. Requesting corrections and a credit note.' },
      { subject: 'Intermittent socket connection drops', category: 'Technical', priority: 'high', status: 'in_progress', desc: 'Our frontend logs show recurrent WebSocket disconnects and retries. Transport closes with reason ping timeout.' }
    ];

    // Build list of 22 realistic tickets
    const ticketsToCreate = [];

    // First populate the templates
    for (let i = 0; i < 22; i++) {
      const template = ticketTemplates[i % ticketTemplates.length];
      const customer = customersList[i % customersList.length];
      
      // Distribute assignment
      let assignedAgent = null;
      if (i % 3 !== 0) { // 2/3 of tickets assigned
        assignedAgent = agentsList[i % agentsList.length];
      }

      // Generate realistic dates (between 10 days ago and now)
      const creationDate = new Date();
      creationDate.setDate(creationDate.getDate() - (i % 10));

      const isResolvedOrClosed = ['resolved', 'closed'].includes(template.status);
      const resolvedAt = isResolvedOrClosed ? new Date() : null;
      const csatRating = isResolvedOrClosed ? (i % 2 === 0 ? 5 : 4) : null;
      const csatComment = isResolvedOrClosed ? 'Awesome prompt response and clean support!' : null;

      ticketsToCreate.push({
        subject: `${template.subject} (ref-${i})`,
        description: template.desc,
        category: template.category,
        priority: ticketPriorities[i % ticketPriorities.length],
        status: ticketStatuses[i % ticketStatuses.length],
        customer: customer._id,
        assignedAgent: assignedAgent ? assignedAgent._id : null,
        customFields: { browser: 'Chrome 124', system: 'Windows 11', clientIP: `192.168.1.${10 + i}` },
        slaDeadline: new Date(creationDate.getTime() + (24 * 60 * 60 * 1000)), // +24 hours
        resolvedAt,
        csatRating,
        csatComment,
        channel: i % 4 === 0 ? 'chat' : (i % 4 === 1 ? 'email' : 'web'),
        createdAt: creationDate,
        updatedAt: creationDate
      });
    }

    const tickets = await Ticket.insertMany(ticketsToCreate);
    console.log(`Successfully seeded ${tickets.length} Support Tickets.`);

    // 8. Seed responses (2-4 responses per ticket)
    const responsesToCreate = [];
    const chatMessagesToCreate = [];

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const customerId = ticket.customer;
      // Default fallback agent if ticket is unassigned
      const agentId = ticket.assignedAgent || agentSarah._id;

      // Response 1: Customer initial request (mirroring description)
      responsesToCreate.push({
        ticket: ticket._id,
        author: customerId,
        message: `Hi team, I am running into this issue: ${ticket.description}`,
        isInternalNote: false,
        attachments: i % 5 === 0 ? ['error_stack.log', 'screenshot.png'] : [],
        createdAt: new Date(ticket.createdAt.getTime() + (5 * 60 * 1000))
      });

      // Response 2: Agent initial reply
      responsesToCreate.push({
        ticket: ticket._id,
        author: agentId,
        message: `Hello! Thank you for raising this. I am looking into the details for your issue related to ${ticket.category}. I will update you as soon as I check the system logs.`,
        isInternalNote: false,
        attachments: [],
        createdAt: new Date(ticket.createdAt.getTime() + (20 * 60 * 1000))
      });

      // Response 3: Internal note (on select tickets)
      if (i % 3 === 0) {
        responsesToCreate.push({
          ticket: ticket._id,
          author: adminUser._id,
          message: `Internal log checking: Node process metrics looked stable. We should verify if database transaction pools were exhausted.`,
          isInternalNote: true,
          attachments: [],
          createdAt: new Date(ticket.createdAt.getTime() + (30 * 60 * 1000))
        });
      }

      // Response 4: Customer follow-up (on resolved/closed)
      if (['resolved', 'closed'].includes(ticket.status)) {
        responsesToCreate.push({
          ticket: ticket._id,
          author: customerId,
          message: `Great! The changes you pushed resolved the error. Thanks for the quick solution.`,
          isInternalNote: false,
          attachments: [],
          createdAt: new Date(ticket.createdAt.getTime() + (45 * 60 * 1000))
        });
      }

      // Seed chat messages (if ticket channel is chat)
      if (ticket.channel === 'chat') {
        chatMessagesToCreate.push({
          ticket: ticket._id,
          sender: customerId,
          message: 'Hello, is anyone online to assist with a real-time question?',
          createdAt: new Date(ticket.createdAt.getTime() + (2 * 60 * 1000))
        });
        chatMessagesToCreate.push({
          ticket: ticket._id,
          sender: agentId,
          message: 'Yes John, Agent here. I am online and tracking your active ticket thread. Let me know!',
          createdAt: new Date(ticket.createdAt.getTime() + (3 * 60 * 1000))
        });
      }
    }

    const ticketResponses = await TicketResponse.insertMany(responsesToCreate);
    const chatMessages = await ChatMessage.insertMany(chatMessagesToCreate);
    console.log(`Successfully seeded ${ticketResponses.length} Ticket Responses.`);
    console.log(`Successfully seeded ${chatMessages.length} Chat Messages.`);

    // 9. Seed SLA Records (including at least one intentionally breached record)
    const slaRecordsToCreate = [];

    // SLA 1: Breached Ticket (Critical priority in the past)
    const breachedTicket = tickets.find(t => t.priority === 'critical' && t.status === 'open');
    if (breachedTicket) {
      // Set deadlines in the past to trigger breach
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 5); // 5 hours ago

      slaRecordsToCreate.push({
        ticket: breachedTicket._id,
        priority: 'critical',
        responseDeadline: pastDate,
        resolutionDeadline: new Date(pastDate.getTime() + (3 * 60 * 60 * 1000)), // 2 hours ago
        breached: true,
        escalatedAt: new Date()
      });
      
      // Update ticket deadlines to match
      breachedTicket.slaDeadline = pastDate;
      await breachedTicket.save();
    }

    // SLA 2: Active SLA (Critical priority, not breached)
    const activeTicket = tickets.find(t => t.priority === 'critical' && t.status === 'in_progress');
    if (activeTicket) {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 45); // 45 mins in future

      slaRecordsToCreate.push({
        ticket: activeTicket._id,
        priority: 'critical',
        responseDeadline: futureDate,
        resolutionDeadline: new Date(futureDate.getTime() + (4 * 60 * 60 * 1000)),
        breached: false
      });

      activeTicket.slaDeadline = futureDate;
      await activeTicket.save();
    }

    // SLA 3: Medium Priority SLA
    const mediumTicket = tickets.find(t => t.priority === 'medium' && t.status === 'open');
    if (mediumTicket) {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 12);

      slaRecordsToCreate.push({
        ticket: mediumTicket._id,
        priority: 'medium',
        responseDeadline: futureDate,
        resolutionDeadline: new Date(futureDate.getTime() + (24 * 60 * 60 * 1000)),
        breached: false
      });
    }

    const slaRecords = await SLARecord.insertMany(slaRecordsToCreate);
    console.log(`Successfully seeded ${slaRecords.length} SLA Records.`);

    // 10. Seed Invoices (2 enterprise client invoices)
    const invoicesData = [
      {
        client: custJohn._id,
        billingPeriodStart: new Date(2026, 5, 1),
        billingPeriodEnd: new Date(2026, 5, 30),
        ticketCount: 12,
        agentSeats: 5,
        amountDue: 599.00,
        status: 'paid',
        stripeInvoiceId: 'in_1Mjk49Lkd89dKjl22',
        lineItems: [
          { description: 'Gold Support Subscription (Tier 2)', amount: 499.00 },
          { description: 'Overage Tickets (2 tickets @ $50/ea)', amount: 100.00 }
        ]
      },
      {
        client: custAlice._id,
        billingPeriodStart: new Date(2026, 5, 1),
        billingPeriodEnd: new Date(2026, 5, 30),
        ticketCount: 32,
        agentSeats: 12,
        amountDue: 1499.00,
        status: 'pending',
        stripeInvoiceId: 'in_1Mjk49Lkd89dKjl99',
        lineItems: [
          { description: 'Platinum Support Subscription (Tier 3)', amount: 999.00 },
          { description: 'Seat allocation licenses (10 seats)', amount: 500.00 }
        ]
      }
    ];

    const invoices = await Invoice.insertMany(invoicesData);
    console.log(`Successfully seeded ${invoices.length} Invoices.`);

    console.log('\n==================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('==================================================');
    console.log(`Total Users: ${users.length}`);
    console.log(`Total KB Articles: ${kbArticles.length}`);
    console.log(`Total Canned Responses: ${cannedResponses.length}`);
    console.log(`Total Tickets: ${tickets.length}`);
    console.log(`Total Responses: ${ticketResponses.length}`);
    console.log(`Total Chat Messages: ${chatMessages.length}`);
    console.log(`Total SLA Records: ${slaRecords.length}`);
    console.log(`Total Invoices: ${invoices.length}`);
    console.log('==================================================\n');

    console.log('🔑 TEST USER CREDENTIALS FOR VERIFICATION:');
    console.log('--------------------------------------------------');
    console.log('1. Admin:    admin@helpdesk.com    | Password: admin123');
    console.log('2. Agent 1:  sarah@helpdesk.com    | Password: agent123');
    console.log('3. Agent 2:  alex@helpdesk.com     | Password: agent123');
    console.log('4. Customer: john@acme.com         | Password: customer123');
    console.log('5. Customer: alice@bobcorp.com     | Password: customer123');
    console.log('--------------------------------------------------\n');

    // Close Connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedDatabase();
