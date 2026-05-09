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

// ─── SEND OTP ──────────────────────────────────────────────────────────────

exports.sendOTP = async (req, res, next) => {
  logger.info(`[AuthController] POST /auth/send-otp → body=${JSON.stringify({
    email: req.body.email,
    name: req.body.name,
    isRegistration: req.body.isRegistration
  })}`);

  try {
    const { error, value } = sendOTPSchema.validate(req.body);
    if (error) {
      logger.warn(`[AuthController] sendOTP validation failed: ${error.details[0].message}`);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, name, phone, dob, isRegistration } = value;

    if (isRegistration) {
      if (!name) {
        logger.warn(`[AuthController] Registration attempted without name — email=${email}`);
        return res.status(400).json({ error: 'Name is required for registration' });
      }
      logger.info(`[AuthController] Registration flow → calling sendOTPForRegistration for ${email}`);
      await authService.sendOTPForRegistration(email, name, phone, dob);
    } else {
      logger.info(`[AuthController] Login flow → calling sendOTP for ${email}`);
      const result = await authService.sendOTP(email);
      if (result.needsRegistration) {
        logger.warn(`[AuthController] Login OTP failed — email not registered: ${email}`);
        return res.status(404).json({ error: 'Email not registered', code: 'USER_NOT_FOUND' });
      }
    }

    logger.info(`[AuthController] OTP sent successfully → email=${email}`);
    res.status(200).json({ success: true, message: 'OTP sent successfully', expiresIn: 600 });
  } catch (err) {
    logger.error(`[AuthController] sendOTP unhandled error: ${err.message}`, { stack: err.stack });
    next(err);
  }
};

// ─── VERIFY OTP ────────────────────────────────────────────────────────────

exports.verifyOTP = async (req, res, next) => {
  logger.info(`[AuthController] POST /auth/verify-otp → email=${req.body.email}`);

  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      otp: Joi.string().length(6).required()
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      logger.warn(`[AuthController] verifyOTP validation failed: ${error.details[0].message}`);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { token, user } = await authService.verifyOTP(value.email, value.otp);
    logger.info(`[AuthController] User authenticated successfully — email=${value.email}, userId=${user._id}`);
    res.status(200).json({
      success: true, token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, dob: user.dob },
      expiresIn: 86400
    });
  } catch (err) {
    const knownErrors = ['Invalid OTP code.', 'OTP has expired', 'No OTP requested'];
    if (knownErrors.some(m => err.message.startsWith(m))) {
      logger.warn(`[AuthController] verifyOTP known rejection: ${err.message}`);
      return res.status(401).json({ error: err.message });
    }
    logger.error(`[AuthController] verifyOTP unhandled error: ${err.message}`, { stack: err.stack });
    next(err);
  }
};

// ─── LOGOUT ────────────────────────────────────────────────────────────────

exports.logout = (req, res) => {
  logger.info(`[AuthController] POST /auth/logout → email=${req.user?.email}`);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// ─── ME ────────────────────────────────────────────────────────────────────

exports.me = async (req, res, next) => {
  logger.info(`[AuthController] GET /auth/me → userId=${req.user?.userId}`);
  try {
    const user = await User.findById(req.user.userId).select('-otp -__v');
    if (!user) {
      logger.warn(`[AuthController] /me — user not found in DB: userId=${req.user.userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (err) {
    logger.error(`[AuthController] /me unhandled error: ${err.message}`, { stack: err.stack });
    next(err);
  }
};
