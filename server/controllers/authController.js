// Auth Controller - handles register, login with JWT
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import ChatMessage from '../models/ChatMessage.js';
import InterviewSession from '../models/InterviewSession.js';
import { generateToken } from '../utils/generateToken.js';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../utils/emailService.js';

/**
 * Register a new user. Default role is "user" unless body.role is valid for dev/testing.
 * In production you may want to strip role from body and always use 'user'.
 */
export async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 3600000); // 1 hour

    const hashed = await bcrypt.hash(password, 12);
    const allowedOnRegister = ['user', 'recruiter'];
    const safeRole =
      role && allowedOnRegister.includes(role) ? role : 'user';

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: safeRole,
      isVerified: false,
      verificationCode,
      verificationExpires,
    });

    // Send verification email
    await sendVerificationEmail({
      toEmail: user.email,
      toName: user.name,
      code: verificationCode,
    });

    res.status(201).json({
      success: true,
      email: user.email,
      message: 'Registration successful. Please check your email for the verification code.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Login with email and password; returns JWT.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is verified (only block if explicitly false and not a demo account)
    const isDemo = email.toLowerCase().endsWith('@hirehub.demo');
    if (user.isVerified === false && !isDemo) {
      // Auto-regenerate code if expired or missing
      if (!user.verificationCode || !user.verificationExpires || user.verificationExpires < Date.now()) {
        user.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationExpires = new Date(Date.now() + 3600000);
        await user.save();
        await sendVerificationEmail({
          toEmail: user.email,
          toName: user.name,
          code: user.verificationCode,
        });
      }
      return res.status(403).json({
        message: 'Please verify your email address first. A verification code has been sent.',
        isVerified: false,
        email: user.email,
      });
    }

    const token = generateToken(user._id, user.role);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify registration code.
 */
export async function verify(req, res, next) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (user.verificationExpires < Date.now()) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    // Mark as verified and clear code fields
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    await user.save();

    // Send welcome email highlighting platform features
    sendWelcomeEmail({
      toEmail: user.email,
      toName: user.name,
      role: user.role
    }).catch(err => console.error('[Mailer] Welcome email background error:', err.message));

    const token = generateToken(user._id, user.role);
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: 'Account verified successfully!',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Resend verification code.
 */
export async function resendVerificationCode(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 3600000); // 1 hour

    user.verificationCode = verificationCode;
    user.verificationExpires = verificationExpires;
    await user.save();

    await sendVerificationEmail({
      toEmail: user.email,
      toName: user.name,
      code: verificationCode,
    });

    res.status(200).json({
      success: true,
      message: 'Verification code has been resent to your email.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Request password reset code.
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit random code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    await sendPasswordResetEmail({
      toEmail: user.email,
      toName: user.name,
      code: resetCode,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset code has been sent to your email.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify reset password code.
 */
export async function verifyResetCode(req, res, next) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and reset code are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.resetPasswordCode !== code) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    if (user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: 'Reset code has expired' });
    }

    res.status(200).json({
      success: true,
      message: 'Reset code verified successfully. You can now choose a new password.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reset password using verification code.
 */
export async function resetPassword(req, res, next) {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.resetPasswordCode !== code) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    if (user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: 'Reset code has expired' });
    }

    // Update password
    const hashed = await bcrypt.hash(newPassword, 12);
    user.password = hashed;

    // Clear code fields
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete current user account and cascade delete all related data.
 * Demo accounts are blocked from deletion.
 */
export async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if it's a demo account
    const isDemo = user.email.toLowerCase().endsWith('@hirehub.demo');
    if (isDemo) {
      return res.status(403).json({ message: 'Demo accounts cannot be deleted.' });
    }

    // 1. Delete user profile
    await Profile.deleteOne({ userId });

    // 2. Delete interview sessions
    await InterviewSession.deleteMany({ userId });

    // 3. Delete based on role
    if (user.role === 'user') {
      // Find candidate applications
      const apps = await Application.find({ applicantId: userId });
      const appIds = apps.map(a => a._id.toString());
      
      // Delete chat messages in rooms of these applications
      await ChatMessage.deleteMany({ roomId: { $in: appIds } });
      
      // Delete applications
      await Application.deleteMany({ applicantId: userId });
    } else if (user.role === 'recruiter') {
      // Find recruiter jobs
      const jobs = await Job.find({ createdBy: userId });
      const jobIds = jobs.map(j => j._id);
      
      // Find applications for these jobs
      const apps = await Application.find({ jobId: { $in: jobIds } });
      const appIds = apps.map(a => a._id.toString());
      
      // Delete chat messages in rooms of these applications
      await ChatMessage.deleteMany({ roomId: { $in: appIds } });
      
      // Delete applications for recruiter's jobs
      await Application.deleteMany({ jobId: { $in: jobIds } });
      
      // Delete recruiter's jobs
      await Job.deleteMany({ createdBy: userId });
    }

    // 4. Delete chat messages sent by this user
    await ChatMessage.deleteMany({ senderId: userId });

    // 5. Delete user account
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.',
    });
  } catch (err) {
    next(err);
  }
}
