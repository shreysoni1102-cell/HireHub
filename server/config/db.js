import mongoose from 'mongoose';

/**
 * Connects to MongoDB using MONGODB_URI from environment.
 * Exits the process if connection fails (fail-fast for production clarity).
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in environment');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}
