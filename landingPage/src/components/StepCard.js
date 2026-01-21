import { Mic, Cpu, Gauge } from 'lucide-react';
import './StepCard.css';

const iconMap = {
  microphone: Mic,
  ai: Cpu,
  gauge: Gauge
};

const StepCard = ({ icon, title, description }) => {
  const IconComponent = iconMap[icon];
  
  return (
    <article className="step-card" data-testid="step-card">
      <div className="step-icon-wrapper" data-testid="step-icon">
        <IconComponent size={42} strokeWidth={1.8} className="step-icon" aria-hidden="true" />
      </div>
      <h3 className="step-title" data-testid="step-title">{title}</h3>
      <p className="step-description" data-testid="step-description">{description}</p>
    </article>
  );
};

export default StepCard;
