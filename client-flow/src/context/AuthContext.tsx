import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiService } from '../crm/api';
import { useNavigate } from '@tanstack/react-router';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  preferences: any;
  updatePreferences: (newPrefs: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<any>({ theme: 'light', accentColor: '#2563eb', density: 'comfortable' });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const applyPreferences = (prefs: any) => {
    if (!prefs) return;
    const root = document.documentElement;
    
    // Theme
    if (prefs.theme === 'dark') {
      root.classList.add('dark');
    } else if (prefs.theme === 'light') {
      root.classList.remove('dark');
    } else if (prefs.theme === 'system') {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Accent
    const accentMap: Record<string, string> = {
      "#2563eb": "0.551 0.22 264.364",
      "#7c3aed": "0.55 0.26 280",
      "#16a34a": "0.62 0.19 145",
      "#f97316": "0.65 0.2 45",
      "#ef4444": "0.6 0.2 25",
      "#0ea5e9": "0.65 0.15 240"
    };
    if (prefs.accentColor && accentMap[prefs.accentColor]) {
      root.style.setProperty('--primary', `oklch(${accentMap[prefs.accentColor]})`);
      root.style.setProperty('--ring', `oklch(${accentMap[prefs.accentColor]})`);
      // Update sidebar primary as well
      root.style.setProperty('--sidebar-primary', `oklch(${accentMap[prefs.accentColor]})`);
    }

    // Density
    if (prefs.density === 'compact') {
      root.style.fontSize = '14px';
    } else {
      root.style.fontSize = ''; // default 16px
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('crm_jwt_token');
      const currentUser = ApiService.getCurrentUser();
      if (token && currentUser) {
        setUser(currentUser);
        try {
          const freshUser = await ApiService.getMe();
          setUser(freshUser);
          localStorage.setItem('crm_user', JSON.stringify(freshUser));
          
          const prefs = await ApiService.getPreferences();
          setPreferences(prefs);
          applyPreferences(prefs);
        } catch (err) {
          // Token is expired/invalid — clear it silently
          if ((err as any)?.response?.status === 401) {
            ApiService.logout();
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const updatePreferences = async (newPrefs: any) => {
    try {
      const updated = await ApiService.updatePreferences(newPrefs);
      setPreferences(updated);
      applyPreferences(updated);
    } catch (err) {
      console.error("Failed to update preferences", err);
    }
  };

  const login = async (email: string, pass: string) => {
    const { user } = await ApiService.login(email, pass);
    setUser(user);
    
    // Fetch and apply preferences on login
    const prefs = await ApiService.getPreferences();
    setPreferences(prefs);
    applyPreferences(prefs);
    
    navigate({ to: '/dashboard' });
  };

  const logout = () => {
    ApiService.logout();
    setUser(null);
    setPreferences({ theme: 'light', accentColor: '#2563eb', density: 'comfortable' });
    applyPreferences({ theme: 'light', accentColor: '#2563eb', density: 'comfortable' });
    navigate({ to: '/login' });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading, preferences, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
