import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { PROTEIN_OPTIONS, CARB_OPTIONS, FAT_OPTIONS } from '../data/foodDatabase';
import { getFavorites, toggleFavorite, getRecentFoods, addToRecent, getFavoritesForSync, mergeFavoritesFromSync } from '../utils/favoritesManager';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { mergeEntries, entriesMapToArray, updateLocalEntry } from '../utils/sync';
import './MenuTracker.css';

const DEFAULT_ALLOWANCE = {
  protein: 5,
  carbs: 5,
  fat: 1,
  freeCalories: 200,
};

function MenuTracker() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [menuData, setMenuData] = useState({ protein: [], carbs: [], fat: [], freeCalories: 0 });
  const [freeCaloriesInput, setFreeCaloriesInput] = useState('');
  const [favorites, setFavorites] = useState(getFavorites());
  const [recentFoods, setRecentFoods] = useState(getRecentFoods());
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [dailyAllowance, setDailyAllowance] = useState(DEFAULT_ALLOWANCE);
  const [menuTemplate, setMenuTemplate] = useState({ protein: [], carbs: [], fat: [] });
  const [dropdownOpen, setDropdownOpen] = useState(null); // 'protein', 'carbs', 'fat', or null
  const dropdownRefs = useRef({});
  const { isAuthenticated, token, setSyncStatus, user } = useAuth();

  // Get user-specific storage key
  const getStorageKey = () => {
    return user?.id ? `menuTrackerData_${user.id}` : 'menuTrackerData';
  };

  // Helpers to load/save local storage
  const loadLocalEntries = () => {
    const storageKey = getStorageKey();
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  };

  const saveLocalEntries = (entries) => {
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(entries));
    const entry = entries[selectedDate];
    const data = entry?.data || entry || { protein: [], carbs: [], fat: [], freeCalories: 0 };
    setMenuData(data);
    setFreeCaloriesInput((data.freeCalories ?? 0).toString());
  };

  const loadSelectedDate = (entries) => {
    const entry = entries[selectedDate];
    const data = entry?.data || entry || { protein: [], carbs: [], fat: [], freeCalories: 0 };
    setMenuData(data);
    setFreeCaloriesInput((data.freeCalories ?? 0).toString());
  };

  // Initial load from local
  useEffect(() => {
    const entries = loadLocalEntries();
    // Filter out template entries (they're not consumed foods)
    const consumedEntries = Object.keys(entries).reduce((acc, key) => {
      if (key !== 'template') {
        acc[key] = entries[key];
      }
      return acc;
    }, {});
    loadSelectedDate(consumedEntries);
    setFavorites(getFavorites());
    setRecentFoods(getRecentFoods());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Fetch user allowances
  useEffect(() => {
    const fetchAllowances = async () => {
      if (!isAuthenticated || !token) {
        setDailyAllowance(DEFAULT_ALLOWANCE);
        return;
      }
      try {
        const res = await api.fetchAllowances(token);
        setDailyAllowance(res.allowances || DEFAULT_ALLOWANCE);
      } catch (err) {
        console.error('Failed to fetch allowances:', err);
        setDailyAllowance(DEFAULT_ALLOWANCE);
      }
    };
    fetchAllowances();
  }, [isAuthenticated, token, user?.id]);

  // Fetch menu template (available foods)
  useEffect(() => {
    const fetchMenuTemplate = async () => {
      if (!isAuthenticated || !token) {
        // Fallback to hardcoded options if not authenticated
        setMenuTemplate({
          protein: PROTEIN_OPTIONS,
          carbs: CARB_OPTIONS,
          fat: FAT_OPTIONS,
        });
        return;
      }
      try {
        const res = await api.fetchMenuTemplate(token);
        const template = res.template || { protein: [], carbs: [], fat: [] };
        // If template is empty, fallback to hardcoded options
        if (template.protein.length === 0 && template.carbs.length === 0 && template.fat.length === 0) {
          setMenuTemplate({
            protein: PROTEIN_OPTIONS,
            carbs: CARB_OPTIONS,
            fat: FAT_OPTIONS,
          });
        } else {
          setMenuTemplate(template);
        }
      } catch (err) {
        console.error('Failed to fetch menu template:', err);
        // Fallback to hardcoded options on error
        setMenuTemplate({
          protein: PROTEIN_OPTIONS,
          carbs: CARB_OPTIONS,
          fat: FAT_OPTIONS,
        });
      }
    };
    fetchMenuTemplate();
  }, [isAuthenticated, token, user?.id]);

  // Sync with server when authenticated
  useEffect(() => {
    const syncFromServer = async () => {
      if (!isAuthenticated || !token) return;
      setSyncStatus('syncing');
      try {
        // fetch menu entries
        const res = await api.fetchMenu(token);
        const serverEntries = res.entries || [];
        // Filter out template entries (they're not consumed foods)
        const consumedEntries = serverEntries.filter(entry => entry.dayKey !== 'template');
        const local = loadLocalEntries();
        // Filter out template from local storage too
        const localConsumed = Object.keys(local).reduce((acc, key) => {
          if (key !== 'template') {
            acc[key] = local[key];
          }
          return acc;
        }, {});
        // On login/sync, prioritize server data (admin edits should take precedence)
        // Check if this is a fresh login by seeing if local storage is empty or from different user
        const isFreshLogin = Object.keys(localConsumed).length === 0;
        const merged = mergeEntries(localConsumed, consumedEntries, isFreshLogin);
        saveLocalEntries(merged);
        loadSelectedDate(merged);
        // favorites
        const favRes = await api.fetchFavorites(token);
        mergeFavoritesFromSync(favRes.favorites || []);
        setFavorites(getFavorites());
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } catch (err) {
        console.error('Sync menu failed', err);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    };
    syncFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  // Save data to local and server
  const saveData = async (newMenuData) => {
    const updatedEntries = updateLocalEntry(loadLocalEntries(), selectedDate, newMenuData);
    saveLocalEntries(updatedEntries);

    if (isAuthenticated && token) {
      setSyncStatus('syncing');
      try {
        const entriesArray = entriesMapToArray(updatedEntries);
        await api.syncMenu(entriesArray, token);
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 1500);
      } catch (err) {
        console.error('Sync menu save failed', err);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    }
  };

  const addFoodItem = (category, foodItem) => {
    const newMenuData = {
      ...menuData,
      [category]: [...menuData[category], { ...foodItem, id: Date.now() }],
    };
    saveData(newMenuData);
    setDropdownOpen(null);
    // Add to recent items
    addToRecent(category, foodItem);
    setRecentFoods(getRecentFoods());
  };

  const removeFoodItem = (category, itemId) => {
    const newMenuData = {
      ...menuData,
      [category]: menuData[category].filter(item => item.id !== itemId),
    };
    saveData(newMenuData);
  };

  const updateFreeCalories = (value) => {
    const calories = parseInt(value) || 0;
    const newMenuData = {
      ...menuData,
      freeCalories: calories,
    };
    saveData(newMenuData);
    setFreeCaloriesInput(value);
  };

  const getRemaining = (category) => {
    const consumed = menuData[category].length;
    return dailyAllowance[category] - consumed;
  };

  const handleToggleFavorite = (category, foodItem, e) => {
    e.stopPropagation();
    const newFavs = toggleFavorite(category, foodItem);
    setFavorites(newFavs);
    if (isAuthenticated && token) {
      setSyncStatus('syncing');
      api.syncFavorites(getFavoritesForSync(), token)
        .then(() => {
          setSyncStatus('synced');
          setTimeout(() => setSyncStatus('idle'), 1500);
        })
        .catch((err) => {
          console.error('Sync favorites failed', err);
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 3000);
        });
    }
  };

  const quickAddFromFavorites = (category, foodItem) => {
    if (getRemaining(category) > 0) {
      addFoodItem(category, foodItem);
    }
  };

  const renderFoodList = (category) => {
    return (
      <div className="food-list">
        {menuData[category].map((item) => (
          <div key={item.id} className="food-item">
            <div className="food-item-info">
              <span className="food-name">{item.nameEn || item.name}</span>
              <span className="food-amount">{item.amountEn || item.amount}</span>
            </div>
            <button
              className="remove-button"
              onClick={() => removeFoodItem(category, item.id)}
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
        {menuData[category].length === 0 && (
          <div className="empty-state">No items added yet</div>
        )}
      </div>
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen) {
        const ref = dropdownRefs.current[dropdownOpen];
        if (ref && !ref.contains(event.target)) {
          setDropdownOpen(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const toggleDropdown = (category) => {
    console.log('Toggle dropdown:', category, 'Current:', dropdownOpen);
    setDropdownOpen(dropdownOpen === category ? null : category);
  };

  const getAvailableFoods = (category) => {
    const foods = menuTemplate[category] || [];
    console.log(`Available foods for ${category}:`, foods.length, foods);
    console.log('Menu template state:', menuTemplate);
    // If no foods in template, use hardcoded options as fallback
    if (foods.length === 0) {
      console.log(`No foods in template for ${category}, using fallback`);
      if (category === 'protein') return PROTEIN_OPTIONS;
      if (category === 'carbs') return CARB_OPTIONS;
      if (category === 'fat') return FAT_OPTIONS;
    }
    return foods;
  };

  return (
    <div className="menu-tracker">
      <div className="date-selector">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="date-input"
        />
      </div>

      {/* Quick Add Section */}
      <section className="menu-section quick-add-section">
        <div className="section-header">
          <h2>Quick Add</h2>
          <button
            className="toggle-quick-add"
            onClick={() => setShowQuickAdd(!showQuickAdd)}
          >
            {showQuickAdd ? '▼' : '▶'}
          </button>
        </div>
        {showQuickAdd && (
          <div className="quick-add-content">
            {['protein', 'carbs', 'fat'].map((category) => {
              const categoryFavorites = favorites[category] || [];
              const categoryRecent = recentFoods[category] || [];
              const quickItems = categoryFavorites.length > 0 
                ? categoryFavorites 
                : categoryRecent.slice(0, 3); // Show recent if no favorites
              
              if (quickItems.length === 0) return null;
              
              return (
                <div key={category} className="quick-add-category">
                  <div className="quick-add-category-label">
                    {category === 'protein' ? 'Protein' : category === 'carbs' ? 'Carbs' : 'Fat'}
                  </div>
                  <div className="quick-add-items">
                    {quickItems.map((item) => (
                      <button
                        key={item.id}
                        className="quick-add-item"
                        onClick={() => quickAddFromFavorites(category, item)}
                        disabled={getRemaining(category) <= 0}
                      >
                        <span className="quick-add-item-name">
                          {item.nameEn || item.name}
                        </span>
                        {categoryFavorites.some(f => f.id === item.id) && (
                          <span className="favorite-badge">★</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {favorites.protein.length === 0 && 
             favorites.carbs.length === 0 && 
             favorites.fat.length === 0 && 
             recentFoods.protein.length === 0 &&
             recentFoods.carbs.length === 0 &&
             recentFoods.fat.length === 0 && (
              <div className="quick-add-empty">
                No favorites or recent items yet. Add foods to see them here!
              </div>
            )}
          </div>
        )}
      </section>

      {/* Protein Section */}
      <section className="menu-section">
        <div className="section-header">
          <h2>Protein</h2>
          <div className="counter">
            <span className={getRemaining('protein') >= 0 ? 'remaining' : 'over-limit'}>
              {menuData.protein.length} / {dailyAllowance.protein}
            </span>
          </div>
        </div>
        {renderFoodList('protein')}
        <div className="dropdown-container" ref={el => dropdownRefs.current['protein'] = el}>
          <button
            className="add-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Add Protein button clicked');
              toggleDropdown('protein');
            }}
            disabled={getRemaining('protein') <= 0}
          >
            + Add Protein
          </button>
          {dropdownOpen === 'protein' && (
            <FoodDropdown
              category="protein"
              options={getAvailableFoods('protein')}
              favorites={favorites.protein}
              onSelect={(item) => {
                console.log('Food selected:', item);
                addFoodItem('protein', item);
              }}
              onToggleFavorite={(item, e) => {
                handleToggleFavorite('protein', item, e);
              }}
            />
          )}
        </div>
      </section>

      {/* Carbs Section */}
      <section className="menu-section">
        <div className="section-header">
          <h2>Carbohydrates</h2>
          <div className="counter">
            <span className={getRemaining('carbs') >= 0 ? 'remaining' : 'over-limit'}>
              {menuData.carbs.length} / {dailyAllowance.carbs}
            </span>
          </div>
        </div>
        {renderFoodList('carbs')}
        <div className="dropdown-container" ref={el => dropdownRefs.current['carbs'] = el}>
          <button
            className="add-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Add Carbs button clicked');
              toggleDropdown('carbs');
            }}
            disabled={getRemaining('carbs') <= 0}
          >
            + Add Carbs
          </button>
          {dropdownOpen === 'carbs' && (
            <FoodDropdown
              category="carbs"
              options={getAvailableFoods('carbs')}
              favorites={favorites.carbs}
              onSelect={(item) => {
                console.log('Food selected:', item);
                addFoodItem('carbs', item);
              }}
              onToggleFavorite={(item, e) => {
                handleToggleFavorite('carbs', item, e);
              }}
            />
          )}
        </div>
      </section>

      {/* Fat Section */}
      <section className="menu-section">
        <div className="section-header">
          <h2>Fat</h2>
          <div className="counter">
            <span className={getRemaining('fat') >= 0 ? 'remaining' : 'over-limit'}>
              {menuData.fat.length} / {dailyAllowance.fat}
            </span>
          </div>
        </div>
        {renderFoodList('fat')}
        <div className="dropdown-container" ref={el => dropdownRefs.current['fat'] = el}>
          <button
            className="add-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Add Fat button clicked');
              toggleDropdown('fat');
            }}
            disabled={getRemaining('fat') <= 0}
          >
            + Add Fat
          </button>
          {dropdownOpen === 'fat' && (
            <FoodDropdown
              category="fat"
              options={getAvailableFoods('fat')}
              favorites={favorites.fat}
              onSelect={(item) => {
                console.log('Food selected:', item);
                addFoodItem('fat', item);
              }}
              onToggleFavorite={(item, e) => {
                handleToggleFavorite('fat', item, e);
              }}
            />
          )}
        </div>
      </section>

      {/* Free Calories Section */}
      <section className="menu-section">
        <div className="section-header">
          <h2>Free Calories</h2>
          <div className="counter">
            <span className={menuData.freeCalories <= dailyAllowance.freeCalories ? 'remaining' : 'over-limit'}>
              {menuData.freeCalories} / {dailyAllowance.freeCalories}
            </span>
          </div>
        </div>
        <div className="free-calories-input">
          <input
            type="number"
            value={freeCaloriesInput}
            onChange={(e) => {
              setFreeCaloriesInput(e.target.value);
              updateFreeCalories(e.target.value);
            }}
            placeholder="Enter calories"
            className="calories-input"
            min="0"
          />
          <span className="calories-unit">kcal</span>
        </div>
      </section>
    </div>
  );
}

function FoodDropdown({ category, options, favorites = [], onSelect, onToggleFavorite }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(
    (item) =>
      (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.nameEn && item.nameEn.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Sort: favorites first, then alphabetically
  const sortedOptions = [...filteredOptions].sort((a, b) => {
    const aIsFavorite = favorites.some(f => f.id === a.id);
    const bIsFavorite = favorites.some(f => f.id === b.id);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return (a.nameEn || a.name || '').localeCompare(b.nameEn || b.name || '');
  });

  return (
    <div className="food-dropdown">
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="dropdown-search-input"
        autoFocus
      />
      <div className="food-dropdown-list">
        {sortedOptions.length > 0 ? (
          sortedOptions.map((item) => {
            const isFav = favorites.some(f => f.id === item.id);
            return (
              <button
                key={item.id}
                className={`food-dropdown-item ${isFav ? 'favorite' : ''}`}
                onClick={() => onSelect(item)}
              >
                <div className="dropdown-item-content">
                  <div className="dropdown-item-name">{item.nameEn || item.name}</div>
                  {(item.amountEn || item.amount) && (
                    <div className="dropdown-item-amount">{item.amountEn || item.amount}</div>
                  )}
                </div>
                <button
                  className={`dropdown-favorite-button ${isFav ? 'active' : ''}`}
                  onClick={(e) => onToggleFavorite(item, e)}
                  aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  ★
                </button>
              </button>
            );
          })
        ) : (
          <div className="dropdown-empty">No foods available</div>
        )}
      </div>
    </div>
  );
}

export default MenuTracker;
