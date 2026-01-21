import React from 'react';
import '../utils/buttons.css';

const ExitButton = () => {
  const handleExit = () => {
    console.log('Exit clicked');
    // Mock exit logic
    if (window.confirm('Are you sure you want to exit?')) {
      console.log('User exited the interview portal');
    }
  };

  return (
    <button className="exit-button" onClick={handleExit}>
      EXIT
    </button>
  );
};

export default ExitButton;