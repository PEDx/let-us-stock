"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { storage } from "./storage";

export interface AuthUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      
      if (data.user) {
        // 用户已登录，设置远程存储
        if (!storage.isRemoteConnected()) {
          storage.setRemote();
        }
        setUser(data.user);
      } else {
        // 用户未登录，清除远程存储
        if (storage.isRemoteConnected()) {
          storage.clearRemote();
        }
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      // 出错时也清除远程存储
      if (storage.isRemoteConnected()) {
        storage.clearRemote();
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(() => {
    window.location.href = "/api/auth/github";
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/auth/logout";
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
