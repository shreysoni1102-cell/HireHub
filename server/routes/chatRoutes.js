import { Router } from 'express';
import ChatMessage from '../models/ChatMessage.js';
import Application from '../models/Application.js';
import { protect } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/chat/{roomId}:
 *   get:
 *     summary: Get chat history for a room (applicationId)
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of chat messages
 *       403:
 *         description: Not authorized to view this chat
 */
router.get('/:roomId', protect, async (req, res, next) => {
  try {
    const { roomId } = req.params;

    // Verify the requesting user is part of this application
    const application = await Application.findById(roomId)
      .populate('jobId', 'createdBy')
      .lean();

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const isSeeker    = String(application.applicantId) === String(req.user.id);
    const isRecruiter = String(application.jobId?.createdBy) === String(req.user.id);

    if (!isSeeker && !isRecruiter) {
      return res.status(403).json({ message: 'Not authorized to view this chat.' });
    }

    if (application.status !== 'shortlisted') {
      return res.status(403).json({ message: 'Chat is only available for shortlisted applications.' });
    }

    const messages = await ChatMessage.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.json({ messages, application });
  } catch (err) {
    next(err);
  }
});

export default router;
