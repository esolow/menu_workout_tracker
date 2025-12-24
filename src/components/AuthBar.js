import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthBar.css';

function AuthBar() {
  const { isAuthenticated, user, login, logout, loading, syncStatus } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(email.trim(), password);
    if (!res.success) {
      setError(res.error || 'Failed');
    } else {
      setEmail('');
      setPassword('');
    }
  };

  if (isAuthenticated) {
    const getSyncIcon = () => {
      switch (syncStatus) {
        case 'syncing':
          return '⟳';
        case 'synced':
          return '✓';
        case 'error':
          return '⚠';
        default:
          return '';
      }
    };

    const getSyncClass = () => {
      switch (syncStatus) {
        case 'syncing':
          return 'sync-syncing';
        case 'synced':
          return 'sync-synced';
        case 'error':
          return 'sync-error';
        default:
          return '';
      }
    };

    return (
      <div className="auth-bar">
        <div className="auth-info">
          <div className="auth-email">
            {user?.email}
            {syncStatus !== 'idle' && (
              <span className={`sync-status ${getSyncClass()}`} title={syncStatus}>
                {getSyncIcon()}
              </span>
            )}
          </div>
        </div>
        <button className="auth-logout" onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <form className="auth-bar auth-form" onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? '...' : 'Login'}
      </button>
      {error && <div className="auth-error">{error}</div>}
    </form>
  );
}

export default AuthBar;
