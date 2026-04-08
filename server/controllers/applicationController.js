// Application Controller — job application submission and status management
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import { sendStatusUpdateEmail } from '../utils/emailService.js';

/** Job seeker: apply to a job */
export async function applyToJob(req, res, next) {
  try {
    const { jobId } = req.params;
    const { resumeLink } = req.body;
    if (!resumeLink) {
      return res.status(400).json({ message: 'resumeLink is required' });
    }
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    try {
      const application = await Application.create({
        jobId,
        applicantId: req.user._id,
        resumeLink,
        status: 'applied',
        appliedAt: new Date(),
      });
      await application.populate([
        { path: 'jobId', select: 'title company location' },
        { path: 'applicantId', select: 'name email' },
      ]);
      res.status(201).json(application);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: 'You have already applied to this job' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/** Job seeker: my applications */
export async function getMyApplications(req, res, next) {
  try {
    const list = await Application.find({ applicantId: req.user._id })
      .populate('jobId')
      .sort({ appliedAt: -1 });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

/** Recruiter: applications for jobs they posted */
export async function getRecruiterApplications(req, res, next) {
  try {
    const myJobs = await Job.find({ createdBy: req.user._id }).select('_id title company');
    const jobIds = myJobs.map((j) => j._id);
    const applications = await Application.find({ jobId: { $in: jobIds } })
      .populate('applicantId', 'name email')
      .populate('jobId', 'title company location')
      .sort({ appliedAt: -1 });
    res.json({ jobs: myJobs, applications });
  } catch (err) {
    next(err);
  }
}

/** Recruiter: update application status (shortlist / reject) */
export async function updateApplicationStatus(req, res, next) {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;
    if (!['shortlisted', 'rejected', 'applied'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const application = await Application.findById(applicationId).populate('jobId');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    const job = application.jobId;
    if (!job || job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not allowed to update this application' });
    }
    application.status = status;
    await application.save();
    await application.populate([
      { path: 'jobId', select: 'title company' },
      { path: 'applicantId', select: 'name email' },
    ]);

    // Fire-and-forget email notification (does not block the response)
    sendStatusUpdateEmail({
      toEmail: application.applicantId.email,
      toName: application.applicantId.name,
      jobTitle: application.jobId.title,
      company: application.jobId.company,
      status,
    });

    res.json(application);
  } catch (err) {
    next(err);
  }
}

