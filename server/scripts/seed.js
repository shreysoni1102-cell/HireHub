/**
 * Seed script: creates sample admin, recruiter, job seeker, jobs, and an application.
 * Run from server folder: npm run seed
 * Requires MONGODB_URI and JWT_SECRET in .env (JWT only if you extend seed to test tokens).
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Set MONGODB_URI in server/.env');
  process.exit(1);
}

async function run() {
  await mongoose.connect(uri);
  console.log('Connected. Clearing collections…');
  await Application.deleteMany({});
  await Job.deleteMany({});
  await User.deleteMany({});

  const password = await bcrypt.hash('Password123!', 12);

  const [admin, recruiter, seeker] = await User.create([
    {
      name: 'Alex Admin',
      email: 'admin@hirehub.demo',
      password,
      role: 'admin',
    },
    {
      name: 'Riley Recruiter',
      email: 'recruiter@hirehub.demo',
      password,
      role: 'recruiter',
    },
    {
      name: 'Sam Seeker',
      email: 'seeker@hirehub.demo',
      password,
      role: 'user',
    },
  ]);

  const jobs = await Job.create([
    {
      title: 'Frontend Engineer',
      description:
        'Build responsive UIs with React and collaborate with design. Experience with Vite and Tailwind is a plus.',
      company: 'Northwind Labs',
      location: 'Remote · US',
      salary: '$110k – $135k',
      createdBy: recruiter._id,
    },
    {
      title: 'Backend Developer (Node)',
      description:
        'Design REST APIs with Express and MongoDB. Own authentication, data modeling, and deployment workflows.',
      company: 'Blue Canoe Software',
      location: 'Hybrid · Toronto',
      salary: 'CAD 95k – 115k',
      createdBy: recruiter._id,
    },
    {
      title: 'Junior Full Stack Developer',
      description:
        'Great for portfolio builders: work across React and Node, ship features end-to-end with mentorship.',
      company: 'HireHub Demo Co.',
      location: 'Remote',
      salary: '$70k – $85k',
      createdBy: recruiter._id,
    },
  ]);

  await Application.create({
    jobId: jobs[0]._id,
    applicantId: seeker._id,
    resumeLink: 'https://example.com/resumes/sam-seeker.pdf',
    status: 'applied',
    appliedAt: new Date(),
  });

  console.log('\nSeed complete. Test accounts (password: Password123!):\n');
  console.log('  Admin:     admin@hirehub.demo');
  console.log('  Recruiter: recruiter@hirehub.demo');
  console.log('  Seeker:    seeker@hirehub.demo');
  console.log('\nJobs created:', jobs.length);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
