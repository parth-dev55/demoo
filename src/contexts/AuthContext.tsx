import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'farmer' | 'expert' | 'gov_officer' | 'researcher' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getUserIdFromEmail = (email: string): string => {
  return 'usr_' + email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking session on mount
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const storedUser = localStorage.getItem('agrigpt_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          // Ensure deterministic user ID based on email
          if (parsed && parsed.email) {
            parsed.id = getUserIdFromEmail(parsed.email);
            localStorage.setItem('agrigpt_user', JSON.stringify(parsed));
          }
          setUser(parsed);
        }
      } catch (error) {
        console.error("Session check failed", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const userId = getUserIdFromEmail(email);
    const mockUser: User = {
      id: userId,
      email,
      name: email.split('@')[0],
      role: 'farmer'
    };
    
    setUser(mockUser);
    localStorage.setItem('agrigpt_user', JSON.stringify(mockUser));
    setIsLoading(false);
  };

  const loginWithGoogle = async () => {
    await login('demo.user@gmail.com');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('agrigpt_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
