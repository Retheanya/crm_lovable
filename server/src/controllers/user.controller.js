const userService = require('../services/user.service');

exports.getUsers = async (req, res, next) => {
  try {
    const result = await userService.getUsers(req.query);
    res.status(200).json({ success: true, count: result.data.length, total: result.pagination.total, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body, req.user);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const user = await userService.updateUserStatus(req.params.id, req.body.isActive, req.user);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
