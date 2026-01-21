import { ArrowRight, Award, Users, Target } from 'lucide-react';
import './FullHero.css';

const FullHero = ({onSignInClick}) => {
  return (
    <section className="full-hero" id="home" data-testid="full-hero-section">
      <div className="hero-overlay"></div>
      <div className="hero-content-wrapper">
        <div className="hero-content">
          <div className="hero-badge">
            <Award size={16} />
            <span>Government of India Initiative</span>
          </div>
          <h1 className="hero-title" data-testid="hero-title">
            Next-Gen <span className="hero-title-highlight">AI-Powered</span><br />
            Interview System for India
          </h1>
          <p className="hero-subtitle" data-testid="hero-subtitle">
            Advanced virtual interview platform powered by artificial intelligence. Supporting multilingual assessments, 
            real-time speech recognition, and intelligent evaluation to help candidates prepare and excel in NDA examinations.
          </p>
          <div className="hero-actions">
            <button onClick={onSignInClick} className="cta-primary" data-testid="start-interview-btn">
              Start Interview
              <ArrowRight className="btn-icon" size={20} />
            </button>
            <button className="cta-secondary" data-testid="learn-more-btn">
              Learn More
            </button>
          </div>
          
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">10K+</div>
              <div className="stat-label">Candidates Tested</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">95%</div>
              <div className="stat-label">Accuracy Rate</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">6+</div>
              <div className="stat-label">Languages Supported</div>
            </div>
          </div>
        </div>
        
        <div className="hero-image-container">
          <div className="hero-illustration-wrapper">
            {/* Floating particles */}
            <div className="particle particle-1"></div>
            <div className="particle particle-2"></div>
            <div className="particle particle-3"></div>
            <div className="particle particle-4"></div>
            <div className="particle particle-5"></div>
            
            {/* Main illustration - Interview Scene */}
            <svg className="hero-illustration" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="orangeGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#FF9933', stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#138808', stopOpacity:1}} />
                </linearGradient>
                <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{stopColor:'#000080', stopOpacity:0.8}} />
                  <stop offset="100%" style={{stopColor:'#4169E1', stopOpacity:0.6}} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Background circles */}
              <circle className="bg-circle-1" cx="300" cy="300" r="240" fill="url(#orangeGreen)" opacity="0.05"/>
              <circle className="bg-circle-2" cx="300" cy="300" r="190" fill="url(#orangeGreen)" opacity="0.08"/>
              <circle className="bg-circle-3" cx="300" cy="300" r="140" fill="url(#orangeGreen)" opacity="0.12"/>
              
              {/* Interview Table/Desk */}
              <rect x="120" y="380" width="360" height="15" rx="7" fill="#8B4513" opacity="0.3"/>
              
              {/* Interviewer (Left) - Officer/Panel Member */}
              <g className="interviewer-group">
                {/* Body */}
                <ellipse cx="180" cy="340" rx="45" ry="55" fill="#138808" opacity="0.8"/>
                {/* Head */}
                <circle cx="180" cy="260" r="35" fill="#FFB380"/>
                {/* Hair */}
                <path d="M 150 250 Q 150 230 180 225 Q 210 230 210 250" fill="#333"/>
                {/* Tie */}
                <rect x="173" y="280" width="14" height="40" fill="#FF9933"/>
                {/* Clipboard */}
                <rect x="140" y="310" width="30" height="40" rx="3" fill="#fff" stroke="#333" strokeWidth="2"/>
                <line x1="145" y1="320" x2="165" y2="320" stroke="#FF9933" strokeWidth="2"/>
                <line x1="145" y1="330" x2="165" y2="330" stroke="#333" strokeWidth="1"/>
                <line x1="145" y1="337" x2="165" y2="337" stroke="#333" strokeWidth="1"/>
              </g>
              
              {/* Candidate (Right) - Person being interviewed */}
              <g className="candidate-group">
                {/* Body */}
                <ellipse cx="420" cy="340" rx="45" ry="55" fill="#FF9933" opacity="0.8"/>
                {/* Head */}
                <circle cx="420" cy="260" r="35" fill="#FFB380"/>
                {/* Hair */}
                <path d="M 390 250 Q 390 230 420 225 Q 450 230 450 250" fill="#333"/>
                {/* Nervous indicators - sweat drops */}
                <circle className="sweat-drop drop-1" cx="440" cy="255" r="3" fill="#4FC3F7"/>
                <circle className="sweat-drop drop-2" cx="448" cy="265" r="3" fill="#4FC3F7"/>
              </g>
              
              {/* Speech bubbles */}
              <g className="speech-group">
                {/* Interviewer question bubble */}
                <rect className="speech-bubble bubble-1" x="80" y="180" width="120" height="50" rx="10" fill="#fff" stroke="#138808" strokeWidth="3"/>
                <text x="140" y="200" fontSize="14" fill="#138808" textAnchor="middle" fontWeight="bold">Tell us about</text>
                <text x="140" y="218" fontSize="14" fill="#138808" textAnchor="middle" fontWeight="bold">yourself?</text>
                <polygon points="150,230 160,245 170,230" fill="#fff" stroke="#138808" strokeWidth="3"/>
                
                {/* Candidate response bubble */}
                <rect className="speech-bubble bubble-2" x="340" y="160" width="140" height="70" rx="10" fill="#fff" stroke="#FF9933" strokeWidth="3"/>
                <text x="410" y="185" fontSize="12" fill="#FF9933" textAnchor="middle">I am passionate</text>
                <text x="410" y="203" fontSize="12" fill="#FF9933" textAnchor="middle">about defence</text>
                <text x="410" y="221" fontSize="12" fill="#FF9933" textAnchor="middle">research...</text>
                <polygon points="390,230 390,245 400,235" fill="#fff" stroke="#FF9933" strokeWidth="3"/>
              </g>
              
              {/* AI Analysis Panel (Top) */}
              <g className="ai-panel-group">
                <rect x="220" y="40" width="160" height="100" rx="12" fill="rgba(255,255,255,0.95)" stroke="url(#orangeGreen)" strokeWidth="3"/>
                
                {/* AI Brain Icon */}
                <circle cx="250" cy="70" r="18" fill="#138808"/>
                <circle cx="245" cy="67" r="3" fill="#fff"/>
                <circle cx="255" cy="67" r="3" fill="#fff"/>
                <circle cx="250" cy="75" r="3" fill="#fff"/>
                <line x1="245" y1="67" x2="250" y2="75" stroke="#fff" strokeWidth="1.5"/>
                <line x1="255" y1="67" x2="250" y2="75" stroke="#fff" strokeWidth="1.5"/>
                
                {/* Analysis bars */}
                <text x="285" y="60" fontSize="10" fill="#666" fontWeight="600">Confidence</text>
                <rect x="285" y="65" width="80" height="6" rx="3" fill="#e0e0e0"/>
                <rect className="analysis-bar bar-1" x="285" y="65" width="65" height="6" rx="3" fill="#FF9933"/>
                
                <text x="285" y="85" fontSize="10" fill="#666" fontWeight="600">Clarity</text>
                <rect x="285" y="90" width="80" height="6" rx="3" fill="#e0e0e0"/>
                <rect className="analysis-bar bar-2" x="285" y="90" width="70" height="6" rx="3" fill="#138808"/>
                
                <text x="285" y="110" fontSize="10" fill="#666" fontWeight="600">Relevance</text>
                <rect x="285" y="115" width="80" height="6" rx="3" fill="#e0e0e0"/>
                <rect className="analysis-bar bar-3" x="285" y="115" width="60" height="6" rx="3" fill="#000080"/>
              </g>
              
              {/* Camera/Recording indicator */}
              <g className="camera-group">
                <circle className="recording-pulse" cx="520" cy="80" r="25" fill="#FF0000" opacity="0.2"/>
                <circle cx="520" cy="80" r="15" fill="#FF0000"/>
                <circle cx="520" cy="80" r="8" fill="#fff"/>
                <text x="520" y="110" fontSize="11" fill="#666" textAnchor="middle" fontWeight="bold">REC</text>
              </g>
              
              {/* Timer */}
              <g className="timer-group">
                <rect x="470" y="450" width="100" height="40" rx="8" fill="rgba(255,255,255,0.9)" stroke="#FF9933" strokeWidth="2"/>
                <text x="520" y="465" fontSize="11" fill="#666" textAnchor="middle" fontWeight="600">TIME LEFT</text>
                <text className="timer-text" x="520" y="483" fontSize="18" fill="#FF9933" textAnchor="middle" fontWeight="bold">04:32</text>
              </g>
              
              {/* Microphone with audio levels */}
              <g className="mic-levels-group">
                <circle className="sound-wave wave-1" cx="120" cy="480" r="20" fill="none" stroke="#FF9933" strokeWidth="3" opacity="0.6"/>
                <circle className="sound-wave wave-2" cx="120" cy="480" r="35" fill="none" stroke="#FF9933" strokeWidth="2" opacity="0.4"/>
                <circle className="sound-wave wave-3" cx="120" cy="480" r="50" fill="none" stroke="#FF9933" strokeWidth="1" opacity="0.2"/>
                
                <rect x="112" y="470" width="16" height="28" rx="8" fill="#FF9933"/>
                <rect x="114" y="500" width="12" height="15" fill="#ff7700"/>
                <line x1="120" y1="515" x2="120" y2="530" stroke="#ff7700" strokeWidth="4" strokeLinecap="round"/>
                <line x1="110" y1="530" x2="130" y2="530" stroke="#ff7700" strokeWidth="4" strokeLinecap="round"/>
                
                {/* Audio level bars */}
                <rect className="audio-level level-1" x="85" y="495" width="4" height="15" rx="2" fill="#138808"/>
                <rect className="audio-level level-2" x="92" y="490" width="4" height="25" rx="2" fill="#138808"/>
                <rect className="audio-level level-3" x="99" y="485" width="4" height="35" rx="2" fill="#FF9933"/>
                <rect className="audio-level level-4" x="141" y="490" width="4" height="25" rx="2" fill="#138808"/>
                <rect className="audio-level level-5" x="148" y="495" width="4" height="15" rx="2" fill="#138808"/>
              </g>
              
              {/* Success checkmarks */}
              <g className="success-group">
                <circle className="check-circle check-1" cx="60" cy="120" r="18" fill="#138808" opacity="0.2"/>
                <path className="check-mark check-1" d="M 53 120 L 58 125 L 68 113" stroke="#138808" strokeWidth="4" fill="none" strokeLinecap="round"/>
                
                <circle className="check-circle check-2" cx="540" cy="350" r="15" fill="#FF9933" opacity="0.2"/>
                <path className="check-mark check-2" d="M 533 350 L 538 355 L 548 343" stroke="#FF9933" strokeWidth="3" fill="none" strokeLinecap="round"/>
              </g>
              
              {/* Language support indicators */}
              <text x="50" y="550" fontSize="24" fill="url(#orangeGreen)" opacity="0.3" className="lang-symbol">हि</text>
              <text x="520" y="550" fontSize="22" fill="url(#orangeGreen)" opacity="0.3" className="lang-symbol">En</text>
              <text x="280" y="560" fontSize="20" fill="url(#orangeGreen)" opacity="0.3" className="lang-symbol">த</text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FullHero;
