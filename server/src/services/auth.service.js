const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const ErrorResponse = require('../utils/errorResponse');

class AuthService {
  async login(email, password) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new ErrorResponse('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new ErrorResponse('User account is inactive', 401);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new ErrorResponse('Invalid credentials', 401);
    }

    const token = this.generateToken(user._id, user.role, user.email);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  generateToken(userId, role, email) {
    return jwt.sign(
      { userId, role, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }
}

module.exports = new AuthService();
