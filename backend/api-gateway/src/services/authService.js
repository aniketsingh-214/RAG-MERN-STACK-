const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../config/logger');

class AuthService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }

  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  async sendOTPForRegistration(email, name, phone, dob) {
    const existing = await User.findOne({ email });
    if (existing && existing.isVerified)
      throw new Error('Email already registered. Please login instead.');

    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await User.findOneAndUpdate(
      { email },
      { $set: { name, email, phone, dob: dob ? new Date(dob) : undefined,
          'otp.code': otp, 'otp.expiresAt': expiresAt, 'otp.attempts': 1, isVerified: false } },
      { upsert: true, new: true }
    );

    await this._sendEmail(email, otp, name);
    return { sent: true };
  }

  async sendOTP(email) {
    const user = await User.findOne({ email });
    if (!user) return { needsRegistration: true };

    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await User.findOneAndUpdate({ email }, {
      $set: { 'otp.code': otp, 'otp.expiresAt': expiresAt, 'otp.attempts': 1 }
    });

    await this._sendEmail(email, otp, user.name);
    return { sent: true };
  }

  async _sendEmail(email, otp, name) {
    await this.transporter.sendMail({
      from: `"${process.env.APP_NAME || 'RAG Assistant'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your Verification Code - ${process.env.APP_NAME || 'RAG Assistant'}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f0f;color:#fff;border-radius:12px;">
        <h1 style="color:#7c3aed;">RAG Assistant</h1>
        <p>Hi ${name || 'there'},</p>
        <p>Your one-time verification code:</p>
        <div style="background:#1a1a2e;border:2px solid #7c3aed;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#a78bfa;">${otp}</span>
        </div>
        <p style="color:#71717a;">Expires in <strong>10 minutes</strong>. Do not share it.</p>
      </div>`
    });
  }

  async verifyOTP(email, otpCode) {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');
    if (!user.otp?.code) throw new Error('No OTP requested. Please request a new one.');
    if (user.otp.expiresAt < new Date()) throw new Error('OTP has expired. Please request a new one.');
    if (user.otp.code !== otpCode) throw new Error('Invalid OTP code.');

    await User.findOneAndUpdate({ email }, {
      $set: { isVerified: true, lastLoginAt: new Date() },
      $unset: { otp: 1 }
    });

    return { token: this.generateJWT(user), user };
  }

  generateJWT(user) {
    return jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  verifyJWT(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}

module.exports = new AuthService();
