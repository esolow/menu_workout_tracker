import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import './WorkoutTracker.css';
import { EXERCISES_BY_BODY_PART } from '../data/exercisesDatabase';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { mergeEntries, entriesMapToArray, updateLocalEntry } from '../utils/sync';

const DEFAULT_WEEKLY_GOALS = {
  muscle: 4,
  cardio: 3,
};

// Minimal routine shape; actual exercises come from admin-defined schedule
const DEFAULT_WORKOUT_ROUTINE = {};

// Normalize routines to the new exercises map format
const normalizeWorkoutRoutine = (routine) => {
  const normalized = {};

  Object.keys(routine || {}).forEach((key) => {
    const workout = routine[key] || {};
    if (workout.exercises) {
      normalized[key] = { ...workout, exercises: { ...workout.exercises } };
      return;
    }

    // Legacy bodyParts format -> expand to all exercises for those parts
    if (Array.isArray(workout.bodyParts)) {
      const exercises = {};
      workout.bodyParts.forEach((bodyPartKey) => {
        const bodyPart = EXERCISES_BY_BODY_PART[bodyPartKey];
        if (bodyPart?.exercises) {
          bodyPart.exercises.forEach((exercise) => {
            exercises[`${bodyPartKey}-${exercise.id}`] = {
              sets: exercise.sets || 4,
              reps: exercise.reps || '12-15',
            };
          });
        }
      });
      normalized[key] = { ...workout, exercises };
      return;
    }

    normalized[key] = { ...workout, exercises: {} };
  });

  return normalized;
};

// Get workout number for a given date based on muscle workouts completed in that week
const getWorkoutNumber = (date, workoutData, weekStart, workoutRoutine) => {
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
      const day = workoutData[dayKey]?.data || workoutData[dayKey];
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
  
  // Get available workout numbers from routine
  const workoutNumbers = Object.keys(workoutRoutine).map(Number).sort((a, b) => a - b);
  const maxWorkouts = workoutNumbers.length || 1;
  
  // Return workout number, cycling if more than available workouts
  const index = (workoutCount - 1) % maxWorkouts;
  return workoutNumbers[index] || workoutNumbers[0] || 1;
};

function WorkoutTracker() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [workoutData, setWorkoutData] = useState({});
  const [notesModal, setNotesModal] = useState(null); // { date: Date, dayKey: string } or null
  const [workoutRoutineModal, setWorkoutRoutineModal] = useState(null); // { date: Date, dayKey: string, workoutNumber: number, isCompleted?: boolean } or null
  const [weeklyGoals, setWeeklyGoals] = useState(DEFAULT_WEEKLY_GOALS);
  const [workoutRoutine, setWorkoutRoutine] = useState(() =>
    normalizeWorkoutRoutine(DEFAULT_WORKOUT_ROUTINE)
  );
  const [customExercises, setCustomExercises] = useState({});
  const [exerciseWeights, setExerciseWeights] = useState({}); // latest weight per exercise (for defaults)
  const [latestExerciseSets, setLatestExerciseSets] = useState({}); // latest per-set data per exercise
  const { isAuthenticated, token, setSyncStatus, user } = useAuth();

  // Get user-specific storage key
  const getStorageKey = () => {
    return user?.id ? `workoutTrackerData_${user.id}` : 'workoutTrackerData';
  };
  const getWeightsStorageKey = () => {
    return user?.id ? `workoutExerciseWeights_${user.id}` : 'workoutExerciseWeights';
  };
  const getLatestSetsStorageKey = () => {
    return user?.id ? `workoutExerciseSets_${user.id}` : 'workoutExerciseSets';
  };

  // Helpers
  const loadLocal = () => {
    const storageKey = getStorageKey();
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  };

  const saveLocal = (data) => {
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(data));
    setWorkoutData(data);
  };

  const loadWeightsLocal = () => {
    const storageKey = getWeightsStorageKey();
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  };

  const saveWeightsLocal = (data) => {
    const storageKey = getWeightsStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(data));
    setExerciseWeights(data);
  };

  const loadLatestSetsLocal = () => {
    const storageKey = getLatestSetsStorageKey();
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  };

  const saveLatestSetsLocal = (data) => {
    const storageKey = getLatestSetsStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(data));
    setLatestExerciseSets(data);
  };

  // Fetch workout schedule
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!isAuthenticated || !token) {
        setWeeklyGoals(DEFAULT_WEEKLY_GOALS);
        setWorkoutRoutine(normalizeWorkoutRoutine(DEFAULT_WORKOUT_ROUTINE));
        return;
      }
      try {
        console.debug('[WorkoutTracker] fetching workout schedule...');
        const res = await api.fetchWorkoutSchedule(token);
        const schedule = res.schedule || {};
        console.debug('[WorkoutTracker] schedule response', schedule);

        const weekly = {
          muscle: schedule.weeklyMuscle || DEFAULT_WEEKLY_GOALS.muscle,
          cardio: schedule.weeklyCardio || DEFAULT_WEEKLY_GOALS.cardio,
        };
        setWeeklyGoals(weekly);

        // Only use admin-defined workouts; avoid falling back to preset body-part lists
        const serverRoutine = schedule.workoutRoutine || {};
        const safeRoutine = Object.keys(serverRoutine).length ? serverRoutine : DEFAULT_WORKOUT_ROUTINE;
        setWorkoutRoutine(normalizeWorkoutRoutine(safeRoutine));

        setCustomExercises(schedule.customExercises || {});
      } catch (err) {
        console.error('[WorkoutTracker] Failed to fetch workout schedule:', err);
        setWeeklyGoals(DEFAULT_WEEKLY_GOALS);
        setWorkoutRoutine(normalizeWorkoutRoutine(DEFAULT_WORKOUT_ROUTINE));
      }
    };
    fetchSchedule();
  }, [isAuthenticated, token, user?.id]);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      const local = loadLocal();
      setWorkoutData(local);
      setExerciseWeights(loadWeightsLocal());
      setLatestExerciseSets(loadLatestSetsLocal());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Sync from server when authed
  useEffect(() => {
    const syncFromServer = async () => {
      if (!isAuthenticated || !token || !user?.id) return;
      setSyncStatus('syncing');
      try {
        const res = await api.fetchWorkouts(token);
        const serverEntries = res.entries || [];
        const local = loadLocal();
        // Prioritize server data (admin edits should take precedence)
        const merged = mergeEntries(local, serverEntries);
        saveLocal(merged);
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } catch (err) {
        console.error('Sync workouts failed', err);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    };
    syncFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  // Save and sync
  const saveData = async (newData, dayKey) => {
    const updated = updateLocalEntry(loadLocal(), dayKey, newData);
    saveLocal(updated);
    if (isAuthenticated && token) {
      setSyncStatus('syncing');
      try {
        await api.syncWorkouts(entriesMapToArray(updated), token);
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 1500);
      } catch (err) {
        console.error('Sync workouts save failed', err);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    }
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(currentWeek, i));
    }
    return dates;
  };

  const getDayKey = (date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const toggleWorkout = (date, type, e) => {
    const dayKey = getDayKey(date);
    const currentDayEntry = workoutData[dayKey];
    const currentDay = currentDayEntry?.data || currentDayEntry || { muscle: false, cardio: false };
    
    // For muscle workouts
    if (type === 'muscle') {
      e?.stopPropagation();
      // If already marked, unmark it
      if (currentDay.muscle) {
        const workoutNumber = currentDay.workoutNumber || getWorkoutNumber(date, workoutData, currentWeek, workoutRoutine);
        setWorkoutRoutineModal({ date, dayKey, workoutNumber, isCompleted: true });
      } else {
        // If not marked, show routine popup
        const workoutNumber = getWorkoutNumber(date, workoutData, currentWeek, workoutRoutine);
        setWorkoutRoutineModal({ date, dayKey, workoutNumber, isCompleted: false });
      }
      return;
    }
    
    // For cardio, toggle normally
    if (currentDay[type]) {
      const newDay = { ...currentDay, [type]: false };
      const updatedEntries = updateLocalEntry(workoutData, dayKey, newDay);
      // remove if empty
      if (!newDay.muscle && !newDay.cardio && !newDay.notes) {
        delete updatedEntries[dayKey];
      }
      saveData(newDay, dayKey);
    } else {
      const newDay = { ...currentDay, muscle: false, cardio: false, [type]: true };
      saveData(newDay, dayKey);
    }
  };

  const closeWorkoutRoutineModal = () => {
    setWorkoutRoutineModal(null);
  };

  const saveExerciseProgress = (dayKey, workoutNumber, completedExercises) => {
    const currentDayEntry = workoutData[dayKey];
    const currentDay = currentDayEntry?.data || currentDayEntry || { muscle: false, cardio: false };
    const newDay = {
      ...currentDay,
      workoutNumber,
      completedExercises: completedExercises || {},
    };
    saveData(newDay, dayKey);
  };

  const markWorkoutComplete = (dayKey, workoutNumber, completedExercises) => {
    const currentDayEntry = workoutData[dayKey];
    const currentDay = currentDayEntry?.data || currentDayEntry || { muscle: false, cardio: false };
    const newDay = {
      ...currentDay,
      muscle: true,
      workoutNumber,
      completedExercises: completedExercises || {},
    };
    saveData(newDay, dayKey);
    closeWorkoutRoutineModal();
  };

  const unmarkWorkout = (dayKey) => {
    const currentDayEntry = workoutData[dayKey];
    const currentDay = currentDayEntry?.data || currentDayEntry || { muscle: false, cardio: false, notes: '' };
    const newDay = { ...currentDay, muscle: false };
    delete newDay.workoutNumber;
    delete newDay.completedExercises;

    // If no other data, remove the entry entirely
    if (!newDay.cardio && !newDay.notes) {
      const local = loadLocal();
      delete local[dayKey];
      saveLocal(local);
    } else {
      saveData(newDay, dayKey);
    }
    closeWorkoutRoutineModal();
  };

  const updateExerciseWeight = (dayKey, exerciseKey, setsData) => {
    // Persist per-day weight data (array of {weight, reps} per set)
    const currentDayEntry = workoutData[dayKey];
    const currentDay = currentDayEntry?.data || currentDayEntry || { muscle: false, cardio: false };
    const dayWeights = currentDay.exerciseWeights || {};
    const newDayWeights = { ...dayWeights };

    // Check if all sets are empty
    const allEmpty = setsData.every(set => (!set.weight || set.weight === '') && (!set.reps || set.reps === ''));
    
    if (allEmpty) {
      delete newDayWeights[exerciseKey];
    } else {
      newDayWeights[exerciseKey] = setsData;
    }

    const newDay = { ...currentDay, exerciseWeights: newDayWeights };
    // Clean up if weights emptied and nothing else
    if (!newDay.muscle && !newDay.cardio && !newDay.notes && Object.keys(newDayWeights).length === 0) {
      const local = loadLocal();
      delete local[dayKey];
      saveLocal(local);
    } else {
      saveData(newDay, dayKey);
    }

    // Keep latest weight for defaults (use first set's weight if available)
    const nextLatest = { ...exerciseWeights };
    const firstSetWeight = setsData && setsData.length > 0 && setsData[0].weight ? setsData[0].weight : '';
    if (allEmpty || !firstSetWeight) {
      delete nextLatest[exerciseKey];
    } else {
      nextLatest[exerciseKey] = firstSetWeight; // Keep single weight for backward compatibility
    }
    saveWeightsLocal(nextLatest);

    // Keep latest per-set stats for quick defaults next time
    const nextLatestSets = { ...latestExerciseSets };
    if (allEmpty) {
      delete nextLatestSets[exerciseKey];
    } else {
      nextLatestSets[exerciseKey] = setsData;
    }
    saveLatestSetsLocal(nextLatestSets);
  };

  const openNotesModal = (date) => {
    const dayKey = getDayKey(date);
    setNotesModal({ date, dayKey });
  };

  const closeNotesModal = () => {
    setNotesModal(null);
  };

  const saveNotes = (dayKey, notes) => {
    const currentDayEntry = workoutData[dayKey];
    const currentDay = currentDayEntry?.data || currentDayEntry || { muscle: false, cardio: false };
    const newDay = { ...currentDay, notes: notes.trim() };
    // remove if empty
    if (!newDay.muscle && !newDay.cardio && !newDay.notes) {
      const updated = { ...workoutData };
      delete updated[dayKey];
      saveData({}, dayKey); // will remove
      saveLocal(updated);
      return;
    }
    saveData(newDay, dayKey);
    closeNotesModal();
  };

  const getWeekStats = () => {
    const weekDates = getWeekDates();
    let muscleCount = 0;
    let cardioCount = 0;

    weekDates.forEach((date) => {
      const dayKey = getDayKey(date);
      const entry = workoutData[dayKey];
      const day = entry?.data || entry;
      if (day) {
        if (day.muscle) muscleCount++;
        if (day.cardio) cardioCount++;
      }
    });

    return { muscleCount, cardioCount };
  };

  const weekDates = getWeekDates();
  const stats = getWeekStats();
  const isCurrentWeek = isSameDay(currentWeek, startOfWeek(new Date(), { weekStartsOn: 0 }));

  const navigateWeek = (direction) => {
    setCurrentWeek(addDays(currentWeek, direction * 7));
  };

  return (
    <div className="workout-tracker">
      <div className="week-navigation">
        <button className="nav-button" onClick={() => navigateWeek(-1)}>
          ← Previous
        </button>
        <div className="week-display">
          {format(weekDates[0], 'MMM d')} - {format(weekDates[6], 'MMM d, yyyy')}
          {isCurrentWeek && <span className="current-week-badge">Current</span>}
        </div>
        <button className="nav-button" onClick={() => navigateWeek(1)}>
          Next →
        </button>
      </div>

      <div className="week-stats">
        <div className="stat-card">
          <div className="stat-label">Muscle Workouts</div>
          <div className={`stat-value ${stats.muscleCount >= weeklyGoals.muscle ? 'completed' : ''}`}>
            {stats.muscleCount} / {weeklyGoals.muscle}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cardio Workouts</div>
          <div className={`stat-value ${stats.cardioCount >= weeklyGoals.cardio ? 'completed' : ''}`}>
            {stats.cardioCount} / {weeklyGoals.cardio}
          </div>
        </div>
      </div>

      <div className="week-calendar">
        {weekDates.map((date) => {
          const dayKey = getDayKey(date);
          const entry = workoutData[dayKey];
          const day = entry?.data || entry || { muscle: false, cardio: false };
          const isToday = isSameDay(date, new Date());
          const dayName = format(date, 'EEE');
          const dayNumber = format(date, 'd');

          const hasNotes = day.notes && day.notes.trim().length > 0;

          return (
            <div key={dayKey} className={`day-card ${isToday ? 'today' : ''}`}>
              <div className="day-header">
                <div className="day-name">{dayName}</div>
                <div className="day-number">{dayNumber}</div>
                {hasNotes && <div className="notes-indicator">📝</div>}
              </div>
              <div className="workout-buttons">
                <button
                  className={`workout-button muscle ${day.muscle ? 'active' : ''}`}
                  onClick={(e) => toggleWorkout(date, 'muscle', e)}
                >
                  💪 Muscle
                </button>
                <button
                  className={`workout-button cardio ${day.cardio ? 'active' : ''}`}
                  onClick={() => toggleWorkout(date, 'cardio')}
                >
                  🏃 Cardio
                </button>
                <button
                  className="notes-button"
                  onClick={() => openNotesModal(date)}
                  title="Add notes"
                >
                  📝 Notes
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="workout-info">
        <p className="info-text">
          Tap a workout type to mark it as completed. Each day can have either a muscle workout or a cardio workout. Tap "Notes" to add details about your workout.
        </p>
      </div>

      {notesModal && (
        <NotesModal
          date={notesModal.date}
          dayKey={notesModal.dayKey}
          currentNotes={(workoutData[notesModal.dayKey]?.data || workoutData[notesModal.dayKey] || {}).notes || ''}
          onSave={saveNotes}
          onClose={closeNotesModal}
        />
      )}

      {workoutRoutineModal && (
        <WorkoutRoutineModal
          date={workoutRoutineModal.date}
          dayKey={workoutRoutineModal.dayKey}
          workoutNumber={workoutRoutineModal.workoutNumber}
          workoutRoutine={workoutRoutine}
          customExercises={customExercises}
          exerciseWeights={exerciseWeights}
          currentCompletedExercises={(workoutData[workoutRoutineModal.dayKey]?.data || workoutData[workoutRoutineModal.dayKey] || {}).completedExercises || {}}
          currentDayWeights={(workoutData[workoutRoutineModal.dayKey]?.data || workoutData[workoutRoutineModal.dayKey] || {}).exerciseWeights || {}}
          latestExerciseSets={latestExerciseSets}
          onUpdateWeight={updateExerciseWeight}
          onComplete={markWorkoutComplete}
          onUnmark={unmarkWorkout}
          isCompleted={!!workoutRoutineModal.isCompleted}
          onSaveProgress={saveExerciseProgress}
          onClose={closeWorkoutRoutineModal}
        />
      )}
    </div>
  );
}

function WorkoutRoutineModal({ date, dayKey, workoutNumber, workoutRoutine, customExercises, exerciseWeights, currentDayWeights, latestExerciseSets, currentCompletedExercises, onComplete, onUnmark, onSaveProgress, onClose, onUpdateWeight, isCompleted }) {
  const [completedExercises, setCompletedExercises] = useState(currentCompletedExercises);
  const [expandedWeightTracking, setExpandedWeightTracking] = useState({}); // { exerciseKey: true/false }
  const [localWeights, setLocalWeights] = useState(currentDayWeights || {}); // Local state for weight tracking
  const routine = workoutRoutine[workoutNumber] || workoutRoutine[1] || { name: 'Workout', exercises: {} };
  
  // Update local weights when currentDayWeights changes
  useEffect(() => {
    setLocalWeights(currentDayWeights || {});
  }, [currentDayWeights]);
  const SHOULDER_LABELS = {
    middleShoulder: 'Middle Shoulder',
    rearShoulder: 'Rear Shoulder',
  };
  const LEG_KEY_ALIASES = { calvs: 'calves' }; // legacy key compatibility
  const LEG_LABELS = {
    quadriceps: 'Quadriceps',
    hamstrings: 'Hamstrings',
    calves: 'Calves',
  };
  const normalizeLegKey = (key) => LEG_KEY_ALIASES[key] || key;

  // Convert exercise keys (default or custom) into exercise objects with sets/reps
  const allExercises = Object.keys(routine.exercises || {}).map((exerciseKey) => {
    const exerciseData = routine.exercises[exerciseKey];
    if (!exerciseData) return null;

    const isCustom = exerciseKey.startsWith('custom-');
    const parts = exerciseKey.split('-');
    const rawBodyPartKey = isCustom ? parts[1] : parts[0];
    const bodyPartKey = normalizeLegKey(rawBodyPartKey);
    const idPart = isCustom ? parts[2] : parts[1];
    const exerciseId = parseInt(idPart, 10);

    if (!bodyPartKey || Number.isNaN(exerciseId)) return null;

    const bodyPart = EXERCISES_BY_BODY_PART[bodyPartKey];
    const legacyKey = Object.keys(LEG_KEY_ALIASES).find(k => LEG_KEY_ALIASES[k] === bodyPartKey);
    const customList = customExercises?.[bodyPartKey] || (legacyKey ? customExercises?.[legacyKey] : []) || [];

    // Try to resolve custom exercise; if missing, fall back to default DB so admin-selected exercises still render
    let baseExercise = isCustom
      ? customList.find((ex) => ex.id === exerciseId)
      : bodyPart?.exercises?.find((ex) => ex.id === exerciseId);

    if (!baseExercise && bodyPart?.exercises) {
      baseExercise = bodyPart.exercises.find((ex) => ex.id === exerciseId);
    }

    if (!baseExercise) return null;

    const sets = exerciseData.sets ?? baseExercise.sets ?? 4;
    const reps = exerciseData.reps ?? baseExercise.reps ?? '12-15';

    return {
      ...baseExercise,
      sets,
      reps,
      videoUrl: baseExercise.videoUrl || '',
      bodyPartKey,
      bodyPartName: bodyPart?.nameEn || baseExercise.bodyPartName || 'Body Part',
      shoulderType: SHOULDER_LABELS[bodyPartKey],
      legType: LEG_LABELS[bodyPartKey],
      isCustom,
      exerciseKey,
      // Get per-set weight data or fallback to old single weight format
      setsData: (() => {
        // 1) Current day data (local state)
        if (localWeights && Array.isArray(localWeights[exerciseKey])) {
          return localWeights[exerciseKey];
        }
        // 2) Latest stored per-set stats from previous sessions
        if (latestExerciseSets && Array.isArray(latestExerciseSets[exerciseKey])) {
          return latestExerciseSets[exerciseKey];
        }
        // 3) Migrate old single-weight format
        const oldWeight = (localWeights && localWeights[exerciseKey] && !Array.isArray(localWeights[exerciseKey]))
          ? localWeights[exerciseKey]
          : (exerciseWeights?.[exerciseKey] ?? '');
        const totalSets = exerciseData.sets ?? baseExercise.sets ?? 4;
        if (oldWeight && oldWeight !== '') {
          return Array.from({ length: totalSets }, () => ({ weight: oldWeight, reps: '' }));
        }
        return Array.from({ length: totalSets }, () => ({ weight: '', reps: '' }));
      })(),
    };
  }).filter(Boolean);

  // Update state when reopening
  useEffect(() => {
    setCompletedExercises(currentCompletedExercises);
    // Reset expanded weight tracking when modal reopens
    setExpandedWeightTracking({});
  }, [currentCompletedExercises, dayKey]);

  const toggleExercise = (exerciseKey) => {
    const key = exerciseKey;
    const newCompletedExercises = {
      ...completedExercises,
      [key]: !completedExercises[key],
    };
    setCompletedExercises(newCompletedExercises);
    onSaveProgress(dayKey, workoutNumber, newCompletedExercises);
  };

  const openExerciseLink = (exercise, event) => {
    event.stopPropagation();
    const directUrl = exercise.videoUrl?.trim();
    if (directUrl) {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const searchQuery = encodeURIComponent(exercise.nameEn || exercise.name || 'exercise tutorial');
    window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank', 'noopener,noreferrer');
  };

  const handleComplete = () => {
    onComplete(dayKey, workoutNumber, completedExercises);
  };

  // Group exercises by body part
  const exercisesByBodyPart = {};
  allExercises.forEach(exercise => {
    if (!exercisesByBodyPart[exercise.bodyPartKey]) {
      exercisesByBodyPart[exercise.bodyPartKey] = {
        name: exercise.bodyPartName,
        exercises: [],
      };
    }
    exercisesByBodyPart[exercise.bodyPartKey].exercises.push(exercise);
  });

  return (
    <div className="workout-routine-modal-overlay" onClick={onClose}>
      <div className="workout-routine-modal" onClick={(e) => e.stopPropagation()}>
        <div className="workout-routine-modal-header">
          <h3>{routine.name}</h3>
          <div className="workout-routine-date">
            {format(date, 'EEEE, MMMM d, yyyy')}
          </div>
          <button className="workout-routine-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="workout-routine-content">
          <div className="workout-routine-instructions">
            Mark exercises as done as you complete them
          </div>
          
          {Object.entries(exercisesByBodyPart).map(([bodyPartKey, { name, exercises }]) => (
            <div key={bodyPartKey} className="workout-routine-body-part">
              <h4 className="workout-routine-body-part-title">{name}</h4>
              <div className="workout-routine-exercises">
                {exercises.map((exercise) => {
                  const exerciseKey = exercise.exerciseKey;
                  const isCompleted = completedExercises[exerciseKey];
                  
                  return (
                    <div
                      key={exerciseKey}
                      className={`workout-routine-exercise ${isCompleted ? 'completed' : ''}`}
                      onClick={() => toggleExercise(exerciseKey)}
                    >
                      <div className="workout-routine-exercise-checkbox">
                        {isCompleted ? '✓' : ''}
                      </div>
                      <div className="workout-routine-exercise-info">
                        <div className="workout-routine-exercise-name">
                          {exercise.nameEn}
                          {exercise.shoulderType && <span className="shoulder-tag">{exercise.shoulderType}</span>}
                          {exercise.legType && <span className="shoulder-tag">{exercise.legType}</span>}
                        </div>
                        <div className="workout-routine-exercise-details">
                          {exercise.sets} sets × {exercise.reps} reps
                        </div>
                        <div className="workout-routine-exercise-weight">
                          <button
                            className="weight-tracking-toggle"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedWeightTracking(prev => ({
                                ...prev,
                                [exerciseKey]: !prev[exerciseKey]
                              }));
                            }}
                          >
                            {expandedWeightTracking[exerciseKey] ? '▼' : '▶'} Track Weight & Reps
                          </button>
                          {expandedWeightTracking[exerciseKey] && (
                            <div className="weight-tracking-dropdown" onClick={(e) => e.stopPropagation()}>
                              <div className="weight-tracking-header">
                                <span>Set</span>
                                <span>Weight (kg)</span>
                                <span>Reps</span>
                              </div>
                              {exercise.setsData.map((setData, setIndex) => {
                                // Get current sets data from local state or use exercise's default
                                const currentSetsData = (localWeights[exerciseKey] && Array.isArray(localWeights[exerciseKey]))
                                  ? localWeights[exerciseKey]
                                  : exercise.setsData;
                                const currentSet = currentSetsData[setIndex] || { weight: '', reps: '' };
                                
                                return (
                                  <div key={setIndex} className="weight-tracking-row">
                                    <span className="set-number">{setIndex + 1}</span>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.5"
                                      value={currentSet.weight || ''}
                                      onChange={(e) => {
                                        const newSetsData = [...currentSetsData];
                                        if (!newSetsData[setIndex]) {
                                          newSetsData[setIndex] = { weight: '', reps: '' };
                                        }
                                        newSetsData[setIndex] = { ...newSetsData[setIndex], weight: e.target.value };
                                        // Update local state immediately for responsive UI
                                        setLocalWeights(prev => ({ ...prev, [exerciseKey]: newSetsData }));
                                        onUpdateWeight(dayKey, exerciseKey, newSetsData);
                                      }}
                                      placeholder="0"
                                      className="weight-input"
                                    />
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      value={currentSet.reps || ''}
                                      onChange={(e) => {
                                        const newSetsData = [...currentSetsData];
                                        if (!newSetsData[setIndex]) {
                                          newSetsData[setIndex] = { weight: '', reps: '' };
                                        }
                                        newSetsData[setIndex] = { ...newSetsData[setIndex], reps: e.target.value };
                                        // Update local state immediately for responsive UI
                                        setLocalWeights(prev => ({ ...prev, [exerciseKey]: newSetsData }));
                                        onUpdateWeight(dayKey, exerciseKey, newSetsData);
                                      }}
                                      placeholder="0"
                                      className="reps-input"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="workout-routine-exercise-actions">
                        <button
                          className="workout-routine-exercise-link"
                          onClick={(e) => openExerciseLink(exercise, e)}
                          title={exercise.videoUrl ? 'Open exercise video' : 'Search this exercise on YouTube'}
                        >
                          ↗ Video
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="workout-routine-modal-actions">
          <button className="workout-routine-cancel-button" onClick={onClose}>
            Close
          </button>
          {isCompleted && (
            <button className="workout-routine-unmark-button" onClick={() => onUnmark(dayKey)}>
              Unmark Workout
            </button>
          )}
          {!isCompleted && (
            <button className="workout-routine-complete-button" onClick={handleComplete}>
              Mark Workout Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NotesModal({ date, dayKey, currentNotes, onSave, onClose }) {
  const [notes, setNotes] = useState(currentNotes);

  // Update state when currentNotes changes (when reopening modal)
  useEffect(() => {
    setNotes(currentNotes);
  }, [currentNotes]);

  const handleSave = () => {
    onSave(dayKey, notes);
  };

  return (
    <div className="notes-modal-overlay" onClick={onClose}>
      <div className="notes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notes-modal-header">
          <h3>Workout Notes</h3>
          <div className="notes-modal-date">
            {format(date, 'EEEE, MMMM d, yyyy')}
          </div>
          <button className="notes-close-button" onClick={onClose}>×</button>
        </div>
        <textarea
          className="notes-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about your workout...&#10;&#10;Examples:&#10;- How you felt&#10;- Weights used&#10;- Exercises performed&#10;- Duration or distance&#10;- Any observations"
          rows={12}
          autoFocus
        />
        <div className="notes-modal-actions">
          <button className="notes-cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="notes-save-button" onClick={handleSave}>
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkoutTracker;
