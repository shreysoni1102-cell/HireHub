import { Router } from 'express';
import { register, login, verify, resendVerificationCode, forgotPassword, verifyResetCode, resetPassword, deleteAccount } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [user, recruiter, admin]
 *                 example: user
 *     responses:
 *       201:
 *         description: User registered successfully. Returns JWT token.
 *       400:
 *         description: Validation error or email already exists.
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and get a JWT token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful. Copy the token and click Authorize at the top.
 *       401:
 *         description: Invalid credentials.
 *       429:
 *         description: Too many login attempts. Rate limited for 15 minutes.
 */
router.post('/login', login);


router.post('/verify', verify);
router.post('/resend-code', resendVerificationCode);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);
router.delete('/delete-account', protect, deleteAccount);

export default router;
