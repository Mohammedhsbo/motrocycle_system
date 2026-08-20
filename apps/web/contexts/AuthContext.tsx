"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient, setAuthToken, getAuthToken } from "@/lib/api-client";
import type { CurrentUserResponse, LoginRequest, LoginResponse } from "@motorcycle-system/shared-types";

interface AuthContextType {
  user: CurrentUserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const userData = await apiClient.get<CurrentUserResponse>("/auth/me");
      
      // Only allow customers (role name = "customer")
      if (userData.role.name === "customer") {
        setUser(userData);
      } else {
        // Not a customer, clear auth
        setAuthToken(null);
        setUser(null);
      }
    } catch (error) {
      setAuthToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (credentials: LoginRequest) => {
    const response = await apiClient.post<LoginResponse>("/auth/login", credentials);
    
    // Only allow customers
    if (response.user.role.name !== "customer") {
      throw new Error("Invalid user type");
    }

    setAuthToken(response.accessToken);
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      // Ignore logout errors
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
