import { Router } from 'express';
import { getProfile, syncGithubProfile } from '../controllers/profileController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Retrieve candidate profile
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: Profile details returned.
 */
router.get('/', protect, getProfile);

/**
 * @swagger
 * /api/profile/github-sync:
 *   post:
 *     summary: Synchronize profile with public GitHub repositories
 *     tags: [Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [githubUsername]
 *             properties:
 *               githubUsername:
 *                 type: string
 *                 example: octocat
 *     responses:
 *       200:
 *         description: Profile successfully synchronized and parsed.
 */
router.post('/github-sync', protect, syncGithubProfile);

export default router;
