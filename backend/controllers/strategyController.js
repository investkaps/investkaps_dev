import Strategy from '../model/Strategy.js';
import Subscription from '../model/Subscription.js';
import { validationResult  } from 'express-validator';

// Get all strategies
export const getAllStrategies = async (req, res) => {
  try {
    const strategies = await Strategy.find().sort({ createdAt: -1 });
    res.status(200).json(strategies);
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get strategy by ID
export const getStrategyById = async (req, res) => {
  try {
    const strategy = await Strategy.findById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }
    
    res.status(200).json(strategy);
  } catch (error) {
    console.error('Error fetching strategy:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new strategy
export const createStrategy = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if strategy code already exists
    const existingStrategy = await Strategy.findOne({ strategyCode: req.body.strategyCode });
    if (existingStrategy) {
      return res.status(400).json({ message: 'Strategy code already exists' });
    }

    const strategy = new Strategy(req.body);
    await strategy.save();
    
    res.status(201).json({ message: 'Strategy created successfully', strategy });
  } catch (error) {
    console.error('Error creating strategy:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update strategy
export const updateStrategy = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if strategy exists
    const strategy = await Strategy.findById(req.params.id);
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    // Check if strategy code is being changed and if it already exists
    if (req.body.strategyCode && req.body.strategyCode !== strategy.strategyCode) {
      const existingStrategy = await Strategy.findOne({ strategyCode: req.body.strategyCode });
      if (existingStrategy) {
        return res.status(400).json({ message: 'Strategy code already exists' });
      }
    }

    const updatedStrategy = await Strategy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({ message: 'Strategy updated successfully', strategy: updatedStrategy });
  } catch (error) {
    console.error('Error updating strategy:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete strategy
export const deleteStrategy = async (req, res) => {
  try {
    // Check if strategy exists
    const strategy = await Strategy.findById(req.params.id);
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    // Check if strategy is associated with any subscriptions
    const subscriptionsWithStrategy = await Subscription.find({ strategies: req.params.id });
    if (subscriptionsWithStrategy.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete strategy as it is associated with subscriptions',
        subscriptions: subscriptionsWithStrategy.map(sub => ({ id: sub._id, name: sub.name }))
      });
    }

    await Strategy.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Strategy deleted successfully' });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle strategy status (active/inactive)
export const toggleStrategyStatus = async (req, res) => {
  try {
    const strategy = await Strategy.findById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }
    
    strategy.isActive = !strategy.isActive;
    await strategy.save();
    
    res.status(200).json({ 
      message: `Strategy ${strategy.isActive ? 'activated' : 'deactivated'} successfully`,
      strategy
    });
  } catch (error) {
    console.error('Error toggling strategy status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get subscriptions by strategy ID
export const getSubscriptionsByStrategy = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ 
      strategies: req.params.id 
    }).select('packageCode name isActive');
    
    res.status(200).json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions by strategy:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
