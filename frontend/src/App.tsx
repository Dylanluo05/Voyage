import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import { IconProvider } from './components/Icon';
import ProtectedRoute from './components/ProtectedRoute';
import SmoothScroll from './components/SmoothScroll';
import RouteTransition from './components/RouteTransition';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import SharePage from './pages/SharePage';
import GuestUploadPage from './pages/GuestUploadPage';
import ProfilePage from './pages/ProfilePage';
import SubscriptionPage from './pages/SubscriptionPage';
import DiscoverPage from './pages/DiscoverPage';
import SidequestsPage from './pages/SidequestsPage';
import HowToPlayPage from './pages/HowToPlayPage';
import LeaderboardPage from './pages/LeaderboardPage';

/** Route family → drives `<body data-route>` so the atmosphere shifts hue per section. */
function routeFamily(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/trips')) return 'trips';
  if (pathname.startsWith('/sidequests') || pathname.startsWith('/claims')) return 'sidequests';
  if (pathname.startsWith('/discover')) return 'discover';
  if (pathname.startsWith('/leaderboard') || pathname.startsWith('/how-to-play')) return 'play';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/subscription')) return 'subscription';
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) return 'auth';
  if (pathname.startsWith('/share') || pathname.startsWith('/upload')) return 'share';
  return 'app';
}

function Shell() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.body.dataset.route = routeFamily(pathname);
  }, [pathname]);

  return (
    <>
      <NavBar />
      <RouteTransition>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<main><LoginPage /></main>} />
          <Route path="/register" element={<main><RegisterPage /></main>} />
          <Route path="/discover" element={<main><DiscoverPage /></main>} />
          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <main>
                  <TripsPage />
                </main>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id"
            element={
              <ProtectedRoute>
                <main>
                  <TripDetailPage />
                </main>
              </ProtectedRoute>
            }
          />
          <Route path="/share/:token" element={<SharePage />} />
          <Route path="/upload/:token" element={<GuestUploadPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <main>
                  <ProfilePage />
                </main>
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <main>
                  <SubscriptionPage />
                </main>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sidequests"
            element={
              <ProtectedRoute>
                <main>
                  <SidequestsPage />
                </main>
              </ProtectedRoute>
            }
          />
          <Route path="/claims" element={<Navigate to="/sidequests" replace />} />
          <Route path="/how-to-play" element={<HowToPlayPage />} />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <main>
                  <LeaderboardPage />
                </main>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RouteTransition>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <IconProvider>
        <SmoothScroll>
          <Shell />
        </SmoothScroll>
      </IconProvider>
    </AuthProvider>
  );
}
