import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 * @returns {Promise} MongoDB connection
 */
const connectDB = async () => {
  try {
    // Connect to MongoDB with modern options
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // No need for deprecated options in Mongoose 6+
      // Just using the connection string is enough
    });

    console.log('✅ MongoDB connected successfully');
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    // Don't exit the process, just log the error
    // This allows the server to continue running even if MongoDB is not available
    // process.exit(1);
  }
};

export default connectDB;
