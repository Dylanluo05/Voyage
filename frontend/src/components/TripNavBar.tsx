import { useEffect, useRef, useState } from 'react';

export const ALL_SECTIONS = [
    { key: 'map', label: 'Map' },
    { key: 'budget', label: 'Budget' },
    { key: 'hotels', label: 'Hotels' },
    { key: 'flights', label: 'Flights' },
    { key: 'sidequests', label: 'Sidequests' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'weather', label: 'Weather' },
    { key: 'collaborators', label: 'Collaborators' },
    { key: 'trip-playlist', label: 'Trip Playlist' },
    { key: 'itinerary', label: 'Itinerary' },
    { key: 'chat', label: 'AI Chat' },
] as const;

interface TripNavBarProps {
    setSection: React.Dispatch<React.SetStateAction<string>>;
    visibleSections: Set<string>;
    onToggleSection: (key: string) => void;
}

export default function TripNavBar({ setSection, visibleSections, onToggleSection }: TripNavBarProps) {
    const [showCustomize, setShowCustomize] = useState(false);
    const customizeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showCustomize) return;
        function handleMouseDown(e: MouseEvent) {
            if (!customizeRef.current?.contains(e.target as Node)) {
                setShowCustomize(false);
            }
        }
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [showCustomize]);

    return (
        <nav className="trip-navbar">
            <div className="trip-navbar-inner">
                <div className="trip-navbar-scroll">
                    {ALL_SECTIONS.filter(s => visibleSections.has(s.key)).map(s => (
                        <button key={s.key} className="trip-nav-btn" onClick={() => setSection(s.key)}>
                            {s.label}
                        </button>
                    ))}
                </div>
                <div ref={customizeRef} className="trip-nav-customize-wrap">
                    <button
                        className="trip-nav-btn trip-nav-sections-btn"
                        onClick={() => setShowCustomize(v => !v)}
                    >
                        Sections {showCustomize ? '▴' : '▾'}
                    </button>
                    {showCustomize && (
                        <div className="trip-nav-customize-dropdown">
                            {ALL_SECTIONS.map(s => (
                                <label key={s.key} className="trip-nav-customize-row">
                                    <input
                                        type="checkbox"
                                        checked={visibleSections.has(s.key)}
                                        onChange={() => onToggleSection(s.key)}
                                    />
                                    {s.label}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
