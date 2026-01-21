import { Calendar, ArrowRight } from 'lucide-react';
import './PosterCard.css';

const PosterCard = ({ title, date, badge, image }) => {
  const isGradient = image.startsWith('linear-gradient');
  const imageStyle = isGradient 
    ? { background: image }
    : { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  
  return (
    <div className="poster-card" data-testid="poster-card" tabIndex="0">
      <div className="poster-image" style={imageStyle}>
        <span className="poster-badge" data-testid="poster-badge">{badge}</span>
      </div>
      <div className="poster-content">
        <h3 className="poster-title" data-testid="poster-title">{title}</h3>
        <div className="poster-meta">
          <Calendar size={16} />
          <span className="poster-date" data-testid="poster-date">{date}</span>
        </div>
        <button className="poster-action" data-testid="poster-action-btn">
          View Details
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default PosterCard;
