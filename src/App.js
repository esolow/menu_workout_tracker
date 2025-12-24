import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import './App.css';
import MenuTracker from './components/MenuTracker';
import WorkoutTracker from './components/WorkoutTracker';
import Exercises from './components/Exercises';
import Stats from './components/Stats';
import AdminPanel from './components/AdminPanel';
import AuthBar from './components/AuthBar';
import { useAuth } from './context/AuthContext';

function App() {
  const { isAuthenticated, isAdmin } = useAuth();

  const getDefaultTab = () => (isAdmin ? 'exercises' : 'menu');
  const [activeTab, setActiveTab] = useState(getDefaultTab);

  useEffect(() => {
    const allowedTabs = isAdmin
      ? ['exercises', 'stats', 'admin']
      : ['menu', 'workout', 'stats'];
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [isAdmin, activeTab]);

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="login-screen">
        <div className="login-container">
          <div className="login-header">
            <h1>Menu & Workout Tracker</h1>
            <p className="login-subtitle">Track your daily menu and weekly workouts</p>
          </div>
          <div className="login-form-wrapper">
            <AuthBar />
            <p className="login-hint">Login to sync across devices</p>
          </div>
        </div>
      </div>
    );
  }

  // Show main app if authenticated
  return (
    <div className="App">
      <header className="app-header">
        <h1>Menu & Workout Tracker</h1>
        <div className="date-display">
          {format(new Date(), 'EEEE, MMMM d')}
        </div>
        <div className="auth-bar-wrapper">
          <AuthBar />
        </div>
      </header>

      <nav className="tab-navigation">
        {isAdmin ? (
          <>
            <button
              className={`tab-button ${activeTab === 'exercises' ? 'active' : ''}`}
              onClick={() => setActiveTab('exercises')}
            >
              Exercises
            </button>
            <button
              className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              Stats
            </button>
            <button
              className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin
            </button>
          </>
        ) : (
          <>
            <button
              className={`tab-button ${activeTab === 'menu' ? 'active' : ''}`}
              onClick={() => setActiveTab('menu')}
            >
              Menu
            </button>
            <button
              className={`tab-button ${activeTab === 'workout' ? 'active' : ''}`}
              onClick={() => setActiveTab('workout')}
            >
              Workouts
            </button>
            <button
              className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              Stats
            </button>
          </>
        )}
      </nav>

      <main className="app-content">
        {!isAdmin && activeTab === 'menu' && <MenuTracker />}
        {!isAdmin && activeTab === 'workout' && <WorkoutTracker />}
        {isAdmin && activeTab === 'exercises' && <Exercises />}
        {activeTab === 'stats' && <Stats />}
        {isAdmin && activeTab === 'admin' && <AdminPanel />}
      </main>
    </div>
  );
}

export default App;
