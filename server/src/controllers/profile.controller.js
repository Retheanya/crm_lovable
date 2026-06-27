const profileService = require('../services/profile.service');

const getProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getProfile(req.user._id);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await profileService.updateProfile(req.user._id, req.body);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const result = await profileService.changePassword(req.user._id, currentPassword, newPassword, confirmPassword);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, changePassword };
