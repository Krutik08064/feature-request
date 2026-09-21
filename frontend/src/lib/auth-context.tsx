import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { notify } from "./notify";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<any>;
  verifyEmail: (email: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: (prompt?: string) => void;
  closeAuthModal: () => void;
  authPrompt: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPrompt, setAuthPrompt] = useState<string>("Sign in to upvote and comment");

  const checkAuth = async () => {
    try {
      const userData = await api.get<User>("/api/auth/me");
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  const openAuthModal = (prompt?: string) => {
    if (prompt) setAuthPrompt(prompt);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async (email: string, password: string) => {
    const res = await api.post("/api/auth/login", { email, password });
    setUser(res.user);
    notify.success("Welcome back!", `Logged in as ${res.user.name}`);
    closeAuthModal();
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await api.post("/api/auth/signup", { name, email, password });
    notify.info("Verification code sent", "Check the simulated console or dev-tokens endpoint.");
    return res;
  };

  const verifyEmail = async (email: string, token: string) => {
    const res = await api.post("/api/auth/verify-email", { email, token });
    notify.success("Email verified!", "You can now log in to your account.");
    return res;
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setUser(null);
      notify.info("Logged out", "You have been signed out.");
    }
  };

  const forgotPassword = async (email: string) => {
    await api.post("/api/auth/forgot-password", { email });
    notify.info("Password Reset Requested", "Instructions have been logged to console (simulated email).");
  };

  const resetPassword = async (email: string, token: string, newPassword: string) => {
    await api.post("/api/auth/reset-password", {
      email,
      token,
      new_password: newPassword,
    });
    notify.success("Password Updated", "Your password has been changed. Please log in.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        verifyEmail,
        logout,
        forgotPassword,
        resetPassword,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authPrompt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
