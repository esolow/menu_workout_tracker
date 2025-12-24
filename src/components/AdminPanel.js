import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { EXERCISES_BY_BODY_PART } from '../data/exercisesDatabase';
import { PROTEIN_OPTIONS, CARB_OPTIONS, FAT_OPTIONS } from '../data/foodDatabase';
import './AdminPanel.css';

function AdminPanel() {
  const { token, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewMode, setViewMode] = useState('users'); // 'users' | 'menu' | 'workouts'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New user form
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');

  // User menu data (template - not day-specific)
  const [userMenuItems, setUserMenuItems] = useState({
    protein: [],
    carbs: [],
    fat: [],
  });
  
  // Menu templates
  const [menuTemplates, setMenuTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  // Menu item editing
  const [editingMenuItem, setEditingMenuItem] = useState(null); // { category, index } or null
  
  // User allowances (daily menu limits)
  const [userAllowances, setUserAllowances] = useState({
    protein: 5,
    carbs: 5,
    fat: 1,
    freeCalories: 200,
  });

  // User workout schedule
  const [workoutSchedule, setWorkoutSchedule] = useState({
    weeklyMuscle: 4,
    weeklyCardio: 3,
    workoutRoutine: {
      1: { name: 'Workout 1', exercises: {} }, // exercises: { 'chest-1': true, 'chest-2': true, ... }
    },
  });

  // Custom exercises (user-specific)
  const [customExercises, setCustomExercises] = useState({}); // { 'bodyPart': [{ id, name, nameEn, sets, reps, videoUrl }] }
  // Admin's custom exercises (to show when building schedules for any user)
  const [adminCustomExercises, setAdminCustomExercises] = useState({});

  // Track expanded body parts for each workout
  const [expandedBodyParts, setExpandedBodyParts] = useState({}); // { 'workout-1-chest': true, ... }
  const [expandedWorkouts, setExpandedWorkouts] = useState({}); // { 'workout-1': true }

  const SHOULDER_KEYS = ['middleShoulder', 'rearShoulder'];
  const SHOULDER_LABELS = {
    middleShoulder: 'Middle Shoulder',
    rearShoulder: 'Rear Shoulder',
  };
  const LEG_KEYS = ['quadriceps', 'hamstrings', 'calves'];
  const LEG_KEY_ALIASES = { calvs: 'calves' }; // legacy key compatibility
  const LEG_LABELS = {
    quadriceps: 'Quadriceps',
    hamstrings: 'Hamstrings',
    calves: 'Calves',
  };
  const normalizeLegKey = (key) => LEG_KEY_ALIASES[key] || key;

  const getBodyPartGroups = () => {
    return Object.keys(EXERCISES_BY_BODY_PART).reduce((acc, key) => {
      const normalizedKey = normalizeLegKey(key);
      if (SHOULDER_KEYS.includes(key)) {
        if (!acc.find(group => group.key === 'shoulders')) {
          acc.push({
            key: 'shoulders',
            nameEn: 'Shoulders',
            name: 'כתפיים',
            bodyPartKeys: SHOULDER_KEYS,
          });
        }
      } else if (LEG_KEYS.includes(normalizedKey)) {
        if (!acc.find(group => group.key === 'legs')) {
          acc.push({
            key: 'legs',
            nameEn: 'Legs',
            name: 'רגליים',
            bodyPartKeys: LEG_KEYS,
          });
        }
      } else {
        const bp = EXERCISES_BY_BODY_PART[normalizedKey];
        acc.push({
          key: normalizedKey,
          nameEn: bp?.nameEn || normalizedKey,
          name: bp?.name || normalizedKey,
          bodyPartKeys: [normalizedKey],
        });
      }
      return acc;
    }, []);
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.admin.getUsers(token);
      setUsers(res.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAdmin && token) {
      loadUsers();
      // Fetch admin's custom exercises so they're available when building schedules
      const fetchAdminExercises = async () => {
        try {
          const res = await api.fetchWorkoutSchedule(token);
          setAdminCustomExercises(res.schedule?.customExercises || {});
        } catch (err) {
          console.error('Failed to fetch admin exercises', err);
        }
      };
      fetchAdminExercises();
    }
  }, [isAdmin, token, loadUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.admin.createUser(newUserEmail, newUserPassword, newUserRole, token);
      setSuccess('User created successfully');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.admin.deleteUser(userId, token);
      setSuccess('User deleted successfully');
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
        setViewMode('users');
      }
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setViewMode('menu');
    setError('');
    setSuccess('');
                try {
                  const [allowancesRes, scheduleRes, templatesRes, userTemplateRes] = await Promise.all([
                    api.admin.getUserAllowances(user.id, token),
                    api.admin.getUserWorkoutSchedule(user.id, token),
                    api.admin.getMenuTemplates(token),
                    api.admin.getUserMenuTemplate(user.id, token),
                  ]);
      
      // Load menu templates
      setMenuTemplates(templatesRes.templates || []);
      const userTemplateId = userTemplateRes.templateId;
      setSelectedTemplateId(userTemplateId);
      
      // Load menu items based on selected template
      if (userTemplateId) {
        // User has a custom template, fetch it
        try {
          const templateRes = await api.admin.getMenuTemplate(userTemplateId, token);
          setUserMenuItems({
            protein: templateRes.template.protein || [],
            carbs: templateRes.template.carbs || [],
            fat: templateRes.template.fat || [],
          });
        } catch (err) {
          console.error('Failed to load template:', err);
          // Fallback to defaults
          setUserMenuItems({
            protein: PROTEIN_OPTIONS,
            carbs: CARB_OPTIONS,
            fat: FAT_OPTIONS,
          });
        }
      } else {
        // No template selected, use default foods from foodDatabase
        setUserMenuItems({
          protein: PROTEIN_OPTIONS,
          carbs: CARB_OPTIONS,
          fat: FAT_OPTIONS,
        });
      }
      setUserAllowances(allowancesRes.allowances || {
        protein: 5,
        carbs: 5,
        fat: 1,
        freeCalories: 200,
      });
      const defaultSchedule = scheduleRes.schedule || {
        weeklyMuscle: 4,
        weeklyCardio: 3,
        workoutRoutine: {
          1: { name: 'Workout 1', exercises: {} },
        },
      };
      // Convert old format (bodyParts) to new format (exercises) if needed
      if (defaultSchedule.workoutRoutine) {
        Object.keys(defaultSchedule.workoutRoutine).forEach(workoutNum => {
          const workout = defaultSchedule.workoutRoutine[workoutNum];
          if (workout.bodyParts && !workout.exercises) {
            // Convert bodyParts to exercises (include all exercises from those body parts)
            const exercises = {};
            workout.bodyParts.forEach(bodyPartKey => {
              const bodyPart = EXERCISES_BY_BODY_PART[bodyPartKey];
              if (bodyPart) {
                bodyPart.exercises.forEach(exercise => {
                  exercises[`${bodyPartKey}-${exercise.id}`] = true;
                });
              }
            });
            workout.exercises = exercises;
            delete workout.bodyParts;
          }
        });
      }
      
      // Ensure all workouts from 1 to weeklyMuscle exist
      const weeklyMuscle = defaultSchedule.weeklyMuscle || 4;
      const routine = defaultSchedule.workoutRoutine || {};
      
      // Normalize workout keys (convert string keys to numbers) and ensure all workouts exist
      const normalizedRoutine = {};
      
      // First, copy existing workouts (handling both string and number keys)
      for (const key in routine) {
        const numKey = parseInt(key);
        if (!isNaN(numKey) && numKey >= 1 && numKey <= weeklyMuscle) {
          normalizedRoutine[numKey] = {
            name: routine[key].name || `Workout ${numKey}`,
            exercises: routine[key].exercises || {}
          };
        }
      }
      
      // Ensure all workouts from 1 to weeklyMuscle exist
      for (let i = 1; i <= weeklyMuscle; i++) {
        if (!normalizedRoutine[i]) {
          normalizedRoutine[i] = { name: `Workout ${i}`, exercises: {} };
        }
      }
      
      setWorkoutSchedule({
        ...defaultSchedule,
        workoutRoutine: normalizedRoutine
      });
      setCustomExercises(defaultSchedule.customExercises || {});
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveMenu = async () => {
    try {
      // If a template is selected, update that template
      if (selectedTemplateId) {
        await api.admin.updateMenuTemplate(selectedTemplateId, {
          name: menuTemplates.find(t => t.id === selectedTemplateId)?.name || 'Template',
          protein: userMenuItems.protein,
          carbs: userMenuItems.carbs,
          fat: userMenuItems.fat,
        }, token);
        setSuccess('Menu template updated successfully');
      } else {
        // No template selected, create a new one or save as default
        setError('Please select or create a menu template first');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectTemplate = async (templateId) => {
    try {
      setSelectedTemplateId(templateId);
      await api.admin.setUserMenuTemplate(selectedUser.id, templateId, token);
      
      if (templateId) {
        // Load the template
        const templateRes = await api.admin.getMenuTemplate(templateId, token);
        setUserMenuItems({
          protein: templateRes.template.protein || [],
          carbs: templateRes.template.carbs || [],
          fat: templateRes.template.fat || [],
        });
      } else {
        // Use defaults
        setUserMenuItems({
          protein: PROTEIN_OPTIONS,
          carbs: CARB_OPTIONS,
          fat: FAT_OPTIONS,
        });
      }
      setSuccess('Menu template selected successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      setError('Please enter a template name');
      return;
    }
    try {
      const res = await api.admin.createMenuTemplate({
        name: newTemplateName.trim(),
        protein: userMenuItems.protein,
        carbs: userMenuItems.carbs,
        fat: userMenuItems.fat,
      }, token);
      
      // Reload templates
      const templatesRes = await api.admin.getMenuTemplates(token);
      setMenuTemplates(templatesRes.templates || []);
      
      // Select the new template
      setSelectedTemplateId(res.id);
      await api.admin.setUserMenuTemplate(selectedUser.id, res.id, token);
      setNewTemplateName('');
      setSuccess('Menu template created and selected successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    if (!window.confirm(`Are you sure you want to delete the menu template "${templateName}"? This will set all users using this template back to the default menu.`)) {
      return;
    }
    try {
      await api.admin.deleteMenuTemplate(templateId, token);
      
      // If the deleted template was selected for this user, reset to default
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId(null);
        await api.admin.setUserMenuTemplate(selectedUser.id, null, token);
        setUserMenuItems({
          protein: PROTEIN_OPTIONS,
          carbs: CARB_OPTIONS,
          fat: FAT_OPTIONS,
        });
      }
      
      // Reload templates
      const templatesRes = await api.admin.getMenuTemplates(token);
      setMenuTemplates(templatesRes.templates || []);
      
      setSuccess('Menu template deleted successfully');
    } catch (err) {
      setError(err.message);
    }
  };


  if (!isAdmin) {
    return <div className="admin-panel">Access denied. Admin privileges required.</div>;
  }

  const openEditMenuItem = (category, index) => {
    const item = userMenuItems[category]?.[index] || {};
    setEditingMenuItem({ category, index, item: { ...item } });
  };

  const closeEditMenuItem = () => {
    setEditingMenuItem(null);
  };

  const saveMenuItem = (updatedItem) => {
    if (!editingMenuItem) return;
    const { category, index } = editingMenuItem;
    const list = userMenuItems[category] ? [...userMenuItems[category]] : [];
    if (index >= 0 && index < list.length) {
      list[index] = { ...list[index], ...updatedItem, id: list[index].id || Date.now() };
    } else {
      list.push({ ...updatedItem, id: Date.now() });
    }
    setUserMenuItems({ ...userMenuItems, [category]: list });
    closeEditMenuItem();
  };

  const addMenuItem = (category) => {
    const newItem = { 
      id: Date.now(),
      name: '',
      nameEn: '',
      amount: '',
      amountEn: ''
    };
    const list = userMenuItems[category] ? [...userMenuItems[category]] : [];
    list.push(newItem);
    setUserMenuItems({ ...userMenuItems, [category]: list });
    setEditingMenuItem({ category, index: list.length - 1, item: newItem });
  };

  const removeMenuItem = (category, index) => {
    const list = userMenuItems[category] ? [...userMenuItems[category]] : [];
    list.splice(index, 1);
    setUserMenuItems({ ...userMenuItems, [category]: list });
  };

  const handleSaveAllowances = async () => {
    try {
      await api.admin.updateUserAllowances(selectedUser.id, userAllowances, token);
      setSuccess('Daily allowances updated successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveWorkoutSchedule = async () => {
    // Ensure all workouts from 1 to weeklyMuscle exist
    const routine = { ...workoutSchedule.workoutRoutine };
    for (let i = 1; i <= workoutSchedule.weeklyMuscle; i++) {
      if (!routine[i]) {
        routine[i] = { name: `Workout ${i}`, exercises: {} };
      }
    }
    
    // Validate that each workout (1..weeklyMuscle) has at least one exercise
    for (let i = 1; i <= workoutSchedule.weeklyMuscle; i++) {
      const workout = routine[i];
      const hasExercises = workout && workout.exercises && Object.keys(workout.exercises).length > 0;
      if (!hasExercises) {
        alert(`Please add at least one exercise to Workout ${i} before saving.`);
        return;
      }
    }

    try {
      await api.admin.updateUserWorkoutSchedule(selectedUser.id, { 
        ...workoutSchedule, 
        workoutRoutine: routine,
        customExercises 
      }, token);
      setSuccess('Workout schedule updated successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleExerciseInWorkout = (workoutNumber, exerciseKey) => {
    console.log('Toggle exercise:', workoutNumber, exerciseKey);
    const routine = { ...workoutSchedule.workoutRoutine };
    const workout = { ...routine[workoutNumber] };
    const exercises = { ...(workout.exercises || {}) };
    console.log('Current exercises:', exercises);
    
    // Check if exercise is already selected (could be in either format)
    const existingKey = Object.keys(exercises).find(key => {
      if (key === exerciseKey) return true;
      // Also check if it's the same exercise in different format
      if (exerciseKey.startsWith('custom-')) {
        const parts = exerciseKey.split('-');
        if (parts.length >= 3) {
          const bodyPartKey = parts[1];
          const exerciseId = parts[2];
          return key === `${bodyPartKey}-${exerciseId}`;
        }
      } else {
        const [bodyPartKey, exerciseId] = exerciseKey.split('-');
        return key === `custom-${bodyPartKey}-${exerciseId}`;
      }
      return false;
    });
    console.log('Existing key:', existingKey);
    
    if (existingKey) {
      // Remove exercise (remove both formats if they exist)
      delete exercises[existingKey];
      if (exerciseKey.startsWith('custom-')) {
        const parts = exerciseKey.split('-');
        if (parts.length >= 3) {
          const bodyPartKey = parts[1];
          const exerciseId = parts[2];
          delete exercises[`${bodyPartKey}-${exerciseId}`];
        }
      } else {
        const [bodyPartKey, exerciseId] = exerciseKey.split('-');
        delete exercises[`custom-${bodyPartKey}-${exerciseId}`];
      }
    } else {
      // Add exercise with default sets/reps
      if (exerciseKey.startsWith('custom-')) {
        // Custom exercise format: 'custom-bodyPart-id'
        const parts = exerciseKey.split('-');
        if (parts.length >= 3) {
          const bodyPartKey = parts[1];
          const customId = parseInt(parts[2]);
          // Check both user's and admin's custom exercises
          const userCustomExercisesForBodyPart = customExercises[bodyPartKey] || [];
          const adminCustomExercisesForBodyPart = adminCustomExercises[bodyPartKey] || [];
          const customExercise = userCustomExercisesForBodyPart.find(ex => ex.id === customId)
            || adminCustomExercisesForBodyPart.find(ex => ex.id === customId);
          if (customExercise) {
            exercises[exerciseKey] = {
              sets: customExercise.sets || 4,
              reps: customExercise.reps || '12-15',
            };
          } else {
            // Fallback: add with defaults if exercise not found (shouldn't happen, but safety net)
            exercises[exerciseKey] = {
              sets: 4,
              reps: '12-15',
            };
          }
        }
      } else {
        // Default exercise format: 'bodyPart-id'
        const [bodyPartKey, exerciseId] = exerciseKey.split('-');
        const exerciseIdNum = parseInt(exerciseId);
        
        // Check if there's an override for this exercise (in user's or admin's custom exercises)
        const userCustomExercisesForBodyPart = customExercises[bodyPartKey] || [];
        const adminCustomExercisesForBodyPart = adminCustomExercises[bodyPartKey] || [];
        const override = userCustomExercisesForBodyPart.find(ex => ex.originalId === exerciseIdNum)
          || adminCustomExercisesForBodyPart.find(ex => ex.originalId === exerciseIdNum);
        
        if (override) {
          // Use override values
          exercises[exerciseKey] = {
            sets: override.sets || 4,
            reps: override.reps || '12-15',
          };
        } else {
          // Use default exercise values
          const bodyPart = EXERCISES_BY_BODY_PART[bodyPartKey];
          if (bodyPart) {
            const exercise = bodyPart.exercises.find(ex => ex.id === exerciseIdNum);
            if (exercise) {
              exercises[exerciseKey] = {
                sets: exercise.sets || 4,
                reps: exercise.reps || '12-15',
              };
            } else {
              // Fallback: add with defaults if exercise not found
              exercises[exerciseKey] = {
                sets: 4,
                reps: '12-15',
              };
            }
          } else {
            // Fallback: add with defaults if body part not found
            exercises[exerciseKey] = {
              sets: 4,
              reps: '12-15',
            };
          }
        }
      }
    }
    
    workout.exercises = exercises;
    routine[workoutNumber] = workout;
    console.log('New exercises:', exercises);
    console.log('New routine:', routine);
    setWorkoutSchedule(prev => ({
      ...prev,
      workoutRoutine: routine
    }));
  };

  const updateExerciseSets = (workoutNumber, exerciseKey, sets) => {
    const routine = { ...workoutSchedule.workoutRoutine };
    const workout = { ...routine[workoutNumber] };
    const exercises = { ...(workout.exercises || {}) };
    
    if (exercises[exerciseKey]) {
      exercises[exerciseKey] = {
        ...exercises[exerciseKey],
        sets: parseInt(sets) || 0,
      };
    }
    
    workout.exercises = exercises;
    routine[workoutNumber] = workout;
    setWorkoutSchedule({ ...workoutSchedule, workoutRoutine: routine });
  };

  const updateExerciseReps = (workoutNumber, exerciseKey, reps) => {
    const routine = { ...workoutSchedule.workoutRoutine };
    const workout = { ...routine[workoutNumber] };
    const exercises = { ...(workout.exercises || {}) };
    
    if (exercises[exerciseKey]) {
      exercises[exerciseKey] = {
        ...exercises[exerciseKey],
        reps: reps,
      };
    }
    
    workout.exercises = exercises;
    routine[workoutNumber] = workout;
    setWorkoutSchedule({ ...workoutSchedule, workoutRoutine: routine });
  };

  const toggleAllExercisesForBodyPart = (workoutNumber, bodyPartExercises, memberKeys) => {
    const routine = { ...workoutSchedule.workoutRoutine };
    const workout = { ...routine[workoutNumber] };
    const exercises = { ...(workout.exercises || {}) };
    
    // Check if all exercises are selected
    let allSelected = true;
    for (const exercise of bodyPartExercises) {
      const isCustom = !exercise.originalId && !exercise.isOverride && !exercise.hiddenId;
      const baseBodyPartKey = exercise.originalKey || exercise.bodyPartKey || memberKeys[0];
      const exerciseKey = isCustom 
        ? `custom-${baseBodyPartKey}-${exercise.id}`
        : `${baseBodyPartKey}-${exercise.originalId || exercise.id}`;
      
      // Check if exercise is selected (could be in either format)
      const exerciseData = exercises[exerciseKey] 
        || exercises[`${baseBodyPartKey}-${exercise.originalId || exercise.id}`] 
        || exercises[`custom-${baseBodyPartKey}-${exercise.id}`];
      
      if (!exerciseData) {
        allSelected = false;
        break;
      }
    }
    
    // Toggle all exercises
    for (const exercise of bodyPartExercises) {
      const isCustom = !exercise.originalId && !exercise.isOverride && !exercise.hiddenId;
      const baseBodyPartKey = exercise.originalKey || exercise.bodyPartKey || memberKeys[0];
      const exerciseKey = isCustom 
        ? `custom-${baseBodyPartKey}-${exercise.id}`
        : `${baseBodyPartKey}-${exercise.originalId || exercise.id}`;
      
      if (allSelected) {
        // Deselect all - remove all formats
        delete exercises[exerciseKey];
        delete exercises[`${baseBodyPartKey}-${exercise.originalId || exercise.id}`];
        delete exercises[`custom-${baseBodyPartKey}-${exercise.id}`];
      } else {
        // Select all - add with default sets/reps
        if (isCustom) {
          const customId = parseInt(exercise.id);
          const userCustomExercisesForBodyPart = customExercises[baseBodyPartKey] || [];
          const adminCustomExercisesForBodyPart = adminCustomExercises[baseBodyPartKey] || [];
          const customExercise = userCustomExercisesForBodyPart.find(ex => ex.id === customId)
            || adminCustomExercisesForBodyPart.find(ex => ex.id === customId);
          if (customExercise) {
            exercises[exerciseKey] = {
              sets: customExercise.sets || 4,
              reps: customExercise.reps || '12-15',
            };
          } else {
            exercises[exerciseKey] = {
              sets: 4,
              reps: '12-15',
            };
          }
        } else {
          const exerciseIdNum = parseInt(exercise.originalId || exercise.id);
          const userCustomExercisesForBodyPart = customExercises[baseBodyPartKey] || [];
          const adminCustomExercisesForBodyPart = adminCustomExercises[baseBodyPartKey] || [];
          const override = userCustomExercisesForBodyPart.find(ex => ex.originalId === exerciseIdNum)
            || adminCustomExercisesForBodyPart.find(ex => ex.originalId === exerciseIdNum);
          
          if (override) {
            exercises[exerciseKey] = {
              sets: override.sets || 4,
              reps: override.reps || '12-15',
            };
          } else {
            const bodyPart = EXERCISES_BY_BODY_PART[baseBodyPartKey];
            if (bodyPart) {
              const defaultExercise = bodyPart.exercises.find(ex => ex.id === exerciseIdNum);
              if (defaultExercise) {
                exercises[exerciseKey] = {
                  sets: defaultExercise.sets || 4,
                  reps: defaultExercise.reps || '12-15',
                };
              } else {
                exercises[exerciseKey] = {
                  sets: 4,
                  reps: '12-15',
                };
              }
            } else {
              exercises[exerciseKey] = {
                sets: 4,
                reps: '12-15',
              };
            }
          }
        }
      }
    }
    
    workout.exercises = exercises;
    routine[workoutNumber] = workout;
    setWorkoutSchedule({ ...workoutSchedule, workoutRoutine: routine });
  };

  const updateWeeklyMuscle = (value) => {
    const newValue = parseInt(value) || 1;
    const routine = { ...workoutSchedule.workoutRoutine };
    
    // Add or remove workout slots based on new value
    const currentCount = Object.keys(routine).length;
    
    if (newValue > currentCount) {
      // Add new workout slots
      for (let i = currentCount + 1; i <= newValue; i++) {
        if (!routine[i]) {
          routine[i] = { name: `Workout ${i}`, exercises: {} };
        }
      }
    } else if (newValue < currentCount) {
      // Remove excess workout slots
      Object.keys(routine).forEach(key => {
        if (parseInt(key) > newValue) {
          delete routine[key];
        }
      });
    }
    
    setWorkoutSchedule({ ...workoutSchedule, weeklyMuscle: newValue, workoutRoutine: routine });
  };

  const getExercisesForGroup = (groupKey) => {
    const group = getBodyPartGroups().find(g => g.key === groupKey);
    if (!group) return [];

    const memberKeys = group.bodyPartKeys || [groupKey];

    // Merge default exercises for group, tagging shoulders with type and origin key
    const defaultExercises = memberKeys.flatMap(key => {
      const normalizedKey = normalizeLegKey(key);
      const bodyPart = EXERCISES_BY_BODY_PART[normalizedKey];
      return (bodyPart?.exercises || []).map(exercise => ({
        ...exercise,
        originalKey: normalizedKey,
        shoulderType: SHOULDER_LABELS[normalizedKey],
        legType: LEG_LABELS[normalizedKey],
      }));
    });

    // Merge user's and admin's custom exercises (admin's take precedence for duplicates)
    const allCustomExercises = memberKeys.flatMap(key => {
      const normalizedKey = normalizeLegKey(key);
      const legacyKey = Object.keys(LEG_KEY_ALIASES).find(k => LEG_KEY_ALIASES[k] === normalizedKey);
      const customExercisesForBodyPart = customExercises[normalizedKey] || (legacyKey ? customExercises[legacyKey] : []) || [];
      const adminCustomExercisesForBodyPart = adminCustomExercises[normalizedKey] || (legacyKey ? adminCustomExercises[legacyKey] : []) || [];

      const merged = [...customExercisesForBodyPart];
      adminCustomExercisesForBodyPart.forEach(adminEx => {
        if (!merged.some(ex => ex.id === adminEx.id && !ex.originalId)) {
          merged.push(adminEx);
        }
      });

      return merged.map(ex => ({
        ...ex,
        bodyPartKey: normalizedKey,
        shoulderType: SHOULDER_LABELS[normalizedKey],
        legType: LEG_LABELS[normalizedKey],
      }));
    });

    // Filter out hidden default exercises
    const visibleDefaultExercises = defaultExercises.filter(ex => 
      !allCustomExercises.some(custom => custom.hiddenId === ex.id && custom.bodyPartKey === ex.originalKey)
    );

    // Get overridden exercises (replace defaults with custom versions)
    const exercises = visibleDefaultExercises.map(ex => {
      const override = allCustomExercises.find(custom => custom.originalId === ex.id && custom.bodyPartKey === ex.originalKey);
      if (override) {
        return {
          ...ex,
          ...override,
          isOverride: true,
          shoulderType: ex.shoulderType || override.shoulderType,
        };
      }
      return ex;
    });

    // Add custom exercises (not overrides, not hidden)
    const pureCustomExercises = allCustomExercises.filter(
      ex => !ex.originalId && !ex.isHidden && !ex.hiddenId
    );
    exercises.push(...pureCustomExercises);

    return exercises;
  };

  const toggleBodyPartExpanded = (workoutNum, bodyPartKey) => {
    const key = `workout-${workoutNum}-${bodyPartKey}`;
    setExpandedBodyParts(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isBodyPartExpanded = (workoutNum, bodyPartKey) => {
    const key = `workout-${workoutNum}-${bodyPartKey}`;
    return expandedBodyParts[key] || false;
  };

  const toggleWorkoutExpanded = (workoutNum) => {
    const key = `workout-${workoutNum}`;
    setExpandedWorkouts(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isWorkoutExpanded = (workoutNum) => {
    const key = `workout-${workoutNum}`;
    return !!expandedWorkouts[key];
  };

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>

      {error && <div className="admin-error">{error}</div>}
      {success && <div className="admin-success">{success}</div>}

      {viewMode === 'users' && (
        <div className="admin-section">
          <h3>User Management</h3>

          <div className="users-list">
            <h4>All Users</h4>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn-edit"
                          onClick={() => handleSelectUser(user)}
                        >
                          Edit Data
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <form onSubmit={handleCreateUser} className="admin-form">
            <h4>Create New User</h4>
            <input
              type="email"
              placeholder="Email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              required
            />
            <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit">Create User</button>
          </form>
        </div>
      )}

      {selectedUser && viewMode === 'menu' && (
        <div className="admin-section">
          <div className="admin-header">
            <h3>Editing Menu for: {selectedUser.email}</h3>
            <div className="admin-actions">
              <button onClick={() => setViewMode('workouts')}>Switch to Workouts</button>
              <button onClick={() => { setSelectedUser(null); setViewMode('users'); }}>Back to Users</button>
            </div>
          </div>

          {/* Menu Template Selection */}
          <div className="menu-template-selector">
            <h4>Menu Template</h4>
            <p className="template-description">
              Select which menu template (list of available foods) this user will see in their dropdown
            </p>
            <div className="template-selection">
              <select
                value={selectedTemplateId || ''}
                onChange={(e) => handleSelectTemplate(e.target.value ? parseInt(e.target.value) : null)}
                className="template-select"
              >
                <option value="">Default Menu (All Foods)</option>
                {menuTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <div className="create-template">
                <input
                  type="text"
                  placeholder="New template name..."
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="template-name-input"
                />
                <button onClick={handleCreateTemplate} className="btn-create-template">
                  Create New Template
                </button>
              </div>
            </div>
            {menuTemplates.length > 0 && (
              <div className="templates-list">
                <h5>Manage Templates</h5>
                <div className="templates-list-items">
                  {menuTemplates.map(template => (
                    <div key={template.id} className="template-item">
                      <span className="template-item-name">{template.name}</span>
                      <button
                        onClick={() => handleDeleteTemplate(template.id, template.name)}
                        className="btn-delete-template"
                        title="Delete template"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Daily Allowances Editor */}
          <div className="allowances-editor">
            <h4>Daily Menu Allowances</h4>
            <p className="allowances-description">
              Set how many servings of each category this user is allowed per day
            </p>
            <div className="allowances-grid">
              <div className="allowance-item">
                <label>Protein Servings:</label>
                <input
                  type="number"
                  min="0"
                  value={userAllowances.protein}
                  onChange={(e) => setUserAllowances({ ...userAllowances, protein: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="allowance-item">
                <label>Carb Servings:</label>
                <input
                  type="number"
                  min="0"
                  value={userAllowances.carbs}
                  onChange={(e) => setUserAllowances({ ...userAllowances, carbs: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="allowance-item">
                <label>Fat Servings:</label>
                <input
                  type="number"
                  min="0"
                  value={userAllowances.fat}
                  onChange={(e) => setUserAllowances({ ...userAllowances, fat: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="allowance-item">
                <label>Free Calories:</label>
                <input
                  type="number"
                  min="0"
                  value={userAllowances.freeCalories}
                  onChange={(e) => setUserAllowances({ ...userAllowances, freeCalories: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <button className="btn-save-allowances" onClick={handleSaveAllowances}>
              Save Daily Allowances
            </button>
          </div>

          <div className="admin-data-editor">
            <div className="menu-editor-container">
              <div className="menu-editor-header">
                <h3>Menu Items</h3>
                <p className="menu-editor-description">Edit the available dishes for each nutrition category</p>
                <button onClick={handleSaveMenu} className="btn-save-menu-primary">Save Menu</button>
              </div>

              <div className="menu-edit-grid">
                {['protein', 'carbs', 'fat'].map((cat) => (
                  <div key={cat} className="menu-category-column">
                    <div className="menu-category-header">
                      <h4 className="menu-category-title">
                        {cat === 'protein' ? '🥩 Protein' : cat === 'carbs' ? '🍞 Carbs' : '🥑 Fat'}
                      </h4>
                      <button 
                        className="btn-add-menu-item"
                        onClick={() => addMenuItem(cat)}
                        title={`Add ${cat} item`}
                      >
                        + Add Item
                      </button>
                    </div>
                    <div className="menu-items-container">
                      {userMenuItems[cat]?.length ? (
                        userMenuItems[cat].map((item, idx) => (
                          <div key={item.id || idx} className="menu-item-card">
                            <div 
                              className="menu-item-display" 
                              onClick={() => openEditMenuItem(cat, idx)}
                            >
                              <div className="menu-item-name-display">
                                {item.nameEn || item.name || 'Unnamed Item'}
                              </div>
                              {(item.amountEn || item.amount) && (
                                <div className="menu-item-amount-display">
                                  {item.amountEn || item.amount}
                                </div>
                              )}
                              {!item.nameEn && !item.name && (
                                <div className="menu-item-placeholder">Click to edit</div>
                              )}
                            </div>
                            <div className="menu-item-buttons">
                              <button 
                                className="btn-edit-menu-item" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditMenuItem(cat, idx);
                                }}
                                title="Edit item"
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn-delete-menu-item" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMenuItem(cat, idx);
                                }}
                                title="Remove item"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="menu-items-empty">
                          <p>No {cat} items yet</p>
                          <button 
                            className="btn-add-first-item"
                            onClick={() => addMenuItem(cat)}
                          >
                            Add First Item
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Menu Item Edit Modal */}
          {editingMenuItem && (
            <MenuItemEditModal
              item={editingMenuItem.item}
              category={editingMenuItem.category}
              onSave={saveMenuItem}
              onClose={closeEditMenuItem}
            />
          )}
        </div>
      )}

      {selectedUser && viewMode === 'workouts' && (
        <div className="admin-section">
          <div className="admin-header">
            <h3>Editing Workouts for: {selectedUser.email}</h3>
            <div className="admin-actions">
              <button onClick={() => setViewMode('menu')}>Switch to Menu</button>
              <button onClick={() => { setSelectedUser(null); setViewMode('users'); }}>Back to Users</button>
            </div>
          </div>

          {/* Workout Schedule Editor */}
          <div className="workout-schedule-editor">
            <h4>Workout Schedule</h4>
            <p className="schedule-description">
              Set weekly goals and customize workout structure
            </p>
            
            <div className="weekly-goals">
              <h5>Weekly Goals</h5>
              <div className="goals-grid">
                <div className="goal-item">
                  <label>Muscle Workouts per Week:</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={workoutSchedule.weeklyMuscle}
                    onChange={(e) => updateWeeklyMuscle(e.target.value)}
                  />
                </div>
                <div className="goal-item">
                  <label>Cardio Workouts per Week:</label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={workoutSchedule.weeklyCardio}
                    onChange={(e) => setWorkoutSchedule({ ...workoutSchedule, weeklyCardio: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="workout-routine-editor">
              <h5>Workout Structure</h5>
              <p className="routine-description">
                Select exercises for each workout, organized by body part
              </p>
              {Array.from({ length: workoutSchedule.weeklyMuscle }, (_, i) => i + 1).map((workoutNum) => {
                const workout = workoutSchedule.workoutRoutine[workoutNum] || { name: `Workout ${workoutNum}`, exercises: {} };
                const workoutExercises = workout.exercises || {};
                const expanded = isWorkoutExpanded(workoutNum);
                
                return (
                  <div key={workoutNum} className="workout-routine-item">
                    <div
                      className="workout-header clickable"
                      onClick={() => toggleWorkoutExpanded(workoutNum)}
                    >
                      <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
                      <h6>{workout.name}</h6>
                    </div>
                    {expanded && getBodyPartGroups().map((bodyPart) => {
                      const bodyPartExercises = getExercisesForGroup(bodyPart.key);
                      const memberKeys = bodyPart.bodyPartKeys || [bodyPart.key];
                      const displayKey = bodyPart.key;

                      // Count selected exercises (check both default and custom formats)
                      const selectedExercises = bodyPartExercises.filter(ex => {
                        const baseKey = ex.originalKey || ex.bodyPartKey || memberKeys[0];
                        const defaultKey = `${baseKey}-${ex.originalId || ex.id}`;
                        const customKey = `custom-${baseKey}-${ex.id}`;
                        return workoutExercises[defaultKey] || workoutExercises[customKey];
                      });
                      
                      // Only show body part if it has exercises
                      if (bodyPartExercises.length === 0) return null;
                      
                      const isExpanded = isBodyPartExpanded(workoutNum, displayKey);
                      
                      return (
                        <div key={displayKey} className="body-part-section">
                          <div 
                            className="body-part-title clickable"
                            onClick={() => toggleBodyPartExpanded(workoutNum, displayKey)}
                          >
                            <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                            <span className="body-part-name">
                              {bodyPart.nameEn} ({bodyPart.name})
                            </span>
                            {selectedExercises.length > 0 && (
                              <span className="exercise-count">({selectedExercises.length} selected)</span>
                            )}
                          </div>
                          {isExpanded && (
                            <div className="exercises-list">
                              {/* Select All button */}
                              <div className="select-all-exercises">
                                <button
                                  className="btn-select-all"
                                  onClick={() => toggleAllExercisesForBodyPart(workoutNum, bodyPartExercises, memberKeys)}
                                >
                                  {selectedExercises.length === bodyPartExercises.length 
                                    ? '✓ Deselect All' 
                                    : 'Select All'}
                                </button>
                              </div>
                              {bodyPartExercises.map((exercise) => {
                                // Determine if this is a custom exercise (not an override, not a default)
                                const isCustom = !exercise.originalId && !exercise.isOverride && !exercise.hiddenId;
                                const baseBodyPartKey = exercise.originalKey || exercise.bodyPartKey || memberKeys[0];
                                // Use custom key for custom exercises, default key for others
                                const exerciseKey = isCustom 
                                  ? `custom-${baseBodyPartKey}-${exercise.id}`
                                  : `${baseBodyPartKey}-${exercise.originalId || exercise.id}`;
                                
                                // Check if exercise is selected (could be in either format)
                                const exerciseData = workoutExercises[exerciseKey] 
                                  || workoutExercises[`${baseBodyPartKey}-${exercise.originalId || exercise.id}`] 
                                  || workoutExercises[`custom-${baseBodyPartKey}-${exercise.id}`];
                                const isSelected = !!exerciseData;
                                const customSets = exerciseData?.sets ?? exercise.sets ?? 4;
                                const customReps = exerciseData?.reps ?? exercise.reps ?? '12-15';
                                
                                return (
                                  <div key={exercise.id} className={`exercise-item ${exercise.isOverride ? 'overridden-exercise' : ''} ${isCustom ? 'custom-exercise' : ''}`}>
                                    <label className="exercise-checkbox">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleExerciseInWorkout(workoutNum, exerciseKey)}
                                      />
                                      <span className="exercise-name">
                                        {exercise.nameEn}
                                        {exercise.shoulderType && <span className="shoulder-tag">{exercise.shoulderType}</span>}
                                      </span>
                                    </label>
                                    {isSelected && (
                                      <div className="exercise-params">
                                        <div className="param-group">
                                          <label>Sets:</label>
                                          <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={customSets}
                                            onChange={(e) => updateExerciseSets(workoutNum, exerciseKey, e.target.value)}
                                            className="param-input"
                                          />
                                        </div>
                                        <div className="param-group">
                                          <label>Reps:</label>
                                          <input
                                            type="text"
                                            value={customReps}
                                            onChange={(e) => updateExerciseReps(workoutNum, exerciseKey, e.target.value)}
                                            className="param-input"
                                            placeholder="12-15"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <button className="btn-save-schedule" onClick={handleSaveWorkoutSchedule}>
              Save Workout Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItemEditModal({ item, category, onSave, onClose }) {
  const [editedItem, setEditedItem] = useState({
    name: item.name || '',
    nameEn: item.nameEn || '',
    amount: item.amount || '',
    amountEn: item.amountEn || '',
    id: item.id || Date.now(),
  });

  const handleSave = () => {
    if (!editedItem.nameEn && !editedItem.name) {
      alert('Please enter at least a name');
      return;
    }
    onSave(editedItem);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Menu Item</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-field">
            <label>Hebrew Name:</label>
            <input
              type="text"
              value={editedItem.name}
              onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
              placeholder="שם בעברית"
            />
          </div>
          <div className="form-field">
            <label>English Name: *</label>
            <input
              type="text"
              value={editedItem.nameEn}
              onChange={(e) => setEditedItem({ ...editedItem, nameEn: e.target.value })}
              placeholder="English name"
              required
            />
          </div>
          <div className="form-field">
            <label>Hebrew Amount:</label>
            <input
              type="text"
              value={editedItem.amount}
              onChange={(e) => setEditedItem({ ...editedItem, amount: e.target.value })}
              placeholder="כמות בעברית (לדוגמה: 3 כוסות חלב)"
            />
          </div>
          <div className="form-field">
            <label>English Amount:</label>
            <input
              type="text"
              value={editedItem.amountEn}
              onChange={(e) => setEditedItem({ ...editedItem, amountEn: e.target.value })}
              placeholder="Amount in English (e.g., 3 cups of milk)"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;

