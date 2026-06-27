const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

class PreferencesService {
  async getPreferences(userId) {
    const user = await User.findById(userId);
    if (!user) throw new ErrorResponse('User not found', 404);
    
    return user.preferences || { theme: 'light', accentColor: '#2563eb', density: 'comfortable' };
  }

  async updatePreferences(userId, updateData) {
    const user = await User.findById(userId);
    if (!user) throw new ErrorResponse('User not found', 404);

    if (!user.preferences) {
      user.preferences = { theme: 'light', accentColor: '#2563eb', density: 'comfortable' };
    }

    if (updateData.theme) user.preferences.theme = updateData.theme;
    if (updateData.accentColor) user.preferences.accentColor = updateData.accentColor;
    if (updateData.density) user.preferences.density = updateData.density;

    await user.save();
    return user.preferences;
  }
}

module.exports = new PreferencesService();
