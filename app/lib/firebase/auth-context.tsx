/**
 * Firebase 认证上下文
 *
 * 提供用户登录/登出状态管理，支持 GitHub 和 Google 登录
 */

"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  signInWithGithub,
  signInWithGoogle,
  signOut,
  onAuthChange,
} from "../firebase/config";
import type { User } from "firebase/auth";

interface FirebaseAuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: "github" | "google";
}

interface AuthContextType {
  user: FirebaseAuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (provider: "github" | "google") => Promise<void>;
  loginWithGithub: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const defaultValue: AuthContextType = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  loginWithGithub: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  refresh: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从 providerData 获取登录方式
  const getProviderInfo = (firebaseUser: User): "github" | "google" => {
    const providerData = firebaseUser.providerData;
    for (const info of providerData) {
      if (info.providerId === "github.com") return "github";
      if (info.providerId === "google.com") return "google";
    }
    return "github"; // 默认
  };

  const refresh = useCallback(async () => {
    setIsLoading(true);
    // 认证状态由 onAuthChange 处理
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser: User | null) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          provider: getProviderInfo(firebaseUser),
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (provider: "github" | "google") => {
    try {
      setIsLoading(true);
      if (provider === "github") {
        await signInWithGithub();
      } else {
        await signInWithGoogle();
      }
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoading(false);
      throw error;
    }
  }, []);

  const loginWithGithub = useCallback(async () => {
    await login("github");
  }, [login]);

  const loginWithGoogle = useCallback(async () => {
    await login("google");
  }, [login]);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await signOut();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGithub,
        loginWithGoogle,
        logout,
        refresh,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
