import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import type { User, OtpPurpose } from '../types';
import * as authApi from '../api/auth';
import { ApiError, getToken, setToken } from '../api/client';
import { track } from '../utils/analytics';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Resolves to true if a code was sent and must be verified, false if login completed directly. */
  login: (email: string, password: string) => Promise<boolean>;
  authWithGoogle: (credential: string) => Promise<void>;
  /** Resolves to true if a code was sent and must be verified, false if signup completed directly. */
  register: (email: string, password: string, name: string) => Promise<boolean>;
  verifyOtp: (email: string, code: string, purpose: OtpPurpose) => Promise<void>;
  resendOtp: (email: string, purpose: OtpPurpose) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// The last known profile, so a launch with no signal (common on a phone) still opens the app signed in
// instead of treating "couldn't reach the server" as "signed out".
const USER_CACHE_KEY = 'trip_planner_user';

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null): void {
  try {
    if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    /* storage unavailable: the cache is only a convenience */
  }
}

/** The server said this token/account is no longer valid (as opposed to being unreachable). */
function isAuthRejection(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 404);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // True when the profile came from the cache because the server couldn't be reached at startup.
  const [unverified, setUnverified] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .fetchMe()
      .then(setUser)
      .catch((err: unknown) => {
        if (isAuthRejection(err)) {
          setToken(null);
          setUser(null);
        } else {
          // Offline or the server is down: keep the session and use the last known profile.
          setUser(readCachedUser());
          setUnverified(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Keep the cache in step with who's signed in.
  useEffect(() => {
    if (!loading && !unverified) writeCachedUser(user);
  }, [user, loading, unverified]);

  // Once the connection is back, confirm the cached session (and drop it if the server rejects it).
  useEffect(() => {
    if (!unverified) return;
    const verify = () => {
      authApi
        .fetchMe()
        .then((u) => {
          setUser(u);
          setUnverified(false);
        })
        .catch((err: unknown) => {
          if (isAuthRejection(err)) {
            setToken(null);
            setUser(null);
            setUnverified(false);
          }
        });
    };
    const onVisible = () => {
      if (!document.hidden) verify();
    };
    window.addEventListener('online', verify);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', verify);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [unverified]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    if ('token' in res) {
      setToken(res.token);
      setUser(res.user);
      return false;
    }
    return true;
  }, []);

  const authWithGoogle = useCallback(async (credential: string) => {
    const res = await authApi.googleAuth(credential);
    setToken(res.token);
    setUser(res.user);
    track('Google Auth');
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await authApi.register({ email, password, name });
      if ('token' in res) {
        setToken(res.token);
        setUser(res.user);
        track('Signup');
        return false;
      }
      return true;
    },
    []
  );

  const verifyOtp = useCallback(async (email: string, code: string, purpose: OtpPurpose) => {
    const res = await authApi.verifyOtp(email, code, purpose);
    setToken(res.token);
    setUser(res.user);
    if (purpose === 'register') track('Signup');
  }, []);

  const resendOtp = useCallback(async (email: string, purpose: OtpPurpose) => {
    await authApi.resendOtp(email, purpose);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await authApi.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    const res = await authApi.resetPassword(token, password);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        authWithGoogle,
        register,
        verifyOtp,
        resendOtp,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
