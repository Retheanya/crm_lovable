const dashboardService = require('../services/dashboard.service');

const getSummary = async (req, res, next) => {
  try {
    const summary = await dashboardService.getSummary(req.user, req.query.pipelineRange);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

const getReports = async (req, res, next) => {
  try {
    const reports = await dashboardService.getReports(req.user);
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary, getReports };
