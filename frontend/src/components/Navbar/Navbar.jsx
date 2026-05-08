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
  const [highContrast, setHighContrast] = useState(false);
  const [language, setLanguage] = useState(() => {
    if (typeof document !== 'undefined') {
      return localStorage.getItem('preferred-language') || document.documentElement.lang || 'en';
    }
    return 'en';
  });
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

    // Load contrast preference
    const savedContrast = localStorage.getItem('high-contrast-mode') === 'true';
    setHighContrast(savedContrast);
    if (savedContrast) {
      document.body.classList.add('high-contrast-mode');
    }
  }, [currentUser]);

  const switchLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('preferred-language', lang);
  };

  // Sync language state to <html lang> attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const toggleContrast = () => {
    const newContrast = !highContrast;
    setHighContrast(newContrast);
    localStorage.setItem('high-contrast-mode', newContrast);
    if (newContrast) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/">
            <img src="/logo.png" alt="" aria-hidden="true" className="logo-image" width="88" height="88" />
            <span className="logo-text">investkaps</span>
          </Link>
        </div>

        <button 
          className={`menu-icon ${menuOpen ? 'active' : ''}`} 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Mobile menu backdrop */}
        {menuOpen && <div className="menu-backdrop" onClick={() => setMenuOpen(false)}></div>}

        <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          {/* Close button */}
          <li className="menu-close-item">
            <button className="menu-close-btn" onClick={() => setMenuOpen(false)} aria-label="Close navigation menu">
              <span>✕</span>
            </button>
          </li>
          
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
            <Link to="/legal#contact-us" className={`nav-link ${location.pathname === '/legal' && location.hash === '#contact-us' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Contact</Link>
          </li>
          <li className="nav-item mobile-auth-item">
            {/* Mobile auth buttons - Wrapped in <li> for semantic HTML accessibility */}
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
                  <a
                    href="https://trade.investkaps.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mobile-login-btn"
                    onClick={() => setMenuOpen(false)}
                  >
                    Login
                  </a>
                  <a
                    href="https://trade.investkaps.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mobile-register-btn"
                    onClick={() => setMenuOpen(false)}
                  >Get Started</a>
                </>
              )}
            </div>
          </li>
        </ul>

        <div className="nav-right-section">
          <div className="nav-cta">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="btn btn-dashboard">Dashboard</Link>
                <div className="user-menu">
                  <button
                    className="user-menu-button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-label="User menu"
                    aria-expanded={dropdownOpen}
                  >
                    <span className="user-initial">{currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}</span>
                    <span className="user-name">{currentUser?.name || 'User'}</span>
                    <i className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`} aria-hidden="true"></i>
                  </button>

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
                <a href="https://trade.investkaps.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Login</a>
                <a href="https://trade.investkaps.com" target="_blank" rel="noopener noreferrer" className="btn btn-primary">Get Started</a>
              </>
            )}
          </div>

          <div className="nav-controls">
            <select
              id="language-switcher"
              className="lang-switcher"
              aria-label="Select language"
              value={language}
              onChange={(e) => switchLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
            <button
              className="btn-contrast-toggle"
              onClick={toggleContrast}
              aria-label={highContrast ? "Disable high contrast mode" : "Enable high contrast mode"}
              aria-pressed={highContrast}
              title="Toggle High Contrast"
            >
              <i className="fas fa-adjust" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;