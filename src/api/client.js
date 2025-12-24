const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true', // Bypass ngrok warning page
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  signup: (email, password) => request('/auth/signup', { method: 'POST', body: { email, password } }),
  fetchMenu: (token) => request('/sync/menu', { token }),
  syncMenu: (entries, token) => request('/sync/menu', { method: 'POST', token, body: { entries } }),
  fetchMenuTemplate: (token) => request('/sync/menu-template', { token }),
  fetchWorkouts: (token) => request('/sync/workouts', { token }),
  syncWorkouts: (entries, token) => request('/sync/workouts', { method: 'POST', token, body: { entries } }),
  fetchFavorites: (token) => request('/sync/favorites', { token }),
  syncFavorites: (favorites, token) => request('/sync/favorites', { method: 'POST', token, body: { favorites } }),
  fetchAllowances: (token) => request('/sync/allowances', { token }),
  // Admin endpoints
  admin: {
    getUsers: (token) => request('/admin/users', { token }),
    createUser: (email, password, role, token) => request('/admin/users', { method: 'POST', token, body: { email, password, role } }),
    deleteUser: (userId, token) => request(`/admin/users/${userId}`, { method: 'DELETE', token }),
    getUserMenu: (userId, token) => request(`/admin/users/${userId}/menu`, { token }),
    updateUserMenu: (userId, entries, token) => request(`/admin/users/${userId}/menu`, { method: 'POST', token, body: { entries } }),
    getUserWorkouts: (userId, token) => request(`/admin/users/${userId}/workouts`, { token }),
    updateUserWorkouts: (userId, entries, token) => request(`/admin/users/${userId}/workouts`, { method: 'POST', token, body: { entries } }),
    getUserAllowances: (userId, token) => request(`/admin/users/${userId}/allowances`, { token }),
    updateUserAllowances: (userId, allowances, token) => request(`/admin/users/${userId}/allowances`, { method: 'POST', token, body: allowances }),
    getUserWorkoutSchedule: (userId, token) => request(`/admin/users/${userId}/workout-schedule`, { token }),
    updateUserWorkoutSchedule: (userId, schedule, token) => request(`/admin/users/${userId}/workout-schedule`, { method: 'POST', token, body: schedule }),
    // Menu Templates
    getMenuTemplates: (token) => request('/admin/menu-templates', { token }),
    getMenuTemplate: (templateId, token) => request(`/admin/menu-templates/${templateId}`, { token }),
    createMenuTemplate: (template, token) => request('/admin/menu-templates', { method: 'POST', token, body: template }),
    updateMenuTemplate: (templateId, template, token) => request(`/admin/menu-templates/${templateId}`, { method: 'PUT', token, body: template }),
    deleteMenuTemplate: (templateId, token) => request(`/admin/menu-templates/${templateId}`, { method: 'DELETE', token }),
    getUserMenuTemplate: (userId, token) => request(`/admin/users/${userId}/menu-template`, { token }),
    setUserMenuTemplate: (userId, templateId, token) => request(`/admin/users/${userId}/menu-template`, { method: 'POST', token, body: { templateId } }),
  },
  fetchWorkoutSchedule: (token) => request('/sync/workout-schedule', { token }),
  baseUrl: API_BASE,
};

