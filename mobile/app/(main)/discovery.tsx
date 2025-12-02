import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  ImageBackground,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { useAuth } from '../../src/providers/AuthProvider';
import { useTheme, Theme } from '../../src/theme';
import { programsApi, ProgramListItem, DiscoveryFeedResponse } from '../../src/lib/api/programs';
import { 
    PROGRAM_FOCUS_OPTIONS, 
    DIFFICULTY_OPTIONS, 
    ProgramDifficulty,
    ProgramFocus
} from '../../src/lib/types/program';

const { width, height } = Dimensions.get('window');
const HERO_HEIGHT = height * 0.48;
const CARD_WIDTH = width * 0.72;
const SMALL_CARD_WIDTH = width * 0.42;

// Category icons mapping
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Strength': 'barbell-outline',
  'Cardio': 'heart-outline',
  'Crossfit': 'fitness-outline',
  'Yoga': 'body-outline',
  'Hybrid': 'layers-outline',
  'Triathalon': 'bicycle-outline',
};

// Category gradient colors
const CATEGORY_GRADIENTS: Record<string, string[]> = {
  'Strength': ['#FF6B6B', '#FF8E53'],
  'Cardio': ['#4ECDC4', '#45B7D1'],
  'Crossfit': ['#A66CFF', '#9C40FF'],
  'Yoga': ['#96E6A1', '#5BCEAA'],
  'Hybrid': ['#FFD93D', '#FF9A3C'],
  'Triathalon': ['#6BCAFF', '#4A90D9'],
};

export default function DiscoveryScreen() {
  const { accessToken } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchFocused = useRef(new Animated.Value(0)).current;

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedData, setFeedData] = useState<DiscoveryFeedResponse | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFocus, setSelectedFocus] = useState<ProgramFocus | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<ProgramDifficulty | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Search Results State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ProgramListItem[]>([]);
  const [searchingLoading, setSearchingLoading] = useState(false);

  // Hero card animation
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  // --- Data Fetching ---

  const fetchFeed = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await programsApi.getDiscoveryFeed(accessToken);
      setFeedData(data);
    } catch (error) {
      console.error('Failed to load discovery feed', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  const fetchSearchResults = useCallback(async () => {
    if (!accessToken) return;
    
    if (!searchQuery && !selectedFocus && !selectedDifficulty) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchingLoading(true);

    try {
      const response = await programsApi.getPublicPrograms(accessToken, {
        search: searchQuery,
        focus: selectedFocus || undefined,
        difficulty: selectedDifficulty || undefined,
      });
      setSearchResults(response.results);
    } catch (error) {
      console.error('Failed to search programs', error);
    } finally {
      setSearchingLoading(false);
    }
  }, [accessToken, searchQuery, selectedFocus, selectedDifficulty]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchSearchResults();
    }, 400);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedFocus, selectedDifficulty, fetchSearchResults]);

  // --- Event Handlers ---

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed();
    if (isSearching) fetchSearchResults();
  };

  const handleProgramPress = (programId: number) => {
    router.push(`/program-details/${programId}?type=public`); 
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFocus(null);
    setSelectedDifficulty(null);
    setIsSearching(false);
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    Animated.spring(searchFocused, {
      toValue: 1,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    Animated.spring(searchFocused, {
      toValue: 0,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  };

  // --- Render Components ---

  // Hero Featured Card (Netflix-style large card)
  const renderHeroSection = () => {
    if (!feedData?.featured || feedData.featured.length === 0) return null;
    
    const featured = feedData.featured[activeHeroIndex];
    if (!featured) return null;

    const difficultyOption = DIFFICULTY_OPTIONS.find(d => d.value === featured.difficulty);

    return (
      <TouchableOpacity 
        activeOpacity={0.95}
        onPress={() => handleProgramPress(featured.id)}
        style={styles.heroContainer}
      >
        <ImageBackground
          source={featured.image_url ? { uri: featured.image_url } : require('../../assets/images/adaptive-icon.png')}
          style={styles.heroImage}
          imageStyle={styles.heroImageStyle}
        >
          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
            locations={[0, 0.5, 1]}
            style={styles.heroGradient}
          >
            {/* Featured badge */}
            <View style={styles.heroBadgeRow}>
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.featuredBadgeText}>FEATURED</Text>
              </View>
            </View>

            {/* Content */}
            <View style={styles.heroContent}>
              {/* Tags */}
              <View style={styles.heroTagsRow}>
                <View style={[styles.heroTag, { backgroundColor: difficultyOption?.color || theme.colors.primary }]}>
                  <Text style={styles.heroTagText}>{featured.difficulty}</Text>
                </View>
                <View style={[styles.heroTag, styles.heroTagOutline]}>
                  <Text style={[styles.heroTagText, { color: 'white' }]}>{featured.focus}</Text>
                </View>
              </View>

              {/* Title & Description */}
              <Text style={styles.heroTitle} numberOfLines={2}>{featured.title}</Text>
              {featured.description && (
                <Text style={styles.heroDescription} numberOfLines={2}>
                  {featured.description}
                </Text>
              )}

              {/* Stats row */}
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStat}>
                  <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.heroStatText}>{featured.week_count} Weeks</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Ionicons name="flash-outline" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.heroStatText}>{featured.session_count} Sessions</Text>
                </View>
              </View>

              {/* CTA Button */}
              <View style={styles.heroCTARow}>
                <TouchableOpacity 
                  style={styles.heroCTAButton}
                  onPress={() => handleProgramPress(featured.id)}
                >
                  <Text style={styles.heroCTAText}>View Program</Text>
                  <Ionicons name="arrow-forward" size={18} color="black" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.heroSecondaryButton}>
                  <Ionicons name="bookmark-outline" size={22} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Hero pagination dots */}
        {feedData.featured.length > 1 && (
          <View style={styles.heroDots}>
            {feedData.featured.slice(0, 5).map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setActiveHeroIndex(index)}
                style={[
                  styles.heroDot,
                  index === activeHeroIndex && styles.heroDotActive
                ]}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Category Quick Access
  const renderCategories = () => (
    <View style={styles.categoriesSection}>
      <Text style={styles.sectionTitleLarge}>Browse Categories</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContent}
      >
        {PROGRAM_FOCUS_OPTIONS.map((category) => {
          const isSelected = selectedFocus === category.value;
          const gradientColors = CATEGORY_GRADIENTS[category.value] || ['#667eea', '#764ba2'];
          
          return (
            <TouchableOpacity
              key={category.value}
              style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
              activeOpacity={0.8}
              onPress={() => setSelectedFocus(isSelected ? null : category.value)}
            >
              <LinearGradient
                colors={isSelected ? gradientColors : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                style={styles.categoryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.categoryIconWrapper, isSelected && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons 
                    name={CATEGORY_ICONS[category.value] || 'fitness-outline'} 
                    size={24} 
                    color={isSelected ? 'white' : theme.colors.primary}
                  />
                </View>
                <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                  {category.label.replace(' Training', '')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // Section Header
  const renderSectionHeader = (title: string, subtitle?: string, icon?: keyof typeof Ionicons.glyphMap) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        {icon && (
          <View style={styles.sectionIconWrapper}>
            <Ionicons name={icon} size={18} color={theme.colors.primary} />
          </View>
        )}
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <TouchableOpacity style={styles.seeAllButton}>
        <Text style={styles.seeAllText}>See All</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  // Trending Card with Rank
  const renderTrendingCard = ({ item, index }: { item: ProgramListItem; index: number }) => {
    const difficultyOption = DIFFICULTY_OPTIONS.find(d => d.value === item.difficulty);
    
    return (
      <TouchableOpacity 
        style={styles.trendingCard} 
        activeOpacity={0.9}
        onPress={() => handleProgramPress(item.id)}
      >
        {/* Rank indicator */}
        <View style={styles.rankBadge}>
          <Text style={styles.rankNumber}>{index + 1}</Text>
        </View>

        <Image 
          source={item.image_url ? { uri: item.image_url } : require('../../assets/images/adaptive-icon.png')} 
          style={styles.trendingImage}
        />
        
        {/* Glass effect overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.trendingGradient}
        >
          <View style={styles.trendingContent}>
            <View style={styles.trendingTagsRow}>
              <View style={[styles.miniTag, { backgroundColor: difficultyOption?.color || theme.colors.primary }]}>
                <Text style={styles.miniTagText}>{item.difficulty}</Text>
              </View>
            </View>
            <Text style={styles.trendingTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.trendingMeta}>
              {item.week_count}W • {item.session_count} Sessions
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Modern Program Card (for New Arrivals)
  const renderProgramCard = ({ item }: { item: ProgramListItem }) => {
    const difficultyOption = DIFFICULTY_OPTIONS.find(d => d.value === item.difficulty);
    const gradientColors = CATEGORY_GRADIENTS[item.focus] || ['#667eea', '#764ba2'];

    return (
      <TouchableOpacity 
        style={styles.programCard} 
        activeOpacity={0.9}
        onPress={() => handleProgramPress(item.id)}
      >
        <View style={styles.programImageWrapper}>
          <Image 
            source={item.image_url ? { uri: item.image_url } : require('../../assets/images/adaptive-icon.png')} 
            style={styles.programImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.programImageGradient}
          />
          {/* Floating difficulty badge */}
          <View style={[styles.floatingBadge, { backgroundColor: difficultyOption?.color }]}>
            <Text style={styles.floatingBadgeText}>{item.difficulty}</Text>
          </View>
        </View>
        
        <View style={styles.programCardContent}>
          <Text style={styles.programTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.programMetaRow}>
            <View style={[styles.focusPill, { backgroundColor: gradientColors[0] + '20' }]}>
              <Text style={[styles.focusPillText, { color: gradientColors[0] }]}>{item.focus}</Text>
            </View>
            <Text style={styles.programDuration}>{item.week_count}W • {item.session_count}S</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Search Result Card
  const renderSearchResultCard = ({ item, index }: { item: ProgramListItem; index: number }) => {
    const difficultyOption = DIFFICULTY_OPTIONS.find(d => d.value === item.difficulty);
    const gradientColors = CATEGORY_GRADIENTS[item.focus] || ['#667eea', '#764ba2'];

    return (
      <Animated.View
        style={[
          styles.searchResultCard,
          {
            opacity: 1,
            transform: [{ translateY: 0 }],
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.searchResultInner}
          activeOpacity={0.8}
          onPress={() => handleProgramPress(item.id)}
        >
          <Image 
            source={item.image_url ? { uri: item.image_url } : require('../../assets/images/adaptive-icon.png')} 
            style={styles.searchResultImage}
          />
          
          <View style={styles.searchResultContent}>
            <Text style={styles.searchResultTitle} numberOfLines={1}>{item.title}</Text>
            
            <View style={styles.searchResultTags}>
              <View style={[styles.searchResultTag, { backgroundColor: gradientColors[0] + '20' }]}>
                <Text style={[styles.searchResultTagText, { color: gradientColors[0] }]}>{item.focus}</Text>
              </View>
              <View style={[styles.searchResultTag, { backgroundColor: difficultyOption?.color + '20' }]}>
                <Text style={[styles.searchResultTagText, { color: difficultyOption?.color }]}>{item.difficulty}</Text>
              </View>
            </View>
            
            <View style={styles.searchResultStats}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.secondaryText} />
              <Text style={styles.searchResultStatText}>{item.week_count} Weeks</Text>
              <Text style={styles.searchResultStatDot}>•</Text>
              <Ionicons name="flash-outline" size={14} color={theme.colors.secondaryText} />
              <Text style={styles.searchResultStatText}>{item.session_count} Sessions</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.searchResultAction}>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.secondaryText} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Difficulty Filter Pills
  const renderDifficultyFilters = () => (
    <View style={styles.difficultyFilters}>
      {DIFFICULTY_OPTIONS.map((diff) => {
        const isSelected = selectedDifficulty === diff.value;
        return (
          <TouchableOpacity
            key={diff.value}
            style={[
              styles.difficultyPill,
              isSelected && { backgroundColor: diff.color, borderColor: diff.color }
            ]}
            onPress={() => setSelectedDifficulty(isSelected ? null : diff.value)}
          >
            <View style={[styles.difficultyDot, { backgroundColor: isSelected ? 'white' : diff.color }]} />
            <Text style={[
              styles.difficultyPillText,
              isSelected && { color: 'white' }
            ]}>
              {diff.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Loading skeleton
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <View style={[styles.skeletonHero, { backgroundColor: theme.colors.surfaceHighlight }]} />
      <View style={styles.skeletonSection}>
        <View style={[styles.skeletonTitle, { backgroundColor: theme.colors.surfaceHighlight }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: theme.colors.surfaceHighlight }]} />
          ))}
        </ScrollView>
      </View>
    </View>
  );

  // --- Main Render ---

  const searchBarWidth = searchFocused.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '85%'],
  });

  return (
    <View style={styles.container}>
      {/* Header with Search */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreeting}>Discover</Text>
            <Text style={styles.headerSubtitle}>Find your perfect program</Text>
          </View>
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.primaryText} />
          </TouchableOpacity>
        </View>
         
        {/* Search Bar */}
        <View style={styles.searchRow}>
          <Animated.View style={[styles.searchContainer, { width: searchBarWidth }]}>
            <Ionicons name="search" size={20} color={theme.colors.secondaryText} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search programs, workouts..."
              placeholderTextColor={theme.colors.secondaryText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color={theme.colors.secondaryText} />
              </TouchableOpacity>
            )}
          </Animated.View>
          
          {isSearchFocused && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                handleSearchBlur();
                setSearchQuery('');
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Difficulty Filters */}
        {renderDifficultyFilters()}
      </View>

      {/* Content Area */}
      {isSearching ? (
        // SEARCH RESULTS
        <View style={styles.contentContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {searchingLoading ? 'Searching...' : `${searchResults.length} Results`}
            </Text>
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
              <Ionicons name="close" size={16} color={theme.colors.primary} />
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          
          {searchingLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Finding programs...</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResultCard}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.searchResultsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconWrapper}>
                    <Ionicons name="search-outline" size={48} color={theme.colors.secondaryText} />
                  </View>
                  <Text style={styles.emptyTitle}>No programs found</Text>
                  <Text style={styles.emptyText}>
                    Try adjusting your search or filters to find what you're looking for
                  </Text>
                  <TouchableOpacity style={styles.emptyButton} onPress={clearFilters}>
                    <Text style={styles.emptyButtonText}>Clear Filters</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      ) : (
        // DISCOVERY FEED
        <ScrollView 
          style={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={theme.colors.primary}
            />
          }
        >
          {loading ? (
            renderSkeleton()
          ) : (
            <>
              {/* Hero Featured Section */}
              {renderHeroSection()}

              {/* Categories */}
              {renderCategories()}

              {/* Trending Section */}
              {feedData?.trending && feedData.trending.length > 0 && (
                <View style={styles.section}>
                  {renderSectionHeader('Trending Now', 'Most popular this week', 'trending-up')}
                  <FlatList
                    horizontal
                    data={feedData.trending}
                    renderItem={renderTrendingCard}
                    keyExtractor={(item) => 'trend-' + item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalListContent}
                    snapToInterval={CARD_WIDTH + 16}
                    decelerationRate="fast"
                  />
                </View>
              )}

              {/* New Arrivals Section */}
              {feedData?.new && feedData.new.length > 0 && (
                <View style={styles.section}>
                  {renderSectionHeader('New Arrivals', 'Fresh programs just added', 'time-outline')}
                  <FlatList
                    horizontal
                    data={feedData.new}
                    renderItem={renderProgramCard}
                    keyExtractor={(item) => 'new-' + item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalListContent}
                    snapToInterval={SMALL_CARD_WIDTH + 12}
                    decelerationRate="fast"
                  />
                </View>
              )}

              {/* Bottom Spacing */}
              <View style={{ height: 100 }} />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  // Header Styles
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerGreeting: {
    fontSize: 32,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: theme.colors.secondaryText,
    marginTop: 2,
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  // Search Styles
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.primaryText,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  cancelButton: {
    marginLeft: 12,
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  
  // Difficulty Filters
  difficultyFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  difficultyPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primaryText,
  },
  
  // Content Container
  contentContainer: {
    flex: 1,
  },
  
  // Hero Section
  heroContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 24,
    overflow: 'hidden',
    height: HERO_HEIGHT,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageStyle: {
    borderRadius: 24,
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  heroBadgeRow: {
    flexDirection: 'row',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  featuredBadgeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroContent: {
    gap: 12,
  },
  heroTagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  heroTagOutline: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: theme.typography.fontFamilyBold,
    color: 'white',
    letterSpacing: -0.5,
  },
  heroDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  heroCTARow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  heroCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  heroCTAText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '700',
  },
  heroSecondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  heroDotActive: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },
  
  // Categories Section
  categoriesSection: {
    marginTop: 28,
    marginBottom: 8,
  },
  sectionTitleLarge: {
    fontSize: 22,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    width: 100,
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryCardSelected: {
    transform: [{ scale: 1.02 }],
  },
  categoryGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primaryText,
  },
  categoryLabelSelected: {
    color: 'white',
  },
  
  // Section Header
  section: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.secondaryText,
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  
  horizontalListContent: {
    paddingHorizontal: 20,
  },
  
  // Trending Card
  trendingCard: {
    width: CARD_WIDTH,
    height: 220,
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceHighlight,
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  trendingGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
  },
  trendingContent: {
    padding: 16,
    gap: 6,
  },
  trendingTagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  miniTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  trendingTitle: {
    fontSize: 18,
    fontFamily: theme.typography.fontFamilyBold,
    color: 'white',
  },
  trendingMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  
  // Program Card (New Arrivals)
  programCard: {
    width: SMALL_CARD_WIDTH,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  programImageWrapper: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  programImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  programImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  floatingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  floatingBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  programCardContent: {
    padding: 12,
    gap: 8,
  },
  programTitle: {
    fontSize: 15,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
  },
  programMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  focusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  programDuration: {
    fontSize: 12,
    color: theme.colors.secondaryText,
    fontWeight: '500',
  },
  
  // Search Results
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultsCount: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '15',
  },
  clearFiltersText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  searchResultsList: {
    padding: 20,
    gap: 12,
  },
  searchResultCard: {
    marginBottom: 12,
  },
  searchResultInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchResultImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  searchResultContent: {
    flex: 1,
    marginLeft: 14,
    gap: 6,
  },
  searchResultTitle: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
  },
  searchResultTags: {
    flexDirection: 'row',
    gap: 6,
  },
  searchResultTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  searchResultTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  searchResultStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchResultStatText: {
    fontSize: 13,
    color: theme.colors.secondaryText,
  },
  searchResultStatDot: {
    color: theme.colors.secondaryText,
    marginHorizontal: 4,
  },
  searchResultAction: {
    padding: 8,
  },
  
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: theme.colors.secondaryText,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.secondaryText,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Skeleton Loading
  skeletonContainer: {
    padding: 20,
  },
  skeletonHero: {
    height: HERO_HEIGHT,
    borderRadius: 24,
    marginBottom: 32,
  },
  skeletonSection: {
    marginBottom: 32,
  },
  skeletonTitle: {
    height: 24,
    width: 160,
    borderRadius: 8,
    marginBottom: 16,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: 20,
    marginRight: 16,
  },
});