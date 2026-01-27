import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import ServicesPage from './pages/Services/Services';
import Contact from './pages/Contact/Contact';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import ESignForm from './pages/AadhaarESign/ESignForm';
import Pricing from './pages/Pricing/Pricing';
import UserRecommendations from './pages/Dashboard/UserRecommendations';
import PaymentSuccess from './pages/Payment/PaymentSuccess';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminSetup from './pages/Setup/AdminSetup';
import AdminCheck from './pages/AdminCheck';
import Profile from './pages/Profile/Profile';
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy';
import CodeOfConduct from './pages/CodeOfConduct/CodeOfConduct';
import GrievanceRedressal from './pages/GrievanceRedressal/GrievanceRedressal';
import CancellationsRefunds from './pages/CancellationsRefunds/CancellationsRefunds';
import InvestorCharter from './pages/InvestorCharter/InvestorCharter';
import TermsConditions from './pages/TermsConditions/TermsConditions';
import ValidUPI from './pages/ValidUPI/ValidUPI';
import Disclaimer from './pages/Disclaimer/Disclaimer';
import ComplaintsData from './pages/ComplaintsData/ComplaintsData';
import FAQ from './pages/FAQ/FAQ';
import AuditReport from './pages/AuditReport/AuditReport';
import AuditReport2 from './pages/AuditReport2/AuditReport2';
import Subscribe from './pages/Subscribe/Subscribe';
import MomentumRider from './pages/Plans/MomentumRider';
import StrategicAlpha from './pages/Plans/StrategicAlpha';
import LeveredRiskFnO from './pages/Plans/LeveredRiskFnO';
import IK15MomentumMP from './pages/Plans/IK15MomentumMP';  // Add this line

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
          <Routes>
            <Route 
              path="/*" 
              element={
                <AppLayout scrolled={scrolled}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/services" element={<ServicesPage />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/setup/admin" element={<AdminSetup />} />
                    
                    {/* Policy and Legal Pages */}
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/disclaimers" element={<Disclaimer />} />
                    <Route path="/code-of-conduct" element={<CodeOfConduct />} />
                    <Route path="/grievance-redressal" element={<GrievanceRedressal />} />
                    <Route path="/cancellations-and-refunds" element={<CancellationsRefunds />} />
                    <Route path="/terms-and-conditions" element={<TermsConditions />} />
                    <Route path="/investor-charter" element={<InvestorCharter />} />
                    <Route path="/complaints-and-audit" element={<ComplaintsData />} />
                    <Route path="/valid-upi" element={<ValidUPI />} />
                    <Route path="/complaints-data" element={<ComplaintsData />} />
                    <Route path="/faqs" element={<FAQ />} />
                    <Route path="/audit-report" element={<AuditReport />} />
                    <Route path="/audit-report-2" element={<AuditReport2 />} />
                    <Route path="/subscribe" element={<Subscribe />} />
                    <Route path="/plans/momentum-rider" element={<MomentumRider />} />
                    <Route path="/plans/strategic-alpha" element={<StrategicAlpha />} />
                    <Route path="/plans/levered-risk-fno" element={<LeveredRiskFnO />} />
                    <Route path="/plans/ik15-momentum" element={<IK15MomentumMP />} />

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
                      path="/admin-check"
                      element={
                        <ProtectedRoute>
                          <AdminCheck />
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
