import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hirehub';

async function run() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  
  // Set isVerified: true for all existing users
  const res = await User.updateMany(
    { isVerified: { $exists: false } },
    { $set: { isVerified: true } }
  );
  console.log(`Updated ${res.modifiedCount} users to isVerified: true`);
  
  // Also make sure all demo accounts are verified
  const resDemo = await User.updateMany(
    { email: { $regex: /@hirehub\.demo$/i } },
    { $set: { isVerified: true } }
  );
  console.log(`Ensured demo accounts are verified`);

  await mongoose.disconnect();
  console.log('Disconnected');
}

run().catch(console.error);
