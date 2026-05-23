import Job from '../models/Job.js';

/** Public: list all jobs */
export async function getJobs(_req, res, next) {
  try {
    const jobs = await Job.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
}

/** Public: single job */
export async function getJobById(req, res, next) {
  try {
    const job = await Job.findById(req.params.id).populate('createdBy', 'name email');
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  } catch (err) {
    next(err);
  }
}

/** Recruiter: create job */
export async function createJob(req, res, next) {
  try {
    const { title, description, company, location, salary } = req.body;
    if (!title || !description || !company || !location || !salary) {
      return res.status(400).json({ message: 'All job fields are required' });
    }
    const job = await Job.create({
      title,
      description,
      company,
      location,
      salary,
      createdBy: req.user._id,
    });
    await job.populate('createdBy', 'name email');
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
}

/** Recruiter: update own job */
export async function updateJob(req, res, next) {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own jobs' });
    }
    const { title, description, company, location, salary } = req.body;
    Object.assign(job, {
      ...(title != null && { title }),
      ...(description != null && { description }),
      ...(company != null && { company }),
      ...(location != null && { location }),
      ...(salary != null && { salary }),
    });
    await job.save();
    await job.populate('createdBy', 'name email');
    res.json(job);
  } catch (err) {
    next(err);
  }
}

/** Recruiter: delete own job */
export async function deleteJob(req, res, next) {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own jobs' });
    }
    await job.deleteOne();
    res.json({ message: 'Job removed' });
  } catch (err) {
    next(err);
  }
}
