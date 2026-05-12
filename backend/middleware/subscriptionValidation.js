import UserSubscription from '../model/UserSubscription.js';
import User from '../model/User.js';

/**
 * Middleware to validate that a user can access IA services
 * Prevents RA clients with active subscriptions from accessing IA
 */
export const validateIAAccess = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has any active RA subscriptions
    const activeRASubscription = await UserSubscription.findOne({
      user: userId,
      serviceType: 'RA',
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('subscription');

    if (activeRASubscription) {
      return res.status(403).json({
        success: false,
        error: 'Cannot access IA services while you have an active RA subscription',
        details: {
          message: 'You must wait until your RA subscription ends before accessing IA services',
          raSubscriptionEndDate: activeRASubscription.endDate,
          raSubscriptionName: activeRASubscription.subscription?.name || 'RA Subscription'
        }
      });
    }

    // User can access IA services
    next();
  } catch (error) {
    console.error('Error in validateIAAccess middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during subscription validation'
    });
  }
};

/**
 * Middleware to validate that a user can access RA services
 * Prevents IA clients with active subscriptions from accessing RA
 */
export const validateRAAccess = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has any active IA subscriptions
    const activeIASubscription = await UserSubscription.findOne({
      user: userId,
      serviceType: 'IA',
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('subscription');

    if (activeIASubscription) {
      return res.status(403).json({
        success: false,
        error: 'Cannot access RA services while you have an active IA subscription',
        details: {
          message: 'You must wait until your IA subscription ends before accessing RA services',
          iaSubscriptionEndDate: activeIASubscription.endDate,
          iaSubscriptionName: activeIASubscription.subscription?.name || 'IA Subscription'
        }
      });
    }

    // User can access RA services
    next();
  } catch (error) {
    console.error('Error in validateRAAccess middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during subscription validation'
    });
  }
};

/**
 * Get user's client types and active subscriptions
 */
export const getUserServiceInfo = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const activeSubscriptions = await UserSubscription.find({
      user: userId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('subscription');

    return {
      clientTypes: user.clientTypes || { RA: {}, IA: {} },
      activeSubscriptions: activeSubscriptions.map(sub => ({
        serviceType: sub.serviceType,
        subscriptionName: sub.subscription?.name,
        endDate: sub.endDate,
        status: sub.status
      }))
    };
  } catch (error) {
    console.error('Error getting user service info:', error);
    return null;
  }
};
