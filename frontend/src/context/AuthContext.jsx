// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  useClerk,
  useUser,
  useSignUp,
  useSignIn,
  useAuth as useClerkAuth
} from '@clerk/clerk-react';
import { userAPI } from '../services/api';

// Create the authentication context
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clerk hooks
  const { isLoaded: clerkLoaded, user: clerkUser } = useUser();
  const clerk = useClerk();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { getToken: getClerkToken, isSignedIn: clerkIsSignedIn, isLoaded: clerkAuthLoaded } = useClerkAuth();

  // Basic JWT validation helper
  const isTokenValid = (token) => {
    if (!token || typeof token !== 'string') return false;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payloadJson = atob(parts[1]);
      const payload = JSON.parse(payloadJson);
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) return false;
      return true;
    } catch {
      return false;
    }
  };

  const clearLocalAuth = () => {
    try {
      localStorage.removeItem('clerk_jwt');
      sessionStorage.removeItem('auth_email');
      sessionStorage.removeItem('signInAttempt');
    } catch (err) {
      console.warn('clearLocalAuth error', err);
    }
  };

  const logout = async () => {
    try {
      if (clerk?.signOut) await clerk.signOut();
    } catch (err) {
      console.warn('Clerk signOut failed:', err);
    } finally {
      clearLocalAuth();
      setCurrentUser(null);
      setError(null);
      setLoading(false);
    }
    return { success: true };
  };

  // Create or update backend user helper - only using Clerk email
  const createOrUpdateBackendUser = async (maybeClerkUser) => {
    try {
      console.log('🟡 Frontend: createOrUpdateBackendUser called with:', maybeClerkUser?.id);
      
      if (!maybeClerkUser) {
        console.log('❌ Frontend: No clerkUser provided');
        return;
      }
      
      // Get email from Clerk user ONLY - this is our source of truth
      const email = maybeClerkUser.primaryEmailAddress?.emailAddress;
      if (!email) {
        console.warn('❌ Frontend: No Clerk email available for backend user creation');
        return;
      }
      
      console.log('🟡 Frontend: Creating backend user for email:', email);
      
      // Ensure token stored in localStorage (get via Clerk hook if possible)
      let tokenString = localStorage.getItem('clerk_jwt') || null;
      if (!tokenString && typeof getClerkToken === 'function') {
        try {
          const tk = await getClerkToken();
          tokenString = typeof tk === 'string' ? tk : tk?.jwt || null;
          if (tokenString) localStorage.setItem('clerk_jwt', tokenString);
        } catch (err) {
          console.warn('❌ Frontend: Could not fetch token for backend create:', err);
        }
      }

      console.log('🟡 Frontend: Token available:', !!tokenString);

      // First check if user already exists by email
      try {
        console.log('🔍 Frontend: Checking if user exists by email:', email);
        await userAPI.getUserByEmail(email);
        console.log('⚠️ Frontend: User already exists, skipping creation');
        return; // User already exists, no need to create
      } catch (err) {
        console.log('🟡 Frontend: User not found, proceeding with creation:', err.message);
        // User not found, continue with creation
      }

      // Build payload expected by backend
      const payload = {
        clerkId: maybeClerkUser.id,
        email: email, // Only using Clerk email
        name: maybeClerkUser.firstName || email.split('@')[0] || 'User',
        isVerified: maybeClerkUser.emailAddresses?.[0]?.verification?.status === 'verified'
      };

      console.log('🟡 Frontend: Calling userAPI.createUser with payload:', payload);

      // Call backend create; userAPI uses axios instance which attaches token automatically
      const result = await userAPI.createUser(payload);
      console.log('✅ Frontend: User created successfully:', result);
    } catch (err) {
      console.error('❌ Frontend: Failed to create backend user:', err.message || err);
      console.error('❌ Frontend: Full error:', err);
    }
  };

  // Sync Clerk -> local state and backend
  useEffect(() => {
    let mounted = true;
    const checkAuthStatus = async () => {
      console.log('🔍 AUTH: checkAuthStatus called');
      console.log('🔍 AUTH: clerkLoaded:', clerkLoaded);
      console.log('🔍 AUTH: clerkAuthLoaded:', clerkAuthLoaded);
      console.log('🔍 AUTH: clerkUser:', clerkUser ? clerkUser.id : null);
      console.log('🔍 AUTH: clerkIsSignedIn:', clerkIsSignedIn);
      
      setLoading(true);
      try {
        const savedToken = localStorage.getItem('clerk_jwt');
        console.log('🔍 AUTH: Saved token exists:', !!savedToken);

        if (savedToken && !isTokenValid(savedToken)) {
          console.log('🔍 AUTH: Saved token invalid, clearing...');
          clearLocalAuth();
        }

        if (clerkLoaded && clerkUser) {
          console.log('✅ AUTH: Clerk loaded and user available');
          try {
            // Prefer Clerk hook getToken
            let token = null;
            if (typeof getClerkToken === 'function') {
              console.log('🔍 AUTH: Getting token via getClerkToken...');
              token = await getClerkToken();
            } else if (clerkUser?.getToken) {
              console.log('🔍 AUTH: Getting token via clerkUser.getToken...');
              token = await clerkUser.getToken();
            }

            const tokenString = typeof token === 'string' ? token : token?.jwt || null;
            console.log('🔍 AUTH: Token string obtained:', !!tokenString);
            if (tokenString) {
              localStorage.setItem('clerk_jwt', tokenString);
              console.log('🔍 AUTH: Token saved to localStorage');
            }

            const user = {
              id: clerkUser.id,
              email: clerkUser.primaryEmailAddress?.emailAddress,
              name: clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User',
              isVerified: clerkUser.emailAddresses?.[0]?.verification?.status === 'verified',
              createdAt: clerkUser.createdAt
            };

            console.log('👤 AUTH: User object created:', { id: user.id, email: user.email, name: user.name });

            // Try to fetch backend user; fallback to setting Clerk user directly
            try {
              console.log('🔍 AUTH: Checking if user exists in backend...');
              // First try by clerkId
              let response;
              try {
                console.log('🔍 AUTH: Trying getUserByClerkId...');
                response = await userAPI.getUserByClerkId(clerkUser.id);
                console.log('✅ AUTH: User found by clerkId');
              } catch (clerkIdError) {
                console.log('⚠️ AUTH: User not found by clerkId, trying email...');
                // If not found by clerkId, try by email
                if (clerkUser.primaryEmailAddress?.emailAddress) {
                  response = await userAPI.getUserByEmail(clerkUser.primaryEmailAddress.emailAddress);
                  console.log('✅ AUTH: User found by email');
                } else {
                  throw clerkIdError; // Re-throw if no email available
                }
              }
              
              if (mounted) {
                const role = response.user?.role || 'customer';
                console.log('👤 AUTH: Setting current user with role:', role);
                setCurrentUser({
                  ...user,
                  profile: response.user?.profile,
                  kycStatus: response.user?.kycStatus,
                  mongoId: response.user?._id,
                  role: role
                });
              }
            } catch (err) {
              console.log('⚠️ AUTH: Backend user not found, creating new user...');
              console.log('⚠️ AUTH: Error details:', err.message);
              // If backend user not found, set the clerk user and create backend record
              if (mounted) {
                console.log('👤 AUTH: Setting current user from Clerk data');
                setCurrentUser(user);
              }
              // Try to create backend user asynchronously
              console.log('🔧 AUTH: Calling createOrUpdateBackendUser...');
              createOrUpdateBackendUser(clerkUser);
            }
          } catch (err) {
            console.error('❌ AUTH: Error getting token from Clerk user:', err);
            clearLocalAuth();
            if (mounted) setCurrentUser(null);
          }
        } else {
          // Clerk loaded but no user
          if (clerkLoaded) {
            console.log('⚠️ AUTH: Clerk loaded but no user');
            const tokenNow = localStorage.getItem('clerk_jwt');
            if (tokenNow && !isTokenValid(tokenNow)) clearLocalAuth();
            if (mounted) setCurrentUser(null);
          } else {
            // Clerk not loaded yet; wait for it
            console.log('⏳ AUTH: Clerk not loaded yet, waiting...');
            if (mounted) setLoading(true);
            return;
          }
        }
      } catch (err) {
        console.error('❌ AUTH: Error in checkAuthStatus:', err);
        clearLocalAuth();
        if (mounted) setCurrentUser(null);
      } finally {
        console.log('🏁 AUTH: checkAuthStatus completed, loading:', false);
        if (mounted) setLoading(false);
      }
    };

    checkAuthStatus();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkLoaded && clerkAuthLoaded, clerkUser]);

  // sendOTP - same as before but guards if already signed in
  const sendOTP = async (email) => {
    try {
      setLoading(true);
      setError(null);

      if (clerkIsSignedIn) {
        throw new Error("You're already signed in.");
      }

      if (!signInLoaded || !signIn) {
        throw new Error('Clerk sign-in is not ready yet. Please wait and try again.');
      }

      sessionStorage.setItem('auth_email', email);

      const signInAttempt = await signIn.create({ identifier: email });

      const emailFactor = signInAttempt.supportedFirstFactors?.find(
        factor => factor.strategy === 'email_code'
      );

      if (!emailFactor) throw new Error('Email verification is not supported for this account');

      await signInAttempt.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: emailFactor.emailAddressId
      });

      return { success: true, message: 'OTP sent successfully via Clerk' };
    } catch (err) {
      console.error('sendOTP error:', err);
      setError(err.message || 'Failed to send OTP');
      return { success: false, error: err.message || 'Failed to send OTP' };
    } finally {
      setLoading(false);
    }
  };

  // verifyOTP - after success, set active session, store token, set currentUser and create backend user
  const verifyOTP = async (otp) => {
    try {
      setLoading(true);
      setError(null);

      if (!signInLoaded || !signIn) {
        throw new Error('Sign-in not available. Please restart the login process.');
      }

      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: otp,
      });

      console.log('OTP verification result status:', result.status);
      
      if (result.status === 'complete') {
        console.log('OTP verification successful, setting active session...');
        
        if (clerk?.setActive) {
          await clerk.setActive({ session: result.createdSessionId });
        }

        // Try to get token via Clerk auth hook
        try {
          if (typeof getClerkToken === 'function') {
            const tokenObj = await getClerkToken();
            const tokenString = typeof tokenObj === 'string' ? tokenObj : tokenObj?.jwt || null;
            if (tokenString) localStorage.setItem('clerk_jwt', tokenString);
          }
        } catch (err) {
          console.warn('Could not get token after OTP verification:', err);
        }

        // Allow Clerk hooks to update clerkUser, but set a basic currentUser if clerkUser isn't available yet
        try {
          await new Promise(res => setTimeout(res, 400)); // give Clerk a moment
          const maybeUser = clerkUser || (clerk?.user ?? null);
          if (maybeUser) {
            const userObj = {
              id: maybeUser.id,
              email: maybeUser.primaryEmailAddress?.emailAddress,
              name: maybeUser.firstName || maybeUser.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User',
              isVerified: maybeUser.emailAddresses?.[0]?.verification?.status === 'verified',
              createdAt: maybeUser.createdAt
            };
            setCurrentUser(userObj);
            // Ensure backend user exists
            createOrUpdateBackendUser(maybeUser);
          } else {
            // If Clerk hasn't populated user, set minimal info but don't use session email
            // We'll wait for Clerk to provide the proper email
            setCurrentUser({ id: 'pending', name: 'User' });
            console.log('Waiting for Clerk to provide user data');
            // Backend create will be attempted when clerkUser becomes available (see checkAuthStatus)
          }
        } catch (err) {
          console.warn('Error updating user state after OTP:', err);
        }

        sessionStorage.removeItem('auth_email');
        console.log('Login successful, returning success response');
        return { success: true, message: 'Login successful' };
      } else {
        console.error('OTP verification failed, status:', result.status);
        throw new Error('Verification failed. Please check your code and try again.');
      }
    } catch (err) {
      console.error('verifyOTP error:', err);
      setError(err.message || 'Failed to verify OTP');
      return { success: false, error: err.message || 'Failed to verify OTP' };
    } finally {
      setLoading(false);
    }
  };

  // register & completeRegistration: when registration completes, create backend user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      // Wait for Clerk to be fully loaded with a timeout
      const maxWaitTime = 5000; // 5 seconds
      const startTime = Date.now();
      
      while ((!signUpLoaded || !signUp) && (Date.now() - startTime < maxWaitTime)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!signUpLoaded || !signUp) {
        throw new Error('Clerk sign-up service is not available. Please refresh the page and try again.');
      }

      const result = await signUp.create({ emailAddress: userData.email });
      await result.prepareEmailAddressVerification({ strategy: 'email_code' });

      return { success: true, message: 'Registration initiated. Please check your email for verification code.', signUpAttempt: result };
    } catch (err) {
      console.error('register error:', err);
      
      // Handle CAPTCHA-specific errors
      let errorMessage = err.message || 'Failed to register';
      if (err.message && err.message.includes('CAPTCHA')) {
        errorMessage = 'CAPTCHA verification failed. Please try again or contact support if the issue persists.';
      } else if (err.errors && err.errors.length > 0) {
        errorMessage = err.errors[0].message || errorMessage;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async (otp) => {
    try {
      setLoading(true);
      setError(null);

      if (!signUpLoaded || !signUp) {
        throw new Error('Clerk sign-up is not available. Please restart the registration process.');
      }

      const completeSignUp = await signUp.attemptEmailAddressVerification({ code: otp });

      console.log('Registration OTP verification result status:', completeSignUp.status);
      
      if (completeSignUp.status === 'complete') {
        console.log('Registration OTP verification successful, setting active session...');
        
        if (clerk?.setActive) {
          await clerk.setActive({ session: completeSignUp.createdSessionId });
        }

        // Attempt to get token and store it
        try {
          if (typeof getClerkToken === 'function') {
            const tokenObj = await getClerkToken();
            const tokenString = typeof tokenObj === 'string' ? tokenObj : tokenObj?.jwt || null;
            if (tokenString) localStorage.setItem('clerk_jwt', tokenString);
          }
        } catch (err) {
          console.warn('Could not fetch token after registration:', err);
        }

        // Wait a short moment and then create backend user if clerkUser is available
        try {
          await new Promise(res => setTimeout(res, 500));
          const maybeUser = clerkUser || (clerk?.user ?? null);
          if (maybeUser) {
            // Set current user locally
            const userObj = {
              id: maybeUser.id,
              email: maybeUser.primaryEmailAddress?.emailAddress,
              name: maybeUser.firstName || maybeUser.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User',
              isVerified: maybeUser.emailAddresses?.[0]?.verification?.status === 'verified',
              createdAt: maybeUser.createdAt
            };
            setCurrentUser(userObj);
            // Create backend user
            createOrUpdateBackendUser(maybeUser);
          } else {
            // clerkUser not available yet; checkAuthStatus will create the backend user later
            console.warn('Clerk user not yet available after registration; will create backend user when Clerk loads');
            // We only use Clerk email, so we must wait for Clerk to provide it
          }
        } catch (err) {
          console.warn('Error creating backend user after registration:', err);
        }

        console.log('Registration completed successfully, returning success response');
        return { success: true, user: completeSignUp.createdUserId, message: 'Registration completed successfully!' };
      } else {
        console.error('Registration OTP verification failed, status:', completeSignUp.status);
        throw new Error('Verification failed. Please check your code and try again.');
      }
    } catch (err) {
      console.error('completeRegistration error:', err);
      setError(err.message || 'Failed to complete registration');
      return { success: false, error: err.message || 'Failed to complete registration' };
    } finally {
      setLoading(false);
    }
  };

  // Profile / KYC updates (unchanged)
  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser?.id) throw new Error('User not authenticated');

      const response = await userAPI.updateProfile(currentUser.id, {
        name: profileData.name || currentUser.name,
        profile: profileData.profile
      });

      setCurrentUser(prev => ({
        ...prev,
        name: profileData.name || prev.name,
        profile: {
          ...prev.profile,
          ...profileData.profile
        }
      }));

      return { success: true, user: response.user };
    } catch (err) {
      console.error('updateProfile error:', err);
      setError(err.message || 'Failed to update profile');
      return { success: false, error: err.message || 'Failed to update profile' };
    } finally {
      setLoading(false);
    }
  };

  const updateKYC = async (kycData) => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser?.id) throw new Error('User not authenticated');

      const response = await userAPI.updateKYC(currentUser.id, kycData);

      setCurrentUser(prev => ({
        ...prev,
        kycStatus: {
          ...prev.kycStatus,
          ...kycData
        }
      }));

      return { success: true, user: response.user };
    } catch (err) {
      console.error('updateKYC error:', err);
      setError(err.message || 'Failed to update KYC');
      return { success: false, error: err.message || 'Failed to update KYC' };
    } finally {
      setLoading(false);
    }
  };

  const clearAuthData = () => {
    clearLocalAuth();
    setCurrentUser(null);
    setError(null);
    console.log('All authentication data cleared');
  };

  const value = {
    currentUser,
    loading,
    error,
    sendOTP,
    verifyOTP,
    register,
    completeRegistration,
    logout,
    updateProfile,
    updateKYC,
    clearAuthData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
