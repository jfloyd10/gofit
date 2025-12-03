// src/components/program-builder/ExerciseLibrary.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Theme } from '../../theme';
import { useAuth } from '../../providers/AuthProvider';
import { exercisesApi } from '../../lib/api/programs';
import { Exercise, EXERCISE_CATEGORIES, MUSCLE_GROUPS } from '../../lib/types/program';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.92;

interface ExerciseLibraryProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  multiSelect?: boolean;
  selectedExercises?: Exercise[];
}

type TabType = 'official' | 'custom';
type ViewMode = 'list' | 'detail' | 'create';

interface FilterState {
  search: string;
  category: string | null;
  muscleGroup: string | null;
}

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  'Barbell': 'barbell',
  'Dumbbell': 'fitness',
  'Machine': 'cog',
  'Cable': 'git-pull-request',
  'Bodyweight': 'body',
  'Cardio': 'heart',
  'Kettlebell': 'bowling-ball',
  'Band': 'link',
  'Stretching': 'expand',
};

// Muscle group emoji mapping
const MUSCLE_ICONS: Record<string, string> = {
  'Chest': '💪',
  'Back': '🔙',
  'Shoulders': '🎯',
  'Biceps': '💪',
  'Triceps': '💪',
  'Legs': '🦵',
  'Quadriceps': '🦵',
  'Hamstrings': '🦵',
  'Glutes': '🍑',
  'Core': '⚡',
  'Abs': '⚡',
  'Calves': '🦶',
  'Forearms': '💪',
  'Traps': '🎯',
};

export const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  visible,
  onClose,
  onSelectExercise,
  multiSelect = false,
  selectedExercises = [],
}) => {
  const theme = useTheme();
  const { accessToken } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // State
  const [activeTab, setActiveTab] = useState<TabType>('official');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: null,
    muscleGroup: null,
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // View mode: 'list' | 'detail' | 'create'
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  
  const searchInputRef = useRef<TextInput>(null);

  // Custom exercise form state
  const [customExercise, setCustomExercise] = useState({
    name: '',
    description: '',
    category: '',
    muscle_groups: '',
    equipment_needed: '',
    default_sets: 3,
    default_reps: 10,
    default_rest: 60,
  });
  const [isCreating, setIsCreating] = useState(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const detailSlideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const filterHeightAnim = useRef(new Animated.Value(0)).current;

  // Main modal animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      fetchExercises();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      // Reset view mode when closing
      setViewMode('list');
      setDetailExercise(null);
    }
  }, [visible]);

  // Detail view animation
  useEffect(() => {
    if (viewMode === 'detail') {
      Animated.spring(detailSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(detailSlideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [viewMode]);

  // Filter panel animation
  useEffect(() => {
    Animated.spring(filterHeightAnim, {
      toValue: showFilters ? 1 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 15,
    }).start();
  }, [showFilters]);

  useEffect(() => {
    if (visible) {
      fetchExercises();
    }
  }, [activeTab, filters]);

  const fetchExercises = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiCall =
        activeTab === 'official'
          ? exercisesApi.getOfficialExercises
          : exercisesApi.getCustomExercises;

      const response = await apiCall(accessToken, {
        search: filters.search || undefined,
        category: filters.category || undefined,
        muscle_groups: filters.muscleGroup || undefined,
        page_size: 50,
      });

      setExercises(response.results);
    } catch (err) {
      setError('Failed to load exercises');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, activeTab, filters]);

  const handleSearchChange = useCallback((text: string) => {
    setFilters((prev) => ({ ...prev, search: text }));
  }, []);

  const handleCategorySelect = useCallback((category: string | null) => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const handleMuscleGroupSelect = useCallback((muscleGroup: string | null) => {
    setFilters((prev) => ({ ...prev, muscleGroup }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ search: '', category: null, muscleGroup: null });
  }, []);

  const hasActiveFilters = filters.category || filters.muscleGroup;
  const activeFilterCount = [filters.category, filters.muscleGroup].filter(Boolean).length;

  const handleCreateCustomExercise = async () => {
    if (!accessToken || !customExercise.name.trim()) return;

    setIsCreating(true);
    try {
      const newExercise = await exercisesApi.createExercise(
        {
          name: customExercise.name,
          description: customExercise.description || null,
          category: customExercise.category || null,
          muscle_groups: customExercise.muscle_groups || null,
          equipment_needed: customExercise.equipment_needed || null,
          default_sets: customExercise.default_sets,
          default_reps: customExercise.default_reps,
          default_rest: customExercise.default_rest,
        },
        accessToken
      );

      setExercises((prev) => [newExercise, ...prev]);
      setViewMode('list');
      setCustomExercise({
        name: '',
        description: '',
        category: '',
        muscle_groups: '',
        equipment_needed: '',
        default_sets: 3,
        default_reps: 10,
        default_rest: 60,
      });

      onSelectExercise(newExercise);
    } catch (err) {
      console.error('Failed to create exercise:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const isExerciseSelected = useCallback((exercise: Exercise) => {
    return selectedExercises.some((e) => e.id === exercise.id);
  }, [selectedExercises]);

  // Open detail view
  const openExerciseDetail = useCallback((exercise: Exercise) => {
    setDetailExercise(exercise);
    setViewMode('detail');
  }, []);

  // Close detail view
  const closeExerciseDetail = useCallback(() => {
    setViewMode('list');
    setTimeout(() => setDetailExercise(null), 300);
  }, []);

  // Add exercise
  const handleAddExercise = useCallback((exercise: Exercise) => {
    onSelectExercise(exercise);
  }, [onSelectExercise]);

  // Exercise Item Component
  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    const selected = isExerciseSelected(item);
    const categoryIcon = item.category ? CATEGORY_ICONS[item.category] || 'fitness' : 'fitness';

    return (
      <View style={[styles.exerciseCard, selected && styles.exerciseCardSelected]}>
        <TouchableOpacity
          style={styles.exerciseMainArea}
          onPress={() => handleAddExercise(item)}
          activeOpacity={0.7}
        >
          <View style={styles.exerciseVisual}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.exerciseImage} />
            ) : (
              <LinearGradient
                colors={
                  selected
                    ? [theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]
                    : [theme.colors.surface, theme.colors.background]
                }
                style={styles.exerciseIconContainer}
              >
                <Ionicons
                  name={categoryIcon as any}
                  size={26}
                  color={selected ? '#fff' : theme.colors.secondaryText}
                />
              </LinearGradient>
            )}
          </View>

          <View style={styles.exerciseContent}>
            <Text style={[styles.exerciseName, selected && styles.exerciseNameSelected]} numberOfLines={1}>
              {item.name}
            </Text>

            <View style={styles.exerciseMetaRow}>
              {item.muscle_groups && (
                <View style={styles.muscleTag}>
                  <Text style={styles.muscleTagText}>{item.muscle_groups}</Text>
                </View>
              )}
              {item.category && (
                <View style={[styles.categoryPill, selected && styles.categoryPillSelected]}>
                  <Text style={[styles.categoryPillText, selected && styles.categoryPillTextSelected]}>
                    {item.category}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons - Separate from main touchable */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => openExerciseDetail(item)}
            activeOpacity={0.6}
          >
            <Ionicons name="information-circle-outline" size={24} color={theme.colors.secondaryText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, selected && styles.addButtonSelected]}
            onPress={() => handleAddExercise(item)}
            activeOpacity={0.6}
          >
            {selected ? (
              <Ionicons name="checkmark" size={20} color="#fff" />
            ) : (
              <Ionicons name="add" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // List View Header
  const renderListHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerHandle} />
      <View style={styles.headerRow}>
        <View style={styles.headerTitleSection}>
          <Text style={styles.headerTitle}>Exercise Library</Text>
          <Text style={styles.headerSubtitle}>
            {exercises.length} exercises available
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={22} color={theme.colors.primaryText} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Tabs
  const renderTabs = () => (
    <View style={styles.tabsWrapper}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'official' && styles.tabBtnActive]}
          onPress={() => setActiveTab('official')}
        >
          <Ionicons
            name="shield-checkmark"
            size={16}
            color={activeTab === 'official' ? '#fff' : theme.colors.secondaryText}
          />
          <Text style={[styles.tabText, activeTab === 'official' && styles.tabTextActive]}>
            Official
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'custom' && styles.tabBtnActive]}
          onPress={() => setActiveTab('custom')}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color={activeTab === 'custom' ? '#fff' : theme.colors.secondaryText}
          />
          <Text style={[styles.tabText, activeTab === 'custom' && styles.tabTextActive]}>
            My Exercises
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Search Bar
  const renderSearchBar = () => (
    <View style={styles.searchSection}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={theme.colors.secondaryText} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={theme.colors.secondaryText}
          value={filters.search}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
        {filters.search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.filterToggleBtn, hasActiveFilters && styles.filterToggleBtnActive]}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons
          name="options-outline"
          size={18}
          color={hasActiveFilters ? '#fff' : theme.colors.secondaryText}
        />
        {activeFilterCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  // Category Filters
  const renderCategoryFilters = () => (
    <View style={styles.categoryFiltersContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFiltersContent}
      >
        <TouchableOpacity
          style={[styles.categoryFilterPill, !filters.category && styles.categoryFilterPillActive]}
          onPress={() => handleCategorySelect(null)}
        >
          <Text style={[styles.categoryFilterText, !filters.category && styles.categoryFilterTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        {EXERCISE_CATEGORIES.map((category) => {
          const isActive = filters.category === category;
          const iconName = CATEGORY_ICONS[category] || 'fitness';

          return (
            <TouchableOpacity
              key={category}
              style={[styles.categoryFilterPill, isActive && styles.categoryFilterPillActive]}
              onPress={() => handleCategorySelect(isActive ? null : category)}
            >
              <Ionicons
                name={iconName as any}
                size={14}
                color={isActive ? '#fff' : theme.colors.secondaryText}
                style={styles.categoryFilterIcon}
              />
              <Text style={[styles.categoryFilterText, isActive && styles.categoryFilterTextActive]}>
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // Extended Filters
  const renderExtendedFilters = () => {
    const filterHeight = filterHeightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 180],
    });

    return (
      <Animated.View style={[styles.extendedFiltersPanel, { height: filterHeight, opacity: filterHeightAnim }]}>
        <View style={styles.muscleFilterSection}>
          <Text style={styles.filterSectionLabel}>Target Muscles</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.muscleChipsRow}>
              {MUSCLE_GROUPS.map((muscle) => {
                const isActive = filters.muscleGroup === muscle;
                const emoji = MUSCLE_ICONS[muscle] || '💪';

                return (
                  <TouchableOpacity
                    key={muscle}
                    style={[styles.muscleChip, isActive && styles.muscleChipActive]}
                    onPress={() => handleMuscleGroupSelect(isActive ? null : muscle)}
                  >
                    <Text style={styles.muscleChipEmoji}>{emoji}</Text>
                    <Text style={[styles.muscleChipText, isActive && styles.muscleChipTextActive]}>
                      {muscle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearAllFiltersBtn} onPress={clearFilters}>
            <Ionicons name="refresh" size={14} color={theme.colors.error} />
            <Text style={styles.clearAllFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  // Create Button
  const renderCreateButton = () => {
    if (activeTab !== 'custom') return null;

    return (
      <TouchableOpacity style={styles.createExerciseBtn} onPress={() => setViewMode('create')}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.createExerciseBtnGradient}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createExerciseBtnText}>Create New Exercise</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Empty State
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name={activeTab === 'custom' ? 'sparkles-outline' : 'barbell-outline'}
          size={48}
          color={theme.colors.secondaryText}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'custom' ? 'No Custom Exercises Yet' : 'No Exercises Found'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'custom'
          ? 'Create your first custom exercise'
          : 'Try adjusting your search or filters'}
      </Text>
    </View>
  );

  // Loading State
  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loadingText}>Loading exercises...</Text>
    </View>
  );

  // Error State
  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.error} />
      <Text style={styles.errorTitle}>Connection Error</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={fetchExercises}>
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Create Form View
  const renderCreateForm = () => (
    <View style={styles.createFormContainer}>
      <View style={styles.detailHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setViewMode('list')}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Create Exercise</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.createFormScroll}>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Exercise Name *</Text>
            <View style={styles.formInputContainer}>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Bulgarian Split Squat"
                placeholderTextColor={theme.colors.secondaryText}
                value={customExercise.name}
                onChangeText={(text) => setCustomExercise((prev) => ({ ...prev, name: text }))}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Description</Text>
            <View style={[styles.formInputContainer, styles.formInputMultiline]}>
              <TextInput
                style={[styles.formInput, styles.formInputArea]}
                placeholder="Brief description..."
                placeholderTextColor={theme.colors.secondaryText}
                value={customExercise.description}
                onChangeText={(text) => setCustomExercise((prev) => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formSection, { flex: 1 }]}>
              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.formInputContainer}>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Dumbbell"
                  placeholderTextColor={theme.colors.secondaryText}
                  value={customExercise.category}
                  onChangeText={(text) => setCustomExercise((prev) => ({ ...prev, category: text }))}
                />
              </View>
            </View>

            <View style={[styles.formSection, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.formLabel}>Target Muscles</Text>
              <View style={styles.formInputContainer}>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Quads"
                  placeholderTextColor={theme.colors.secondaryText}
                  value={customExercise.muscle_groups}
                  onChangeText={(text) => setCustomExercise((prev) => ({ ...prev, muscle_groups: text }))}
                />
              </View>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Equipment Needed</Text>
            <View style={styles.formInputContainer}>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Dumbbells, Bench"
                placeholderTextColor={theme.colors.secondaryText}
                value={customExercise.equipment_needed}
                onChangeText={(text) => setCustomExercise((prev) => ({ ...prev, equipment_needed: text }))}
              />
            </View>
          </View>

          <View style={styles.defaultsSection}>
            <Text style={styles.defaultsSectionTitle}>Default Values</Text>
            <View style={styles.defaultsGrid}>
              <View style={styles.defaultItem}>
                <Text style={styles.defaultItemLabel}>Sets</Text>
                <View style={styles.defaultInputContainer}>
                  <TouchableOpacity
                    style={styles.defaultAdjustBtn}
                    onPress={() => setCustomExercise((prev) => ({ ...prev, default_sets: Math.max(1, prev.default_sets - 1) }))}
                  >
                    <Ionicons name="remove" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.defaultValue}>{customExercise.default_sets}</Text>
                  <TouchableOpacity
                    style={styles.defaultAdjustBtn}
                    onPress={() => setCustomExercise((prev) => ({ ...prev, default_sets: prev.default_sets + 1 }))}
                  >
                    <Ionicons name="add" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.defaultItem}>
                <Text style={styles.defaultItemLabel}>Reps</Text>
                <View style={styles.defaultInputContainer}>
                  <TouchableOpacity
                    style={styles.defaultAdjustBtn}
                    onPress={() => setCustomExercise((prev) => ({ ...prev, default_reps: Math.max(1, prev.default_reps - 1) }))}
                  >
                    <Ionicons name="remove" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.defaultValue}>{customExercise.default_reps}</Text>
                  <TouchableOpacity
                    style={styles.defaultAdjustBtn}
                    onPress={() => setCustomExercise((prev) => ({ ...prev, default_reps: prev.default_reps + 1 }))}
                  >
                    <Ionicons name="add" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.defaultItem}>
                <Text style={styles.defaultItemLabel}>Rest (s)</Text>
                <View style={styles.defaultInputContainer}>
                  <TouchableOpacity
                    style={styles.defaultAdjustBtn}
                    onPress={() => setCustomExercise((prev) => ({ ...prev, default_rest: Math.max(0, prev.default_rest - 15) }))}
                  >
                    <Ionicons name="remove" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.defaultValue}>{customExercise.default_rest}</Text>
                  <TouchableOpacity
                    style={styles.defaultAdjustBtn}
                    onPress={() => setCustomExercise((prev) => ({ ...prev, default_rest: prev.default_rest + 15 }))}
                  >
                    <Ionicons name="add" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, !customExercise.name.trim() && styles.submitBtnDisabled]}
            onPress={handleCreateCustomExercise}
            disabled={!customExercise.name.trim() || isCreating}
          >
            <LinearGradient
              colors={
                customExercise.name.trim()
                  ? [theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]
                  : [theme.colors.surface, theme.colors.surface]
              }
              style={styles.submitBtnGradient}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={customExercise.name.trim() ? '#fff' : theme.colors.secondaryText} />
                  <Text style={[styles.submitBtnText, !customExercise.name.trim() && { color: theme.colors.secondaryText }]}>
                    Create Exercise
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  // Exercise Detail View (NOT a modal, just an animated view)
  const renderDetailView = () => {
    if (!detailExercise) return null;

    const selected = isExerciseSelected(detailExercise);
    const categoryIcon = detailExercise.category ? CATEGORY_ICONS[detailExercise.category] || 'fitness' : 'fitness';

    return (
      <Animated.View
        style={[
          styles.detailOverlay,
          { transform: [{ translateX: detailSlideAnim }] },
        ]}
      >
        {/* Detail Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={closeExerciseDetail}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primaryText} />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>Exercise Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
          {/* Hero Section */}
          <View style={styles.detailHero}>
            {detailExercise.image ? (
              <Image source={{ uri: detailExercise.image }} style={styles.detailHeroImage} />
            ) : (
              <LinearGradient
                colors={[theme.colors.primary + '40', theme.colors.primary + '20']}
                style={styles.detailHeroPlaceholder}
              >
                <View style={styles.detailHeroIconContainer}>
                  <Ionicons name={categoryIcon as any} size={64} color={theme.colors.primary} />
                </View>
              </LinearGradient>
            )}
          </View>

          {/* Exercise Name & Meta */}
          <View style={styles.detailInfo}>
            <Text style={styles.detailExerciseName}>{detailExercise.name}</Text>
            
            <View style={styles.detailBadges}>
              {detailExercise.category && (
                <View style={styles.detailBadge}>
                  <Ionicons name={categoryIcon as any} size={14} color={theme.colors.primary} />
                  <Text style={styles.detailBadgeText}>{detailExercise.category}</Text>
                </View>
              )}
              {detailExercise.muscle_groups && (
                <View style={styles.detailBadge}>
                  <Ionicons name="body-outline" size={14} color={theme.colors.primary} />
                  <Text style={styles.detailBadgeText}>{detailExercise.muscle_groups}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats */}
          <View style={styles.detailStats}>
            <View style={styles.detailStatCard}>
              <Ionicons name="layers-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.detailStatValue}>{detailExercise.default_sets || 3}</Text>
              <Text style={styles.detailStatLabel}>Sets</Text>
            </View>
            <View style={styles.detailStatCard}>
              <Ionicons name="repeat-outline" size={24} color="#f59e0b" />
              <Text style={styles.detailStatValue}>{detailExercise.default_reps || 10}</Text>
              <Text style={styles.detailStatLabel}>Reps</Text>
            </View>
            <View style={styles.detailStatCard}>
              <Ionicons name="timer-outline" size={24} color="#22c55e" />
              <Text style={styles.detailStatValue}>{detailExercise.default_rest || 60}s</Text>
              <Text style={styles.detailStatLabel}>Rest</Text>
            </View>
          </View>

          {/* Description */}
          {detailExercise.description && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>About This Exercise</Text>
              <Text style={styles.detailDescription}>{detailExercise.description}</Text>
            </View>
          )}

          {/* Equipment */}
          {detailExercise.equipment_needed && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Equipment Needed</Text>
              <View style={styles.detailEquipmentRow}>
                <Ionicons name="barbell-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.detailEquipmentText}>{detailExercise.equipment_needed}</Text>
              </View>
            </View>
          )}

          {/* Instructions */}
          {detailExercise.instructions && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>How To Perform</Text>
              {(typeof detailExercise.instructions === 'string'
                ? detailExercise.instructions.split('\n').filter(Boolean)
                : detailExercise.instructions
              ).map((step: string, index: number) => (
                <View key={index} style={styles.detailInstructionItem}>
                  <View style={styles.detailInstructionNumber}>
                    <Text style={styles.detailInstructionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.detailInstructionText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Add Button */}
        <View style={styles.detailBottomCTA}>
          <TouchableOpacity
            style={[styles.detailAddBtn, selected && styles.detailAddBtnSelected]}
            onPress={() => {
              handleAddExercise(detailExercise);
              closeExerciseDetail();
            }}
          >
            <LinearGradient
              colors={selected ? ['#22c55e', '#16a34a'] : [theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
              style={styles.detailAddBtnGradient}
            >
              <Ionicons name={selected ? 'checkmark-circle' : 'add-circle'} size={22} color="#fff" />
              <Text style={styles.detailAddBtnText}>
                {selected ? 'Added to Workout' : 'Add to Workout'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // Main List Content
  const renderListContent = () => {
    if (isLoading) return renderLoadingState();
    if (error) return renderErrorState();
    if (exercises.length === 0) return renderEmptyState();

    return (
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExerciseItem}
        contentContainerStyle={styles.exerciseList}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.exerciseSeparator} />}
      />
    );
  };

  // Main List View
  const renderListView = () => (
    <View style={styles.listViewContainer}>
      {renderListHeader()}
      {renderTabs()}
      {renderSearchBar()}
      {renderCategoryFilters()}
      {renderExtendedFilters()}
      {renderCreateButton()}
      <View style={styles.listContainer}>{renderListContent()}</View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Main content based on view mode */}
          {viewMode === 'create' ? renderCreateForm() : renderListView()}
          
          {/* Detail overlay - slides from right */}
          {renderDetailView()}
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: MODAL_HEIGHT,
      overflow: 'hidden',
    },
    listViewContainer: {
      flex: 1,
    },
    header: {
      paddingTop: 12,
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerHandle: {
      width: 36,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    headerTitleSection: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    headerSubtitle: {
      fontSize: 13,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabsWrapper: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 4,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      gap: 6,
    },
    tabBtnActive: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.secondaryText,
    },
    tabTextActive: {
      color: '#fff',
    },
    searchSection: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 10,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 44,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.primaryText,
    },
    filterToggleBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterToggleBtnActive: {
      backgroundColor: theme.colors.primary,
    },
    filterBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.error,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
    },
    categoryFiltersContainer: {
      marginBottom: 8,
    },
    categoryFiltersContent: {
      paddingHorizontal: 20,
    },
    categoryFilterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      marginRight: 8,
    },
    categoryFilterPillActive: {
      backgroundColor: theme.colors.primary,
    },
    categoryFilterIcon: {
      marginRight: 6,
    },
    categoryFilterText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.secondaryText,
    },
    categoryFilterTextActive: {
      color: '#fff',
    },
    extendedFiltersPanel: {
      marginHorizontal: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      overflow: 'hidden',
      marginBottom: 8,
    },
    muscleFilterSection: {
      paddingTop: 16,
    },
    filterSectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.secondaryText,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    muscleChipsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingBottom: 8,
    },
    muscleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      gap: 4,
    },
    muscleChipActive: {
      backgroundColor: theme.colors.primarySoft,
    },
    muscleChipEmoji: {
      fontSize: 12,
    },
    muscleChipText: {
      fontSize: 12,
      color: theme.colors.secondaryText,
      fontWeight: '500',
    },
    muscleChipTextActive: {
      color: theme.colors.primary,
    },
    clearAllFiltersBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 6,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: 8,
    },
    clearAllFiltersText: {
      fontSize: 13,
      color: theme.colors.error,
      fontWeight: '500',
    },
    createExerciseBtn: {
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 12,
      overflow: 'hidden',
    },
    createExerciseBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: 8,
    },
    createExerciseBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    listContainer: {
      flex: 1,
    },
    exerciseList: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },
    exerciseSeparator: {
      height: 10,
    },
    exerciseCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    exerciseCardSelected: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primary,
    },
    exerciseMainArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    exerciseVisual: {
      marginRight: 14,
    },
    exerciseImage: {
      width: 56,
      height: 56,
      borderRadius: 12,
    },
    exerciseIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    exerciseContent: {
      flex: 1,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: 6,
    },
    exerciseNameSelected: {
      color: theme.colors.primary,
    },
    exerciseMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    muscleTag: {
      backgroundColor: theme.colors.background,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    muscleTagText: {
      fontSize: 11,
      color: theme.colors.secondaryText,
      fontWeight: '500',
    },
    categoryPill: {
      backgroundColor: theme.colors.background,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    categoryPillSelected: {
      backgroundColor: theme.colors.primary + '20',
    },
    categoryPillText: {
      fontSize: 11,
      color: theme.colors.secondaryText,
      fontWeight: '500',
    },
    categoryPillTextSelected: {
      color: theme.colors.primary,
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginLeft: 8,
    },
    infoButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButtonSelected: {
      backgroundColor: '#22c55e',
    },
    loadingState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    loadingText: {
      fontSize: 15,
      color: theme.colors.secondaryText,
    },
    errorState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      gap: 12,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    errorSubtitle: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      textAlign: 'center',
    },
    retryBtn: {
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 24,
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
    },
    retryBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      textAlign: 'center',
    },

    // Detail Overlay (slides from right)
    detailOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background,
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    detailHeaderTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primaryText,
      flex: 1,
      textAlign: 'center',
    },
    detailScrollContent: {
      paddingBottom: 20,
    },
    detailHero: {
      height: 220,
      backgroundColor: theme.colors.surface,
    },
    detailHeroImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    detailHeroPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    detailHeroIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    detailInfo: {
      padding: 20,
    },
    detailExerciseName: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.primaryText,
      marginBottom: 12,
    },
    detailBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    detailBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primarySoft,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      gap: 6,
    },
    detailBadgeText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.primary,
    },
    detailStats: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 20,
    },
    detailStatCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    detailStatValue: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.primaryText,
      marginTop: 8,
    },
    detailStatLabel: {
      fontSize: 12,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },
    detailSection: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    detailSectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.primaryText,
      marginBottom: 12,
    },
    detailDescription: {
      fontSize: 15,
      lineHeight: 24,
      color: theme.colors.secondaryText,
    },
    detailEquipmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 12,
      gap: 12,
    },
    detailEquipmentText: {
      fontSize: 15,
      color: theme.colors.primaryText,
      flex: 1,
    },
    detailInstructionItem: {
      flexDirection: 'row',
      marginBottom: 12,
      gap: 12,
    },
    detailInstructionNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    detailInstructionNumberText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },
    detailInstructionText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.primaryText,
    },
    detailBottomCTA: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    detailAddBtn: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    detailAddBtnSelected: {},
    detailAddBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 10,
    },
    detailAddBtnText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#fff',
    },

    // Create Form
    createFormContainer: {
      flex: 1,
    },
    createFormScroll: {
      padding: 20,
    },
    formSection: {
      marginBottom: 16,
    },
    formRow: {
      flexDirection: 'row',
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.secondaryText,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    formInputContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    formInputMultiline: {
      minHeight: 80,
    },
    formInput: {
      fontSize: 15,
      color: theme.colors.primaryText,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    formInputArea: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    defaultsSection: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginTop: 8,
      marginBottom: 24,
    },
    defaultsSectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.secondaryText,
      textTransform: 'uppercase',
      marginBottom: 16,
    },
    defaultsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    defaultItem: {
      alignItems: 'center',
      flex: 1,
    },
    defaultItemLabel: {
      fontSize: 12,
      color: theme.colors.secondaryText,
      marginBottom: 8,
    },
    defaultInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    defaultAdjustBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    defaultValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.primaryText,
      minWidth: 40,
      textAlign: 'center',
    },
    submitBtn: {
      borderRadius: 14,
      overflow: 'hidden',
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    submitBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
  });

export default ExerciseLibrary;
