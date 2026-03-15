// Authentication utility - integrated with backend API
// Backend: http://localhost:9091

const API_BASE_URL = 'http://localhost:9091';

// Real API: Login
export const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/otp-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        user: {
          id: data.id || email,
          email: data.email || email,
          name: data.name || email.split('@')[0],
          role: 'Candidate',
        },
        token: data.token,
      };
    }

    return {
      success: false,
      message: data.message || 'Invalid email or password',
    };
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    return {
      success: false,
      message: 'Unable to connect to server. Please try again later.',
    };
  }
};

// Real API: Sign-up — calls backend to send OTP email
export const signUpUser = async (name, email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/otp-auth/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('[OTP SENT]', data.message);

      return {
        success: true,
        message: data.message || 'OTP sent to your email',
        tempUserId: email,
        userData: { name, email },
        emailSent: data.emailSent,
      };
    }

    return {
      success: false,
      message: data.message || 'Failed to send OTP. Please try again.',
    };
  } catch (error) {
    console.error('[SIGNUP ERROR]', error);
    return {
      success: false,
      message: 'Unable to connect to server. Please check if the backend is running.',
    };
  }
};

// Real API: Verify OTP
export const verifyOTP = async (tempUserId, email, otp, name, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/otp-auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('[OTP VERIFIED]', data.message);

      return {
        success: true,
        user: {
          id: data.id || tempUserId,
          email: data.email || email,
          name: data.name || name,
          role: 'Candidate',
        },
        token: data.token,
        message: data.message || 'Account verified successfully',
      };
    }

    return {
      success: false,
      message: data.message || 'Invalid OTP. Please try again.',
    };
  } catch (error) {
    console.error('[OTP VERIFY ERROR]', error);
    return {
      success: false,
      message: 'Unable to connect to server. Please try again later.',
    };
  }
};

export const validateToken = async (token) => {
  if (!token) {
    return { success: false, message: 'No token provided' };
  }
  // Token presence is enough — JWT itself is verified on protected routes
  return { success: true };
};