import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const featuresRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (user) navigate('/trips');
  }, [user]);

  useEffect(() => {
    const cards = featuresRef.current?.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!cards?.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    cards.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing">
      {/* Hero */}
      <section className="landing-hero">
        <video className="hero-video" autoPlay muted loop playsInline>
          <source src="https://www.pexels.com/download/video/36244259/" type="video/mp4" />
        </video>
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="landing-headline">Plan trips.<br />Not spreadsheets.</h1>
          <p className="landing-sub">
            Voyage is a collaborative itinerary builder with AI recommendations,
            live weather, and drag-and-drop scheduling.
          </p>
          <div className="landing-cta-row">
            <Link to="/register" className="btn-primary-lg">Get started free</Link>
            <Link to="/login" className="btn-ghost-lg">Sign in</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" ref={featuresRef}>
        <div className="features-heading" data-reveal>
          <h2>Why Voyage?</h2>
          <p>Everything your group needs in one place.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card" data-reveal data-delay="1">
            <span className="feature-icon">🤖</span>
            <h3>AI Recommendations</h3>
            <p>VoyageAI takes in your travel criteria and generates the best plan tailored to you.</p>
          </div>
          <div className="feature-card" data-reveal data-delay="2">
            <span className="feature-icon">🌤️</span>
            <h3>Live Weather</h3>
            <p>Track the forecast during your trip so you can plan around the climate.</p>
          </div>
          <div className="feature-card" data-reveal data-delay="3">
            <span className="feature-icon">🗺️</span>
            <h3>Interactive Map</h3>
            <p>See all your stops on a map to minimize travel time and pick the best route.</p>
          </div>
          <div className="feature-card" data-reveal data-delay="4">
            <span className="feature-icon">👥</span>
            <h3>Collaborate</h3>
            <p>Build itineraries with friends and vote on activities together in real time.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
