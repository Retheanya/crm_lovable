const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

class ProfileService {
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ErrorResponse('User not found', 404);
    }
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };
  }

  async updateProfile(userId, updateData) {
    // Ensure email is unique if updated
    if (updateData.email) {
      const existingUser = await User.findOne({ email: updateData.email });
      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        throw new ErrorResponse('Email already in use', 400);
      }
    }

    const user = await User.findByIdAndUpdate(userId, {
      name: updateData.name,
      email: updateData.email
    }, {
      new: true,
      runValidators: true
    });

    if (!user) {
      throw new ErrorResponse('User not found', 404);
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };
  }

  async changePassword(userId, currentPassword, newPassword, confirmPassword) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new ErrorResponse('Please provide current, new, and confirm passwords', 400);
    }

    if (newPassword !== confirmPassword) {
      throw new ErrorResponse('New password and confirm password do not match', 400);
    }

    if (newPassword.length < 6) {
      throw new ErrorResponse('Password must be at least 6 characters', 400);
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new ErrorResponse('User not found', 404);
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      throw new ErrorResponse('Current password is incorrect', 401);
    }

    user.password = newPassword;
    await user.save();

    return { message: 'Password updated successfully' };
  }
}

module.exports = new ProfileService();
