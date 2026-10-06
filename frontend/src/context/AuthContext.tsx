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
import { getToken, setToken } from '../api/client';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .fetchMe()
      .then(setUser)
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

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
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await authApi.register({ email, password, name });
      if ('token' in res) {
        setToken(res.token);
        setUser(res.user);
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
