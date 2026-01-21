import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import FullHero from '../components/FullHero';
import EvaluationSection from '../components/EvaluationSection';
import FooterBand from '../components/FooterBand';
import Marquee from '../components/Marquee';
import Footer from '../components/Footer';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <ThemeProvider>
      <div className="landing-page">
        <Navbar onSignInClick={() => navigate('/sign-in')} />
        <FullHero onSignInClick={() => navigate('/login')} />
        <EvaluationSection />
        <FooterBand />
        <Marquee />
        <Footer />
      </div>
    </ThemeProvider>
  );
};

export default LandingPage;
