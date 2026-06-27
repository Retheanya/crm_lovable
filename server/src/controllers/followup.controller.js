const followUpService = require('../services/followup.service');

const addFollowUp = async (req, res, next) => {
  try {
    const followUp = await followUpService.addFollowUp(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data: followUp });
  } catch (error) {
    next(error);
  }
};

const updateFollowUp = async (req, res, next) => {
  try {
    const followUp = await followUpService.updateFollowUp(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: followUp });
  } catch (error) {
    next(error);
  }
};

const getFollowUps = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, status, today, leadId } = req.query;
    const options = {
      skip: (page - 1) * limit,
      limit: parseInt(limit),
      sort: sort ? { [sort.split(':')[0]]: sort.split(':')[1] === 'desc' ? -1 : 1 } : { followUpDate: 1 }
    };

    const result = await followUpService.getFollowUps({ status, today, leadId }, options, req.user);
    res.status(200).json({
      success: true,
      count: result.followUps.length,
      total: result.total,
      data: result.followUps
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addFollowUp,
  updateFollowUp,
  getFollowUps
};
