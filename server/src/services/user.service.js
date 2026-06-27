const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

class UserService {
  async getUsers(query) {
    const { page = 1, limit = 10, search, role, isActive, sort = '-createdAt' } = query;
    const skip = (page - 1) * limit;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const users = await User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password'); // Exclude password

    const total = await User.countDocuments(filter);

    return {
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getUserById(id) {
    const user = await User.findById(id).select('-password');
    if (!user) {
      throw new ErrorResponse('User not found', 404);
    }
    return user;
  }

  async createUser(userData, currentUser) {
    // Role protection: ADMIN cannot create SUPER_ADMIN
    if (currentUser.role === 'ADMIN' && userData.role === 'SUPER_ADMIN') {
      throw new ErrorResponse('Admins cannot create Super Admin accounts', 403);
    }

    // Check for existing email
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new ErrorResponse('Email already registered', 400);
    }

    const user = await User.create(userData);
    user.password = undefined; // Exclude password from response
    return user;
  }

  async updateUser(id, updateData, currentUser) {
    const user = await User.findById(id);
    if (!user) {
      throw new ErrorResponse('User not found', 404);
    }

    // Role protection: ADMIN cannot modify SUPER_ADMIN accounts
    if (currentUser.role === 'ADMIN' && user.role === 'SUPER_ADMIN') {
      throw new ErrorResponse('Admins cannot modify Super Admin accounts', 403);
    }

    // Role protection: ADMIN cannot elevate to SUPER_ADMIN
    if (currentUser.role === 'ADMIN' && updateData.role === 'SUPER_ADMIN') {
      throw new ErrorResponse('Admins cannot grant Super Admin privileges', 403);
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ email: updateData.email });
      if (existingUser) {
        throw new ErrorResponse('Email already registered', 400);
      }
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      user[key] = updateData[key];
    });

    await user.save();
    user.password = undefined;
    return user;
  }

  async updateUserStatus(id, isActive, currentUser) {
    if (id.toString() === currentUser._id.toString()) {
      throw new ErrorResponse('You cannot change your own status', 400);
    }

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      throw new ErrorResponse('User not found', 404);
    }

    if (currentUser.role === 'ADMIN' && userToUpdate.role === 'SUPER_ADMIN') {
      throw new ErrorResponse('Admins cannot modify Super Admin accounts', 403);
    }

    userToUpdate.isActive = isActive;
    await userToUpdate.save();
    userToUpdate.password = undefined;

    return userToUpdate;
  }

  async deleteUser(id, currentUser) {
    if (id.toString() === currentUser._id.toString()) {
      throw new ErrorResponse('You cannot delete your own account', 400);
    }

    const user = await User.findById(id);
    if (!user) {
      throw new ErrorResponse('User not found', 404);
    }

    if (currentUser.role === 'ADMIN' && user.role === 'SUPER_ADMIN') {
      throw new ErrorResponse('Admins cannot delete Super Admin accounts', 403);
    }

    await user.deleteOne();
    return true;
  }
}

module.exports = new UserService();
