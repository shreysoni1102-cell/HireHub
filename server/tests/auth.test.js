process.env.NODE_ENV = 'test';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server.js';
import User from '../models/User.js';
import Job from '../models/Job.js';

describe('HireHub Server Integration Tests', () => {
  const seekerEmail = 'testseeker@hirehub.demo';
  const recruiterEmail = 'testrecruiter@hirehub.demo';
  const password = 'Password123!';

  let seekerToken = '';
  let recruiterToken = '';
  let createdJobId = '';

  beforeAll(async () => {
    // Cleanup any existing test users or jobs to ensure clean state
    await User.deleteMany({ email: { $in: [seekerEmail, recruiterEmail] } });
  });

  afterAll(async () => {
    // Cleanup created data
    await User.deleteMany({ email: { $in: [seekerEmail, recruiterEmail] } });
    if (createdJobId) {
      await Job.deleteOne({ _id: createdJobId });
    }
    // Close mongoose connection
    await mongoose.connection.close();
  });

  describe('Auth Flow', () => {
    it('should register a seeker role successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Seeker',
          email: seekerEmail,
          password: password,
          role: 'user',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should login a seeker successfully (bypassing verification because it is @hirehub.demo)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: seekerEmail,
          password: password,
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      seekerToken = res.body.token;
    });

    it('should register a recruiter role successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Recruiter',
          email: recruiterEmail,
          password: password,
          role: 'recruiter',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should login a recruiter successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: recruiterEmail,
          password: password,
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      recruiterToken = res.body.token;
    });
  });

  describe('Job Posting Roles Check', () => {
    it('should allow a recruiter to post a job', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'Software Engineer - Test',
          description: 'A mock job posting to test roles and permissions.',
          company: 'Test Company',
          location: 'Remote',
          salary: '10 LPA',
        });

      expect(res.status).toBe(201);
      expect(res.body).toBeDefined();
      expect(res.body.title).toBe('Software Engineer - Test');
      createdJobId = res.body._id;
    });

    it('should reject a seeker trying to post a job with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          title: 'Malicious Job Posting',
          description: 'Should fail.',
          company: 'Failed Company',
          location: 'Remote',
          salary: '0 LPA',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });
  });
});
