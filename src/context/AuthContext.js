import React, { createContext, useContext, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('authToken') || null);
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const isAuthenticated = Boolean(token);

  // Clear previous user's data when switching users
  const clearPreviousUserData = (previousUserId) => {
    if (previousUserId) {
      // Clear user-specific localStorage keys
      localStorage.removeItem(`menuTrackerData_${previousUserId}`);
      localStorage.removeItem(`workoutTrackerData_${previousUserId}`);
      localStorage.removeItem(`foodFavorites_${previousUserId}`);
      localStorage.removeItem(`recentFoods_${previousUserId}`);
    }
    // Also clear generic keys (for backward compatibility)
    localStorage.removeItem('menuTrackerData');
    localStorage.removeItem('workoutTrackerData');
    localStorage.removeItem('foodFavorites');
    localStorage.removeItem('recentFoods');
  };

  const saveAuth = (nextToken, nextUser) => {
    const previousUserId = user?.id;
    const newUserId = nextUser?.id;
    
    // If switching users, clear previous user's data
    if (previousUserId && newUserId && previousUserId !== newUserId) {
      clearPreviousUserData(previousUserId);
    }
    
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken) {
      localStorage.setItem('authToken', nextToken);
      localStorage.setItem('authUser', JSON.stringify(nextUser));
    } else {
      // On logout, clear all user data
      if (previousUserId) {
        clearPreviousUserData(previousUserId);
      }
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      saveAuth(res.token, res.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.signup(email, password);
      saveAuth(res.token, res.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    saveAuth(null, null);
  };

  const isAdmin = user?.role === 'admin';

  const value = {
    token,
    user,
    loading,
    isAuthenticated,
    isAdmin,
    login,
    signup,
    logout,
    apiBase: api.baseUrl,
    syncStatus,
    setSyncStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
