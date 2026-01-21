import React from 'react';
import '../utils/buttons.css';

const SubmitButton = ({ disabled = false }) => {
  return (
    <button type="submit" className="submit-button" disabled={disabled}>
      {disabled ? 'Submitting...' : 'Submit'}
    </button>
  );
};

export default SubmitButton;