import { Router } from 'express';
import {
  startInterview,
  submitAnswer,
  getInterviewHistory,
  getInterviewDetails
} from '../controllers/interviewController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/interview/start:
 *   post:
 *     summary: Start a new mock interview session
 *     tags: [Interview]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobTitle, jobDescription]
 *             properties:
 *               jobTitle:
 *                 type: string
 *                 example: Node.js Backend Developer
 *               jobDescription:
 *                 type: string
 *                 example: Design APIs, work with Mongoose, and maintain socket rooms.
 *     responses:
 *       201:
 *         description: Interview started. First question returned.
 */
router.post('/start', protect, startInterview);

/**
 * @swagger
 * /api/interview/answer:
 *   post:
 *     summary: Submit answer for current question and fetch next (or finish)
 *     tags: [Interview]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, answer]
 *             properties:
 *               sessionId:
 *                 type: string
 *               answer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Next question returned or completed evaluation details.
 */
router.post('/answer', protect, submitAnswer);

/**
 * @swagger
 * /api/interview/history:
 *   get:
 *     summary: List user interview sessions
 *     tags: [Interview]
 *     responses:
 *       200:
 *         description: List of sessions.
 */
router.get('/history', protect, getInterviewHistory);

/**
 * @swagger
 * /api/interview/{id}:
 *   get:
 *     summary: Get details of a single interview session
 *     tags: [Interview]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Complete session and score results.
 */
router.get('/:id', protect, getInterviewDetails);

export default router;
