import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { ClerkProvider } from '@clerk/clerk-react';

// Components
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import AdminRoute from './components/guards/AdminRoute'; // Admin route guard
import PWAInstallPrompt from './components/PWAInstallPrompt/PWAInstallPrompt';
import WhatsAppButton from './components/WhatsAppButton/WhatsAppButton';

// Pages
import Home from './pages/Home/Home';
import About from './pages/About/About';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import ESignForm from './pages/AadhaarESign/ESignForm';
import Pricing from './pages/Pricing/Pricing';
import UserRecommendations from './pages/Dashboard/UserRecommendations';
import PaymentSuccess from './pages/Payment/PaymentSuccess';
import AdminDashboard from './pages/Admin/AdminDashboard';
import Profile from './pages/Profile/Profile';
import LegalCenter from './pages/LegalCenter/LegalCenter';
import AuditReport from './pages/AuditReport/AuditReport';
import AuditReport2 from './pages/AuditReport2/AuditReport2';
import Subscribe from './pages/Subscribe/Subscribe';

// Scroll to top on every route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

// Layout component that conditionally renders the navbar
const AppLayout = ({ children, scrolled }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isHomePage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';
  const isContactPage = location.pathname === '/contact';
  const isAboutPage = location.pathname === '/about';
  
  // Add or remove page-specific classes on body based on current route
  useEffect(() => {
    // Remove all page classes first
    document.body.classList.remove('is-home', 'is-login', 'is-register', 'is-contact', 'is-about');
    
    // Add appropriate class
    if (isHomePage) {
      document.body.classList.add('is-home');
    } else if (isLoginPage) {
      document.body.classList.add('is-login');
    } else if (isRegisterPage) {
      document.body.classList.add('is-register');
    } else if (isContactPage) {
      document.body.classList.add('is-contact');
    } else if (isAboutPage) {
      document.body.classList.add('is-about');
    }
    
    return () => {
      document.body.classList.remove('is-home', 'is-login', 'is-register', 'is-contact', 'is-about');
    };
  }, [isHomePage, isLoginPage, isRegisterPage, isContactPage, isAboutPage]);
  
  return (
    <div className={isAdminRoute ? 'app-admin' : 'app'}>
      {!isAdminRoute && <Navbar scrolled={scrolled} />}
      <main className={`main-content ${isAdminRoute ? 'admin-content' : ''}`}>
        {children}
      </main>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <WhatsAppButton />}
    </div>
  );
};

function App() {
  const [scrolled, setScrolled] = useState(false);
  const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  useEffect(() => {
    const normalizeWidgetTabIndex = () => {
      const widgetButtons = document.querySelectorAll(
        'button.uwaw-close, button.uwaw-features__item__i, button#reset-all.btn-reset-all, button#uw-widget-custom-trigger'
      );

      widgetButtons.forEach((button) => {
        const tabindex = Number(button.getAttribute('tabindex'));
        if (!Number.isNaN(tabindex) && tabindex > 0) {
          button.setAttribute('tabindex', '0');
        }
      });

      const nestedFocusableInDarkBtn = document.querySelectorAll(
        '#dark-btn input, #dark-btn select, #dark-btn textarea, #dark-btn button, #dark-btn a, #dark-btn [tabindex]'
      );

      nestedFocusableInDarkBtn.forEach((node) => {
        if (node.getAttribute('tabindex') !== '-1') {
          node.setAttribute('tabindex', '-1');
        }
        if (node.getAttribute('aria-hidden') !== 'true') {
          node.setAttribute('aria-hidden', 'true');
        }
      });
    };

    normalizeWidgetTabIndex();
    const observer = new MutationObserver(normalizeWidgetTabIndex);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (!clerkPubKey) {
    return <div>Missing Clerk Publishable Key</div>;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      navigate={(to) => (window.location.href = to)}
      telemetry={false}
      appearance={{
        layout: {
          logoPlacement: 'inside',
          socialButtonsVariant: 'iconButton',
          logoImageUrl: '/logo.png',
        },
        variables: { colorPrimary: '#0b73ff' },
      }}
    >
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <Routes>
            <Route 
              path="/*" 
              element={
                <AppLayout scrolled={scrolled}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Navigate to="/legal#contact-us" replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    
                    {/* Consolidated Policy and Legal Page */}
                    <Route path="legal" element={<LegalCenter />} />
                    <Route path="legal/*" element={<LegalCenter />} />

                    {/* Legacy links redirected to section anchors in the consolidated page */}
                    <Route path="privacy-policy" element={<Navigate to="/legal#privacy-policy" replace />} />
                    <Route path="disclaimers" element={<Navigate to="/legal#disclaimers" replace />} />
                    <Route path="terms-and-conditions" element={<Navigate to="/legal#terms-and-conditions" replace />} />
                    <Route path="investor-charter" element={<Navigate to="/legal#investor-charter" replace />} />
                    <Route path="valid-upi" element={<Navigate to="/legal#valid-upi" replace />} />
                    <Route path="faqs" element={<Navigate to="/legal#faqs" replace />} />
                    <Route path="complaints-and-audit" element={<Navigate to="/legal#complaints-and-audit" replace />} />
                    <Route path="complaints-data" element={<Navigate to="/legal#complaints-and-audit" replace />} />
                    <Route path="cancellations-and-refunds" element={<Navigate to="/legal#cancellations-and-refunds" replace />} />
                    <Route path="grievance-redressal" element={<Navigate to="/legal#grievance-redressal" replace />} />
                    <Route path="code-of-conduct" element={<Navigate to="/legal#code-of-conduct" replace />} />

                    <Route path="/audit-report" element={<AuditReport />} />
                    <Route path="/audit-report-2" element={<AuditReport2 />} />
                    <Route path="/subscribe" element={<Subscribe />} />

                    {/* Protected routes */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/esign"
                      element={
                        <ProtectedRoute>
                          <ESignForm />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pricing"
                      element={
                        <ProtectedRoute>
                          <Pricing />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/recommendations"
                      element={
                        <ProtectedRoute>
                          <UserRecommendations />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/payment-success"
                      element={
                        <ProtectedRoute>
                          <PaymentSuccess />
                        </ProtectedRoute>
                      }
                    />

                    {/* Admin routes */}
                    <Route
                      path="/admin/*"
                      element={
                        <AdminRoute>
                          <AdminDashboard />
                        </AdminRoute>
                      }
                    />

                    {/* 404 fallback */}
                    <Route
                      path="*"
                      element={
                        <div className="not-found">
                          <h1>Page Not Found</h1>
                        </div>
                      }
                    />
                  </Routes>
                </AppLayout>
              } 
            />
          </Routes>
          <PWAInstallPrompt />
        </Router>
      </AuthProvider>
    </ClerkProvider>
  );
}

export default App;
