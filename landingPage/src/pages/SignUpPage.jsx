import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../pages/auth.css';
import { Mail, Lock, User, Shield, Award, Zap, Check } from 'lucide-react';
import { signUpUser, verifyOTP } from '../utils/mockAuth';
import { useAuth } from '../context/AuthContext';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState('signup'); // 'signup' or 'otp'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    agreedToTerms: false
  });
  const [otp, setOtp] = useState('');
  const [tempData, setTempData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    if (errors.otp) {
      setErrors(prev => ({ ...prev, otp: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.agreedToTerms) {
      newErrors.terms = 'You must agree to the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUpUser(formData.name, formData.email, formData.password);

      if (result.success) {
        setTempData({
          tempUserId: result.tempUserId,
          userData: result.userData,
        });
        setStep('otp');
        alert(`✅ OTP has been sent to ${formData.email}. Please check your inbox.`);
      } else {
        setErrors({ submit: result.message });
      }
    } catch (error) {
      setErrors({ submit: 'Sign up failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyOTP(
        tempData.tempUserId,
        formData.email,
        otp,
        formData.name,
        formData.password
      );

      if (result.success) {
        login(result.user, result.token);
        alert('Account created successfully! Redirecting to dashboard...');
        navigate('/');
      } else {
        setErrors({ otp: result.message });
      }
    } catch (error) {
      setErrors({ otp: 'Verification failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const result = await signUpUser(formData.name, formData.email, formData.password);
      if (result.success) {
        setTempData({
          tempUserId: result.tempUserId,
          userData: result.userData,
        });
        alert(`✅ OTP resent to ${formData.email}. Please check your inbox.`);
      } else {
        alert(result.message || 'Failed to resend OTP');
      }
    } catch (error) {
      alert('Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated background */}
      <div className="auth-bg">
        <div className="auth-bg-shape shape-1"></div>
        <div className="auth-bg-shape shape-2"></div>
        <div className="auth-bg-shape shape-3"></div>
      </div>
      <div className="auth-grid"></div>

      <div className="auth-container">
        {/* Left Side - Branding */}
        <div className="auth-branding">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Shield size={32} />
            </div>
            <div className="auth-logo-text">
              <h1>NIYUKTISETU</h1>
              <p>by NDA</p>
            </div>
          </div>

          <h2 className="auth-tagline">
            Join the Future of <span className="auth-tagline-highlight">Government Recruitment</span>
          </h2>
          <p className="auth-description">
            Register today to access AI-powered interview preparation, multilingual support,
            and advanced assessment tools designed for NDA examinations.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <Zap size={24} />
              </div>
              <div className="auth-feature-text">
                <h3>AI-Powered Interviews</h3>
                <p>Smart evaluation with real-time feedback</p>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <Award size={24} />
              </div>
              <div className="auth-feature-text">
                <h3>Government Certified</h3>
                <p>Official NDA recruitment platform</p>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <Check size={24} />
              </div>
              <div className="auth-feature-text">
                <h3>6+ Languages Supported</h3>
                <p>Interview in your preferred language</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="auth-card-wrapper">
          <div className="auth-card">
            {step === 'signup' ? (
              <>
                <div className="auth-card-header">
                  <h2 className="auth-card-title">Create Account</h2>
                  <p className="auth-card-subtitle">Start your journey with NDA</p>
                </div>

                <form onSubmit={handleSignUp} className="auth-form">
                  <div className="auth-input-group">
                    <label className="auth-input-label">Full Name</label>
                    <div className="auth-input-wrapper">
                      <User className="auth-input-icon" size={20} />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`auth-input ${errors.name ? 'error' : ''}`}
                        placeholder="Enter your full name"
                      />
                    </div>
                    {errors.name && <span className="auth-error-message">{errors.name}</span>}
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-input-label">Email Address</label>
                    <div className="auth-input-wrapper">
                      <Mail className="auth-input-icon" size={20} />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`auth-input ${errors.email ? 'error' : ''}`}
                        placeholder="Enter your email"
                      />
                    </div>
                    {errors.email && <span className="auth-error-message">{errors.email}</span>}
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-input-label">Password</label>
                    <div className="auth-input-wrapper">
                      <Lock className="auth-input-icon" size={20} />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`auth-input ${errors.password ? 'error' : ''}`}
                        placeholder="Create a strong password"
                      />
                    </div>
                    {errors.password && <span className="auth-error-message">{errors.password}</span>}
                  </div>

                  <div className="auth-checkbox-group">
                    <input
                      type="checkbox"
                      id="terms"
                      name="agreedToTerms"
                      checked={formData.agreedToTerms}
                      onChange={handleInputChange}
                      className="auth-checkbox"
                    />
                    <label htmlFor="terms" className="auth-checkbox-label">
                      I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>
                    </label>
                  </div>
                  {errors.terms && <span className="auth-error-message">{errors.terms}</span>}
                  {errors.submit && <span className="auth-error-message">{errors.submit}</span>}

                  <button type="submit" className="auth-submit" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                  </button>
                </form>

                <div className="auth-footer">
                  Already have an account? <a href="/sign-in">Sign In</a>
                </div>
              </>
            ) : (
              <>
                <div className="auth-card-header">
                  <h2 className="auth-card-title">Verify Email</h2>
                  <p className="auth-card-subtitle">Enter the OTP sent to {formData.email}</p>
                </div>

                <form onSubmit={handleVerifyOtp} className="auth-form">
                  <div className="auth-input-group">
                    <label className="auth-input-label">OTP Code</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={handleOtpChange}
                      className={`auth-input auth-otp-input ${errors.otp ? 'error' : ''}`}
                      placeholder="000000"
                      maxLength="6"
                    />
                    {errors.otp && <span className="auth-error-message">{errors.otp}</span>}
                  </div>

                  <button type="submit" className="auth-submit" disabled={isLoading}>
                    {isLoading ? 'Verifying...' : 'Verify & Continue'}
                  </button>

                  <div className="auth-footer">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="auth-resend-otp"
                      disabled={isLoading}
                    >
                      Resend OTP
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
