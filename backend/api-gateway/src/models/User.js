const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  phone: { type: String, trim: true },
  dob: { type: Date },
  isVerified: { type: Boolean, default: false },
  otp: { code: String, expiresAt: Date, attempts: { type: Number, default: 0 } },
  lastLoginAt: { type: Date }
}, { timestamps: true });

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.otp;
  delete obj.__v;
  return obj;
};


module.exports = mongoose.model('User', userSchema);
