import mongoose from 'mongoose';

let mongoServer;

/**
 * Connects to MongoDB. If NODE_ENV is 'test', starts and connects to an in-memory database.
 * Throws an error if connection fails (replacing process.exit for better test stability).
 */
export async function connectDB() {
  if (mongoose.connection.readyState !== 0) {
    return;
  }

  if (process.env.NODE_ENV === 'test') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    if (!mongoServer) {
      mongoServer = await MongoMemoryServer.create({
        binary: {
          version: '6.0.14',
        },
      });
    }
    const uri = mongoServer.getUri();
    try {
      await mongoose.connect(uri);
      console.log('MongoDB Memory Server connected successfully');
    } catch (err) {
      console.error('MongoDB Memory Server connection error:', err.message);
      throw err;
    }
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in environment');
    throw new Error('MONGODB_URI is not defined in environment');
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

/**
 * Disconnects mongoose and stops the memory server if running.
 */
export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
    }
    console.log('MongoDB disconnected successfully');
  } catch (err) {
    console.error('MongoDB disconnection error:', err.message);
    throw err;
  }
}
