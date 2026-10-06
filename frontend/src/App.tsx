import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import { IconProvider } from './components/Icon';
import { GoogleMapsProvider } from './context/GoogleMapsContext';
import ProtectedRoute from './components/ProtectedRoute';
import SmoothScroll from './components/SmoothScroll';
import RouteTransition from './components/RouteTransition';
import HomePage from './pages/HomePage';
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const TripsPage = lazy(() => import('./pages/TripsPage'));
const TripDetailPage = lazy(() => import('./pages/TripDetailPage'));
const SharePage = lazy(() => import('./pages/SharePage'));
const GuestUploadPage = lazy(() => import('./pages/GuestUploadPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const SidequestsPage = lazy(() => import('./pages/SidequestsPage'));
const HowToPlayPage = lazy(() => import('./pages/HowToPlayPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));

/** Route family → drives `<body data-route>` so the atmosphere shifts hue per section. */
function routeFamily(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/trips')) return 'trips';
  if (pathname.startsWith('/sidequests') || pathname.startsWith('/claims')) return 'sidequests';
  if (pathname.startsWith('/discover')) return 'discover';
  if (pathname.startsWith('/leaderboard') || pathname.startsWith('/how-to-play')) return 'play';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/subscription')) return 'subscription';
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password')
  )
    return 'auth';
  if (pathname.startsWith('/share') || pathname.startsWith('/upload')) return 'share';
  if (pathname.startsWith('/privacy') || pathname.startsWith('/terms')) return 'legal';
  if (pathname.startsWith('/admin')) return 'admin';
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
        <Suspense fallback={<div className="route-loading" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<main><LoginPage /></main>} />
          <Route path="/register" element={<main><RegisterPage /></main>} />
          <Route path="/forgot-password" element={<main><ForgotPasswordPage /></main>} />
          <Route path="/reset-password" element={<main><ResetPasswordPage /></main>} />
          <Route path="/discover" element={<main><DiscoverPage /></main>} />
          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <GoogleMapsProvider>
                  <main>
                    <TripsPage />
                  </main>
                </GoogleMapsProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id"
            element={
              <ProtectedRoute>
                <GoogleMapsProvider>
                  <main>
                    <TripDetailPage />
                  </main>
                </GoogleMapsProvider>
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
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <main><AdminDashboardPage /></main>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute>
                <main><AdminReportsPage /></main>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
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
