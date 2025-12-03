// src/components/program-builder/ExerciseLibrary.tsx
// World-class Exercise Library with "Athletic Premium" design aesthetic

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
  Pressable,
  Keyboard,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Theme } from '../../theme';
import { useAuth } from '../../providers/AuthProvider';
import { exercisesApi } from '../../lib/api/programs';
import { Exercise, EXERCISE_CATEGORIES, MUSCLE_GROUPS } from '../../lib/types/program';
import { PrimaryButton } from '../ui/PrimaryButton';
import { TextField } from '../ui/TextField';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Category icons mapping for visual appeal
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Barbell': 'barbell',
  'Dumbbell': 'fitness',
  'Cable': 'git-merge',
  'Machine': 'cog',
  'Bodyweight': 'body',
  'Kettlebell': 'flame',
  'Cardio': 'heart',
  'Stretching': 'leaf',
  'Plyometric': 'flash',
  'Olympic': 'trophy',
  'Resistance Band': 'pulse',
  'Medicine Ball': 'football',
};

// Muscle group icons
const MUSCLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Chest': 'shield-half',
  'Back': 'arrow-undo',
  'Shoulders': 'arrow-up-circle',
  'Biceps': 'fitness',
  'Triceps': 'fitness',
  'Legs': 'walk',
  'Quadriceps': 'walk',
  'Hamstrings': 'walk',
  'Glutes': 'accessibility',
  'Core': 'radio-button-on',
  'Abs': 'radio-button-on',
  'Calves': 'footsteps',
  'Forearms': 'hand-left',
  'Full Body': 'body',
};

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

// Animated Exercise Card Component
const AnimatedExerciseCard: React.FC<{
  exercise: Exercise;
  index: number;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}> = ({ exercise, index, isSelected, onPress, onLongPress, theme, styles }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const checkmarkAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 50,
      tension: 100,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.spring(checkmarkAnim, {
      toValue: isSelected ? 1 : 0,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isSelected]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 200,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress();
  };

  return (
    <Animated.View
      style={[
        {
          opacity: scaleAnim,
          transform: [
            { scale: Animated.multiply(scaleAnim, pressAnim) },
            {
              translateY: scaleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.exerciseCard,
          isSelected && styles.exerciseCardSelected,
        ]}
      >
        {/* Exercise Image with Gradient Overlay */}
        <View style={styles.exerciseImageWrapper}>
          {exercise.image ? (
            <>
              <Image 
                source={{ uri: exercise.image }} 
                style={styles.exerciseImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)']}
                style={styles.imageGradient}
              />
            </>
          ) : (
            <View style={styles.exercisePlaceholder}>
              <LinearGradient
                colors={[
                  isSelected ? theme.colors.primary : theme.colors.surface,
                  isSelected ? theme.colors.primarySoft : theme.colors.background,
                ]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Ionicons 
                name={CATEGORY_ICONS[exercise.category || ''] || 'barbell-outline'} 
                size={28} 
                color={isSelected ? theme.colors.primary : theme.colors.secondaryText} 
              />
            </View>
          )}
          
          {/* Category Badge */}
          {exercise.category && (
            <View style={styles.categoryBadge}>
              <Ionicons 
                name={CATEGORY_ICONS[exercise.category] || 'ellipse'} 
                size={10} 
                color={theme.colors.surface} 
              />
              <Text style={styles.categoryBadgeText}>{exercise.category}</Text>
            </View>
          )}
        </View>

        {/* Exercise Info */}
        <View style={styles.exerciseContent}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseName} numberOfLines={2}>
              {exercise.name}
            </Text>
            
            {/* Selection Indicator */}
            <Animated.View
              style={[
                styles.selectionIndicator,
                {
                  opacity: checkmarkAnim,
                  transform: [
                    {
                      scale: checkmarkAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.checkmarkCircle}>
                <Ionicons name="checkmark" size={14} color={theme.colors.surface} />
              </View>
            </Animated.View>
          </View>

          {/* Muscle Groups */}
          {exercise.muscle_groups && (
            <View style={styles.muscleTagsRow}>
              {exercise.muscle_groups.split(',').slice(0, 2).map((muscle, idx) => (
                <View key={idx} style={styles.muscleTag}>
                  <Ionicons 
                    name={MUSCLE_ICONS[muscle.trim()] || 'ellipse'} 
                    size={10} 
                    color={theme.colors.primary} 
                  />
                  <Text style={styles.muscleTagText}>{muscle.trim()}</Text>
                </View>
              ))}
              {exercise.muscle_groups.split(',').length > 2 && (
                <Text style={styles.moreMuscles}>
                  +{exercise.muscle_groups.split(',').length - 2}
                </Text>
              )}
            </View>
          )}

          {/* Defaults Row */}
          <View style={styles.defaultsRow}>
            <View style={styles.defaultItem}>
              <Text style={styles.defaultValue}>{exercise.default_sets}</Text>
              <Text style={styles.defaultLabel}>Sets</Text>
            </View>
            <View style={styles.defaultDivider} />
            <View style={styles.defaultItem}>
              <Text style={styles.defaultValue}>{exercise.default_reps}</Text>
              <Text style={styles.defaultLabel}>Reps</Text>
            </View>
            <View style={styles.defaultDivider} />
            <View style={styles.defaultItem}>
              <Text style={styles.defaultValue}>{exercise.default_rest}s</Text>
              <Text style={styles.defaultLabel}>Rest</Text>
            </View>
          </View>
        </View>

        {/* Quick Add Button */}
        <TouchableOpacity 
          style={[
            styles.quickAddButton,
            isSelected && styles.quickAddButtonSelected,
          ]}
          onPress={handlePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name={isSelected ? "checkmark" : "add"} 
            size={20} 
            color={isSelected ? theme.colors.surface : theme.colors.primary} 
          />
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  );
};

// Animated Category Chip Component
const CategoryChip: React.FC<{
  category: string;
  isActive: boolean;
  onPress: () => void;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}> = ({ category, isActive, onPress, theme, styles }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.9, tension: 300, friction: 10, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.categoryChip, isActive && styles.categoryChipActive]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={CATEGORY_ICONS[category] || 'ellipse'} 
          size={14} 
          color={isActive ? theme.colors.surface : theme.colors.secondaryText} 
        />
        <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
          {category}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
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
  const [expandedExercise, setExpandedExercise] = useState<Exercise | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

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

  // Refs
  const searchInputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  // Search debounce
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      // Staggered entrance animations
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Content fade in after modal slides
        Animated.spring(contentAnim, {
          toValue: 1,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }).start();
      });
      fetchExercises();
    } else {
      // Exit animations
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(contentAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      fetchExercises();
    }
  }, [activeTab, filters.category, filters.muscleGroup]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (visible) {
        fetchExercises();
      }
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.search]);

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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const handleMuscleGroupSelect = useCallback((muscleGroup: string | null) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFilters((prev) => ({ ...prev, muscleGroup }));
  }, []);

  const clearFilters = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFilters({ search: '', category: null, muscleGroup: null });
  }, []);

  const hasActiveFilters = filters.category || filters.muscleGroup || filters.search;

  const handleTabChange = (tab: TabType) => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  const toggleFilters = () => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFilters(!showFilters);
    Keyboard.dismiss();
  };

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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreating(false);
    }
  };

  const isExerciseSelected = (exercise: Exercise) => {
    return selectedExercises.some((e) => e.id === exercise.id);
  };

  const renderExerciseItem = ({ item, index }: { item: Exercise; index: number }) => (
    <AnimatedExerciseCard
      exercise={item}
      index={index}
      isSelected={isExerciseSelected(item)}
      onPress={() => onSelectExercise(item)}
      onLongPress={() => setExpandedExercise(item)}
      theme={theme}
      styles={styles}
    />
  );

  const renderCategoryFilters = () => (
    <Animated.View style={{ opacity: contentAnim }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScrollContent}
        style={styles.categoryScroll}
      >
        {/* All option */}
        <CategoryChip
          category="All"
          isActive={!filters.category}
          onPress={() => handleCategorySelect(null)}
          theme={theme}
          styles={styles}
        />
        {EXERCISE_CATEGORIES.map((category) => (
          <CategoryChip
            key={category}
            category={category}
            isActive={filters.category === category}
            onPress={() =>
              handleCategorySelect(filters.category === category ? null : category)
            }
            theme={theme}
            styles={styles}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );

  const renderMuscleGroupFilters = () => (
    <Animated.View
      style={[
        styles.muscleFiltersContainer,
        { opacity: contentAnim },
      ]}
    >
      <View style={styles.muscleFiltersHeader}>
        <Text style={styles.muscleFiltersTitle}>Target Muscles</Text>
        {filters.muscleGroup && (
          <TouchableOpacity onPress={() => handleMuscleGroupSelect(null)}>
            <Text style={styles.clearMuscleText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.muscleGrid}>
        {MUSCLE_GROUPS.map((muscle) => (
          <TouchableOpacity
            key={muscle}
            style={[
              styles.muscleChip,
              filters.muscleGroup === muscle && styles.muscleChipActive,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              handleMuscleGroupSelect(
                filters.muscleGroup === muscle ? null : muscle
              );
            }}
          >
            <Ionicons
              name={MUSCLE_ICONS[muscle] || 'ellipse'}
              size={14}
              color={
                filters.muscleGroup === muscle
                  ? theme.colors.surface
                  : theme.colors.secondaryText
              }
            />
            <Text
              style={[
                styles.muscleChipText,
                filters.muscleGroup === muscle && styles.muscleChipTextActive,
              ]}
            >
              {muscle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderHeader = () => (
    <View style={styles.stickyHeader}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View
          style={[
            styles.searchContainer,
            searchFocused && styles.searchContainerFocused,
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={searchFocused ? theme.colors.primary : theme.colors.secondaryText}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor={theme.colors.secondaryText}
            value={filters.search}
            onChangeText={handleSearchChange}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {filters.search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                handleSearchChange('');
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.colors.secondaryText}
              />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterToggle,
            showFilters && styles.filterToggleActive,
          ]}
          onPress={toggleFilters}
        >
          <Ionicons
            name={showFilters ? 'options' : 'options-outline'}
            size={20}
            color={
              showFilters || hasActiveFilters
                ? theme.colors.primary
                : theme.colors.secondaryText
            }
          />
          {hasActiveFilters && !showFilters && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {[filters.category, filters.muscleGroup].filter(Boolean).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      {renderCategoryFilters()}

      {/* Extended Muscle Filters */}
      {showFilters && renderMuscleGroupFilters()}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersBar}>
          <Text style={styles.activeFiltersText}>
            {[filters.category, filters.muscleGroup].filter(Boolean).join(' · ')}
            {filters.search && ` · "${filters.search}"`}
          </Text>
          <TouchableOpacity onPress={clearFilters} style={styles.clearAllButton}>
            <Ionicons name="close" size={14} color={theme.colors.error} />
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Custom Button (Custom Tab) */}
      {activeTab === 'custom' && !showCreateForm && (
        <TouchableOpacity
          style={styles.createCustomBanner}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCreateForm(true);
          }}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primarySoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.createCustomContent}>
            <View style={styles.createCustomIcon}>
              <Ionicons name="add" size={24} color={theme.colors.surface} />
            </View>
            <View style={styles.createCustomText}>
              <Text style={styles.createCustomTitle}>Create Exercise</Text>
              <Text style={styles.createCustomSubtitle}>
                Add your own custom exercise
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.surface}
            />
          </View>
        </TouchableOpacity>
      )}

      {/* Results Count */}
      {!showCreateForm && !isLoading && exercises.length > 0 && (
        <View style={styles.resultsBar}>
          <Text style={styles.resultsText}>
            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={[theme.colors.primarySoft, 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons
          name={activeTab === 'custom' ? 'create-outline' : 'barbell-outline'}
          size={48}
          color={theme.colors.secondaryText}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'custom'
          ? 'No Custom Exercises'
          : hasActiveFilters
          ? 'No Matches Found'
          : 'Exercise Library Empty'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'custom'
          ? 'Create your first custom exercise to get started'
          : hasActiveFilters
          ? 'Try adjusting your filters or search terms'
          : 'No exercises available at this time'}
      </Text>
      {activeTab === 'custom' && (
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={() => setShowCreateForm(true)}
        >
          <Ionicons name="add" size={18} color={theme.colors.surface} />
          <Text style={styles.emptyActionText}>Create Exercise</Text>
        </TouchableOpacity>
      )}
      {hasActiveFilters && activeTab !== 'custom' && (
        <TouchableOpacity style={styles.emptyActionButton} onPress={clearFilters}>
          <Ionicons name="refresh" size={18} color={theme.colors.surface} />
          <Text style={styles.emptyActionText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCreateForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.createFormWrapper}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.createFormScroll}
      >
        {/* Form Header */}
        <View style={styles.formHeader}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setShowCreateForm(false);
            }}
            style={styles.formBackButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.primaryText} />
          </TouchableOpacity>
          <Text style={styles.formTitle}>New Exercise</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Form Content */}
        <View style={styles.formContent}>
          <TextField
            label="Exercise Name"
            placeholder="e.g., Bulgarian Split Squat"
            value={customExercise.name}
            onChangeText={(text) =>
              setCustomExercise((prev) => ({ ...prev, name: text }))
            }
          />

          <TextField
            label="Description"
            placeholder="Brief description of the exercise..."
            value={customExercise.description}
            onChangeText={(text) =>
              setCustomExercise((prev) => ({ ...prev, description: text }))
            }
            multiline
            numberOfLines={3}
          />

          <View style={styles.formRow}>
            <View style={styles.formRowHalf}>
              <TextField
                label="Category"
                placeholder="e.g., Dumbbell"
                value={customExercise.category}
                onChangeText={(text) =>
                  setCustomExercise((prev) => ({ ...prev, category: text }))
                }
              />
            </View>
            <View style={styles.formRowHalf}>
              <TextField
                label="Equipment"
                placeholder="e.g., Bench"
                value={customExercise.equipment_needed}
                onChangeText={(text) =>
                  setCustomExercise((prev) => ({
                    ...prev,
                    equipment_needed: text,
                  }))
                }
              />
            </View>
          </View>

          <TextField
            label="Target Muscles"
            placeholder="e.g., Quadriceps, Glutes"
            value={customExercise.muscle_groups}
            onChangeText={(text) =>
              setCustomExercise((prev) => ({ ...prev, muscle_groups: text }))
            }
          />

          {/* Defaults Section */}
          <Text style={styles.defaultsSectionTitle}>Default Values</Text>
          <View style={styles.defaultsGrid}>
            <View style={styles.defaultsCard}>
              <Text style={styles.defaultsCardLabel}>Sets</Text>
              <View style={styles.numberStepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCustomExercise((prev) => ({
                      ...prev,
                      default_sets: Math.max(1, prev.default_sets - 1),
                    }));
                  }}
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={theme.colors.primaryText}
                  />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>
                  {customExercise.default_sets}
                </Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCustomExercise((prev) => ({
                      ...prev,
                      default_sets: prev.default_sets + 1,
                    }));
                  }}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={theme.colors.primaryText}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.defaultsCard}>
              <Text style={styles.defaultsCardLabel}>Reps</Text>
              <View style={styles.numberStepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCustomExercise((prev) => ({
                      ...prev,
                      default_reps: Math.max(1, prev.default_reps - 1),
                    }));
                  }}
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={theme.colors.primaryText}
                  />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>
                  {customExercise.default_reps}
                </Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCustomExercise((prev) => ({
                      ...prev,
                      default_reps: prev.default_reps + 1,
                    }));
                  }}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={theme.colors.primaryText}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.defaultsCard}>
              <Text style={styles.defaultsCardLabel}>Rest (sec)</Text>
              <View style={styles.numberStepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCustomExercise((prev) => ({
                      ...prev,
                      default_rest: Math.max(0, prev.default_rest - 15),
                    }));
                  }}
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={theme.colors.primaryText}
                  />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>
                  {customExercise.default_rest}
                </Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCustomExercise((prev) => ({
                      ...prev,
                      default_rest: prev.default_rest + 15,
                    }));
                  }}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={theme.colors.primaryText}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.formActions}>
          <PrimaryButton
            title="Create Exercise"
            onPress={handleCreateCustomExercise}
            loading={isCreating}
            disabled={!customExercise.name.trim()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderContent = () => {
    if (showCreateForm) {
      return renderCreateForm();
    }

    if (isLoading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorState}>
          <View style={styles.errorIconContainer}>
            <Ionicons
              name="cloud-offline-outline"
              size={48}
              color={theme.colors.error}
            />
          </View>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchExercises}>
            <Ionicons name="refresh" size={18} color={theme.colors.surface} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (exercises.length === 0) {
      return renderEmptyState();
    }

    return (
      <FlatList
        ref={listRef}
        data={exercises}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExerciseItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Main Container */}
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle Bar */}
        <View style={styles.handleBar}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Exercise Library</Text>
            {selectedExercises.length > 0 && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>
                  {selectedExercises.length} selected
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              Haptics.selectionAsync();
              onClose();
            }}
          >
            <Ionicons name="close" size={24} color={theme.colors.primaryText} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'official' && styles.tabActive]}
            onPress={() => handleTabChange('official')}
          >
            <Ionicons
              name={activeTab === 'official' ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={18}
              color={
                activeTab === 'official'
                  ? theme.colors.primary
                  : theme.colors.secondaryText
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'official' && styles.tabTextActive,
              ]}
            >
              Official
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'custom' && styles.tabActive]}
            onPress={() => handleTabChange('custom')}
          >
            <Ionicons
              name={activeTab === 'custom' ? 'person' : 'person-outline'}
              size={18}
              color={
                activeTab === 'custom'
                  ? theme.colors.primary
                  : theme.colors.secondaryText
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'custom' && styles.tabTextActive,
              ]}
            >
              My Exercises
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>{renderContent()}</View>
      </Animated.View>

      {/* Exercise Detail Modal */}
      {expandedExercise && (
        <Modal
          visible={!!expandedExercise}
          transparent
          animationType="fade"
          onRequestClose={() => setExpandedExercise(null)}
        >
          <TouchableOpacity
            style={styles.detailBackdrop}
            onPress={() => setExpandedExercise(null)}
            activeOpacity={1}
          >
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{expandedExercise.name}</Text>
                <TouchableOpacity
                  onPress={() => setExpandedExercise(null)}
                  style={styles.detailClose}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={theme.colors.primaryText}
                  />
                </TouchableOpacity>
              </View>
              {expandedExercise.description && (
                <Text style={styles.detailDescription}>
                  {expandedExercise.description}
                </Text>
              )}
              <View style={styles.detailMeta}>
                {expandedExercise.category && (
                  <View style={styles.detailMetaItem}>
                    <Ionicons
                      name={CATEGORY_ICONS[expandedExercise.category] || 'ellipse'}
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.detailMetaText}>
                      {expandedExercise.category}
                    </Text>
                  </View>
                )}
                {expandedExercise.muscle_groups && (
                  <View style={styles.detailMetaItem}>
                    <Ionicons
                      name="body-outline"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.detailMetaText}>
                      {expandedExercise.muscle_groups}
                    </Text>
                  </View>
                )}
                {expandedExercise.equipment_needed && (
                  <View style={styles.detailMetaItem}>
                    <Ionicons
                      name="barbell-outline"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.detailMetaText}>
                      {expandedExercise.equipment_needed}
                    </Text>
                  </View>
                )}
              </View>
              <PrimaryButton
                title={
                  isExerciseSelected(expandedExercise)
                    ? 'Remove from Selection'
                    : 'Add to Program'
                }
                onPress={() => {
                  onSelectExercise(expandedExercise);
                  setExpandedExercise(null);
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: SCREEN_HEIGHT * 0.92,
      minHeight: SCREEN_HEIGHT * 0.75,
      overflow: 'hidden',
      // Shadow for iOS
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      // Elevation for Android
      elevation: 24,
    },
    handleBar: {
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 8,
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.primaryText,
      letterSpacing: -0.5,
    },
    selectedBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    selectedBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.surface,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Tabs
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 12,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      gap: 8,
    },
    tabActive: {
      backgroundColor: theme.colors.primarySoft,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.secondaryText,
    },
    tabTextActive: {
      color: theme.colors.primary,
    },

    // Content
    content: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 40,
    },

    // Sticky Header / Search Section
    stickyHeader: {
      backgroundColor: theme.colors.background,
    },
    searchSection: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 12,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 48,
      gap: 10,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    searchContainerFocused: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.background,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.primaryText,
      paddingVertical: 0,
    },
    filterToggle: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterToggleActive: {
      backgroundColor: theme.colors.primarySoft,
    },
    filterBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.surface,
    },

    // Category Chips
    categoryScroll: {
      marginBottom: 12,
    },
    categoryScrollContent: {
      paddingHorizontal: 20,
      gap: 8,
      flexDirection: 'row',
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      gap: 6,
    },
    categoryChipActive: {
      backgroundColor: theme.colors.primary,
    },
    categoryChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.secondaryText,
    },
    categoryChipTextActive: {
      color: theme.colors.surface,
    },

    // Muscle Filters
    muscleFiltersContainer: {
      marginHorizontal: 20,
      marginBottom: 12,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
    },
    muscleFiltersHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    muscleFiltersTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    clearMuscleText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.error,
    },
    muscleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    muscleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
      gap: 6,
    },
    muscleChipActive: {
      backgroundColor: theme.colors.primary,
    },
    muscleChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.secondaryText,
    },
    muscleChipTextActive: {
      color: theme.colors.surface,
    },

    // Active Filters Bar
    activeFiltersBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: 20,
      marginBottom: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.colors.primarySoft,
      borderRadius: 10,
    },
    activeFiltersText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    clearAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clearAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.error,
    },

    // Create Custom Banner
    createCustomBanner: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 16,
      overflow: 'hidden',
    },
    createCustomContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    createCustomIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    createCustomText: {
      flex: 1,
    },
    createCustomTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.surface,
      marginBottom: 2,
    },
    createCustomSubtitle: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
    },

    // Results Bar
    resultsBar: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    resultsText: {
      fontSize: 13,
      color: theme.colors.secondaryText,
      fontWeight: '500',
    },

    // Exercise Card
    exerciseCard: {
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      flexDirection: 'row',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    exerciseCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
    },
    exerciseImageWrapper: {
      width: 90,
      height: 110,
      position: 'relative',
    },
    exerciseImage: {
      width: '100%',
      height: '100%',
    },
    imageGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    exercisePlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryBadge: {
      position: 'absolute',
      bottom: 6,
      left: 6,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 3,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 6,
      gap: 4,
    },
    categoryBadgeText: {
      fontSize: 9,
      fontWeight: '600',
      color: theme.colors.surface,
      textTransform: 'uppercase',
    },
    exerciseContent: {
      flex: 1,
      padding: 12,
      justifyContent: 'space-between',
    },
    exerciseHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    exerciseName: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.primaryText,
      lineHeight: 20,
      paddingRight: 8,
    },
    selectionIndicator: {
      width: 24,
      height: 24,
    },
    checkmarkCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    muscleTagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 6,
    },
    muscleTag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: theme.colors.primarySoft,
      borderRadius: 6,
      gap: 4,
    },
    muscleTagText: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.primary,
    },
    moreMuscles: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.secondaryText,
    },
    defaultsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },
    defaultItem: {
      alignItems: 'center',
    },
    defaultValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    defaultLabel: {
      fontSize: 10,
      color: theme.colors.secondaryText,
      marginTop: 1,
    },
    defaultDivider: {
      width: 1,
      height: 20,
      backgroundColor: theme.colors.border,
      marginHorizontal: 14,
    },
    quickAddButton: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickAddButtonSelected: {
      backgroundColor: theme.colors.primary,
    },

    // Loading State
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 14,
      color: theme.colors.secondaryText,
    },

    // Error State
    errorState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingVertical: 60,
    },
    errorIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255,59,48,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: 8,
    },
    errorSubtitle: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      marginBottom: 24,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      gap: 8,
    },
    retryButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.surface,
    },

    // Empty State
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingVertical: 60,
    },
    emptyIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      overflow: 'hidden',
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    emptyActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      gap: 8,
    },
    emptyActionText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.surface,
    },

    // Create Form
    createFormWrapper: {
      flex: 1,
    },
    createFormScroll: {
      paddingBottom: 40,
    },
    formHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    formBackButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    formContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
    },
    formRowHalf: {
      flex: 1,
    },
    defaultsSectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 20,
      marginBottom: 12,
    },
    defaultsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    defaultsCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
    },
    defaultsCardLabel: {
      fontSize: 12,
      color: theme.colors.secondaryText,
      marginBottom: 10,
    },
    numberStepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    stepperButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.primaryText,
      minWidth: 36,
      textAlign: 'center',
    },
    formActions: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },

    // Detail Modal
    detailBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    detailCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      padding: 24,
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    detailTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.primaryText,
      paddingRight: 16,
    },
    detailClose: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailDescription: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      lineHeight: 20,
      marginBottom: 16,
    },
    detailMeta: {
      marginBottom: 20,
      gap: 10,
    },
    detailMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    detailMetaText: {
      fontSize: 14,
      color: theme.colors.primaryText,
    },
  });

export default ExerciseLibrary;
