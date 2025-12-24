import React, { useState, useEffect } from 'react';
import { BODY_PARTS, EXERCISES_BY_BODY_PART } from '../data/exercisesDatabase';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Exercises.css';

function Exercises() {
  const [openBodyPart, setOpenBodyPart] = useState(null);
  const [customExercises, setCustomExercises] = useState({});
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [selectedBodyPartForAdd, setSelectedBodyPartForAdd] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null); // { bodyPartKey, exerciseId, isCustom }
  const [newExercise, setNewExercise] = useState({
    name: '',
    nameEn: '',
    videoUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const { isAuthenticated, token, isAdmin, user } = useAuth();

  const SHOULDER_KEYS = ['middleShoulder', 'rearShoulder'];
  const SHOULDER_LABELS = {
    middleShoulder: 'Middle Shoulder',
    rearShoulder: 'Rear Shoulder',
  };
  const LEG_KEYS = ['quadriceps', 'hamstrings', 'calves'];
  const LEG_KEY_ALIASES = { calvs: 'calves' }; // legacy compatibility
  const LEG_LABELS = {
    quadriceps: 'Quadriceps',
    hamstrings: 'Hamstrings',
    calves: 'Calves',
  };
  const normalizeLegKey = (key) => LEG_KEY_ALIASES[key] || key;

  useEffect(() => {
    const fetchCustomExercises = async () => {
      if (isAuthenticated && token) {
        try {
          const res = await api.fetchWorkoutSchedule(token);
          setCustomExercises(res.schedule?.customExercises || {});
        } catch (err) {
          console.error('Failed to fetch custom exercises', err);
        }
      }
    };
    fetchCustomExercises();
  }, [isAuthenticated, token]);

  // Clear "Edited" badge after a short window so it does not persist on reload

  const openAddExerciseModal = (bodyPartKey) => {
    setSelectedBodyPartForAdd(bodyPartKey);
    setEditingExercise(null);
    setNewExercise({
      name: '',
      nameEn: '',
      videoUrl: '',
    });
    setShowAddExerciseModal(true);
  };

  const openEditExerciseModal = (bodyPartKey, exercise, isCustom) => {
    setSelectedBodyPartForAdd(bodyPartKey);
    setEditingExercise({
      bodyPartKey,
      exerciseId: exercise.id,
      isCustom,
    });
    setNewExercise({
      name: exercise.name || '',
      nameEn: exercise.nameEn || '',
      videoUrl: exercise.videoUrl || '',
    });
    setShowAddExerciseModal(true);
  };

  const closeAddExerciseModal = () => {
    setShowAddExerciseModal(false);
    setSelectedBodyPartForAdd(null);
    setEditingExercise(null);
  };

  const handleSaveExercise = async () => {
    if (!selectedBodyPartForAdd || !newExercise.nameEn.trim()) {
      alert('Please fill in at least the English name');
      return;
    }

    setSaving(true);
    try {
      // Fetch current workout schedule
      const res = await api.fetchWorkoutSchedule(token);
      const currentSchedule = res.schedule || {
        weeklyMuscle: 4,
        weeklyCardio: 3,
        workoutRoutine: { 1: { name: 'Workout 1', exercises: {} } },
        customExercises: {},
      };

      let updatedCustomExercises = { ...(currentSchedule.customExercises || {}) };

      if (editingExercise) {
        // Editing existing exercise
        if (editingExercise.isCustom) {
          // Update custom exercise
          const bodyPartExercises = (updatedCustomExercises[selectedBodyPartForAdd] || []).map(ex =>
            ex.id === editingExercise.exerciseId
              ? {
                  ...ex,
                  name: newExercise.name.trim(),
                  nameEn: newExercise.nameEn.trim(),
                  videoUrl: newExercise.videoUrl.trim(),
                }
              : ex
          );
          updatedCustomExercises[selectedBodyPartForAdd] = bodyPartExercises;
        } else {
          // Editing default exercise - create/update custom override
          const existingOverride = (updatedCustomExercises[selectedBodyPartForAdd] || []).find(
            ex => ex.originalId === editingExercise.exerciseId
          );
          if (existingOverride) {
            // Update existing override
            updatedCustomExercises[selectedBodyPartForAdd] = (updatedCustomExercises[selectedBodyPartForAdd] || []).map(ex =>
              ex.originalId === editingExercise.exerciseId
                ? {
                    ...ex,
                    name: newExercise.name.trim(),
                    nameEn: newExercise.nameEn.trim(),
                    videoUrl: newExercise.videoUrl.trim(),
                  }
                : ex
            );
          } else {
            // Create new override
            const defaultExercise = EXERCISES_BY_BODY_PART[selectedBodyPartForAdd]?.exercises.find(
              ex => ex.id === editingExercise.exerciseId
            );
            updatedCustomExercises[selectedBodyPartForAdd] = [
              ...(updatedCustomExercises[selectedBodyPartForAdd] || []),
              {
                id: Date.now(),
                originalId: editingExercise.exerciseId, // Track which default exercise this overrides
                name: newExercise.name.trim() || defaultExercise?.name || '',
                nameEn: newExercise.nameEn.trim() || defaultExercise?.nameEn || '',
                sets: defaultExercise?.sets || 4,
                reps: defaultExercise?.reps || '12-15',
                videoUrl: newExercise.videoUrl.trim() || defaultExercise?.videoUrl || '',
                isOverride: true,
              },
            ];
          }
        }
      } else {
        // Adding new exercise
        updatedCustomExercises = {
          ...updatedCustomExercises,
          [selectedBodyPartForAdd]: [
            ...(updatedCustomExercises[selectedBodyPartForAdd] || []),
            {
              id: Date.now(),
              name: newExercise.name.trim(),
              nameEn: newExercise.nameEn.trim(),
              sets: 4, // Default value
              reps: '12-15', // Default value
              videoUrl: newExercise.videoUrl.trim(),
            },
          ],
        };
      }

      // Update workout schedule with new custom exercises
      await api.admin.updateUserWorkoutSchedule(user.id, {
        weeklyMuscle: currentSchedule.weeklyMuscle || 4,
        weeklyCardio: currentSchedule.weeklyCardio || 3,
        workoutRoutine: currentSchedule.workoutRoutine || { 1: { name: 'Workout 1', exercises: {} } },
        customExercises: updatedCustomExercises,
      }, token);

      // Update local state
      setCustomExercises(updatedCustomExercises);
      if (editingExercise) {
      }
      closeAddExerciseModal();
    } catch (err) {
      console.error('Failed to save exercise', err);
      alert('Failed to save exercise: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExercise = async (bodyPartKey, exerciseId, isDefault = false, originalId = null) => {
    let confirmMessage = 'Are you sure you want to delete this exercise?';
    if (isDefault && originalId) {
      confirmMessage = 'Are you sure you want to remove the custom override? The default exercise will be restored.';
    } else if (isDefault) {
      confirmMessage = 'Are you sure you want to hide this exercise? You can restore it later by editing it.';
    }
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Fetch current workout schedule
      const res = await api.fetchWorkoutSchedule(token);
      const currentSchedule = res.schedule || {
        weeklyMuscle: 4,
        weeklyCardio: 3,
        workoutRoutine: { 1: { name: 'Workout 1', exercises: {} } },
        customExercises: {},
      };

      let updatedCustomExercises = { ...(currentSchedule.customExercises || {}) };

      if (isDefault && !originalId) {
        // Hiding a default exercise - create a hidden marker
        const defaultExercise = EXERCISES_BY_BODY_PART[bodyPartKey]?.exercises.find(ex => ex.id === exerciseId);
        if (defaultExercise) {
          const existingHidden = (updatedCustomExercises[bodyPartKey] || []).find(ex => ex.hiddenId === exerciseId);
          if (!existingHidden) {
            updatedCustomExercises[bodyPartKey] = [
              ...(updatedCustomExercises[bodyPartKey] || []),
              {
                id: Date.now(),
                hiddenId: exerciseId, // Track which default exercise is hidden
                isHidden: true,
              },
            ];
          }
        }
      } else {
        // Removing custom exercise or override
        const bodyPartExercises = (updatedCustomExercises[bodyPartKey] || []).filter(
          ex => ex.id !== exerciseId && ex.hiddenId !== exerciseId
        );

        if (bodyPartExercises.length === 0) {
          delete updatedCustomExercises[bodyPartKey];
        } else {
          updatedCustomExercises[bodyPartKey] = bodyPartExercises;
        }
      }

      // Remove exercise from all workout routines
      const updatedWorkoutRoutine = { ...currentSchedule.workoutRoutine };
      Object.keys(updatedWorkoutRoutine).forEach(workoutNum => {
        const workout = updatedWorkoutRoutine[workoutNum];
        if (workout.exercises) {
          const exercises = { ...workout.exercises };
          // Remove all references to this exercise
          Object.keys(exercises).forEach(key => {
            if (key === `custom-${bodyPartKey}-${exerciseId}` || key === `${bodyPartKey}-${exerciseId}`) {
              delete exercises[key];
            }
          });
          workout.exercises = exercises;
        }
      });

      // Update workout schedule
      await api.admin.updateUserWorkoutSchedule(user.id, {
        weeklyMuscle: currentSchedule.weeklyMuscle || 4,
        weeklyCardio: currentSchedule.weeklyCardio || 3,
        workoutRoutine: updatedWorkoutRoutine,
        customExercises: updatedCustomExercises,
      }, token);

      // Update local state
      setCustomExercises(updatedCustomExercises);
    } catch (err) {
      console.error('Failed to delete exercise', err);
      alert('Failed to delete exercise: ' + err.message);
    }
  };

  const toggleBodyPart = (bodyPartKey) => {
    if (openBodyPart === bodyPartKey) {
      setOpenBodyPart(null);
    } else {
      setOpenBodyPart(bodyPartKey);
    }
  };

  const openVideo = (exercise) => {
    // If custom exercise has videoUrl, use it directly, otherwise search YouTube
    if (exercise.videoUrl) {
      window.open(exercise.videoUrl, '_blank');
    } else {
      // Search YouTube with Hebrew exercise name
      const searchQuery = encodeURIComponent(exercise.name);
      const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
      window.open(youtubeSearchUrl, '_blank');
    }
  };

  const buildBodyPartsList = () => {
    return BODY_PARTS.reduce((acc, bodyPart) => {
      if (SHOULDER_KEYS.includes(bodyPart.key)) {
        let shouldersGroup = acc.find(bp => bp.key === 'shoulders');
        if (!shouldersGroup) {
          shouldersGroup = {
            key: 'shoulders',
            nameEn: 'Shoulders',
            name: 'כתפיים',
            exercises: [],
            bodyPartKeys: SHOULDER_KEYS,
          };
          acc.push(shouldersGroup);
        }

        const labeledExercises = (bodyPart.exercises || []).map(ex => ({
          ...ex,
          originalKey: bodyPart.key,
          shoulderType: SHOULDER_LABELS[bodyPart.key],
        }));
        shouldersGroup.exercises.push(...labeledExercises);
      } else if (LEG_KEYS.includes(bodyPart.key)) {
        let legsGroup = acc.find(bp => bp.key === 'legs');
        if (!legsGroup) {
          legsGroup = {
            key: 'legs',
            nameEn: 'Legs',
            name: 'רגליים',
            exercises: [],
            bodyPartKeys: LEG_KEYS,
          };
          acc.push(legsGroup);
        }

        const labeledExercises = (bodyPart.exercises || []).map(ex => ({
          ...ex,
          originalKey: bodyPart.key,
          legType: LEG_LABELS[normalizeLegKey(bodyPart.key)],
        }));
        legsGroup.exercises.push(...labeledExercises);
      } else {
        acc.push({
          ...bodyPart,
          bodyPartKeys: [bodyPart.key],
        });
      }
      return acc;
    }, []);
  };

  const bodyPartsList = buildBodyPartsList();

  return (
    <div className="exercises-container">
      <div className="exercises-header">
        <h2>Workout Exercises</h2>
        <p className="exercises-subtitle">Select a body part to view exercises</p>
        {isAdmin && (
          <button
            className="add-exercise-button"
            onClick={() => {
              // Open modal to select body part first
              setShowAddExerciseModal(true);
            }}
          >
            + Add Exercise
          </button>
        )}
      </div>

      <div className="body-parts-list">
        {bodyPartsList.map((bodyPart) => {
          const isOpen = openBodyPart === bodyPart.key;
          const isShouldersGroup = bodyPart.key === 'shoulders';
          const isLegsGroup = bodyPart.key === 'legs';
          const defaultExercises = bodyPart.exercises || [];
          const customExercisesForBodyPart = isShouldersGroup
            ? SHOULDER_KEYS.flatMap(key => (customExercises[key] || []).map(ex => ({
                ...ex,
                bodyPartKey: key,
                shoulderType: SHOULDER_LABELS[key],
              })))
            : isLegsGroup
            ? [...LEG_KEYS, ...Object.keys(LEG_KEY_ALIASES)].flatMap(key => {
                const normalizedKey = normalizeLegKey(key);
                return (customExercises[key] || []).map(ex => ({
                  ...ex,
                  bodyPartKey: key,
                  legType: LEG_LABELS[normalizedKey],
                  normalizedLegKey: normalizedKey,
                }));
              })
            : (customExercises[bodyPart.key] || []);
          // Filter out hidden default exercises
          const visibleDefaultExercises = defaultExercises.filter(ex => 
            !customExercisesForBodyPart.some(custom => {
              if (isShouldersGroup || isLegsGroup) {
                const customKey = normalizeLegKey(custom.bodyPartKey || custom.normalizedLegKey || custom.originalKey);
                const baseKey = normalizeLegKey(ex.originalKey);
                return custom.hiddenId === ex.id && customKey === baseKey;
              }
              return custom.hiddenId === ex.id;
            })
          );
          // Count visible exercises
          const totalCount = visibleDefaultExercises.length + customExercisesForBodyPart.filter(ex => !ex.isHidden && !ex.originalId).length;

          return (
            <div key={bodyPart.key} className="body-part-section">
              <button
                className={`body-part-header ${isOpen ? 'open' : ''}`}
                onClick={() => toggleBodyPart(bodyPart.key)}
              >
                <span className="body-part-name">
                  {bodyPart.nameEn} ({bodyPart.name})
                </span>
                <span className="exercise-count">{totalCount} exercises</span>
                <span className="dropdown-arrow">{isOpen ? '▼' : '▶'}</span>
              </button>

              {isOpen && (
                <div className="exercises-list">
                  {isAdmin && (
                    isShouldersGroup ? (
                      <div className="add-exercise-inline-button-group">
                        <button
                          className="add-exercise-inline-button"
                          onClick={() => openAddExerciseModal('middleShoulder')}
                        >
                          + Add Middle Shoulder Exercise
                        </button>
                        <button
                          className="add-exercise-inline-button"
                          onClick={() => openAddExerciseModal('rearShoulder')}
                        >
                          + Add Rear Shoulder Exercise
                        </button>
                      </div>
                    ) : (
                      <button
                        className="add-exercise-inline-button"
                        onClick={() => openAddExerciseModal(bodyPart.key)}
                      >
                        + Add Exercise to {bodyPart.nameEn}
                      </button>
                    )
                  )}
                  {/* Default exercises */}
                  {visibleDefaultExercises.map((exercise) => {
                    // Check if there's a custom override for this exercise
                    const override = customExercisesForBodyPart.find(ex => ex.originalId === exercise.id && (isShouldersGroup ? ex.bodyPartKey === exercise.originalKey : true));
                    const displayExercise = override || exercise;
                    const isOverridden = !!override;
                    const baseBodyPartKey = isShouldersGroup || isLegsGroup ? normalizeLegKey(exercise.originalKey) : bodyPart.key;

                    return (
                      <div key={exercise.id} className={`exercise-item ${isOverridden ? 'overridden-exercise' : ''}`}>
                        <div className="exercise-info">
                          <div className="exercise-name">
                            {displayExercise.nameEn}
                            {displayExercise.shoulderType && <span className="shoulder-tag">{displayExercise.shoulderType}</span>}
                            {displayExercise.legType && <span className="shoulder-tag">{displayExercise.legType}</span>}
                          </div>
                          <div className="exercise-name-hebrew">
                            {displayExercise.name}
                          </div>
                        </div>
                        <div className="exercise-actions">
                          <button
                            className="video-button"
                            onClick={() => openVideo(displayExercise)}
                            aria-label="Watch video"
                          >
                            <span className="video-icon">▶</span>
                            <span className="video-text">Watch</span>
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                className="edit-exercise-button"
                                onClick={() => openEditExerciseModal(baseBodyPartKey, displayExercise, isOverridden)}
                                aria-label="Edit exercise"
                                title="Edit exercise"
                              >
                                ✏️
                              </button>
                              <button
                                className="delete-exercise-button"
                                onClick={() => handleDeleteExercise(baseBodyPartKey, exercise.id, true, override?.id)}
                                aria-label={isOverridden ? "Remove custom override" : "Hide exercise"}
                                title={isOverridden ? "Remove custom override" : "Hide exercise"}
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Custom exercises (not overrides) */}
                  {customExercisesForBodyPart
                    .filter(ex => !ex.originalId && !ex.isOverride)
                    .map((exercise) => {
                      const baseBodyPartKey = isShouldersGroup || isLegsGroup
                        ? normalizeLegKey(exercise.bodyPartKey || exercise.originalKey || exercise.normalizedLegKey)
                        : bodyPart.key;
                      return (
                        <div key={`custom-${baseBodyPartKey}-${exercise.id}`} className="exercise-item custom-exercise">
                          <div className="exercise-info">
                            <div className="exercise-name">
                              {exercise.nameEn}
                              {exercise.shoulderType && <span className="shoulder-tag">{exercise.shoulderType}</span>}
                              {exercise.legType && <span className="shoulder-tag">{exercise.legType}</span>}
                            </div>
                            <div className="exercise-name-hebrew">
                              {exercise.name}
                            </div>
                          </div>
                          <div className="exercise-actions">
                            <button
                              className="video-button"
                              onClick={() => openVideo(exercise)}
                              aria-label="Watch video"
                            >
                              <span className="video-icon">▶</span>
                              <span className="video-text">Watch</span>
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  className="edit-exercise-button"
                                  onClick={() => openEditExerciseModal(baseBodyPartKey, exercise, true)}
                                  aria-label="Edit exercise"
                                  title="Edit exercise"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="delete-exercise-button"
                                  onClick={() => handleDeleteExercise(baseBodyPartKey, exercise.id, false)}
                                  aria-label="Delete exercise"
                                  title="Delete exercise"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Exercise Modal */}
      {showAddExerciseModal && (
        <div className="exercise-modal-overlay" onClick={closeAddExerciseModal}>
          <div className="exercise-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exercise-modal-header">
              <h3>{editingExercise ? 'Edit Exercise' : 'Add Exercise'}</h3>
              <button className="exercise-modal-close" onClick={closeAddExerciseModal}>×</button>
            </div>
            <div className="exercise-modal-content">
              {!selectedBodyPartForAdd ? (
                <div className="body-part-selector">
                  <p>Select a body part:</p>
                  <div className="body-part-buttons">
                    {BODY_PARTS.map((bodyPart) => (
                      <button
                        key={bodyPart.key}
                        className="body-part-select-button"
                        onClick={() => setSelectedBodyPartForAdd(bodyPart.key)}
                      >
                        {bodyPart.nameEn} ({bodyPart.name})
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="exercise-form">
                  <div className="exercise-form-field">
                    <label>Body Part:</label>
                    <div className="selected-body-part">
                      {EXERCISES_BY_BODY_PART[selectedBodyPartForAdd]?.nameEn} ({EXERCISES_BY_BODY_PART[selectedBodyPartForAdd]?.name})
                      <button
                        className="change-body-part-button"
                        onClick={() => setSelectedBodyPartForAdd(null)}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                  <div className="exercise-form-field">
                    <label>Hebrew Name:</label>
                    <input
                      type="text"
                      value={newExercise.name}
                      onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                      placeholder="שם בעברית"
                    />
                  </div>
                  <div className="exercise-form-field">
                    <label>English Name: *</label>
                    <input
                      type="text"
                      value={newExercise.nameEn}
                      onChange={(e) => setNewExercise({ ...newExercise, nameEn: e.target.value })}
                      placeholder="English name"
                      required
                    />
                  </div>
                  <div className="exercise-form-field">
                    <label>YouTube URL:</label>
                    <input
                      type="url"
                      value={newExercise.videoUrl}
                      onChange={(e) => setNewExercise({ ...newExercise, videoUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                  <div className="exercise-modal-actions">
                    <button
                      className="exercise-modal-cancel"
                      onClick={closeAddExerciseModal}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      className="exercise-modal-save"
                      onClick={handleSaveExercise}
                      disabled={saving || !newExercise.nameEn.trim()}
                    >
                      {saving ? 'Saving...' : editingExercise ? 'Update Exercise' : 'Save Exercise'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Exercises;

