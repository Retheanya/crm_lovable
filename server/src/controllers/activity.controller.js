const activityService = require('../services/activity.service');

const getActivities = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort } = req.query;
    const options = {
      skip: (page - 1) * limit,
      limit: parseInt(limit),
      sort: sort ? { [sort.split(':')[0]]: sort.split(':')[1] === 'desc' ? -1 : 1 } : { createdAt: -1 }
    };

    const result = await activityService.getActivities(req.params.id, options, req.user);
    res.status(200).json({
      success: true,
      count: result.activities.length,
      total: result.total,
      data: result.activities
    });
  } catch (error) {
    next(error);
  }
};

const getAllActivities = async (req, res, next) => {
  try {
    const { page = 1, limit = 200, activityType, fromDate, toDate } = req.query;
    const options = {
      skip: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit),
      activityType: activityType || null,
      fromDate: fromDate || null,
      toDate: toDate || null
    };

    const result = await activityService.getAllActivities(options, req.user);
    res.status(200).json({
      success: true,
      count: result.activities.length,
      total: result.total,
      data: result.activities
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getActivities, getAllActivities };
