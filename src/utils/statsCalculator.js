import { format, startOfWeek, addDays, subDays, subWeeks, parseISO, startOfDay, endOfDay } from 'date-fns';

const MENU_STORAGE_KEY = 'menuTrackerData';
const WORKOUT_STORAGE_KEY = 'workoutTrackerData';
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

const unwrap = (entry) => (entry ? entry.data || entry : undefined);

// Get all menu data from localStorage
export const getMenuData = () => {
  const saved = localStorage.getItem(MENU_STORAGE_KEY);
  return saved ? JSON.parse(saved) : {};
};

// Get all workout data from localStorage
export const getWorkoutData = () => {
  const saved = localStorage.getItem(WORKOUT_STORAGE_KEY);
  return saved ? JSON.parse(saved) : {};
};

// Check if a day meets all menu goals
const meetsMenuGoals = (dayData) => {
  if (!dayData) return false;
  return (
    dayData.protein?.length >= DAILY_ALLOWANCE.protein &&
    dayData.carbs?.length >= DAILY_ALLOWANCE.carbs &&
    dayData.fat?.length >= DAILY_ALLOWANCE.fat &&
    dayData.freeCalories <= DAILY_ALLOWANCE.freeCalories
  );
};

// Check if a week meets workout goals
const meetsWorkoutGoals = (weekDates, workoutData) => {
  let muscleCount = 0;
  let cardioCount = 0;
  
  weekDates.forEach((date) => {
    const dayKey = format(date, 'yyyy-MM-dd');
    const dayEntry = workoutData[dayKey];
    const day = unwrap(dayEntry);
    if (day) {
      if (day.muscle) muscleCount++;
      if (day.cardio) cardioCount++;
    }
  });
  
  return muscleCount >= WEEKLY_GOALS.muscle && cardioCount >= WEEKLY_GOALS.cardio;
};

// Calculate menu streak
export const calculateMenuStreak = () => {
  const menuData = getMenuData();
  const today = new Date();
  let streak = 0;
  let currentDate = startOfDay(today);
  
  while (true) {
    const dayKey = format(currentDate, 'yyyy-MM-dd');
    const day = unwrap(menuData[dayKey]);
    if (meetsMenuGoals(day)) {
      streak++;
      currentDate = subDays(currentDate, 1);
    } else {
      break;
    }
  }
  
  return streak;
};

// Calculate workout streak (weeks)
export const calculateWorkoutStreak = () => {
  const workoutData = getWorkoutData();
  const today = new Date();
  let streak = 0;
  let currentWeek = startOfWeek(today, { weekStartsOn: 0 });
  
  while (true) {
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      weekDates.push(addDays(currentWeek, i));
    }
    
    if (meetsWorkoutGoals(weekDates, workoutData)) {
      streak++;
      currentWeek = subWeeks(currentWeek, 1);
    } else {
      break;
    }
  }
  
  return streak;
};

// Get date range based on period
export const getDateRange = (period) => {
  const today = new Date();
  const end = endOfDay(today);
  
  switch (period) {
    case 'week':
      return {
        start: startOfDay(startOfWeek(today, { weekStartsOn: 0 })),
        end,
      };
    case 'month':
      return {
        start: startOfDay(subDays(today, 30)),
        end,
      };
    case 'all':
      // Get earliest date from data
      const menuData = getMenuData();
      const workoutData = getWorkoutData();
      const allDates = [
        ...Object.keys(menuData),
        ...Object.keys(workoutData),
      ];
      
      if (allDates.length === 0) {
        return { start: startOfDay(today), end };
      }
      
      const earliestDate = allDates.sort()[0];
      return {
        start: startOfDay(parseISO(earliestDate)),
        end,
      };
    default:
      return { start: startOfDay(today), end };
  }
};

// Calculate menu statistics for a period
export const calculateMenuStats = (period) => {
  const menuData = getMenuData();
  const { start, end } = getDateRange(period);
  
  const days = [];
  let currentDate = start;
  
  while (currentDate <= end) {
    const dayKey = format(currentDate, 'yyyy-MM-dd');
    const entry = menuData[dayKey];
    const data = unwrap(entry);
    days.push({
      date: dayKey,
      data,
    });
    currentDate = addDays(currentDate, 1);
  }
  
  const daysWithData = days.filter(d => d.data);
  const totalDays = days.length;
  const daysWithDataCount = daysWithData.length;
  
  // Calculate averages
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFreeCalories = 0;
  let completedDays = 0;
  
  daysWithData.forEach(({ data }) => {
    totalProtein += data.protein?.length || 0;
    totalCarbs += data.carbs?.length || 0;
    totalFat += data.fat?.length || 0;
    totalFreeCalories += data.freeCalories || 0;
    if (meetsMenuGoals(data)) {
      completedDays++;
    }
  });
  
  const avgProtein = daysWithDataCount > 0 ? (totalProtein / daysWithDataCount).toFixed(1) : 0;
  const avgCarbs = daysWithDataCount > 0 ? (totalCarbs / daysWithDataCount).toFixed(1) : 0;
  const avgFat = daysWithDataCount > 0 ? (totalFat / daysWithDataCount).toFixed(1) : 0;
  const avgFreeCalories = daysWithDataCount > 0 ? (totalFreeCalories / daysWithDataCount).toFixed(0) : 0;
  const completionRate = totalDays > 0 ? ((completedDays / totalDays) * 100).toFixed(0) : 0;
  
  // Weekly breakdown for charts
  const weeklyData = [];
  let weekStart = startOfWeek(start, { weekStartsOn: 0 });
  
  while (weekStart <= end) {
    const weekEnd = addDays(weekStart, 6);
    const weekDays = [];
    let weekCurrent = weekStart;
    
    while (weekCurrent <= weekEnd && weekCurrent <= end) {
      const dayKey = format(weekCurrent, 'yyyy-MM-dd');
      const entry = menuData[dayKey];
      const data = unwrap(entry);
      weekDays.push({
        date: dayKey,
        data,
      });
      weekCurrent = addDays(weekCurrent, 1);
    }
    
    const weekCompleted = weekDays.filter(d => d.data && meetsMenuGoals(d.data)).length;
    weeklyData.push({
      weekStart: format(weekStart, 'MMM d'),
      completion: weekCompleted,
      total: weekDays.length,
    });
    
    weekStart = addDays(weekStart, 7);
  }
  
  return {
    totalDays,
    daysWithDataCount,
    avgProtein,
    avgCarbs,
    avgFat,
    avgFreeCalories,
    completionRate,
    completedDays,
    weeklyData,
  };
};

// Calculate workout statistics for a period
export const calculateWorkoutStats = (period) => {
  const workoutData = getWorkoutData();
  const { start, end } = getDateRange(period);
  
  let totalMuscle = 0;
  let totalCardio = 0;
  let totalWorkouts = 0;
  
  // Get all dates in range
  let currentDate = start;
  const weeks = [];
  
  while (currentDate <= end) {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = addDays(weekStart, 6);
    
    // Check if we already processed this week
    if (!weeks.some(w => w.start.getTime() === weekStart.getTime())) {
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        if (date <= end) {
          weekDates.push(date);
        }
      }
      
      let weekMuscle = 0;
      let weekCardio = 0;
      
      weekDates.forEach((date) => {
        const dayKey = format(date, 'yyyy-MM-dd');
        const entry = workoutData[dayKey];
        const day = unwrap(entry);
        if (day) {
          if (day.muscle) weekMuscle++;
          if (day.cardio) weekCardio++;
        }
      });
      
      totalMuscle += weekMuscle;
      totalCardio += weekCardio;
      totalWorkouts += weekMuscle + weekCardio;
      
      weeks.push({
        start: weekStart,
        end: weekEnd,
        muscle: weekMuscle,
        cardio: weekCardio,
        completed: weekMuscle >= WEEKLY_GOALS.muscle && weekCardio >= WEEKLY_GOALS.cardio,
      });
    }
    
    currentDate = addDays(currentDate, 7);
  }
  
  const totalWeeks = weeks.length;
  const completedWeeks = weeks.filter(w => w.completed).length;
  const completionRate = totalWeeks > 0 ? ((completedWeeks / totalWeeks) * 100).toFixed(0) : 0;
  
  // Weekly breakdown for charts
  const weeklyData = weeks.map(week => ({
    weekStart: format(week.start, 'MMM d'),
    muscle: week.muscle,
    cardio: week.cardio,
    completed: week.completed ? 1 : 0,
  }));
  
  return {
    totalWeeks,
    completedWeeks,
    totalMuscle,
    totalCardio,
    totalWorkouts,
    completionRate,
    weeklyData,
  };
};

// Get most used foods
export const getMostUsedFoods = (period) => {
  const menuData = getMenuData();
  const { start, end } = getDateRange(period);
  
  const foodCounts = {};
  
  let currentDate = start;
  while (currentDate <= end) {
    const dayKey = format(currentDate, 'yyyy-MM-dd');
    const entry = menuData[dayKey];
    const dayData = unwrap(entry);
    
    if (dayData) {
      ['protein', 'carbs', 'fat'].forEach(category => {
        if (dayData[category]) {
          dayData[category].forEach(item => {
            const key = item.nameEn || item.name;
            foodCounts[key] = (foodCounts[key] || 0) + 1;
          });
        }
      });
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  // Sort by count and return top 5
  return Object.entries(foodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
};
