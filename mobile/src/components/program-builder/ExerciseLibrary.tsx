// src/components/program-builder/ExerciseLibrary.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useTheme, Theme } from '../../theme';
import { useAuth } from '../../providers/AuthProvider';
import { exercisesApi } from '../../lib/api/programs';
import { Exercise, EXERCISE_CATEGORIES, MUSCLE_GROUPS } from '../../lib/types/program';
import { PrimaryButton } from '../ui/PrimaryButton';
import { TextField } from '../ui/TextField';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  // Animation
  const slideAnim = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
      fetchExercises();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

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
      const apiCall = activeTab === 'official' 
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
    setFilters(prev => ({ ...prev, search: text }));
  }, []);

  const handleCategorySelect = useCallback((category: string | null) => {
    setFilters(prev => ({ ...prev, category }));
  }, []);

  const handleMuscleGroupSelect = useCallback((muscleGroup: string | null) => {
    setFilters(prev => ({ ...prev, muscleGroup }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ search: '', category: null, muscleGroup: null });
  }, []);

  const hasActiveFilters = filters.category || filters.muscleGroup;

  const handleCreateCustomExercise = async () => {
    if (!accessToken || !customExercise.name.trim()) return;
    
    setIsCreating(true);
    try {
      const newExercise = await exercisesApi.createExercise({
        name: customExercise.name,
        description: customExercise.description || null,
        category: customExercise.category || null,
        muscle_groups: customExercise.muscle_groups || null,
        equipment_needed: customExercise.equipment_needed || null,
        default_sets: customExercise.default_sets,
        default_reps: customExercise.default_reps,
        default_rest: customExercise.default_rest,
      }, accessToken);
      
      setExercises(prev => [newExercise, ...prev]);
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
      
      // Optionally auto-select the newly created exercise
      onSelectExercise(newExercise);
    } catch (err) {
      console.error('Failed to create exercise:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const isExerciseSelected = (exercise: Exercise) => {
    return selectedExercises.some(e => e.id === exercise.id);
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    const selected = isExerciseSelected(item);
    
    return (
      <TouchableOpacity
        style={[styles.exerciseItem, selected && styles.exerciseItemSelected]}
        onPress={() => onSelectExercise(item)}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.exerciseImage} />
          ) : (
            <View style={styles.exerciseImagePlaceholder}>
              <Ionicons name="barbell-outline" size={24} color={theme.colors.secondaryText} />
            </View>
          )}
        </View>
        
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.exerciseMeta}>
            {item.muscle_groups && (
              <Text style={styles.exerciseMetaText} numberOfLines={1}>
                {item.muscle_groups}
              </Text>
            )}
            {item.category && (
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{item.category}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.exerciseDefaults}>
          <Text style={styles.defaultsText}>
            {item.default_sets}×{item.default_reps}
          </Text>
        </View>
        
        {selected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilterChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterChipsContainer}
      contentContainerStyle={styles.filterChipsContent}
    >
      {EXERCISE_CATEGORIES.map(category => (
        <TouchableOpacity
          key={category}
          style={[
            styles.filterChip,
            filters.category === category && styles.filterChipActive,
          ]}
          onPress={() => handleCategorySelect(filters.category === category ? null : category)}
        >
          <Text style={[
            styles.filterChipText,
            filters.category === category && styles.filterChipTextActive,
          ]}>
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderMuscleGroupFilters = () => (
    <View style={styles.muscleGroupsContainer}>
      <Text style={styles.filterSectionTitle}>Muscle Groups</Text>
      <View style={styles.muscleGroupsGrid}>
        {MUSCLE_GROUPS.map(muscleGroup => (
          <TouchableOpacity
            key={muscleGroup}
            style={[
              styles.muscleGroupChip,
              filters.muscleGroup === muscleGroup && styles.muscleGroupChipActive,
            ]}
            onPress={() => handleMuscleGroupSelect(filters.muscleGroup === muscleGroup ? null : muscleGroup)}
          >
            <Text style={[
              styles.muscleGroupChipText,
              filters.muscleGroup === muscleGroup && styles.muscleGroupChipTextActive,
            ]}>
              {muscleGroup}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCreateForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.createFormContainer}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.createFormHeader}>
          <Text style={styles.createFormTitle}>Create Custom Exercise</Text>
          <TouchableOpacity onPress={() => setShowCreateForm(false)}>
            <Ionicons name="close" size={24} color={theme.colors.primaryText} />
          </TouchableOpacity>
        </View>
        
        <TextField
          label="Exercise Name *"
          placeholder="e.g., Bulgarian Split Squat"
          value={customExercise.name}
          onChangeText={(text) => setCustomExercise(prev => ({ ...prev, name: text }))}
        />
        
        <TextField
          label="Description"
          placeholder="Brief description of the exercise"
          value={customExercise.description}
          onChangeText={(text) => setCustomExercise(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={3}
        />
        
        <TextField
          label="Category"
          placeholder="e.g., Dumbbell, Bodyweight"
          value={customExercise.category}
          onChangeText={(text) => setCustomExercise(prev => ({ ...prev, category: text }))}
        />
        
        <TextField
          label="Target Muscles"
          placeholder="e.g., Quadriceps, Glutes"
          value={customExercise.muscle_groups}
          onChangeText={(text) => setCustomExercise(prev => ({ ...prev, muscle_groups: text }))}
        />
        
        <TextField
          label="Equipment Needed"
          placeholder="e.g., Dumbbells, Bench"
          value={customExercise.equipment_needed}
          onChangeText={(text) => setCustomExercise(prev => ({ ...prev, equipment_needed: text }))}
        />
        
        <View style={styles.defaultsRow}>
          <View style={styles.defaultInput}>
            <Text style={styles.defaultInputLabel}>Default Sets</Text>
            <TextInput
              style={styles.numberInput}
              value={String(customExercise.default_sets)}
              onChangeText={(text) => setCustomExercise(prev => ({ ...prev, default_sets: parseInt(text) || 0 }))}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.defaultInput}>
            <Text style={styles.defaultInputLabel}>Default Reps</Text>
            <TextInput
              style={styles.numberInput}
              value={String(customExercise.default_reps)}
              onChangeText={(text) => setCustomExercise(prev => ({ ...prev, default_reps: parseInt(text) || 0 }))}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.defaultInput}>
            <Text style={styles.defaultInputLabel}>Rest (sec)</Text>
            <TextInput
              style={styles.numberInput}
              value={String(customExercise.default_rest)}
              onChangeText={(text) => setCustomExercise(prev => ({ ...prev, default_rest: parseInt(text) || 0 }))}
              keyboardType="numeric"
            />
          </View>
        </View>
        
        <PrimaryButton
          title="Create Exercise"
          onPress={handleCreateCustomExercise}
          loading={isCreating}
          disabled={!customExercise.name.trim()}
          style={styles.createButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
        
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerHandle} />
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Exercise Library</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.primaryText} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'official' && styles.tabActive]}
              onPress={() => setActiveTab('official')}
            >
              <Ionicons
                name="shield-checkmark"
                size={18}
                color={activeTab === 'official' ? theme.colors.primary : theme.colors.secondaryText}
              />
              <Text style={[styles.tabText, activeTab === 'official' && styles.tabTextActive]}>
                Official
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'custom' && styles.tabActive]}
              onPress={() => setActiveTab('custom')}
            >
              <Ionicons
                name="person"
                size={18}
                color={activeTab === 'custom' ? theme.colors.primary : theme.colors.secondaryText}
              />
              <Text style={[styles.tabText, activeTab === 'custom' && styles.tabTextActive]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {showCreateForm ? (
            renderCreateForm()
          ) : (
            <>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={20} color={theme.colors.secondaryText} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search exercises..."
                    placeholderTextColor={theme.colors.secondaryText}
                    value={filters.search}
                    onChangeText={handleSearchChange}
                    returnKeyType="search"
                  />
                  {filters.search.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearchChange('')}>
                      <Ionicons name="close-circle" size={20} color={theme.colors.secondaryText} />
                    </TouchableOpacity>
                  )}
                </View>
                
                <TouchableOpacity
                  style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
                  onPress={() => setShowFilters(!showFilters)}
                >
                  <Ionicons
                    name="options"
                    size={20}
                    color={hasActiveFilters ? theme.colors.primary : theme.colors.secondaryText}
                  />
                </TouchableOpacity>
              </View>

              {/* Category Filters */}
              {renderFilterChips()}

              {/* Extended Filters */}
              {showFilters && (
                <View style={styles.extendedFilters}>
                  {renderMuscleGroupFilters()}
                  {hasActiveFilters && (
                    <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                      <Ionicons name="refresh" size={16} color={theme.colors.error} />
                      <Text style={styles.clearFiltersText}>Clear Filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Create Custom Button (only on custom tab) */}
              {activeTab === 'custom' && (
                <TouchableOpacity
                  style={styles.createCustomButton}
                  onPress={() => setShowCreateForm(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.createCustomButtonText}>Create Custom Exercise</Text>
                </TouchableOpacity>
              )}

              {/* Exercise List */}
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={fetchExercises}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : exercises.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="barbell-outline" size={48} color={theme.colors.secondaryText} />
                  <Text style={styles.emptyText}>
                    {activeTab === 'custom' 
                      ? "You haven't created any custom exercises yet"
                      : "No exercises found matching your criteria"
                    }
                  </Text>
                  {activeTab === 'custom' && (
                    <TouchableOpacity
                      style={styles.createFirstButton}
                      onPress={() => setShowCreateForm(true)}
                    >
                      <Text style={styles.createFirstButtonText}>Create Your First Exercise</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <FlatList
                  data={exercises}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderExerciseItem}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              )}
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    overlayTouchable: {
      flex: 1,
    },
    container: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: SCREEN_HEIGHT * 0.9,
      minHeight: SCREEN_HEIGHT * 0.7,
    },
    header: {
      alignItems: 'center',
      paddingTop: theme.spacing(2),
      paddingBottom: theme.spacing(3),
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      marginBottom: theme.spacing(3),
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      paddingHorizontal: theme.spacing(4),
    },
    headerTitle: {
      fontSize: theme.typography.fontSizeLg,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    closeButton: {
      padding: theme.spacing(1),
    },

    // Tabs
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing(4),
      paddingVertical: theme.spacing(2),
      gap: theme.spacing(2),
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
      gap: theme.spacing(1),
    },
    tabActive: {
      backgroundColor: theme.colors.primarySoft,
    },
    tabText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.secondaryText,
    },
    tabTextActive: {
      color: theme.colors.primary,
    },

    // Search
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing(4),
      paddingVertical: theme.spacing(2),
      gap: theme.spacing(2),
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      paddingHorizontal: theme.spacing(3),
      gap: theme.spacing(2),
    },
    searchInput: {
      flex: 1,
      paddingVertical: theme.spacing(2),
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.primaryText,
    },
    filterButton: {
      padding: theme.spacing(2),
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.primarySoft,
    },

    // Filter Chips
    filterChipsContainer: {
      paddingVertical: theme.spacing(1),
    },
    filterChipsContent: {
      paddingHorizontal: theme.spacing(4),
      gap: theme.spacing(2),
    },
    filterChip: {
      paddingVertical: theme.spacing(1.5),
      paddingHorizontal: theme.spacing(3),
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      marginRight: theme.spacing(2),
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
    },
    filterChipText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '500',
      color: theme.colors.secondaryText,
    },
    filterChipTextActive: {
      color: theme.colors.surface,
    },

    // Extended Filters
    extendedFilters: {
      paddingHorizontal: theme.spacing(4),
      paddingVertical: theme.spacing(2),
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing(4),
      marginTop: theme.spacing(2),
      borderRadius: 12,
    },
    filterSectionTitle: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
      color: theme.colors.secondaryText,
      marginBottom: theme.spacing(2),
      textTransform: 'uppercase',
    },
    muscleGroupsContainer: {},
    muscleGroupsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing(1),
    },
    muscleGroupChip: {
      paddingVertical: theme.spacing(1),
      paddingHorizontal: theme.spacing(2),
      backgroundColor: theme.colors.background,
      borderRadius: 6,
    },
    muscleGroupChipActive: {
      backgroundColor: theme.colors.primary,
    },
    muscleGroupChipText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
    },
    muscleGroupChipTextActive: {
      color: theme.colors.surface,
    },
    clearFiltersButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing(3),
      paddingVertical: theme.spacing(2),
      gap: theme.spacing(1),
    },
    clearFiltersText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.error,
    },

    // Create Custom Button
    createCustomButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: theme.spacing(4),
      marginVertical: theme.spacing(2),
      paddingVertical: theme.spacing(3),
      backgroundColor: theme.colors.primarySoft,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderStyle: 'dashed',
      gap: theme.spacing(2),
    },
    createCustomButtonText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primary,
    },

    // Exercise List
    listContent: {
      paddingHorizontal: theme.spacing(4),
      paddingTop: theme.spacing(2),
      paddingBottom: theme.spacing(6),
    },
    separator: {
      height: theme.spacing(2),
    },
    exerciseItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: theme.spacing(3),
    },
    exerciseItemSelected: {
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    exerciseImageContainer: {
      marginRight: theme.spacing(3),
    },
    exerciseImage: {
      width: 56,
      height: 56,
      borderRadius: 8,
    },
    exerciseImagePlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    exerciseInfo: {
      flex: 1,
    },
    exerciseName: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: theme.spacing(1),
    },
    exerciseMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(2),
    },
    exerciseMetaText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      flex: 1,
    },
    categoryTag: {
      backgroundColor: theme.colors.background,
      paddingVertical: 2,
      paddingHorizontal: theme.spacing(2),
      borderRadius: 4,
    },
    categoryTagText: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.secondaryText,
    },
    exerciseDefaults: {
      marginLeft: theme.spacing(2),
      alignItems: 'flex-end',
    },
    defaultsText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      fontWeight: '500',
    },
    selectedIndicator: {
      marginLeft: theme.spacing(2),
    },

    // Loading/Error/Empty States
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing(10),
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing(10),
    },
    errorText: {
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.secondaryText,
      marginTop: theme.spacing(2),
    },
    retryButton: {
      marginTop: theme.spacing(4),
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(4),
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
    },
    retryButtonText: {
      color: theme.colors.surface,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing(10),
      paddingHorizontal: theme.spacing(6),
    },
    emptyText: {
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.secondaryText,
      marginTop: theme.spacing(2),
      textAlign: 'center',
    },
    createFirstButton: {
      marginTop: theme.spacing(4),
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(4),
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
    },
    createFirstButtonText: {
      color: theme.colors.surface,
      fontWeight: '600',
    },

    // Create Form
    createFormContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing(4),
      paddingBottom: theme.spacing(4),
    },
    createFormHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing(4),
      paddingTop: theme.spacing(2),
    },
    createFormTitle: {
      fontSize: theme.typography.fontSizeLg,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    defaultsRow: {
      flexDirection: 'row',
      gap: theme.spacing(3),
      marginBottom: theme.spacing(4),
    },
    defaultInput: {
      flex: 1,
    },
    defaultInputLabel: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      marginBottom: theme.spacing(1),
    },
    numberInput: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      paddingHorizontal: theme.spacing(3),
      paddingVertical: theme.spacing(2),
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.primaryText,
      textAlign: 'center',
    },
    createButton: {
      marginTop: theme.spacing(4),
    },
  });

export default ExerciseLibrary;
