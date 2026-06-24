import { connectDB, disconnectDB } from './config/db.js';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});
