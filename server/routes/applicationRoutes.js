import { Router } from 'express';
import {
  applyToJob,
  getMyApplications,
  getRecruiterApplications,
  updateApplicationStatus,
} from '../controllers/applicationController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';

const router = Router();

/**
 * @swagger
 * /api/applications/my:
 *   get:
 *     summary: Get all my applications (Job Seeker only)
 *     tags: [Applications]
 *     responses:
 *       200:
 *         description: List of applications submitted by the logged-in seeker.
 *       401:
 *         description: Not authenticated.
 */
router.get('/my', protect, authorize('user'), getMyApplications);

/**
 * @swagger
 * /api/applications/recruiter:
 *   get:
 *     summary: Get all applications for recruiter's jobs (Recruiter only)
 *     tags: [Applications]
 *     responses:
 *       200:
 *         description: All applications for jobs posted by this recruiter.
 *       401:
 *         description: Not authenticated.
 */
router.get('/recruiter', protect, authorize('recruiter'), getRecruiterApplications);

/**
 * @swagger
 * /api/applications/{applicationId}/status:
 *   put:
 *     summary: Update application status — shortlist or reject (Recruiter only)
 *     tags: [Applications]
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [applied, shortlisted, rejected]
 *                 example: shortlisted
 *     responses:
 *       200:
 *         description: Status updated. Email notification sent to applicant.
 *       403:
 *         description: Not authorized to update this application.
 *       404:
 *         description: Application not found.
 */
router.put('/:applicationId/status', protect, authorize('recruiter'), updateApplicationStatus);

/**
 * @swagger
 * /api/applications/{jobId}:
 *   post:
 *     summary: Apply to a job (Job Seeker only)
 *     tags: [Applications]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB Job ID to apply for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resumeLink]
 *             properties:
 *               resumeLink:
 *                 type: string
 *                 example: https://drive.google.com/file/my-resume
 *     responses:
 *       201:
 *         description: Application submitted successfully.
 *       400:
 *         description: Already applied or missing resumeLink.
 *       404:
 *         description: Job not found.
 */
router.post('/:jobId', protect, authorize('user'), applyToJob);

export default router;
