import StepCard from './StepCard';
import { ArrowRight, ChevronDown } from 'lucide-react';
import './EvaluationSection.css';

const EvaluationSection = () => {
  const steps = [
    {
      id: 1,
      icon: 'microphone',
      title: 'Voice Response Capture',
      description: 'You give answer in subjective form which can be recorded with speech recognition technology in real-time'
    },
    {
      id: 2,
      icon: 'ai',
      title: 'AI-Powered Evaluation',
      description: 'Our AI model then evaluates your answer on the basis of grammar, tone, role-related knowledge, and gives score'
    },
    {
      id: 3,
      icon: 'gauge',
      title: 'Adaptive Question Selection',
      description: 'Then NLP on the basis of your answers decides next series of question set to be asked'
    }
  ];

  return (
    <section className="evaluation-section" data-testid="evaluation-section">
      <div className="evaluation-container">
        <div className="evaluation-panel" data-testid="evaluation-panel">
          <div className="panel-header">
            <span className="step-label" data-testid="step-label">STEP 1</span>
            <h2 className="panel-title" data-testid="panel-title">
              Let's Understand how we evaluate you!
            </h2>
          </div>
          
          <div className="steps-container">
            {steps.map((step, index) => (
              <div key={step.id} className="step-wrapper">
                <StepCard {...step} />
                {index < steps.length - 1 && (
                  <>
                    <div className="arrow-connector desktop-only" data-testid={`arrow-${index}`}>
                      <ArrowRight size={24} strokeWidth={2.5} />
                    </div>
                    <div className="arrow-connector mobile-only" data-testid={`chevron-${index}`}>
                      <ChevronDown size={24} strokeWidth={2.5} />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EvaluationSection;
