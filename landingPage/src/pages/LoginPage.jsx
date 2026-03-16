import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../pages/auth.css';
import { Mail, Lock, Shield, Award, Zap, Globe } from 'lucide-react';
import { loginUser } from '../utils/mockAuth';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    agreedToTerms: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = 'You must agree to the terms and privacy policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsLoading(true);
      try {
        const result = await loginUser(formData.email, formData.password);
        if (result.success) {
          login(result.user, result.token);
          navigate('/');
        } else {
          setErrors({ general: result.message });
        }
      } catch (error) {
        setErrors({ general: 'An error occurred. Please try again.' });
      } finally {
        setIsLoading(false);
      }
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
            Welcome Back to <span className="auth-tagline-highlight">Smart Recruitment</span>
          </h2>
          <p className="auth-description">
            Sign in to access your dashboard, track your interview progress, and explore
            personalized exam preparation resources powered by AI.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <Award size={24} />
              </div>
              <div className="auth-feature-text">
                <h3>Track Progress</h3>
                <p>Monitor your performance and improvements</p>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <Zap size={24} />
              </div>
              <div className="auth-feature-text">
                <h3>Instant Results</h3>
                <p>Get immediate feedback on your interviews</p>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <Globe size={24} />
              </div>
              <div className="auth-feature-text">
                <h3>Multilingual Access</h3>
                <p>Interview in your preferred language</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="auth-card-wrapper">
          <div className="auth-card">
            <div className="auth-card-header">
              <h2 className="auth-card-title">Sign In</h2>
              <p className="auth-card-subtitle">Access your account and continue your journey</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
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
                    placeholder="Enter your password"
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
              {errors.agreedToTerms && <span className="auth-error-message">{errors.agreedToTerms}</span>}
              {errors.general && <span className="auth-error-message">{errors.general}</span>}

              <button type="submit" className="auth-submit" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-footer">
              Don't have an account? <a href="/sign-up">Sign Up</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;