/**
 * Role-based access control middleware
 * This middleware checks if the user has the required role to access a route
 */

/**
 * Check if user has the required role
 * @param {Array|String} roles - Required role(s) to access the route
 * @returns {Function} Express middleware
 */
const checkRole = (roles) => {
  // Convert single role to array
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    // User must be authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has one of the required roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Insufficient permissions'
      });
    }

    // User has required role, proceed
    next();
  };
};

module.exports = {
  checkRole
};
