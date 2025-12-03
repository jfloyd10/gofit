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
import { ExerciseDetail } from './ExerciseDetail';

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

interface FilterState {
  search: string;
  category: string | null;
  muscleGroup: string | null;
}

// Category icons mapping for visual appeal
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Exercise Detail state - using separate visibility flag
  const [exerciseDetailVisible, setExerciseDetailVisible] = useState(false);
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<Exercise | null>(null);
  
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
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const filterHeightAnim = useRef(new Animated.Value(0)).current;

  // Animation effects
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
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
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
    }
  }, [visible]);

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
      setShowCreateForm(false);
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

  // Open exercise detail - set both the exercise and visibility
  const handleInfoPress = useCallback((exercise: Exercise) => {
    setSelectedExerciseForDetail(exercise);
    setExerciseDetailVisible(true);
  }, []);

  // Close exercise detail
  const handleCloseDetail = useCallback(() => {
    setExerciseDetailVisible(false);
    // Clear the exercise after animation completes
    setTimeout(() => {
      setSelectedExerciseForDetail(null);
    }, 350);
  }, []);

  // Add from detail view
  const handleAddFromDetail = useCallback((exercise: Exercise) => {
    onSelectExercise(exercise);
    handleCloseDetail();
  }, [onSelectExercise, handleCloseDetail]);

  const handleAddPress = useCallback((exercise: Exercise) => {
    onSelectExercise(exercise);
  }, [onSelectExercise]);

  // Exercise Item Component
  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    const selected = isExerciseSelected(item);
    const categoryIcon = item.category ? CATEGORY_ICONS[item.category] || 'fitness' : 'fitness';

    return (
      <View style={[styles.exerciseCard, selected && styles.exerciseCardSelected]}>
        {/* Main touchable area */}
        <TouchableOpacity
          style={styles.exerciseMainArea}
          onPress={() => handleAddPress(item)}
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

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Info Button */}
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => handleInfoPress(item)}
          >
            <Ionicons name="information-circle-outline" size={24} color={theme.colors.secondaryText} />
          </TouchableOpacity>

          {/* Add Button */}
          <TouchableOpacity
            style={[styles.addButton, selected && styles.addButtonSelected]}
            onPress={() => handleAddPress(item)}
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

  // Header Component
  const renderHeader = () => (
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

  // Tabs Component
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

  // Search Bar Component
  const renderSearchBar = () => (
    <View style={styles.searchSection}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={theme.colors.secondaryText} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search by name, muscle, equipment..."
          placeholderTextColor={theme.colors.secondaryText}
          value={filters.search}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
        {filters.search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.clearSearchBtn}>
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

  // Category Filter Pills
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

  // Extended Filters Panel
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

  // Create Custom Exercise Button
  const renderCreateButton = () => {
    if (activeTab !== 'custom') return null;

    return (
      <TouchableOpacity style={styles.createExerciseBtn} onPress={() => setShowCreateForm(true)}>
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
          ? 'Create your first custom exercise to see it here'
          : 'Try adjusting your search or filters'}
      </Text>
      {activeTab === 'custom' && (
        <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setShowCreateForm(true)}>
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={styles.emptyCreateBtnText}>Create Exercise</Text>
        </TouchableOpacity>
      )}
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

  // Create Form
  const renderCreateForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.createFormWrapper}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.createFormScroll}>
        <View style={styles.createFormHeader}>
          <View>
            <Text style={styles.createFormTitle}>New Exercise</Text>
            <Text style={styles.createFormSubtitle}>Add to your personal library</Text>
          </View>
          <TouchableOpacity style={styles.createFormCloseBtn} onPress={() => setShowCreateForm(false)}>
            <Ionicons name="close" size={22} color={theme.colors.primaryText} />
          </TouchableOpacity>
        </View>

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
              placeholder="Brief description of the exercise..."
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
                placeholder="e.g., Quads, Glutes"
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
                  onPress={() =>
                    setCustomExercise((prev) => ({
                      ...prev,
                      default_sets: Math.max(1, prev.default_sets - 1),
                    }))
                  }
                >
                  <Ionicons name="remove" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.defaultValue}>{customExercise.default_sets}</Text>
                <TouchableOpacity
                  style={styles.defaultAdjustBtn}
                  onPress={() =>
                    setCustomExercise((prev) => ({
                      ...prev,
                      default_sets: prev.default_sets + 1,
                    }))
                  }
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
                  onPress={() =>
                    setCustomExercise((prev) => ({
                      ...prev,
                      default_reps: Math.max(1, prev.default_reps - 1),
                    }))
                  }
                >
                  <Ionicons name="remove" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.defaultValue}>{customExercise.default_reps}</Text>
                <TouchableOpacity
                  style={styles.defaultAdjustBtn}
                  onPress={() =>
                    setCustomExercise((prev) => ({
                      ...prev,
                      default_reps: prev.default_reps + 1,
                    }))
                  }
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
                  onPress={() =>
                    setCustomExercise((prev) => ({
                      ...prev,
                      default_rest: Math.max(0, prev.default_rest - 15),
                    }))
                  }
                >
                  <Ionicons name="remove" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.defaultValue}>{customExercise.default_rest}</Text>
                <TouchableOpacity
                  style={styles.defaultAdjustBtn}
                  onPress={() =>
                    setCustomExercise((prev) => ({
                      ...prev,
                      default_rest: prev.default_rest + 15,
                    }))
                  }
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
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtnGradient}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Create Exercise</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // Main content based on state
  const renderContent = () => {
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
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
          </Animated.View>

          {/* Main Sheet */}
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            {showCreateForm ? (
              <>
                {renderHeader()}
                {renderCreateForm()}
              </>
            ) : (
              <>
                {renderHeader()}
                {renderTabs()}
                {renderSearchBar()}
                {renderCategoryFilters()}
                {renderExtendedFilters()}
                {renderCreateButton()}

                <View style={styles.listContainer}>{renderContent()}</View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Exercise Detail Modal - Only render when visibility is true */}
      {exerciseDetailVisible && selectedExerciseForDetail && (
        <ExerciseDetail
          visible={exerciseDetailVisible}
          exercise={selectedExerciseForDetail}
          onClose={handleCloseDetail}
          onAddExercise={handleAddFromDetail}
          isSelected={isExerciseSelected(selectedExerciseForDetail)}
        />
      )}
    </>
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
      letterSpacing: -0.5,
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
      paddingVertical: 0,
    },
    clearSearchBtn: {
      padding: 2,
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
      gap: 8,
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
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    muscleChipsRow: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
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
      justifyContent: 'center',
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
      alignItems: 'center',
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
      backgroundColor: theme.colors.success || '#22c55e',
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
      gap: 8,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyCreateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 20,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      gap: 8,
    },
    emptyCreateBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    createFormWrapper: {
      flex: 1,
    },
    createFormScroll: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    createFormHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingTop: 8,
      paddingBottom: 24,
    },
    createFormTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    createFormSubtitle: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },
    createFormCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
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
      letterSpacing: 0.3,
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
      letterSpacing: 0.3,
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
      opacity: 0.5,
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
