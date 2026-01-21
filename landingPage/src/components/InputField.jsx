import React from 'react';
import '../utils/login.css';

const InputField = ({ label, type, placeholder, name, icon, value, onChange }) => {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <div className="input-wrapper">
        <span className="input-icon">{icon || 'a'}</span>
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          className="input-field"
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

export default InputField;