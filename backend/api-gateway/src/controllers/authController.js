const Joi = require('joi');
const authService = require('../services/authService');
const User = require('../models/User');
const logger = require('../config/logger');

const sendOTPSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100),
  phone: Joi.string(),
  dob: Joi.date().iso(),
  isRegistration: Joi.boolean()
});

exports.sendOTP = async (req, res, next) => {
  try {
    const { error, value } = sendOTPSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { email, name, phone, dob, isRegistration } = value;

    if (isRegistration) {
      if (!name) return res.status(400).json({ error: 'Name is required for registration' });
      await authService.sendOTPForRegistration(email, name, phone, dob);
    } else {
      const result = await authService.sendOTP(email);
      if (result.needsRegistration)
        return res.status(404).json({ error: 'Email not registered', code: 'USER_NOT_FOUND' });
    }
    res.status(200).json({ success: true, message: 'OTP sent successfully', expiresIn: 600 });
  } catch (err) { next(err); }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const schema = Joi.object({ email: Joi.string().email().required(), otp: Joi.string().length(6).required() });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { token, user } = await authService.verifyOTP(value.email, value.otp);
    logger.info(`User ${value.email} authenticated`);
    res.status(200).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, dob: user.dob }, expiresIn: 86400 });
  } catch (err) {
    if (['Invalid OTP code.', 'OTP has expired', 'No OTP requested'].some(m => err.message.startsWith(m)))
      return res.status(401).json({ error: err.message });
    next(err);
  }
};

exports.logout = (req, res) => {
  logger.info(`User ${req.user?.email} logged out`);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-otp -__v');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ user });
  } catch (err) { next(err); }
};
