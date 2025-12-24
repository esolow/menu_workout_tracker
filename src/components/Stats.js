import React, { useState, useEffect } from 'react';
import {
  calculateMenuStreak,
  calculateWorkoutStreak,
  calculateMenuStats,
  calculateWorkoutStats,
  getMostUsedFoods,
} from '../utils/statsCalculator';
import './Stats.css';

// Constants (should match MenuTracker and WorkoutTracker)
const DAILY_ALLOWANCE = {
  protein: 5,
  carbs: 5,
  fat: 1,
  freeCalories: 200,
};
const WEEKLY_GOALS = {
  muscle: 4,
  cardio: 3,
};

function Stats() {
  const [period, setPeriod] = useState('week');
  const [menuStreak, setMenuStreak] = useState(0);
  const [workoutStreak, setWorkoutStreak] = useState(0);
  const [menuStats, setMenuStats] = useState(null);
  const [workoutStats, setWorkoutStats] = useState(null);
  const [mostUsedFoods, setMostUsedFoods] = useState([]);

  useEffect(() => {
    // Recalculate when period changes or data might have changed
    const updateStats = () => {
      setMenuStreak(calculateMenuStreak());
      setWorkoutStreak(calculateWorkoutStreak());
      setMenuStats(calculateMenuStats(period));
      setWorkoutStats(calculateWorkoutStats(period));
      setMostUsedFoods(getMostUsedFoods(period));
    };

    updateStats();

    // Update stats when localStorage changes (user adds data)
    const handleStorageChange = () => {
      updateStats();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically (for same-tab updates)
    const interval = setInterval(updateStats, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [period]);

  if (!menuStats || !workoutStats) {
    return <div className="stats-container">Loading...</div>;
  }

  const periodLabels = {
    week: 'This Week',
    month: 'Last 30 Days',
    all: 'All Time',
  };

  return (
    <div className="stats-container">
      <div className="stats-header">
        <h2>Progress & Statistics</h2>
        <div className="period-selector">
          {['week', 'month', 'all'].map((p) => (
            <button
              key={p}
              className={`period-button ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card streak-card">
          <div className="card-label">Menu Streak</div>
          <div className="card-value">{menuStreak} days</div>
          <div className="card-icon">🔥</div>
        </div>
        <div className="summary-card streak-card">
          <div className="card-label">Workout Streak</div>
          <div className="card-value">{workoutStreak} weeks</div>
          <div className="card-icon">💪</div>
        </div>
        <div className="summary-card">
          <div className="card-label">Menu Completion</div>
          <div className="card-value">{menuStats.completionRate}%</div>
          <div className="card-subtext">
            {menuStats.completedDays} / {menuStats.totalDays} days
          </div>
        </div>
        <div className="summary-card">
          <div className="card-label">Workout Completion</div>
          <div className="card-value">{workoutStats.completionRate}%</div>
          <div className="card-subtext">
            {workoutStats.completedWeeks} / {workoutStats.totalWeeks} weeks
          </div>
        </div>
      </div>

      {/* Menu Statistics Section */}
      <section className="stats-section">
        <h3 className="section-title">Menu Statistics</h3>
        
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Avg Protein/Day</div>
            <div className="stat-value">{menuStats.avgProtein}</div>
            <div className="stat-goal">Goal: {DAILY_ALLOWANCE.protein}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Avg Carbs/Day</div>
            <div className="stat-value">{menuStats.avgCarbs}</div>
            <div className="stat-goal">Goal: {DAILY_ALLOWANCE.carbs}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Avg Fat/Day</div>
            <div className="stat-value">{menuStats.avgFat}</div>
            <div className="stat-goal">Goal: {DAILY_ALLOWANCE.fat}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Avg Free Calories</div>
            <div className="stat-value">{menuStats.avgFreeCalories}</div>
            <div className="stat-goal">Limit: {DAILY_ALLOWANCE.freeCalories}</div>
          </div>
        </div>

        {/* Weekly Completion Chart */}
        {menuStats.weeklyData.length > 0 && (
          <div className="chart-container">
            <h4 className="chart-title">Weekly Completion</h4>
            <div className="bar-chart">
              {menuStats.weeklyData.map((week, index) => (
                <div key={index} className="chart-bar-wrapper">
                  <div className="chart-bar-label">{week.weekStart}</div>
                  <div className="chart-bar-container">
                    <div
                      className="chart-bar"
                      style={{
                        width: `${(week.completion / week.total) * 100}%`,
                      }}
                    >
                      <span className="chart-bar-value">
                        {week.completion}/{week.total}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most Used Foods */}
        {mostUsedFoods.length > 0 && (
          <div className="food-list-section">
            <h4 className="chart-title">Most Used Foods</h4>
            <div className="food-list">
              {mostUsedFoods.map((food, index) => (
                <div key={index} className="food-list-item">
                  <span className="food-rank">#{index + 1}</span>
                  <span className="food-name">{food.name}</span>
                  <span className="food-count">{food.count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Workout Statistics Section */}
      <section className="stats-section">
        <h3 className="section-title">Workout Statistics</h3>
        
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Total Muscle</div>
            <div className="stat-value">{workoutStats.totalMuscle}</div>
            <div className="stat-goal">Goal: {WEEKLY_GOALS.muscle}/week</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Cardio</div>
            <div className="stat-value">{workoutStats.totalCardio}</div>
            <div className="stat-goal">Goal: {WEEKLY_GOALS.cardio}/week</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Workouts</div>
            <div className="stat-value">{workoutStats.totalWorkouts}</div>
            <div className="stat-goal">All workouts</div>
          </div>
        </div>

        {/* Weekly Workout Chart */}
        {workoutStats.weeklyData.length > 0 && (
          <div className="chart-container">
            <h4 className="chart-title">Weekly Workouts</h4>
            <div className="workout-chart">
              {workoutStats.weeklyData.map((week, index) => (
                <div key={index} className="workout-chart-item">
                  <div className="workout-chart-label">{week.weekStart}</div>
                  <div className="workout-chart-bars">
                    <div className="workout-bar-wrapper">
                      <div className="workout-bar-label">Muscle</div>
                      <div className="workout-bar-container">
                        <div
                          className="workout-bar muscle-bar"
                          style={{
                            width: `${(week.muscle / WEEKLY_GOALS.muscle) * 100}%`,
                            maxWidth: '100%',
                          }}
                        >
                          {week.muscle}
                        </div>
                      </div>
                    </div>
                    <div className="workout-bar-wrapper">
                      <div className="workout-bar-label">Cardio</div>
                      <div className="workout-bar-container">
                        <div
                          className="workout-bar cardio-bar"
                          style={{
                            width: `${(week.cardio / WEEKLY_GOALS.cardio) * 100}%`,
                            maxWidth: '100%',
                          }}
                        >
                          {week.cardio}
                        </div>
                      </div>
                    </div>
                    {week.completed && (
                      <div className="week-completed-badge">✓</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default Stats;

