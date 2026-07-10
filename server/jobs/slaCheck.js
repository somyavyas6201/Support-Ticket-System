import SLARecord from '../models/SLARecord.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';

// Priority escalation map: when a ticket breaches SLA, bump its priority one level up
const PRIORITY_ESCALATION = {
  low: 'medium',
  medium: 'high',
  high: 'critical',
  critical: 'critical' // already at max
};

/**
 * SLA Escalation Check Job
 * Scans all open (non-breached) SLA records, marks them as breached if deadlines
 * have passed, bumps ticket priority, and reassigns to a senior agent or admin.
 * Emits `sla_breach` socket event so agents get a live alert in the UI.
 */
const runSLACheck = async () => {
  try {
    const now = new Date();

    // Find SLA records that haven't been breached yet and whose resolution deadline has passed
    const breachedRecords = await SLARecord.find({
      breached: false,
      $or: [
        { responseDeadline: { $lte: now } },
        { resolutionDeadline: { $lte: now } }
      ]
    }).populate('ticket');

    if (breachedRecords.length === 0) return;

    // Find a senior agent or admin to reassign breached tickets to
    const seniorAgent = await User.findOne({ role: 'admin' }).select('_id name email');
    const fallbackAgent = seniorAgent || await User.findOne({ role: 'agent' }).select('_id name email');

    for (const sla of breachedRecords) {
      // Skip if the ticket no longer exists or is already resolved/closed
      const ticket = await Ticket.findById(sla.ticket._id || sla.ticket);
      if (!ticket || ['resolved', 'closed'].includes(ticket.status)) {
        // Still mark the SLA as breached for record keeping
        sla.breached = true;
        sla.escalatedAt = now;
        await sla.save();
        continue;
      }

      // 1. Mark SLA as breached
      sla.breached = true;
      sla.escalatedAt = now;
      await sla.save();

      // 2. Escalate the ticket priority
      const previousPriority = ticket.priority;
      const escalatedPriority = PRIORITY_ESCALATION[ticket.priority] || 'critical';
      ticket.priority = escalatedPriority;

      // 3. Reassign to senior agent / admin queue if available
      const previousAgent = ticket.assignedAgent;
      if (fallbackAgent) {
        ticket.assignedAgent = fallbackAgent._id;
      }

      // 4. If ticket is still "open", move to "in_progress" since it's being escalated
      if (ticket.status === 'open') {
        ticket.status = 'in_progress';
      }

      await ticket.save();

      // 5. Populate for the socket event payload
      const populatedTicket = await Ticket.findById(ticket._id)
        .populate('customer', 'name email company')
        .populate('assignedAgent', 'name email avatarUrl');

      // 6. Emit real-time sla_breach event to the agents room
      if (global.io) {
        global.io.to('agents').emit('sla_breach', {
          ticket: populatedTicket,
          slaRecord: sla,
          previousPriority,
          escalatedPriority,
          reassignedTo: fallbackAgent?.name || 'Unassigned',
          breachedAt: now.toISOString(),
          message: `SLA BREACH: Ticket "${ticket.subject}" (was ${previousPriority} → now ${escalatedPriority}) has been escalated and reassigned.`
        });

        // Also emit ticket_updated so queue views refresh
        global.io.to('agents').emit('ticket_updated', populatedTicket);
        global.io.to(`ticket_${ticket._id}`).emit('ticket_updated', populatedTicket);
      }

      console.log(
        `[SLA CHECK] BREACH: Ticket "${ticket.subject}" | ` +
        `Priority: ${previousPriority} → ${escalatedPriority} | ` +
        `Reassigned to: ${fallbackAgent?.name || 'N/A'}`
      );
    }

    console.log(`[SLA CHECK] Scan complete. ${breachedRecords.length} SLA breach(es) processed.`);
  } catch (error) {
    console.error('[SLA CHECK] Error during SLA scan:', error.message);
  }
};

/**
 * Start the SLA check interval. Default: every 60 seconds (for demo).
 * @param {number} intervalMs - Interval in milliseconds (default 60000)
 * @returns {NodeJS.Timer} - The interval ID (can be used to clear)
 */
export const startSLACheckJob = (intervalMs = 60000) => {
  console.log(`[SLA CHECK] Job started. Running every ${intervalMs / 1000}s`);

  // Run once immediately on startup
  runSLACheck();

  // Then run on interval
  const intervalId = setInterval(runSLACheck, intervalMs);
  return intervalId;
};

export default runSLACheck;
