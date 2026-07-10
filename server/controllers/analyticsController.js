import Ticket from '../models/Ticket.js';
import SLARecord from '../models/SLARecord.js';
import User from '../models/User.js';
import TicketResponse from '../models/TicketResponse.js';

// @desc    Get summary stats (open tickets, breached SLAs today, avg CSAT this month)
// @route   GET /api/analytics/summary
// @access  Private (Agent/Admin)
export const getSummaryStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Open tickets count
    const openTickets = await Ticket.countDocuments({ 
      status: { $in: ['open', 'in_progress', 'waiting_on_customer'] } 
    });

    // Total tickets
    const totalTickets = await Ticket.countDocuments();

    // Resolved tickets this month
    const resolvedThisMonth = await Ticket.countDocuments({
      status: { $in: ['resolved', 'closed'] },
      resolvedAt: { $gte: startOfMonth }
    });

    // Breached SLAs today
    const breachedToday = await SLARecord.countDocuments({
      breached: true,
      escalatedAt: { $gte: startOfToday }
    });

    // Total breached SLAs
    const totalBreached = await SLARecord.countDocuments({ breached: true });

    // Average CSAT this month
    const csatAgg = await Ticket.aggregate([
      { $match: { csatRating: { $exists: true, $ne: null }, updatedAt: { $gte: startOfMonth } } },
      { $group: { _id: null, avgCsat: { $avg: '$csatRating' }, count: { $sum: 1 } } }
    ]);
    const avgCsat = csatAgg.length > 0 ? Math.round(csatAgg[0].avgCsat * 100) / 100 : 0;
    const csatCount = csatAgg.length > 0 ? csatAgg[0].count : 0;

    // Average resolution time (in hours) for resolved tickets
    const resTimeAgg = await Ticket.aggregate([
      { $match: { resolvedAt: { $exists: true, $ne: null } } },
      { $project: { resolutionMs: { $subtract: ['$resolvedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$resolutionMs' } } }
    ]);
    const avgResolutionHours = resTimeAgg.length > 0 
      ? Math.round((resTimeAgg[0].avgMs / (1000 * 60 * 60)) * 10) / 10
      : 0;

    // SLA compliance rate
    const totalSLA = await SLARecord.countDocuments();
    const slaCompliance = totalSLA > 0 
      ? Math.round(((totalSLA - totalBreached) / totalSLA) * 1000) / 10
      : 100;

    res.status(200).json({
      success: true,
      data: {
        openTickets,
        totalTickets,
        resolvedThisMonth,
        breachedToday,
        totalBreached,
        avgCsat,
        csatCount,
        avgResolutionHours,
        slaCompliance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get ticket volume over the last 30 days (daily)
// @route   GET /api/analytics/volume
// @access  Private (Agent/Admin)
export const getTicketVolume = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const volume = await Ticket.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Fill in missing days with 0 counts
    const result = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();

      const found = volume.find(v => 
        v._id.year === year && v._id.month === month && v._id.day === day
      );

      result.push({
        date: `${month}/${day}`,
        fullDate: d.toISOString().split('T')[0],
        tickets: found ? found.count : 0
      });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get tickets breakdown by category
// @route   GET /api/analytics/by-category
// @access  Private (Agent/Admin)
export const getByCategory = async (req, res) => {
  try {
    const result = await Ticket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const data = result.map(r => ({ name: r._id, value: r.count }));
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get tickets breakdown by priority
// @route   GET /api/analytics/by-priority
// @access  Private (Agent/Admin)
export const getByPriority = async (req, res) => {
  try {
    const result = await Ticket.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const data = result.map(r => ({ name: r._id, value: r.count }));
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get ticket status distribution
// @route   GET /api/analytics/by-status
// @access  Private (Agent/Admin)
export const getByStatus = async (req, res) => {
  try {
    const result = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const statusColors = {
      open: '#3b82f6',
      in_progress: '#8b5cf6',
      waiting_on_customer: '#eab308',
      resolved: '#10b981',
      closed: '#64748b'
    };

    const data = result.map(r => ({
      name: r._id.replace(/_/g, ' '),
      value: r.count,
      fill: statusColors[r._id] || '#94a3b8'
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get per-agent performance
// @route   GET /api/analytics/agent-performance
// @access  Private (Admin only)
export const getAgentPerformance = async (req, res) => {
  try {
    // Get all agents/admins
    const agents = await User.find({ role: { $in: ['agent', 'admin'] } })
      .select('name email role');

    const performanceData = [];

    for (const agent of agents) {
      // Tickets resolved by this agent
      const resolved = await Ticket.countDocuments({
        assignedAgent: agent._id,
        status: { $in: ['resolved', 'closed'] }
      });

      // Total tickets assigned
      const totalAssigned = await Ticket.countDocuments({
        assignedAgent: agent._id
      });

      // Average CSAT for this agent's tickets
      const csatAgg = await Ticket.aggregate([
        { $match: { assignedAgent: agent._id, csatRating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgCsat: { $avg: '$csatRating' }, count: { $sum: 1 } } }
      ]);

      // Average resolution time for this agent
      const resTimeAgg = await Ticket.aggregate([
        { $match: { assignedAgent: agent._id, resolvedAt: { $exists: true, $ne: null } } },
        { $project: { resolutionMs: { $subtract: ['$resolvedAt', '$createdAt'] } } },
        { $group: { _id: null, avgMs: { $avg: '$resolutionMs' } } }
      ]);

      // Count responses by this agent
      const responseCount = await TicketResponse.countDocuments({ author: agent._id });

      performanceData.push({
        agentId: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        totalAssigned,
        resolved,
        avgCsat: csatAgg.length > 0 ? Math.round(csatAgg[0].avgCsat * 100) / 100 : null,
        csatResponses: csatAgg.length > 0 ? csatAgg[0].count : 0,
        avgResolutionHours: resTimeAgg.length > 0
          ? Math.round((resTimeAgg[0].avgMs / (1000 * 60 * 60)) * 10) / 10
          : null,
        responseCount
      });
    }

    // Sort by resolved count descending
    performanceData.sort((a, b) => b.resolved - a.resolved);

    res.status(200).json({ success: true, data: performanceData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
