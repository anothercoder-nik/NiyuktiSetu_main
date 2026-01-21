import './FooterBand.css';

const FooterBand = () => {
  const tags = [
    { label: 'DRDO', testId: 'drdo' },
    { label: 'RAC', testId: 'rac' },
    { label: 'INTERVIEW', testId: 'interview' },
    { label: 'SEC', testId: 'sec' }
  ];
  
  // Duplicate tags for seamless infinite scroll
  const allTags = [...tags, ...tags, ...tags];
  
  return (
    <footer className="footer-band" data-testid="footer-band">
      <div className="footer-track-container">
        <div className="footer-track">
          {allTags.map((tag, index) => (
            <span key={`${tag.testId}-${index}`} className="tag-group">
              <span className="tag-pill" data-testid={`tag-${tag.testId}-${index}`}>
                {tag.label}
              </span>
              <span className="tag-dot" aria-hidden="true">•</span>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default FooterBand;
