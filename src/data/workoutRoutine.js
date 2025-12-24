// Workout routine definition
// Each workout number corresponds to specific body parts
import { format, addDays } from 'date-fns';

export const WORKOUT_ROUTINE = {
  1: {
    name: 'Workout 1',
    bodyParts: ['chest', 'middleShoulder', 'triceps'],
  },
  2: {
    name: 'Workout 2',
    bodyParts: ['back', 'rearShoulder', 'biceps', 'abs'],
  },
  3: {
    name: 'Workout 3',
    bodyParts: ['quadriceps', 'hamstrings', 'calves'],
  },
  4: {
    name: 'Workout 4',
    bodyParts: ['triceps', 'biceps', 'abs'],
  },
};

// Get workout number for a given date based on muscle workouts completed in that week
export const getWorkoutNumber = (date, workoutData, weekStart) => {
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    weekDates.push(addDays(weekStart, i));
  }
  
  // Get all muscle workout days in the week up to and including this date
  const muscleWorkouts = [];
  weekDates.forEach((weekDate) => {
    // Only count dates that are before or equal to the current date
    if (weekDate <= date) {
      const dayKey = format(weekDate, 'yyyy-MM-dd');
      const day = workoutData[dayKey];
      // Count if it's a muscle workout (already marked)
      // OR if it's the current date (we're about to mark it)
      if (day && day.muscle) {
        muscleWorkouts.push(weekDate);
      } else if (weekDate.getTime() === date.getTime()) {
        // This is the current date, count it as the next workout
        muscleWorkouts.push(weekDate);
      }
    }
  });
  
  // Count unique muscle workout days
  const workoutCount = muscleWorkouts.length;
  
  // Return workout number (1-4), cycling if more than 4
  return ((workoutCount - 1) % 4) + 1;
};

