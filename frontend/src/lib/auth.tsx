"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

export const setToken = (token: string) => {
  localStorage.setItem("access_token", token);
};

export const getToken = (): string | null => {
  return localStorage.getItem("access_token");
};

export const removeToken = () => {
  localStorage.removeItem("access_token");
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export type UserRole = "admin" | "sales_manager" | "sales" | "viewer";

export interface User {
  id: string;
  username: string;
  display_name?: string;
  email?: string;
  role: UserRole;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const hasToken = !!localStorage.getItem("access_token");
    if (!loading && !user && !hasToken && pathname !== "/login" && pathname !== "/auth/callback") {
      router.push("/login");
    }
  }, [user, loading, pathname, router]);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        logout();
        return;
      }

      const response = await fetch("/api/v1/accounts/users/me/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
        }
        throw new Error("Failed to fetch user");
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (err) {
      console.error("Failed to refresh user:", err);
      if (err instanceof Error && err.message.includes("401")) {
        logout();
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    setError(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

const roleHierarchy: Record<UserRole, number> = {
  admin: 4,
  sales_manager: 3,
  sales: 2,
  viewer: 1,
};

export function hasPermission(userRole: UserRole | null, requiredRoles: UserRole | UserRole[]): boolean {
  if (!userRole) {
    return false;
  }

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const userLevel = roleHierarchy[userRole];

  return roles.some((role) => roleHierarchy[role] <= userLevel);
}

export function hasAnyRole(userRole: UserRole | null, roles: UserRole[]): boolean {
  if (!userRole) {
    return false;
  }
  return roles.includes(userRole);
}

export function hasAllRoles(userRole: UserRole | null, roles: UserRole[]): boolean {
  if (!userRole) {
    return false;
  }
  return roles.includes(userRole);
}

export interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  fallback = null,
  requireAuth = true,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (requireAuth && !user) {
    return fallback;
  }

  if (allowedRoles && !hasAnyRole(user?.role || null, allowedRoles)) {
    return fallback;
  }

  return <>{children}</>;
}
