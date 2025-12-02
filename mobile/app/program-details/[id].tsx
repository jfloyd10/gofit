import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  StatusBar,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../src/providers/AuthProvider';
import { useTheme, Theme } from '../../src/theme';
import { programsApi } from '../../src/lib/api/programs';
import { Program, Week, Session, ProgramDifficulty } from '../../src/lib/types/program';
import { DIFFICULTY_OPTIONS, PROGRAM_FOCUS_OPTIONS } from '../../src/lib/types/program';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 380;
const HEADER_MIN_HEIGHT = 100;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// Session focus icons mapping
const SESSION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Lift': 'barbell-outline',
  'Cardio': 'heart-outline',
  'Stretch': 'body-outline',
  'default': 'fitness-outline',
};

// Day abbreviations
const DAY_ABBREV: Record<string, string> = {
  'Monday': 'MON',
  'Tuesday': 'TUE',
  'Wednesday': 'WED',
  'Thursday': 'THU',
  'Friday': 'FRI',
  'Saturday': 'SAT',
  'Sunday': 'SUN',
};

export default function ProgramDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: 'public' | 'private' }>();
  const { accessToken } = useAuth();
  const theme = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const weekScrollRef = useRef<ScrollView>(null);

  const isPublicView = type === 'public';

  // Animated values for header
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const titleTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  const miniTitleOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_DISTANCE - 50, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const fetchProgram = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      setLoading(true);
      let data: Program;
      if (isPublicView) {
        data = await programsApi.getPublicProgram(parseInt(id), accessToken);
      } else {
        data = await programsApi.getProgram(parseInt(id), accessToken);
      }
      setProgram(data);
    } catch (error) {
      console.error('Failed to load program', error);
      Alert.alert('Error', 'Failed to load program details');
    } finally {
      setLoading(false);
    }
  }, [accessToken, id, isPublicView]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const handleCopyProgram = async () => {
    if (!program || !accessToken) return;
    
    Alert.alert(
      "Start This Program",
      `Add "${program.title}" to your library and begin your journey?`,
      [
        { text: "Not Now", style: "cancel" },
        { 
          text: "Let's Go!", 
          onPress: async () => {
            try {
              setCopying(true);
              const newProgram = await programsApi.copyPublicProgram(program.id, accessToken);
              Alert.alert(
                "You're All Set! 💪", 
                "Program added to your library.",
                [
                  { text: "Start Training", onPress: () => router.push(`/program-details/${newProgram.id}?type=private`) },
                  { text: "Done", style: "cancel" }
                ]
              );
            } catch (error) {
              Alert.alert("Oops!", "Couldn't add this program. Please try again.");
            } finally {
              setCopying(false);
            }
          } 
        }
      ]
    );
  };

  const handleEditProgram = () => {
    if (program) {
      router.push(`/program-builder/${program.id}`);
    }
  };

  const handleShare = async () => {
    if (!program) return;
    try {
      await Share.share({
        message: `Check out "${program.title}" on GoFit! 🏋️`,
        // url: `gofit://program/${program.id}` // Deep link when available
      });
    } catch (error) {
      console.error('Share failed', error);
    }
  };

  const getDifficultyColor = (difficulty: ProgramDifficulty) => {
    const option = DIFFICULTY_OPTIONS.find(d => d.value === difficulty);
    return option?.color || theme.colors.primary;
  };

  const getFocusIcon = (focus: string): keyof typeof Ionicons.glyphMap => {
    const mapping: Record<string, keyof typeof Ionicons.glyphMap> = {
      'Strength': 'barbell-outline',
      'Cardio': 'heart-outline',
      'Crossfit': 'flame-outline',
      'Yoga': 'leaf-outline',
      'Hybrid': 'layers-outline',
      'Triathalon': 'bicycle-outline',
    };
    return mapping[focus] || 'fitness-outline';
  };

  const getTotalActivities = () => {
    if (!program) return 0;
    return program.weeks.reduce((total, week) => 
      total + week.sessions.reduce((sessionTotal, session) => 
        sessionTotal + session.blocks.reduce((blockTotal, block) => 
          blockTotal + block.activities.length, 0), 0), 0);
  };

  const getEstimatedDuration = () => {
    if (!program) return '0';
    const totalSessions = program.weeks.reduce((acc, week) => acc + week.sessions.length, 0);
    const hours = Math.round(totalSessions * 0.75); // ~45 min per session average
    return hours > 0 ? `${hours}` : '<1';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading program...</Text>
      </View>
    );
  }

  if (!program) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.secondaryText} />
        <Text style={styles.errorText}>Program not found</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentWeek = program.weeks[selectedWeek];
  
  // Handle both image and image_url fields (API may return either)
  const programImage = (program as any).image_url || program.image;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <Animated.Image 
          source={programImage ? { uri: programImage } : require('../../assets/images/adaptive-icon.png')}
          style={[styles.headerImage, { opacity: imageOpacity }]}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.5, 1]}
          style={styles.headerGradient}
        />
        
        {/* Mini Title (appears on scroll) */}
        <Animated.View style={[styles.miniTitleContainer, { 
          opacity: miniTitleOpacity,
          paddingTop: insets.top + 10,
        }]}>
          <Text style={styles.miniTitle} numberOfLines={1}>{program.title}</Text>
        </Animated.View>

        {/* Header Content */}
        <Animated.View style={[styles.headerContent, { 
          transform: [{ translateY: titleTranslate }],
          bottom: 24,
        }]}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: getDifficultyColor(program.difficulty) }]}>
              <Text style={styles.badgeText}>{program.difficulty}</Text>
            </View>
            <View style={[styles.badge, styles.focusBadge]}>
              <Ionicons name={getFocusIcon(program.focus)} size={12} color="#fff" />
              <Text style={styles.badgeText}>{program.focus}</Text>
            </View>
          </View>
          <Text style={styles.title}>{program.title}</Text>
        </Animated.View>

        {/* Navigation Bar */}
        <View style={[styles.navBar, { paddingTop: insets.top }]}>
          <TouchableOpacity 
            style={[styles.navButton, styles.navButtonBg]} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.navRight}>
            <TouchableOpacity 
              style={[styles.navButton, styles.navButtonBg]} 
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
            
            {isPublicView && (
              <TouchableOpacity 
                style={[styles.navButton, styles.navButtonBg, { marginLeft: 8 }]} 
                onPress={() => setIsSaved(!isSaved)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isSaved ? "bookmark" : "bookmark-outline"} 
                  size={22} 
                  color={isSaved ? theme.colors.primary : "#fff"} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Main Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.statValue}>{program.weeks.length}</Text>
            <Text style={styles.statLabel}>Weeks</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FF9500' + '20' }]}>
              <Ionicons name="flash-outline" size={20} color="#FF9500" />
            </View>
            <Text style={styles.statValue}>
              {program.weeks.reduce((acc, week) => acc + week.sessions.length, 0)}
            </Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#AF52DE' + '20' }]}>
              <Ionicons name="time-outline" size={20} color="#AF52DE" />
            </View>
            <Text style={styles.statValue}>{getEstimatedDuration()}</Text>
            <Text style={styles.statLabel}>Hours</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#34C759' + '20' }]}>
              <Ionicons name="fitness-outline" size={20} color="#34C759" />
            </View>
            <Text style={styles.statValue}>{getTotalActivities()}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
        </View>

        {/* Description */}
        {program.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{program.description}</Text>
          </View>
        )}

        {/* What's Included */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's Included</Text>
          <View style={styles.includesGrid}>
            <View style={styles.includeItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.includeText}>Structured weekly plans</Text>
            </View>
            <View style={styles.includeItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.includeText}>Detailed exercise guides</Text>
            </View>
            <View style={styles.includeItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.includeText}>Rest day scheduling</Text>
            </View>
            <View style={styles.includeItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.includeText}>Progress tracking</Text>
            </View>
          </View>
        </View>

        {/* Week Selector */}
        <View style={styles.weekSelectorSection}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 16 }]}>Program Schedule</Text>
          <ScrollView 
            ref={weekScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekSelectorContent}
            style={styles.weekSelectorScroll}
          >
            {program.weeks.map((week, index) => (
              <TouchableOpacity 
                key={week.id}
                style={[
                  styles.weekTab,
                  selectedWeek === index && styles.weekTabActive
                ]}
                onPress={() => setSelectedWeek(index)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.weekTabNumber,
                  selectedWeek === index && styles.weekTabNumberActive
                ]}>
                  {week.week_number}
                </Text>
                <Text style={[
                  styles.weekTabLabel,
                  selectedWeek === index && styles.weekTabLabelActive
                ]}>
                  Week
                </Text>
                {week.sessions.length > 0 && (
                  <View style={[
                    styles.weekSessionCount,
                    selectedWeek === index && styles.weekSessionCountActive
                  ]}>
                    <Text style={[
                      styles.weekSessionCountText,
                      selectedWeek === index && styles.weekSessionCountTextActive
                    ]}>
                      {week.sessions.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sessions for Selected Week */}
        {currentWeek && (
          <View style={styles.sessionsSection}>
            {currentWeek.week_name && (
              <View style={styles.weekHeader}>
                <Text style={styles.weekName}>{currentWeek.week_name}</Text>
                {currentWeek.notes && (
                  <Text style={styles.weekNotes}>{currentWeek.notes}</Text>
                )}
              </View>
            )}
            
            {currentWeek.sessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={theme.colors.secondaryText} />
                <Text style={styles.emptyStateText}>Rest week - no sessions scheduled</Text>
              </View>
            ) : (
              currentWeek.sessions.map((session, sessionIndex) => (
                <TouchableOpacity 
                  key={session.id} 
                  style={styles.sessionCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    // Future: Navigate to session detail
                  }}
                >
                  <View style={styles.sessionDayBadge}>
                    <Text style={styles.sessionDayText}>
                      {DAY_ABBREV[session.day_of_week] || session.day_of_week?.substring(0, 3).toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.sessionContent}>
                    <View style={styles.sessionHeader}>
                      <Text style={styles.sessionTitle} numberOfLines={1}>
                        {session.title}
                      </Text>
                      <View style={[styles.sessionFocusBadge, { 
                        backgroundColor: session.focus === 'Cardio' ? '#FF3B30' + '20' : 
                                        session.focus === 'Stretch' ? '#34C759' + '20' : 
                                        theme.colors.primary + '20'
                      }]}>
                        <Ionicons 
                          name={SESSION_ICONS[session.focus] || SESSION_ICONS.default} 
                          size={12} 
                          color={session.focus === 'Cardio' ? '#FF3B30' : 
                                session.focus === 'Stretch' ? '#34C759' : 
                                theme.colors.primary} 
                        />
                        <Text style={[styles.sessionFocusText, {
                          color: session.focus === 'Cardio' ? '#FF3B30' : 
                                session.focus === 'Stretch' ? '#34C759' : 
                                theme.colors.primary
                        }]}>
                          {session.focus}
                        </Text>
                      </View>
                    </View>
                    
                    {session.description && (
                      <Text style={styles.sessionDescription} numberOfLines={2}>
                        {session.description}
                      </Text>
                    )}
                    
                    {/* Activity Preview */}
                    <View style={styles.activityPreview}>
                      {session.blocks.slice(0, 1).map(block => 
                        block.activities.slice(0, 3).map((activity, actIndex) => (
                          <View key={activity.id || actIndex} style={styles.activityDot}>
                            <Text style={styles.activityName} numberOfLines={1}>
                              {activity.exercise?.name || activity.manual_name || 'Exercise'}
                            </Text>
                          </View>
                        ))
                      )}
                      {session.blocks.reduce((total, block) => total + block.activities.length, 0) > 3 && (
                        <Text style={styles.moreActivities}>
                          +{session.blocks.reduce((total, block) => total + block.activities.length, 0) - 3} more
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={theme.colors.secondaryText} 
                    style={styles.sessionArrow}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </Animated.ScrollView>

      {/* Floating CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
        <LinearGradient 
          colors={['transparent', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
          locations={[0, 0.3, 1]}
          style={styles.footerGradient}
        >
          {isPublicView ? (
            <View style={styles.footerContent}>
              <View style={styles.footerInfo}>
                <Text style={styles.footerPrice}>
                  {program.price > 0 ? `$${program.price}` : 'Free'}
                </Text>
                <Text style={styles.footerSubtext}>
                  {program.weeks.length} week program
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.ctaButton, copying && styles.ctaButtonDisabled]}
                onPress={handleCopyProgram}
                disabled={copying}
                activeOpacity={0.8}
              >
                {copying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.ctaButtonText}>Add to Library</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.footerContent}>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleEditProgram}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                  Edit Program
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.ctaButton}
                onPress={() => {
                  // Start training flow
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.ctaButtonText}>Start Training</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: theme.colors.secondaryText,
    fontSize: 14,
  },
  errorText: {
    color: theme.colors.secondaryText,
    fontSize: 16,
    marginTop: 12,
  },
  backLink: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backLinkText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  
  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 100,
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  miniTitleContainer: {
    position: 'absolute',
    top: 0,
    left: 60,
    right: 100,
    height: HEADER_MIN_HEIGHT,
    justifyContent: 'center',
    zIndex: 10,
  },
  miniTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  headerContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  focusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonBg: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navRight: {
    flexDirection: 'row',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primaryText,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.secondaryText,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryText,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  descriptionText: {
    fontSize: 15,
    color: theme.colors.secondaryText,
    lineHeight: 24,
  },

  // What's Included
  includesGrid: {
    gap: 12,
  },
  includeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  includeText: {
    fontSize: 15,
    color: theme.colors.primaryText,
  },

  // Week Selector
  weekSelectorSection: {
    marginTop: 28,
  },
  weekSelectorScroll: {
    overflow: 'visible',
  },
  weekSelectorContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  weekTab: {
    width: 72,
    height: 88,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  weekTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  weekTabNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primaryText,
    letterSpacing: -0.5,
  },
  weekTabNumberActive: {
    color: '#fff',
  },
  weekTabLabel: {
    fontSize: 11,
    color: theme.colors.secondaryText,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekTabLabelActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  weekSessionCount: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: theme.colors.secondaryText,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekSessionCountActive: {
    backgroundColor: '#fff',
  },
  weekSessionCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  weekSessionCountTextActive: {
    color: theme.colors.primary,
  },

  // Sessions
  sessionsSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  weekHeader: {
    marginBottom: 16,
  },
  weekName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primaryText,
  },
  weekNotes: {
    fontSize: 14,
    color: theme.colors.secondaryText,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.secondaryText,
  },
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sessionDayBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sessionDayText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primaryText,
    letterSpacing: 0.5,
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryText,
    flex: 1,
    marginRight: 8,
  },
  sessionFocusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  sessionFocusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sessionDescription: {
    fontSize: 13,
    color: theme.colors.secondaryText,
    lineHeight: 18,
    marginBottom: 10,
  },
  activityPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  activityDot: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activityName: {
    fontSize: 11,
    color: theme.colors.secondaryText,
    maxWidth: 80,
  },
  moreActivities: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  sessionArrow: {
    marginLeft: 8,
    marginTop: 12,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerGradient: {
    paddingTop: 30,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  footerInfo: {
    flex: 1,
  },
  footerPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  footerSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    gap: 8,
    marginRight: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
