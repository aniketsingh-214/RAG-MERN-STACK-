const Joi = require('joi');
const User = require('../models/User');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-otp -__v');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ success: true, user });
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { error, value } = Joi.object({
      name: Joi.string().min(2).max(100),
      phone: Joi.string(),
      dob: Joi.date().iso()
    }).validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = await User.findByIdAndUpdate(req.user.userId, { $set: value }, { new: true, runValidators: true }).select('-otp -__v');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ success: true, user });
  } catch (err) { next(err); }
};
