import { Router } from 'express';
import { getUsers, deleteUser } from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';

const router = Router();

router.use(protect, authorize('admin'));

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of all registered users.
 *       403:
 *         description: Not authorized — admin role required.
 */
router.get('/users', getUsers);

/**
 * @swagger
 * /api/admin/user/{id}:
 *   delete:
 *     summary: Delete a user by ID (Admin only)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB User ID to delete
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *       403:
 *         description: Not authorized — admin role required.
 *       404:
 *         description: User not found.
 */
router.delete('/user/:id', deleteUser);

export default router;
