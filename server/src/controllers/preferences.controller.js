const preferencesService = require('../services/preferences.service');

exports.getPreferences = async (req, res, next) => {
  try {
    const preferences = await preferencesService.getPreferences(req.user._id);
    res.status(200).json({ success: true, data: preferences });
  } catch (error) {
    next(error);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const preferences = await preferencesService.updatePreferences(req.user._id, req.body);
    res.status(200).json({ success: true, data: preferences });
  } catch (error) {
    next(error);
  }
};
