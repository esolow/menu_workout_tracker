const FAVORITES_STORAGE_KEY = 'foodFavorites';
const RECENT_STORAGE_KEY = 'recentFoods';
const MAX_RECENT_ITEMS = 10;

const now = () => new Date().toISOString();

// ---------- Local favorites ----------
export const getFavorites = () => {
  const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
  return saved ? JSON.parse(saved) : { protein: [], carbs: [], fat: [] };
};

export const saveFavorites = (favorites) => {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
};

export const toggleFavorite = (category, foodItem) => {
  const favorites = getFavorites();
  const list = favorites[category] || [];
  const idx = list.findIndex((f) => f.id === foodItem.id);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push({ ...foodItem, updatedAt: now() });
  }
  favorites[category] = list;
  saveFavorites(favorites);
  return favorites;
};

export const isFavorite = (category, foodItemId) => {
  const favorites = getFavorites();
  const list = favorites[category] || [];
  return list.some((f) => f.id === foodItemId);
};

// ---------- Sync helpers ----------
export const getFavoritesForSync = () => {
  const favorites = getFavorites();
  const arr = [];
  Object.keys(favorites).forEach((category) => {
    (favorites[category] || []).forEach((item) => {
      arr.push({
        category,
        itemId: item.id,
        item,
        updatedAt: item.updatedAt || now(),
      });
    });
  });
  return arr;
};

export const mergeFavoritesFromSync = (serverFavorites = []) => {
  const local = getFavorites();
  const merged = { protein: [], carbs: [], fat: [] };
  const map = new Map();

  Object.keys(local).forEach((cat) => {
    (local[cat] || []).forEach((item) => {
      const key = `${cat}-${item.id}`;
      map.set(key, { ...item, category: cat, updatedAt: item.updatedAt || '1970-01-01' });
    });
  });

  serverFavorites.forEach((fav) => {
    const key = `${fav.category}-${fav.itemId}`;
    const existing = map.get(key);
    if (!existing || new Date(fav.updatedAt) > new Date(existing.updatedAt)) {
      map.set(key, { ...(fav.item || {}), id: fav.itemId, category: fav.category, updatedAt: fav.updatedAt });
    }
  });

  for (const val of map.values()) {
    const { category, ...rest } = val;
    merged[category] = merged[category] || [];
    merged[category].push(rest);
  }

  saveFavorites(merged);
  return merged;
};

// ---------- Recent foods (local only) ----------
export const getRecentFoods = () => {
  const saved = localStorage.getItem(RECENT_STORAGE_KEY);
  return saved ? JSON.parse(saved) : { protein: [], carbs: [], fat: [] };
};

export const addToRecent = (category, foodItem) => {
  const recent = getRecentFoods();
  const list = recent[category] || [];
  const idx = list.findIndex((i) => i.id === foodItem.id);
  if (idx >= 0) list.splice(idx, 1);
  list.unshift(foodItem);
  if (list.length > MAX_RECENT_ITEMS) list.pop();
  recent[category] = list;
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent));
  return recent;
};
