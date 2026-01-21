import React from 'react';
import { Mail, Phone, MapPin, ExternalLink, Shield, Award, Users } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="main-footer">
      <div className="footer-top">
        <div className="footer-container">
          <div className="footer-grid">
            {/* About Section */}
            <div className="footer-column">
              <div className="footer-brand">
                <Shield size={32} className="footer-brand-icon" />
                <div>
                  <h3 className="footer-brand-title">NIYUKTISETU</h3>
                  <p className="footer-brand-subtitle">by NDA</p>
                </div>
              </div>
              <p className="footer-description">
                Advanced AI-powered recruitment platform by National Defence Academy.
                Revolutionizing government hiring with cutting-edge technology.
              </p>
              <div className="footer-badges">
                <div className="footer-badge">
                  <Award size={16} />
                  <span>Government Certified</span>
                </div>
                <div className="footer-badge">
                  <Users size={16} />
                  <span>10K+ Candidates</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="footer-column">
              <h4 className="footer-title">Quick Links</h4>
              <ul className="footer-links">
                <li><a href="/">Home</a></li>
                <li><a href="/about">About NDA</a></li>
                <li><a href="/exams">Examinations</a></li>
                <li><a href="/results">Results</a></li>
                <li><a href="/careers">Careers</a></li>
                <li><a href="/contact">Contact Us</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div className="footer-column">
              <h4 className="footer-title">Resources</h4>
              <ul className="footer-links">
                <li><a href="/faq">FAQs</a></li>
                <li><a href="/guidelines">Interview Guidelines</a></li>
                <li><a href="/syllabus">Syllabus</a></li>
                <li><a href="/previous-papers">Previous Papers</a></li>
                <li><a href="/notifications">Notifications</a></li>
                <li><a href="/support">Support</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="footer-column">
              <h4 className="footer-title">Contact Us</h4>
              <ul className="footer-contact">
                <li>
                  <MapPin size={18} />
                  <span>NDA Headquarters<br />Khadakwasla, Pune, India</span>
                </li>
                <li>
                  <Phone size={18} />
                  <span>+91 11 2300 XXXX</span>
                </li>
                <li>
                  <Mail size={18} />
                  <span>support@niyuktisetu.nda.gov.in</span>
                </li>
              </ul>
              <div className="footer-social">
                <a href="#" className="social-link" aria-label="Twitter">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="LinkedIn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                    <circle cx="4" cy="4" r="2"/>
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="YouTube">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z"/>
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="Facebook">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-container">
          <div className="footer-bottom-content">
            <p className="footer-copyright">
              © {currentYear} NDA - National Defence Academy. All rights reserved.
            </p>
            <div className="footer-bottom-links">
              <a href="/privacy">Privacy Policy</a>
              <span className="separator">•</span>
              <a href="/terms">Terms of Service</a>
              <span className="separator">•</span>
              <a href="/accessibility">Accessibility</a>
            </div>
          </div>
          <div className="footer-government-badge">
            <span className="badge-text">Proud Initiative of</span>
            <span className="badge-highlight">Government of India</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
