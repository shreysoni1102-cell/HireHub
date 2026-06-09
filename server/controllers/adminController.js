// Admin Controller - user management for admin role
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import ChatMessage from '../models/ChatMessage.js';
import InterviewSession from '../models/InterviewSession.js';

/** Admin: list all users (no passwords) */
export async function getUsers(_req, res, next) {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

/** Admin: delete user by id */
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if it's a demo account
    const isDemo = user.email.toLowerCase().endsWith('@hirehub.demo');
    if (isDemo) {
      return res.status(403).json({ message: 'Demo accounts cannot be deleted.' });
    }

    const userId = user._id;

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

    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}
