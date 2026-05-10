import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/trips');
        }
    }, [user]);

    return (
        <div className="landing">
            {/* Hero */}
            <section className="landing-hero">
                <video className="hero-video" autoPlay muted loop playsInline>
                    <source src="https://www.pexels.com/download/video/36244259/" type="video/mp4" />
                </video>
                <div className="hero-overlay" />
                <div className="hero-content">
                    <h1 className="landing-headline">Plan trips. <br />Not spreadsheets.</h1>
                    <p className="landing-sub">Voyage is a collaborative itinerary builder with AI recommendations, live weather, and drag-and-drop scheduling.</p>
                    <div className="landing-cta-row">
                        <Link to="/register" className="btn-primary-lg">Get started for free</Link>
                        <Link to="/login" className="btn-ghost-lg">Sign in</Link>
                    </div>
                </div>
            </section>
            <section className="features-section">
                <h2 className="features-heading">Why Voyage?</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <span className="feature-icon">🤖</span>
                        <h3>AI Recommendations</h3>
                        <p>VoyageAI takes in your travel criteria and generates the best plan according to them</p>
                    </div>
                    <div className="feature-card">
                        <span className="feature-icon">🌤️</span>
                        <h3>Live Weather</h3>
                        <p>Track the weather forecast during your trip to plan around the climate</p>
                    </div>
                    <div className="feature-card">
                        <span className="feature-icon">🗺️</span>
                        <h3>Interactive Map</h3>
                        <p>Determine the locations of the different landmarks you're visiting so you know how to minimize transportation time and optimize transportation choice</p>
                    </div>
                    <div className="feature-card">
                        <span className="feature-icon">👥</span>
                        <h3>Collaborate with Friends</h3>
                        <p>Build itineraries with your friends and be able to collectively vote on which activities you want to do</p>
                    </div>
                </div>
            </section>
        </div>
    );
}