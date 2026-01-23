import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for checking user roles
 * @returns {Object} Role checking functions
 */
export const useRole = () => {
  const { currentUser } = useAuth();
  
  /**
   * Check if the current user is an admin
   * @returns {boolean} True if user is admin
   */
  const isAdmin = () => {
    const isAdminUser = currentUser?.role === 'admin';
    return isAdminUser;
  };
  
  /**
   * Check if the current user is a customer
   * @returns {boolean} True if user is customer
   */
  const isCustomer = () => {
    return currentUser?.role === 'customer' || !currentUser?.role;
  };
  
  /**
   * Check if the current user has a specific role
   * @param {string|Array} roles - Role or array of roles to check
   * @returns {boolean} True if user has one of the specified roles
   */
  const hasRole = (roles) => {
    if (!currentUser || !currentUser.role) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(currentUser.role);
    }
    
    return currentUser.role === roles;
  };
  
  return {
    isAdmin,
    isCustomer,
    hasRole,
    userRole: currentUser?.role || 'customer'
  };
};

export default useRole;
