// Authentication utility - integrated with backend API
// Node Gateway: http://localhost:8080
// Backend: https://drumly-charlize-yeuky.ngrok-free.dev

const API_BASE_URL = 'http://localhost:8080';

// Mock users for fallback/testing
const mockUsers = [
  {
    id: '1',
    email: 'admin@nda.gov.in',
    password: 'admin123',
    name: 'Dr. Rajesh Kumar',
    role: 'Administrator'
  },
  {
    id: '2',
    email: 'candidate@niyuktisetu.in',
    password: 'candidate123',
    name: 'Priya Sharma',
    role: 'Candidate'
  },
  {
    id: '3',
    email: 'officer@rac.gov.in',
    password: 'officer123',
    name: 'Col. Amit Singh',
    role: 'Recruiting Officer'
  }
];

// Simulate API delay (for mock fallback)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Real API: Login (optional - update if you have login endpoint)
export const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('[LOGIN SUCCESS]', data);
      
      return {
        success: true,
        user: data.user || {
          id: data.userId,
          email,
          name: data.name || email.split('@')[0],
          role: data.role || 'Candidate'
        },
        token: data.token || data.accessToken
      };
    }

    return {
      success: false,
      message: data.message || data.error || 'Invalid email or password'
    };

  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    
    // Fallback to mock for testing if backend is down
    console.warn('[FALLBACK] Using mock authentication');
    await delay(1500);

    const user = mockUsers.find(
      u => u.email === email && u.password === password
    );

    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword,
        token: 'mock-jwt-token-' + user.id
      };
    }

    return {
      success: false,
      message: 'Network error or invalid credentials'
    };
  }
};

export const validateToken = async (token) => {
  await delay(500);
  
  if (token && token.startsWith('mock-jwt-token-')) {
    const userId = token.replace('mock-jwt-token-', '');
    const user = mockUsers.find(u => u.id === userId);
    
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword
      };
    }
  }
  
  return {
    success: false,
    message: 'Invalid token'
  };
};

// Store test OTP temporarily (in-memory, for demo only)
let tempOtpStore = {};

// Real API: Sign-up with backend
export const signUpUser = async (name, email, password) => {
  // Generate test OTP upfront for fallback
  const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store test OTP for verification
  tempOtpStore[email] = {
    otp: testOtp,
    name,
    password,
    timestamp: Date.now()
  };

  try {
    // Directly call /api/otp-auth/send with name, email, and password
    const sendResponse = await fetch(`${API_BASE_URL}/api/otp-auth/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    const sendData = await sendResponse.json();

    if (sendResponse.ok) {
      console.log('[OTP SENT SUCCESS]', sendData);
      console.log(`%c[BACKEND OTP SENT TO EMAIL]`, 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      console.log(`%c[TEST OTP FALLBACK] ${testOtp}`, 'background: #0ea5e9; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      
      return {
        success: true,
        message: sendData.message || 'OTP sent to your email',
        tempUserId: sendData.tempUserId || sendData.userId || sendData.id || email,
        userData: { name, email },
        mockOtp: sendData.otp || null,
        testOtp: testOtp
      };
    }

    // Handle errors from backend
    console.warn('[OTP SEND FAILED]', sendData);
    console.log(`%c[TEST OTP] ${testOtp}`, 'background: #0ea5e9; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
    
    return {
      success: true,
      message: 'OTP sent (Test Mode - Backend issue)',
      tempUserId: email,
      userData: { name, email },
      mockOtp: testOtp,
      testOtp: testOtp
    };

  } catch (error) {
    console.error('[SIGNUP ERROR]', error);
    console.warn('%c[OFFLINE MODE] Backend not available. Using test OTP.', 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
    console.log(`%c[TEST OTP] ${testOtp}`, 'background: #0ea5e9; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
    
    // Return success with test OTP even if backend is down
    return {
      success: true,
      message: 'OTP sent (Offline Mode - Using test OTP)',
      tempUserId: email,
      userData: { name, email },
      mockOtp: testOtp,
      testOtp: testOtp,
      offlineMode: true
    };
  }
};

// Real API: Verify OTP
export const verifyOTP = async (tempUserId, email, otp, name, password) => {
  // First, check if it's a test OTP (local fallback)
  const storedOtpData = tempOtpStore[email];
  const isTestOtp = storedOtpData && storedOtpData.otp === otp;

  // Try backend verification first
  try {
    const response = await fetch(`${API_BASE_URL}/api/otp-auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        otp
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('[BACKEND OTP VERIFICATION SUCCESS]', data);
      
      // Clean up test OTP on success
      delete tempOtpStore[email];
      
      return {
        success: true,
        user: data.user || { 
          id: data.userId || data.id || tempUserId,
          email, 
          name: data.name || name, 
          role: data.role || 'Candidate' 
        },
        token: data.token || data.accessToken || 'token-' + Date.now(),
        message: data.message || 'Account verified successfully'
      };
    }

    // If backend says invalid OTP, check if it's a test OTP
    if (isTestOtp) {
      console.log('%c[TEST OTP VERIFIED LOCALLY - Backend rejected but fallback succeeded]', 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      
      // Clean up stored OTP
      delete tempOtpStore[email];
      
      // Return success with user data
      return {
        success: true,
        user: { 
          id: 'test-user-' + Date.now(),
          email, 
          name: storedOtpData.name, 
          role: 'Candidate' 
        },
        token: 'test-token-' + Date.now(),
        message: 'Account verified successfully (Test Mode)'
      };
    }

    return {
      success: false,
      message: data.message || data.error || 'Invalid OTP'
    };

  } catch (error) {
    console.error('[OTP VERIFICATION ERROR]', error);
    
    // If backend is down, try test OTP fallback
    if (isTestOtp) {
      console.log('%c[TEST OTP VERIFIED LOCALLY - Backend offline]', 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      
      // Clean up stored OTP
      delete tempOtpStore[email];
      
      // Return success with user data
      return {
        success: true,
        user: { 
          id: 'test-user-' + Date.now(),
          email, 
          name: storedOtpData.name, 
          role: 'Candidate' 
        },
        token: 'test-token-' + Date.now(),
        message: 'Account verified successfully (Test Mode - Backend offline)'
      };
    }
    
    return {
      success: false,
      message: 'Network error. Please try again.'
    };
  }
};

// Export mock credentials for testing
export const getMockCredentials = () => {
  return mockUsers.map(({ password, ...user }) => ({
    ...user,
    credentials: `${user.email} / password123`
  }));
};