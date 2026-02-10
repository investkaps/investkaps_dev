import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 * @returns {Promise} MongoDB connection
 */
const connectDB = async () => {
  try {
    console.log('🔌 DB: Attempting to connect to MongoDB...');
    console.log('🔌 DB: Connection string:', process.env.MONGODB_URI ? '***SET***' : 'NOT_SET');
    
    // Connect to MongoDB with modern options
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // No need for deprecated options in Mongoose 6+
      // Just using the connection string is enough
    });

    console.log('✅ DB: MongoDB connected successfully!');
    console.log('✅ DB: Connection host:', conn.connection.host);
    console.log('✅ DB: Connection name:', conn.connection.name);

    return conn;
  } catch (error) {
    console.error('❌ DB: MongoDB connection failed:', error.message);
    console.error('❌ DB: Full error:', error);
    // Don't exit the process, just log the error
    // This allows the server to continue running even if MongoDB is not available
    // process.exit(1);
  }
};

export default connectDB;
