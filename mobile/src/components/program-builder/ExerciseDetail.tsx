import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { useTheme, Theme } from '../../theme';
import { Exercise } from '../../lib/types/program';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface ExerciseDetailProps {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onAddExercise: (exercise: Exercise) => void;
  isSelected?: boolean;
}

type DetailTab = 'overview' | 'media';

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

// Difficulty color mapping
const getDifficultyColor = (difficulty: string | undefined, theme: Theme) => {
  switch (difficulty?.toLowerCase()) {
    case 'beginner':
      return '#22c55e';
    case 'intermediate':
      return '#f59e0b';
    case 'advanced':
      return '#ef4444';
    default:
      return theme.colors.secondaryText;
  }
};

export const ExerciseDetail: React.FC<ExerciseDetailProps> = ({
  visible,
  exercise,
  onClose,
  onAddExercise,
  isSelected = false,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // State
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<Video>(null);

  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Reset state when opening
  useEffect(() => {
    if (visible && exercise) {
      setActiveTab('overview');
      setActiveMediaIndex(0);
      setIsVideoPlaying(false);
      
      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, exercise]);

  // Get media items (video + images)
  const mediaItems = useMemo(() => {
    if (!exercise) return [];
    const items: { type: 'video' | 'image'; uri: string }[] = [];
    
    if (exercise.video_url) {
      items.push({ type: 'video', uri: exercise.video_url });
    }
    if (exercise.image) {
      items.push({ type: 'image', uri: exercise.image });
    }
    // Add additional images if available
    if (exercise.images && Array.isArray(exercise.images)) {
      exercise.images.forEach((img: string) => {
        items.push({ type: 'image', uri: img });
      });
    }
    return items;
  }, [exercise]);

  const categoryIcon = exercise?.category ? CATEGORY_ICONS[exercise.category] || 'fitness' : 'fitness';

  // Handle close with animation
  const handleClose = () => {
    setIsVideoPlaying(false);
    onClose();
  };

  // Handle add exercise
  const handleAddExercise = () => {
    if (exercise) {
      onAddExercise(exercise);
    }
  };

  // Don't render modal content if no exercise
  if (!exercise) {
    return null;
  }

  // Hero Section with Media Carousel
  const renderHeroSection = () => {
    const heroHeight = 280;

    return (
      <View style={[styles.heroSection, { height: heroHeight }]}>
        {mediaItems.length > 0 ? (
          <>
            <FlatList
              data={mediaItems}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveMediaIndex(index);
              }}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item, index }) => (
                <View style={styles.mediaSlide}>
                  {item.type === 'video' ? (
                    <TouchableOpacity
                      style={styles.videoContainer}
                      onPress={() => setIsVideoPlaying(!isVideoPlaying)}
                      activeOpacity={0.9}
                    >
                      <Video
                        ref={videoRef}
                        source={{ uri: item.uri }}
                        style={styles.video}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={isVideoPlaying && activeMediaIndex === index}
                        isLooping
                        isMuted={false}
                      />
                      {!isVideoPlaying && (
                        <View style={styles.playButtonOverlay}>
                          <LinearGradient
                            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
                            style={styles.playButtonGradient}
                          >
                            <View style={styles.playButton}>
                              <Ionicons name="play" size={32} color="#fff" />
                            </View>
                          </LinearGradient>
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <Image source={{ uri: item.uri }} style={styles.heroImage} />
                  )}
                </View>
              )}
            />
            {/* Media Indicators */}
            {mediaItems.length > 1 && (
              <View style={styles.mediaIndicators}>
                {mediaItems.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.mediaIndicator,
                      activeMediaIndex === index && styles.mediaIndicatorActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <LinearGradient
            colors={[theme.colors.primary + '40', theme.colors.primary + '20']}
            style={styles.heroPlaceholder}
          >
            <View style={styles.heroIconContainer}>
              <Ionicons name={categoryIcon as any} size={64} color={theme.colors.primary} />
            </View>
            <Text style={styles.heroPlaceholderText}>No media available</Text>
          </LinearGradient>
        )}

        {/* Overlay Gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.heroGradient}
        />

        {/* Close Button */}
        <TouchableOpacity style={styles.heroCloseBtn} onPress={handleClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Exercise Title Overlay */}
        <View style={styles.heroTitleSection}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {exercise.name}
          </Text>
          <View style={styles.heroMeta}>
            {exercise.category && (
              <View style={styles.heroBadge}>
                <Ionicons name={categoryIcon as any} size={12} color="#fff" />
                <Text style={styles.heroBadgeText}>{exercise.category}</Text>
              </View>
            )}
            {exercise.difficulty && (
              <View
                style={[
                  styles.heroBadge,
                  { backgroundColor: getDifficultyColor(exercise.difficulty, theme) },
                ]}
              >
                <Text style={styles.heroBadgeText}>{exercise.difficulty}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Tab Navigation
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
        onPress={() => setActiveTab('overview')}
      >
        <Ionicons
          name="document-text-outline"
          size={18}
          color={activeTab === 'overview' ? theme.colors.primary : theme.colors.secondaryText}
        />
        <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
          Overview
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'media' && styles.tabActive]}
        onPress={() => setActiveTab('media')}
      >
        <Ionicons
          name="images-outline"
          size={18}
          color={activeTab === 'media' ? theme.colors.primary : theme.colors.secondaryText}
        />
        <Text style={[styles.tabText, activeTab === 'media' && styles.tabTextActive]}>
          Media
        </Text>
        {mediaItems.length > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{mediaItems.length}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  // Overview Tab Content
  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="layers-outline" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.statValue}>{exercise.default_sets || 3}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#f59e0b20' }]}>
            <Ionicons name="repeat-outline" size={20} color="#f59e0b" />
          </View>
          <Text style={styles.statValue}>{exercise.default_reps || 10}</Text>
          <Text style={styles.statLabel}>Reps</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#22c55e20' }]}>
            <Ionicons name="timer-outline" size={20} color="#22c55e" />
          </View>
          <Text style={styles.statValue}>{exercise.default_rest || 60}s</Text>
          <Text style={styles.statLabel}>Rest</Text>
        </View>
      </View>

      {/* Description */}
      {exercise.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Exercise</Text>
          <Text style={styles.descriptionText}>{exercise.description}</Text>
        </View>
      )}

      {/* Target Muscles */}
      {exercise.muscle_groups && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Muscles</Text>
          <View style={styles.muscleChipsContainer}>
            {exercise.muscle_groups.split(',').map((muscle, index) => (
              <View key={index} style={styles.muscleChip}>
                <Text style={styles.muscleChipText}>{muscle.trim()}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Equipment */}
      {exercise.equipment_needed && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment Needed</Text>
          <View style={styles.equipmentRow}>
            <View style={styles.equipmentIconContainer}>
              <Ionicons name="barbell-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.equipmentText}>{exercise.equipment_needed}</Text>
          </View>
        </View>
      )}

      {/* Instructions */}
      {exercise.instructions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How To Perform</Text>
          <View style={styles.instructionsList}>
            {(typeof exercise.instructions === 'string'
              ? exercise.instructions.split('\n').filter(Boolean)
              : exercise.instructions
            ).map((step: string, index: number) => (
              <View key={index} style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.instructionText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Tips */}
      {exercise.tips && (
        <View style={styles.section}>
          <View style={styles.tipsContainer}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={20} color="#f59e0b" />
              <Text style={styles.tipsTitle}>Pro Tips</Text>
            </View>
            <Text style={styles.tipsText}>{exercise.tips}</Text>
          </View>
        </View>
      )}
    </View>
  );

  // Media Tab Content
  const renderMediaTab = () => (
    <View style={styles.tabContent}>
      {mediaItems.length === 0 ? (
        <View style={styles.emptyMediaState}>
          <View style={styles.emptyMediaIconContainer}>
            <Ionicons name="images-outline" size={48} color={theme.colors.secondaryText} />
          </View>
          <Text style={styles.emptyMediaTitle}>No Media Available</Text>
          <Text style={styles.emptyMediaSubtitle}>
            This exercise doesn't have any videos or images yet
          </Text>
        </View>
      ) : (
        <View style={styles.mediaGrid}>
          {mediaItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.mediaGridItem}
              activeOpacity={0.8}
            >
              {item.type === 'video' ? (
                <View style={styles.mediaGridVideo}>
                  <Video
                    source={{ uri: item.uri }}
                    style={styles.mediaGridVideoPlayer}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                  />
                  <View style={styles.mediaGridVideoOverlay}>
                    <View style={styles.mediaGridPlayIcon}>
                      <Ionicons name="play" size={24} color="#fff" />
                    </View>
                    <Text style={styles.mediaGridVideoLabel}>Video</Text>
                  </View>
                </View>
              ) : (
                <Image source={{ uri: item.uri }} style={styles.mediaGridImage} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Main Content */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {renderHeroSection()}
            {renderTabs()}
            {activeTab === 'overview' ? renderOverviewTab() : renderMediaTab()}

            {/* Bottom Padding */}
            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Fixed Bottom CTA */}
          <View style={styles.bottomCTA}>
            <TouchableOpacity
              style={[styles.addExerciseBtn, isSelected && styles.addExerciseBtnSelected]}
              onPress={handleAddExercise}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isSelected
                    ? ['#22c55e', '#16a34a']
                    : [theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addExerciseBtnGradient}
              >
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'add-circle'}
                  size={22}
                  color="#fff"
                />
                <Text style={styles.addExerciseBtnText}>
                  {isSelected ? 'Added to Workout' : 'Add to Workout'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: SCREEN_HEIGHT * 0.95,
      overflow: 'hidden',
    },
    scrollView: {
      flex: 1,
    },
    heroSection: {
      width: SCREEN_WIDTH,
      position: 'relative',
      backgroundColor: theme.colors.surface,
    },
    mediaSlide: {
      width: SCREEN_WIDTH,
      height: 280,
    },
    videoContainer: {
      flex: 1,
      position: 'relative',
    },
    video: {
      flex: 1,
    },
    playButtonOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    playButtonGradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 4,
    },
    heroImage: {
      flex: 1,
      resizeMode: 'cover',
    },
    heroPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    heroPlaceholderText: {
      fontSize: 14,
      color: theme.colors.secondaryText,
    },
    mediaIndicators: {
      position: 'absolute',
      bottom: 70,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    mediaIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.4)',
    },
    mediaIndicatorActive: {
      backgroundColor: '#fff',
      width: 24,
    },
    heroGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 120,
    },
    heroCloseBtn: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 16,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroTitleSection: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: '#fff',
      marginBottom: 10,
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    heroMeta: {
      flexDirection: 'row',
      gap: 8,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      gap: 6,
    },
    heroBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
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
    tabBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    tabBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },
    tabContent: {
      padding: 20,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    statIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.primaryText,
      marginBottom: 12,
    },
    descriptionText: {
      fontSize: 15,
      lineHeight: 24,
      color: theme.colors.secondaryText,
    },
    muscleChipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    muscleChip: {
      backgroundColor: theme.colors.primarySoft,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
    },
    muscleChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    equipmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 12,
      gap: 12,
    },
    equipmentIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    equipmentText: {
      fontSize: 15,
      color: theme.colors.primaryText,
      flex: 1,
    },
    instructionsList: {
      gap: 16,
    },
    instructionItem: {
      flexDirection: 'row',
      gap: 14,
    },
    instructionNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    instructionNumberText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },
    instructionText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.primaryText,
    },
    tipsContainer: {
      backgroundColor: '#f59e0b15',
      borderRadius: 16,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#f59e0b',
    },
    tipsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    tipsTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#f59e0b',
    },
    tipsText: {
      fontSize: 14,
      lineHeight: 22,
      color: theme.colors.primaryText,
    },
    mediaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    mediaGridItem: {
      width: (SCREEN_WIDTH - 52) / 2,
      height: (SCREEN_WIDTH - 52) / 2,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
    },
    mediaGridVideo: {
      flex: 1,
      position: 'relative',
    },
    mediaGridVideoPlayer: {
      flex: 1,
    },
    mediaGridVideoOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    mediaGridPlayIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    mediaGridVideoLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
    mediaGridImage: {
      flex: 1,
      resizeMode: 'cover',
    },
    emptyMediaState: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyMediaIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyMediaTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: 8,
    },
    emptyMediaSubtitle: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      textAlign: 'center',
    },
    bottomCTA: {
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
    addExerciseBtn: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    addExerciseBtnSelected: {},
    addExerciseBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 10,
    },
    addExerciseBtnText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#fff',
    },
  });

export default ExerciseDetail;
