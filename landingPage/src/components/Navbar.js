import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, Moon, Sun } from 'lucide-react';
import './Navbar.css';

const Navbar = ({ onSignInClick }) => {
  const { isAuthenticated, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav className="navbar" data-testid="main-navbar">
      <div className="navbar-container">
        <div className="brand" data-testid="brand-logo">
          <div className="brand-logo">
            <Shield size={24} />
          </div>
          <div className="brand-text">
            <span className="brand-main">NIYUKTISETU</span>
            <span className="brand-sub">National Defence Academy</span>
          </div>
        </div>
        
        <div className="nav-menu" data-testid="nav-menu">
          <a href="#home" className="nav-link" data-testid="nav-home">Home</a>
          <a href="#training" className="nav-link" data-testid="nav-training">Training</a>
          <a href="#exam" className="nav-link" data-testid="nav-exam">Exam</a>
          <a href="#support" className="nav-link" data-testid="nav-support">Support</a>
        </div>
        
        <div className="nav-actions">
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme}
            aria-label="Toggle theme"
            data-testid="theme-toggle"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {isAuthenticated ? (
            <button 
              className="sign-in-btn dashboard-btn" 
              onClick={() => window.location.href = '/dashboard'}
              data-testid="dashboard-btn"
            >
              Dashboard
            </button>
          ) : (
            <button 
              className="sign-in-btn" 
              onClick={onSignInClick}
              data-testid="sign-in-btn"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
