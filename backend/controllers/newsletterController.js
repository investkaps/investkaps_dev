import Newsletter from '../model/Newsletter.js';
import logger from '../utils/logger.js';

export const subscribe = async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      const existingSubscriber = await Newsletter.findOne({ email: email.toLowerCase() });

      if (existingSubscriber) {
        if (existingSubscriber.status === 'unsubscribed') {
          existingSubscriber.status = 'active';
          existingSubscriber.subscribedAt = new Date();
          await existingSubscriber.save();

          logger.info(`Newsletter resubscription: ${email}`);

          return res.status(200).json({
            success: true,
            message: 'Successfully resubscribed to newsletter'
          });
        }

        return res.status(409).json({
          success: false,
          message: 'Email is already subscribed to newsletter'
        });
      }

      const newSubscriber = new Newsletter({
        email: email.toLowerCase()
      });

      await newSubscriber.save();

      logger.info(`New newsletter subscription: ${email}`);

      res.status(201).json({
        success: true,
        message: 'Successfully subscribed to newsletter'
      });

    } catch (error) {
      logger.error('Newsletter subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to subscribe to newsletter. Please try again later.'
      });
    }
};

export const unsubscribe = async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const subscriber = await Newsletter.findOne({ email: email.toLowerCase() });

      if (!subscriber) {
        return res.status(404).json({
          success: false,
          message: 'Email not found in newsletter list'
        });
      }

      subscriber.status = 'unsubscribed';
      await subscriber.save();

      logger.info(`Newsletter unsubscription: ${email}`);

      res.status(200).json({
        success: true,
        message: 'Successfully unsubscribed from newsletter'
      });

    } catch (error) {
      logger.error('Newsletter unsubscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unsubscribe. Please try again later.'
      });
    }
};

export const getAllSubscribers = async (req, res) => {
    try {
      const { status = 'active', page = 1, limit = 50 } = req.query;

      const query = status === 'all' ? {} : { status };

      const subscribers = await Newsletter.find(query)
        .sort({ subscribedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-__v');

      const count = await Newsletter.countDocuments(query);

      res.status(200).json({
        success: true,
        data: subscribers,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      });

    } catch (error) {
      logger.error('Get newsletter subscribers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve subscribers'
      });
    }
};
