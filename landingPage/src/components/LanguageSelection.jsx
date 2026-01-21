import React, { useState } from 'react';
import { isDemoMode } from '../services/api';
import './LanguageSelection.css';

const LanguageSelection = ({ onLanguageSelect, userImage }) => {
  const [selectedLanguage, setSelectedLanguage] = useState(null);

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    // Wait a moment to show selection, then proceed
    setTimeout(() => {
      onLanguageSelect(language);
    }, 500);
  };

  return (
    <div className="language-container">
      {userImage && (
        <div className="user-avatar">
          <img src={userImage} alt="User" />
        </div>
      )}

      <div className="language-content">
        <h1 className="language-title">
          Please confirm your <span className="highlight">Language</span>
        </h1>

        <div className="language-options">
          <button
            className={`language-btn ${selectedLanguage === 'english' ? 'selected' : ''}`}
            onClick={() => handleLanguageSelect('english')}
          >
            English
          </button>
          <button
            className={`language-btn ${selectedLanguage === 'hindi' ? 'selected' : ''}`}
            onClick={() => handleLanguageSelect('hindi')}
          >
            Hindi
          </button>
        </div>
      </div>

      <button className="exit-button">
        EXIT
      </button>
    </div>
  );
};

export default LanguageSelection;
