const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../config/logger');

class AuthService {
  constructor() {
    // Log SMTP config presence at startup (never log actual passwords)
    logger.info('[AuthService] Initializing SMTP transporter', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 4)}***` : '(not set)',
    });

    const isGmail = !process.env.SMTP_HOST || process.env.SMTP_HOST === 'smtp.gmail.com';

    const transportConfig = {
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      // Force IPv4 — Railway/cloud IPv6 routes to Gmail often fail
      family: 4,
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    };

    if (isGmail) {
      // Gmail: explicit port 465 + direct TLS (NOT port 587 STARTTLS)
      transportConfig.host = 'smtp.gmail.com';
      transportConfig.port = 465;
      transportConfig.secure = true;
      logger.info('[AuthService] Gmail SMTP: port=465, secure=true, family=IPv4');
    } else {
      transportConfig.host = process.env.SMTP_HOST;
      transportConfig.port = parseInt(process.env.SMTP_PORT);
      transportConfig.secure = process.env.SMTP_SECURE === 'true';
      logger.info(`[AuthService] Custom SMTP: ${transportConfig.host}:${transportConfig.port}`);
    }

    this.transporter = nodemailer.createTransport(transportConfig);

    // Verify SMTP connection at startup
    this.transporter.verify()
      .then(() => logger.info('[AuthService] ✅ SMTP connection verified successfully'))
      .catch((err) => logger.error(`[AuthService] ❌ SMTP verification FAILED: ${err.message}`, { stack: err.stack }));
  }

  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // ─── REGISTRATION FLOW ────────────────────────────────────────────────────

  async sendOTPForRegistration(email, name, phone, dob) {
    logger.info(`[Auth] sendOTPForRegistration → email=${email}, name=${name}`);

    // 1. Check for existing verified user
    const existing = await User.findOne({ email });
    logger.debug(`[Auth] Existing user lookup result: ${existing ? `found (isVerified=${existing.isVerified})` : 'not found'}`);

    if (existing && existing.isVerified) {
      logger.warn(`[Auth] Registration blocked — email already verified: ${email}`);
      throw new Error('Email already registered. Please login instead.');
    }

    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 2. Upsert user record with OTP
    logger.info(`[Auth] Upserting user record in DB for ${email}`);
    let savedUser;
    try {
      savedUser = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            name, email, phone,
            dob: dob ? new Date(dob) : undefined,
            'otp.code': otp,
            'otp.expiresAt': expiresAt,
            'otp.attempts': 1,
            isVerified: false
          }
        },
        { upsert: true, new: true }
      );
      logger.info(`[Auth] User upserted successfully — _id=${savedUser._id}, email=${email}`);
    } catch (dbErr) {
      logger.error(`[Auth] DB upsert FAILED for ${email}: ${dbErr.message}`, { stack: dbErr.stack });
      throw dbErr;
    }

    // 3. Send OTP email
    await this._sendEmail(email, otp, name);
    return { sent: true };
  }

  // ─── LOGIN FLOW ───────────────────────────────────────────────────────────

  async sendOTP(email) {
    logger.info(`[Auth] sendOTP (login) → email=${email}`);

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`[Auth] Login OTP requested for unregistered email: ${email}`);
      return { needsRegistration: true };
    }

    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    try {
      await User.findOneAndUpdate({ email }, {
        $set: { 'otp.code': otp, 'otp.expiresAt': expiresAt, 'otp.attempts': 1 }
      });
      logger.info(`[Auth] OTP saved in DB for login — email=${email}`);
    } catch (dbErr) {
      logger.error(`[Auth] DB update FAILED saving OTP for ${email}: ${dbErr.message}`, { stack: dbErr.stack });
      throw dbErr;
    }

    await this._sendEmail(email, otp, user.name);
    return { sent: true };
  }

  // ─── EMAIL SENDER ─────────────────────────────────────────────────────────

  async _sendEmail(email, otp, name) {
    logger.info(`[Auth] Sending OTP email → to=${email}`);

    // Verify SMTP config before attempting
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.error('[Auth] SMTP_USER or SMTP_PASS is not set — email will fail');
      throw new Error('Email service is not configured. Contact support.');
    }

    try {
      const info = await this.transporter.sendMail({
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
      logger.info(`[Auth] OTP email sent successfully → to=${email}, messageId=${info.messageId}`);
    } catch (mailErr) {
      logger.error(`[Auth] Email send FAILED → to=${email}: ${mailErr.message}`, {
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
        smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 4)}***` : '(not set)',
        stack: mailErr.stack,
      });
      throw mailErr;
    }
  }

  // ─── OTP VERIFICATION ─────────────────────────────────────────────────────

  async verifyOTP(email, otpCode) {
    logger.info(`[Auth] verifyOTP → email=${email}`);

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`[Auth] verifyOTP failed — user not found: ${email}`);
      throw new Error('User not found');
    }
    if (!user.otp?.code) {
      logger.warn(`[Auth] verifyOTP failed — no OTP on record for: ${email}`);
      throw new Error('No OTP requested. Please request a new one.');
    }
    if (user.otp.expiresAt < new Date()) {
      logger.warn(`[Auth] verifyOTP failed — OTP expired for: ${email}, expiredAt=${user.otp.expiresAt}`);
      throw new Error('OTP has expired. Please request a new one.');
    }
    if (user.otp.code !== otpCode) {
      logger.warn(`[Auth] verifyOTP failed — wrong OTP for: ${email}`);
      throw new Error('Invalid OTP code.');
    }

    // Mark verified
    try {
      await User.findOneAndUpdate({ email }, {
        $set: { isVerified: true, lastLoginAt: new Date() },
        $unset: { otp: 1 }
      });
      logger.info(`[Auth] User verified and marked isVerified=true — email=${email}, _id=${user._id}`);
    } catch (dbErr) {
      logger.error(`[Auth] DB update FAILED after OTP verify for ${email}: ${dbErr.message}`, { stack: dbErr.stack });
      throw dbErr;
    }

    return { token: this.generateJWT(user), user };
  }

  // ─── JWT ──────────────────────────────────────────────────────────────────

  generateJWT(user) {
    if (!process.env.JWT_SECRET) {
      logger.error('[Auth] JWT_SECRET is not set — token generation will fail');
      throw new Error('Server configuration error');
    }
    logger.debug(`[Auth] Generating JWT for userId=${user._id}`);
    return jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }

  verifyJWT(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}

module.exports = new AuthService();
