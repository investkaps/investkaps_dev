const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../model/User');
const UserSubscription = require('../model/UserSubscription');

const clerkUserId = 'user_34vrGHZDFYExkn8x4xmZ9SEueF1';

async function checkData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Check if user exists
    console.log('🔍 Checking for user with Clerk ID:', clerkUserId);
    const user = await User.findOne({ clerkId: clerkUserId });
    
    if (!user) {
      console.log('❌ User NOT found in database');
      console.log('\n📝 Suggestion: The user needs to be created in your User collection first.');
      process.exit(0);
    }
    
    console.log('✅ User found!');
    console.log('   MongoDB ID:', user._id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    
    // 2. Check for ALL subscriptions for this user
    console.log('\n🔍 Checking for ALL subscriptions for this user...');
    const allSubscriptions = await UserSubscription.find({ user: user._id });
    
    if (allSubscriptions.length === 0) {
      console.log('❌ No subscriptions found for this user');
      console.log('\n📝 Suggestion: Create a subscription for this user or use the test bypass.');
      process.exit(0);
    }
    
    console.log(`✅ Found ${allSubscriptions.length} subscription(s):`);
    allSubscriptions.forEach((sub, index) => {
      console.log(`\n   Subscription ${index + 1}:`);
      console.log('   - ID:', sub._id);
      console.log('   - Subscription Plan ID:', sub.subscription);
      console.log('   - Status:', sub.status);
      console.log('   - Duration:', sub.duration);
      console.log('   - Start Date:', sub.startDate);
      console.log('   - End Date:', sub.endDate);
      console.log('   - Is Expired?:', new Date(sub.endDate) < new Date());
    });
    
    // 3. Check for ACTIVE subscriptions
    console.log('\n🔍 Checking for ACTIVE subscriptions...');
    const activeSubscriptions = await UserSubscription.find({ 
      user: user._id,
      status: 'active'
    });
    
    if (activeSubscriptions.length === 0) {
      console.log('❌ No ACTIVE subscriptions found');
      console.log('\n📝 Possible reasons:');
      console.log('   1. All subscriptions have status other than "active"');
      console.log('   2. Subscriptions might be "expired", "cancelled", or "pending"');
      console.log('\n💡 Solution: Update a subscription status to "active" in the database');
    } else {
      console.log(`✅ Found ${activeSubscriptions.length} ACTIVE subscription(s):`);
      activeSubscriptions.forEach((sub, index) => {
        console.log(`\n   Active Subscription ${index + 1}:`);
        console.log('   - ID:', sub._id);
        console.log('   - Subscription Plan ID:', sub.subscription);
        console.log('   - Status:', sub.status);
        console.log('   - End Date:', sub.endDate);
        console.log('   - Days Remaining:', Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)));
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkData();
