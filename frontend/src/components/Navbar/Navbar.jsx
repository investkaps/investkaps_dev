import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import './Navbar.css';

const Navbar = ({ scrolled }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [subscribeDropdownOpen, setSubscribeDropdownOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { isAdmin } = useRole();
  
  // Function to validate JWT token
  const isTokenValid = (token) => {
    if (!token) return false;
    
    try {
      // Basic JWT structure check
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Decode the payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Check if token is expired
      if (payload.exp && payload.exp < currentTime) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error validating token in Navbar:', error);
      return false;
    }
  };
  
  // Check authentication status
  useEffect(() => {
    // Check if user is authenticated via currentUser or localStorage token
    const hasToken = localStorage.getItem('clerk_jwt');
    const isValidToken = hasToken && isTokenValid(hasToken);
    
    // Clean up invalid tokens
    if (hasToken && !isValidToken) {
      localStorage.removeItem('clerk_jwt');
    }
    
    const isAuth = !!currentUser || isValidToken;
    setIsAuthenticated(isAuth);
  }, [currentUser]);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/">
            <img src="/logo.png" alt="InvestKaps" className="logo-image" />
            <span className="logo-text">InvestKaps</span>
          </Link>
        </div>

        <div className={`menu-icon ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Mobile menu backdrop */}
        {menuOpen && <div className="menu-backdrop" onClick={() => setMenuOpen(false)}></div>}

        <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          {/* Close button */}
          <button className="menu-close-btn" onClick={() => setMenuOpen(false)}>
            <span>✕</span>
          </button>
          
          <li className="nav-item">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Home</Link>
          </li>
          <li className="nav-item">
            <Link to="/about" className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>About</Link>
          </li>
          <li className="nav-item">
            <Link to="/subscribe" className={`nav-link ${location.pathname === '/subscribe' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Subscribe</Link>
          </li>
          {isAuthenticated && (
            <>
              <li className="nav-item">
                <Link to="/dashboard" className={`nav-link dashboard-link ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              </li>
            </>
          )}
          <li className="nav-item">
            <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Contact</Link>
          </li>
          {/* Mobile auth buttons */}
          <div className="mobile-auth-buttons">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="mobile-profile-btn" onClick={() => setMenuOpen(false)}>Profile</Link>
                <button 
                  className="mobile-logout-btn"
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                    navigate('/');
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button 
                  className="mobile-login-btn"
                  onClick={() => {
                    navigate('/login');
                    setMenuOpen(false);
                  }}
                >
                  Login
                </button>
                <Link to="/register" className="mobile-register-btn" onClick={() => setMenuOpen(false)}>Get Started</Link>
              </>
            )}
          </div>
        </ul>

        <div className="nav-cta">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="btn btn-dashboard">Dashboard</Link>
              <div className="user-menu">
                <div 
                  className="user-menu-button" 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <span className="user-initial">{currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}</span>
                  <span className="user-name">{currentUser?.name || 'User'}</span>
                  <i className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`}></i>
                </div>
                
                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <span className="user-full-name">{currentUser?.name || 'User'}</span>
                      <span className="user-email">{currentUser?.email || 'Loading...'}</span>
                    </div>
                    <ul className="dropdown-list">
                      <li>
                        <Link to="/profile" onClick={() => setDropdownOpen(false)}>
                          <i className="profile-icon"></i> Profile
                        </Link>
                      </li>
                      <li>
                        <Link to="/dashboard" onClick={() => setDropdownOpen(false)}>
                          <i className="dashboard-icon"></i> Dashboard
                        </Link>
                      </li>
                      <li>
                        <Link to="/settings" onClick={() => setDropdownOpen(false)}>
                          <i className="settings-icon"></i> Settings
                        </Link>
                      </li>
                      {isAdmin() && (
                        <li>
                          <Link to="/admin" onClick={() => setDropdownOpen(false)}>
                            <i className="admin-icon"></i> Admin Dashboard
                          </Link>
                        </li>
                      )}
                      <li className="divider"></li>
                      <li>
                        <button 
                          className="logout-button" 
                          onClick={() => {
                            logout();
                            setDropdownOpen(false);
                            navigate('/');
                          }}
                        >
                          <i className="logout-icon"></i> Logout
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary">Login</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;