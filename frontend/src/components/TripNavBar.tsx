interface TripNavBarProps {
    setSection: React.Dispatch<React.SetStateAction<string>>;
}

export default function TripNavBar({ setSection }: TripNavBarProps) {
    const handleNavigate = (section: string) => {
        setSection(section);
    };

    return (
        <nav className="trip-navbar">
            <div className="trip-navbar-scroll">
                <button className="trip-nav-btn" onClick={() => handleNavigate("map")}>Map</button>
                <button className="trip-nav-btn" onClick={() => handleNavigate("budget")}>Budget</button>
                <button className="trip-nav-btn" onClick={() => handleNavigate("hotels")}>Hotels</button>
                <button className="trip-nav-btn" onClick={() => handleNavigate("flights")}>Flights</button>
                <button className="trip-nav-btn" onClick={() => handleNavigate("sidequests")}>Sidequests</button>
                <button className="trip-nav-btn" onClick={() => handleNavigate("expenses")}>Expenses</button>
                <button className="trip-nav-btn" onClick={() => handleNavigate("weather")}>Weather</button>
                <button className="trip-nav-btn" onClick={() => handleNavigate("collaborators")}>Collaborators</button>
                <button className="trip-nav-btn" onClick={() => handleNavigate("ai-recommendations")}>AI Recommendations</button>
                <button className="trip-nav-btn" onClick={() => handleNavigate("trip-playlist")}>Trip Playlist</button>
                <button className="trip-nav-btn" onClick={() => handleNavigate("itinerary")}>Itinerary</button>
                <button className="trip-nav-btn" onClick={() => handleNavigate("chat")}>AI Chat</button>
            </div>
        </nav>
    );
}