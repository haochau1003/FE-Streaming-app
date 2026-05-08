import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, getProfile, loginUser, logoutUser, registerUser } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const apiKey = await AsyncStorage.getItem('api_key');
      if (apiKey) {
        const profile = await getProfile();
        setUser(profile);
      }
    } catch (e) {
      await AsyncStorage.removeItem('api_key');
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: any) => {
    const res = await loginUser(data);
    if (res.api_key) {
      await AsyncStorage.setItem('api_key', res.api_key);
    }
    setUser(res);
  };

  const register = async (data: any) => {
    const res = await registerUser(data);
    if (res.api_key) {
      await AsyncStorage.setItem('api_key', res.api_key);
    }
    setUser(res);
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      // ignore errors during logout API call
    }
    await AsyncStorage.removeItem('api_key');
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
