const Joi = require('joi');
const User = require('../models/User');
const logger = require('../config/logger');

exports.getProfile = async (req, res, next) => {
  logger.info(`[UserController] GET /user/profile → userId=${req.user?.userId}`);
  try {
    const user = await User.findById(req.user.userId).select('-otp -__v');
    if (!user) {
      logger.warn(`[UserController] getProfile — user not found: userId=${req.user.userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    logger.info(`[UserController] Profile returned for email=${user.email}`);
    res.status(200).json({ success: true, user });
  } catch (err) {
    logger.error(`[UserController] getProfile failed: ${err.message}`, { stack: err.stack });
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  logger.info(`[UserController] PUT /user/profile → userId=${req.user?.userId}, fields=${JSON.stringify(Object.keys(req.body))}`);
  try {
    const { error, value } = Joi.object({
      name: Joi.string().min(2).max(100),
      phone: Joi.string(),
      dob: Joi.date().iso()
    }).validate(req.body);
    if (error) {
      logger.warn(`[UserController] updateProfile validation failed: ${error.details[0].message}`);
      return res.status(400).json({ error: error.details[0].message });
    }

    const user = await User.findByIdAndUpdate(req.user.userId, { $set: value }, { new: true, runValidators: true }).select('-otp -__v');
    if (!user) {
      logger.warn(`[UserController] updateProfile — user not found: userId=${req.user.userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    logger.info(`[UserController] Profile updated for email=${user.email}`);
    res.status(200).json({ success: true, user });
  } catch (err) {
    logger.error(`[UserController] updateProfile failed: ${err.message}`, { stack: err.stack });
    next(err);
  }
};
