import { Router } from 'express';
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
} from '../controllers/jobController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';

const router = Router();

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Get all job listings
 *     tags: [Jobs]
 *     security: []
 *     responses:
 *       200:
 *         description: List of all jobs.
 */
router.get('/', getJobs);

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get a single job by ID
 *     tags: [Jobs]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB Job ID
 *     responses:
 *       200:
 *         description: Job details.
 *       404:
 *         description: Job not found.
 */
router.get('/:id', getJobById);

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job (Recruiter only)
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, company, location, salary]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Frontend Developer
 *               description:
 *                 type: string
 *                 example: Build amazing UIs using React.
 *               company:
 *                 type: string
 *                 example: TechCorp Pvt Ltd
 *               location:
 *                 type: string
 *                 example: Bangalore, India
 *               salary:
 *                 type: string
 *                 example: "8-12 LPA"
 *     responses:
 *       201:
 *         description: Job created successfully.
 *       401:
 *         description: Not authenticated.
 *       403:
 *         description: Not authorized (must be a recruiter).
 */
router.post('/', protect, authorize('recruiter'), createJob);

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     summary: Update a job (Recruiter only — must be job owner)
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               company:
 *                 type: string
 *               location:
 *                 type: string
 *               salary:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job updated successfully.
 *       403:
 *         description: Not authorized.
 *       404:
 *         description: Job not found.
 */
router.put('/:id', protect, authorize('recruiter'), updateJob);

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     summary: Delete a job (Recruiter only — must be job owner)
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job deleted.
 *       403:
 *         description: Not authorized.
 *       404:
 *         description: Job not found.
 */
router.delete('/:id', protect, authorize('recruiter'), deleteJob);

export default router;
