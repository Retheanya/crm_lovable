const communicationService = require('../services/communication.service');

const addCommunication = async (req, res, next) => {
  try {
    const communication = await communicationService.addCommunication(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data: communication });
  } catch (error) {
    next(error);
  }
};

const getCommunications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort } = req.query;
    const options = {
      skip: (page - 1) * limit,
      limit: parseInt(limit),
      sort: sort ? { [sort.split(':')[0]]: sort.split(':')[1] === 'desc' ? -1 : 1 } : { createdAt: -1 }
    };

    const result = await communicationService.getCommunications(req.params.id, options, req.user);
    res.status(200).json({
      success: true,
      count: result.communications.length,
      total: result.total,
      data: result.communications
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addCommunication,
  getCommunications
};
