/**
 * Configuration settings for the application
 * 
 * This file should be gitignored in production and replaced with environment variables
 * For development, you can set values directly here
 */

export default {
  // MongoDB connection string
  MONGO_URI: process.env.MONGO_URI,
  
  // JWT Secret for token generation
  JWT_SECRET: process.env.JWT_SECRET,
  
  // Clerk API keys
  CLERK_API_KEY: process.env.CLERK_API_KEY,
  CLERK_FRONTEND_API: process.env.CLERK_FRONTEND_API,
  
  // Razorpay API keys
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  
  // Frontend URL for CORS
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Node environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Port for the server
  PORT: process.env.PORT || 5000
};
