import React from 'react';
import '../utils/header.css';

const HeaderBar = ({ time = '2:00:00' }) => {
  return (
    <header className="header-bar">
      <div className="header-left">
        <span className="logo-text">NIYUKTI<span className="logo-accent">SETU</span></span>
      </div>
      <div className="header-center">
        <span className="title-text">DRDO 2024</span>
      </div>
      <div className="header-right">
        <span className="timer-text">{time}</span>
      </div>
    </header>
  );
};

export default HeaderBar;