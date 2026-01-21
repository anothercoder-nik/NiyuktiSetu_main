import PosterCard from './PosterCard';
import './Marquee.css';

const Marquee = () => {
  const posters = [
    {
      id: 1,
      title: 'DRDO Recruitment 2025',
      date: 'Jan 15, 2025',
      badge: 'New',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop'
    },
    {
      id: 2,
      title: 'UPSC Civil Services Exam',
      date: 'Feb 01, 2025',
      badge: 'Hot',
      image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&h=300&fit=crop'
    },
    {
      id: 3,
      title: 'SSC CGL Interview 2025',
      date: 'Feb 10, 2025',
      badge: 'Trending',
      image: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop'
    },
    {
      id: 4,
      title: 'Defence Scientist Exam',
      date: 'Feb 20, 2025',
      badge: 'New',
      image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop'
    },
    {
      id: 5,
      title: 'ISRO Technical Assistant',
      date: 'Mar 01, 2025',
      badge: 'Apply',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop'
    },
    {
      id: 6,
      title: 'Bank PO Interview Prep',
      date: 'Mar 15, 2025',
      badge: 'Hot',
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=300&fit=crop'
    },
    {
      id: 7,
      title: 'IAS Mock Interview',
      date: 'Mar 20, 2025',
      badge: 'Trending',
      image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop'
    },
    {
      id: 8,
      title: 'Railway Recruitment Board',
      date: 'Apr 01, 2025',
      badge: 'New',
      image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=300&fit=crop'
    }
  ];

  // Duplicate for seamless loop
  const duplicatedPosters = [...posters, ...posters];

  return (
    <div className="marquee-section" data-testid="marquee-section">
      <h2 className="marquee-title">Upcoming Exams & Notifications</h2>
      <div className="marquee-container">
        <div className="marquee-track">
          {duplicatedPosters.map((poster, index) => (
            <PosterCard key={`${poster.id}-${index}`} {...poster} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Marquee;
