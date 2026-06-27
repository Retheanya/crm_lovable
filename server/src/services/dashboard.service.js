const leadRepository = require('../repositories/lead.repository');
const followupRepository = require('../repositories/followup.repository');
const activityRepository = require('../repositories/activity.repository');
const { ROLES, LEAD_STATUS, FOLLOW_UP_STATUS, ACTIVITY_TYPES } = require('../constants');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const FollowUp = require('../models/FollowUp');
const mongoose = require('mongoose');

const CrmSetting = require('../models/CrmSetting');

class DashboardService {
  async getSummary(user, pipelineRange = 'weekly') {
    // Base query: filter by role — USER only sees their own leads
    let leadQuery = { isDeleted: false };
    if (user.role === ROLES.USER) {
      leadQuery.assignedUser = new mongoose.Types.ObjectId(user._id);
    }

    const totalLeads = await Lead.countDocuments(leadQuery);

    // Fetch CRM settings for normalization
    const settings = await CrmSetting.find({
      category: { $in: ['LEAD_STATUS', 'LEAD_SOURCE'] }
    });
    const statusSettings = settings.filter(s => s.category === 'LEAD_STATUS');
    const sourceSettings = settings.filter(s => s.category === 'LEAD_SOURCE');

    // Aggregate status and source counts
    const [statusesAgg, sourcesAgg] = await Promise.all([
      Lead.aggregate([
        { $match: leadQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: leadQuery },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ])
    ]);

    // Build normalized status counts
    const statusCounts = {};
    // Initialize all known statuses with 0
    statusSettings.forEach(s => {
      statusCounts[s.label] = 0;
      statusCounts[s.value] = 0;
      statusCounts[s.value.toUpperCase()] = 0;
    });

    statusesAgg.forEach(item => {
      if (!item._id) return;
      const rawStatus = item._id.toString();
      const matchedSetting = statusSettings.find(s =>
        s.label.toLowerCase() === rawStatus.toLowerCase() ||
        s.value.toLowerCase() === rawStatus.toLowerCase()
      );
      if (matchedSetting) {
        const count = item.count;
        const keys = new Set([
          matchedSetting.label,
          matchedSetting.value,
          matchedSetting.value.toUpperCase()
        ]);
        keys.forEach(k => {
          statusCounts[k] = (statusCounts[k] || 0) + count;
        });
      } else {
        statusCounts[rawStatus] = (statusCounts[rawStatus] || 0) + item.count;
      }
    });

    // Build normalized source counts
    const sourceCounts = {};
    // Initialize all known sources with 0
    sourceSettings.forEach(s => {
      sourceCounts[s.label] = 0;
      sourceCounts[s.value] = 0;
      sourceCounts[s.value.toUpperCase()] = 0;
    });

    sourcesAgg.forEach(item => {
      if (!item._id) return;
      const rawSource = item._id.toString();
      const matchedSetting = sourceSettings.find(s =>
        s.label.toLowerCase() === rawSource.toLowerCase() ||
        s.value.toLowerCase() === rawSource.toLowerCase()
      );
      if (matchedSetting) {
        const count = item.count;
        const keys = new Set([
          matchedSetting.label,
          matchedSetting.value,
          matchedSetting.value.toUpperCase()
        ]);
        keys.forEach(k => {
          sourceCounts[k] = (sourceCounts[k] || 0) + count;
        });
      } else {
        const prettyName = rawSource.charAt(0).toUpperCase() + rawSource.slice(1).toLowerCase();
        sourceCounts[prettyName] = (sourceCounts[prettyName] || 0) + item.count;
      }
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let followUpQuery = {
      followUpDate: { $gte: startOfDay, $lte: endOfDay },
      status: FOLLOW_UP_STATUS.PENDING
    };

    if (user.role === ROLES.USER) {
      const userLeads = await leadRepository.find({ assignedUser: user._id }, { limit: 0 });
      followUpQuery.leadId = { $in: userLeads.map(l => l._id) };
    }

    const todaysFollowUps = await followupRepository.count(followUpQuery);

    // "My Assigned Leads" = leads where assignedUser == currently logged-in user (ALL roles)
    const myLeads = await Lead.countDocuments({
      isDeleted: false,
      assignedUser: new mongoose.Types.ObjectId(user._id)
    });

    const now = new Date();
    let startDate;
    let buckets;
    let getIndexExpr;
    let formatLabel;

    if (pipelineRange === 'monthly') {
      buckets = 6;
      startDate = new Date(now.getFullYear(), now.getMonth() - buckets + 1, 1);
      getIndexExpr = {
        $add: [
          { $multiply: [{ $subtract: [{ $year: "$createdAt" }, startDate.getFullYear()] }, 12] },
          { $subtract: [{ $month: "$createdAt" }, startDate.getMonth() + 1] }
        ]
      };
      formatLabel = (idx) => {
        const d = new Date(startDate.getFullYear(), startDate.getMonth() + idx, 1);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      };
    } else if (pipelineRange === 'yearly') {
      buckets = 5;
      startDate = new Date(now.getFullYear() - buckets + 1, 0, 1);
      getIndexExpr = {
        $subtract: [{ $year: "$createdAt" }, startDate.getFullYear()]
      };
      formatLabel = (idx) => {
        return `${startDate.getFullYear() + idx}`;
      };
    } else {
      // Default: weekly
      buckets = 8;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - (7 * buckets) - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      getIndexExpr = {
        $floor: {
          $divide: [
            { $subtract: ["$createdAt", startDate] },
            1000 * 60 * 60 * 24 * 7
          ]
        }
      };
      formatLabel = (idx) => `Week ${idx + 1}`;
    }

    const buildAgg = (matchQuery) => [
      { $match: { ...matchQuery, createdAt: { $gte: startDate } } },
      { $project: {
          index: getIndexExpr
      }},
      { $group: {
          _id: "$index",
          count: { $sum: 1 }
      }}
    ];

    let activityLeadFilter = {};
    if (user.role === ROLES.USER) {
      const userLeads = await leadRepository.find({ assignedUser: user._id }, { limit: 0 });
      activityLeadFilter = { leadId: { $in: userLeads.map(l => l._id) } };
    }

    // Replace the exact string match with a case-insensitive regex for Closed Won leads
    // Since this is an aggregation pipeline, we'll just match anything starting with 'closed' or 'won'
    // Actually, in dashboard we used to match activityType LEAD_CLOSED. We can keep doing that.
    const [leadsAgg, contactedAgg, followUpAgg, closedAgg] = await Promise.all([
      Lead.aggregate(buildAgg({ ...leadQuery, isDeleted: false })),
      Activity.aggregate(buildAgg({ ...activityLeadFilter, activityType: ACTIVITY_TYPES.COMMUNICATION_ADDED })),
      FollowUp.aggregate(buildAgg(activityLeadFilter)),
      Activity.aggregate(buildAgg({ ...activityLeadFilter, activityType: ACTIVITY_TYPES.LEAD_CLOSED }))
    ]);

    const weeklyPipeline = Array.from({ length: buckets }).map((_, idx) => {
      const leads = leadsAgg.find(a => a._id === idx)?.count || 0;
      const contacted = contactedAgg.find(a => a._id === idx)?.count || 0;
      const followUp = followUpAgg.find(a => a._id === idx)?.count || 0;
      const closed = closedAgg.find(a => a._id === idx)?.count || 0;
      return {
        day: formatLabel(idx),
        leads,
        contacted,
        followUp,
        closed
      };
    });

    return {
      totalLeads,
      statusCounts,
      sourceCounts,
      todaysFollowUps,
      myLeads,
      weeklyPipeline,
      recentActivities: await activityRepository.findRecent(user.role === ROLES.USER ? { leadId: { $in: (await leadRepository.find({ assignedUser: user._id }, { limit: 0 })).map(l => l._id) } } : {}, 10)
    };
  }

  async getReports(user) {
    let leadQuery = { isDeleted: false };
    if (user.role === ROLES.USER) {
      leadQuery.assignedUser = user._id;
    }

    const leads = await Lead.find(leadQuery).populate('assignedUser');
    let mtdRevenue = 0;
    let closedLeads = 0;
    let totalRevenueClosed = 0; // for avgDealSize across all time
    let totalLeads = leads.length;

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const usersMap = {};

    // Helper: check if a status label means "Closed Won"
    const isClosedWon = (status) => {
      if (!status) return false;
      const s = status.toLowerCase().replace(/[\s_-]+/g, '');
      return s === 'closedwon' || s === 'closed' || s === 'won';
    };

    leads.forEach(l => {
      if (l.assignedUser && l.assignedUser.name) {
        if (!usersMap[l.assignedUser.name]) usersMap[l.assignedUser.name] = { leads: 0, closed: 0 };
        usersMap[l.assignedUser.name].leads++;
        if (isClosedWon(l.status)) {
          usersMap[l.assignedUser.name].closed++;
        }
      }

      if (isClosedWon(l.status)) {
        closedLeads++;
        totalRevenueClosed += l.value || 0;
        // MTD: only count if updated this month
        if (new Date(l.updatedAt) >= firstDay) {
          mtdRevenue += l.value || 0;
        }
      }
    });

    const conversionRate = totalLeads ? ((closedLeads / totalLeads) * 100).toFixed(1) : "0.0";
    const avgDealSize = closedLeads ? Math.round(totalRevenueClosed / closedLeads) : 0;

    const repPerformance = Object.keys(usersMap).map(name => ({
      name: name.split(' ')[0],
      leads: usersMap[name].leads,
      closed: usersMap[name].closed
    }));

    let topPerformer = "No deals yet";
    let topPerformerDeals = 0;
    for (const [name, stats] of Object.entries(usersMap)) {
      if (stats.closed > topPerformerDeals) {
        topPerformerDeals = stats.closed;
        topPerformer = name;
      }
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let activityFilter = { createdAt: { $gte: sevenDaysAgo } };
    if (user.role === ROLES.USER) {
      activityFilter.performedBy = user._id;
    }
    const recentActivities = await Activity.find(activityFilter);

    const dayNames = [];
    const dayMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      dayNames.push(dayName);
      dayMap[dayName] = { calls: 0, emails: 0 };
    }

    recentActivities.forEach(a => {
      const dayName = new Date(a.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      if (dayMap[dayName]) {
        const desc = (a.description || '').toLowerCase();
        if (a.activityType === 'COMMUNICATION_ADDED') {
          if (desc.includes('call') || desc.includes('phone')) dayMap[dayName].calls++;
          else if (desc.includes('email')) dayMap[dayName].emails++;
        }
      }
    });

    const weeklyActivity = dayNames.map(day => ({
      day,
      calls: dayMap[day].calls,
      emails: dayMap[day].emails
    }));

    return {
      cards: {
        mtdRevenue,
        conversionRate,
        avgDealSize,
        topPerformer,
        topPerformerDeals
      },
      repPerformance,
      weeklyActivity
    };
  }
}

module.exports = new DashboardService();
