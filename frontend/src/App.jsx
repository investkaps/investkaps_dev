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
import PrivacyPolicy from './pages/LegalCenter/PrivacyPolicy';
import Disclaimers from './pages/LegalCenter/Disclaimers';
import TermsAndConditions from './pages/LegalCenter/TermsAndConditions';
import InvestorCharter from './pages/LegalCenter/InvestorCharter';
import ValidUPI from './pages/LegalCenter/ValidUPI';
import FAQs from './pages/LegalCenter/FAQs';
import ComplaintsAndAudit from './pages/LegalCenter/ComplaintsAndAudit';
import CancellationsAndRefunds from './pages/LegalCenter/CancellationsAndRefunds';
import GrievanceRedressal from './pages/LegalCenter/GrievanceRedressal';
import CodeOfConduct from './pages/LegalCenter/CodeOfConduct';
import AuditReport from './pages/AuditReport/AuditReport';
import AuditReport2 from './pages/AuditReport2/AuditReport2';
import Subscribe from './pages/Subscribe/Subscribe';
import Unsubscribe from './pages/Unsubscribe/Unsubscribe';

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
      {!isAdminRoute && <header><Navbar scrolled={scrolled} /></header>}
      <main className={`main-content ${isAdminRoute ? 'admin-content' : ''}`}>
        {children}
      </main>
      {!isAdminRoute && <Footer />}
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
                    <Route path="/contact" element={<Navigate to="/grievance-redressal" replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Legal pages */}
                    <Route path="privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="disclaimers" element={<Disclaimers />} />
                    <Route path="terms-and-conditions" element={<TermsAndConditions />} />
                    <Route path="investor-charter" element={<InvestorCharter />} />
                    <Route path="valid-upi" element={<ValidUPI />} />
                    <Route path="faqs" element={<FAQs />} />
                    <Route path="complaints-and-audit" element={<ComplaintsAndAudit />} />
                    <Route path="complaints-data" element={<Navigate to="/complaints-and-audit" replace />} />
                    <Route path="cancellations-and-refunds" element={<CancellationsAndRefunds />} />
                    <Route path="grievance-redressal" element={<GrievanceRedressal />} />
                    <Route path="code-of-conduct" element={<CodeOfConduct />} />

                    <Route path="/audit-report" element={<AuditReport />} />
                    <Route path="/audit-report-2" element={<AuditReport2 />} />
                    <Route path="/subscribe" element={<Subscribe />} />
                    <Route path="/unsubscribe" element={<Unsubscribe />} />

                    {/* Protected routes */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute redirectTo="/">
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
