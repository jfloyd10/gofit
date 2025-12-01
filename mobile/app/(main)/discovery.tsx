import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../src/providers/AuthProvider';
import { useTheme, Theme } from '../../src/theme';
import { Screen } from '../../src/components/ui/Screen';
import { programsApi, ProgramListItem, DiscoveryFeedResponse } from '../../src/lib/api/programs';
import { 
    PROGRAM_FOCUS_OPTIONS, 
    DIFFICULTY_OPTIONS, 
    ProgramDifficulty,
    ProgramFocus
} from '../../src/lib/types/program';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

export default function DiscoveryScreen() {
  const { accessToken } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedData, setFeedData] = useState<DiscoveryFeedResponse | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFocus, setSelectedFocus] = useState<ProgramFocus | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<ProgramDifficulty | null>(null);
  
  // Search Results State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ProgramListItem[]>([]);
  const [searchingLoading, setSearchingLoading] = useState(false);

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
    
    // Only search if there is a query or active filters
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

  // Initial Load
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Trigger search when criteria changes
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchSearchResults();
    }, 500); // Debounce typing
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedFocus, selectedDifficulty, fetchSearchResults]);

  // --- Event Handlers ---

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed();
    if (isSearching) fetchSearchResults();
  };

  const handleProgramPress = (programId: number) => {
    // Navigate to a read-only view or copy preview of the program
    // Assuming we reuse the builder route or a specific detail route
    router.push(`/program-builder/${programId}?mode=view`); 
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFocus(null);
    setSelectedDifficulty(null);
    setIsSearching(false);
  };

  // --- Render Components ---

  const renderSectionHeader = (title: string, icon: keyof typeof Ionicons.glyphMap) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderHorizontalCard = ({ item }: { item: ProgramListItem }) => {
    const difficultyColor = DIFFICULTY_OPTIONS.find(
      (d) => d.value === (item.difficulty as ProgramDifficulty)
    )?.color || theme.colors.primary;

    return (
      <TouchableOpacity 
        style={styles.horizontalCard} 
        activeOpacity={0.8}
        onPress={() => handleProgramPress(item.id)}
      >
        <Image 
          source={item.image_url ? { uri: item.image_url } : require('../../assets/images/adaptive-icon.png')} 
          style={styles.cardImage} 
        />
        <View style={styles.cardOverlay}>
            <View style={styles.cardBadgeContainer}>
                <View style={[styles.badge, { backgroundColor: difficultyColor }]}>
                    <Text style={styles.badgeText}>{item.difficulty}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.badgeText}>{item.focus}</Text>
                </View>
            </View>
            <Text style={styles.cardTitleH} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardSubtitleH}>{item.week_count} Weeks • {item.session_count} Sessions</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderVerticalCard = ({ item }: { item: ProgramListItem }) => {
    const difficultyColor = DIFFICULTY_OPTIONS.find(
      (d) => d.value === (item.difficulty as ProgramDifficulty)
    )?.color || theme.colors.primary;

    return (
      <TouchableOpacity 
        style={styles.verticalCard} 
        activeOpacity={0.7}
        onPress={() => handleProgramPress(item.id)}
      >
        <Image 
          source={item.image_url ? { uri: item.image_url } : require('../../assets/images/adaptive-icon.png')} 
          style={styles.verticalCardImage} 
        />
        <View style={styles.verticalCardContent}>
            <Text style={styles.verticalCardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.verticalCardRow}>
                <Text style={[styles.verticalCardDetail, { color: theme.colors.primary }]}>{item.focus}</Text>
                <Text style={styles.verticalCardDetail}> • </Text>
                <Text style={[styles.verticalCardDetail, { color: difficultyColor }]}>{item.difficulty}</Text>
            </View>
            <Text style={styles.verticalCardMeta}>{item.week_count} Weeks • {item.session_count} Sessions</Text>
        </View>
        <View style={styles.arrowContainer}>
             <Ionicons name="chevron-forward" size={20} color={theme.colors.secondaryText} />
        </View>
      </TouchableOpacity>
    );
  };

  // --- Main Render ---

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
         <Text style={styles.screenTitle}>Discover</Text>
         
         {/* Search Bar */}
         <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={theme.colors.secondaryText} style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder="Search programs..."
                placeholderTextColor={theme.colors.secondaryText}
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.secondaryText} />
                </TouchableOpacity>
            )}
         </View>

         {/* Filter Chips */}
         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer} contentContainerStyle={styles.filtersContent}>
            {PROGRAM_FOCUS_OPTIONS.map((focus) => (
                <TouchableOpacity
                    key={focus.value}
                    style={[
                        styles.filterChip,
                        selectedFocus === focus.value && styles.filterChipSelected
                    ]}
                    onPress={() => setSelectedFocus(selectedFocus === focus.value ? null : focus.value)}
                >
                    <Text style={[
                        styles.filterChipText,
                        selectedFocus === focus.value && styles.filterChipTextSelected
                    ]}>{focus.label}</Text>
                </TouchableOpacity>
            ))}
            {DIFFICULTY_OPTIONS.map((diff) => (
                <TouchableOpacity
                    key={diff.value}
                    style={[
                        styles.filterChip,
                        selectedDifficulty === diff.value && styles.filterChipSelected,
                        selectedDifficulty === diff.value && { backgroundColor: diff.color + '20', borderColor: diff.color }
                    ]}
                    onPress={() => setSelectedDifficulty(selectedDifficulty === diff.value ? null : diff.value)}
                >
                    <Text style={[
                        styles.filterChipText,
                        selectedDifficulty === diff.value && { color: diff.color }
                    ]}>{diff.label}</Text>
                </TouchableOpacity>
            ))}
         </ScrollView>
      </View>

      {/* Content Area */}
      {isSearching ? (
         // SEARCH RESULTS
         <View style={styles.contentContainer}>
            <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>{searchResults.length} Results</Text>
                <TouchableOpacity onPress={clearFilters}>
                    <Text style={styles.clearText}>Clear Filters</Text>
                </TouchableOpacity>
            </View>
            
            {searchingLoading ? (
                 <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={searchResults}
                    renderItem={renderVerticalCard}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                             <Text style={styles.emptyText}>No programs found matching your criteria.</Text>
                        </View>
                    }
                />
            )}
         </View>
      ) : (
         // DISCOVERY FEED
         <ScrollView 
            style={styles.contentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
         >
            {loading ? (
                 <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <>
                    {/* Featured Section */}
                    {feedData?.featured && feedData.featured.length > 0 && (
                        <View style={styles.section}>
                            {renderSectionHeader('Featured Collections', 'star')}
                            <FlatList
                                horizontal
                                data={feedData.featured}
                                renderItem={renderHorizontalCard}
                                keyExtractor={(item) => 'feat-' + item.id}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.horizontalListContent}
                                snapToInterval={CARD_WIDTH + theme.spacing(4)}
                                decelerationRate="fast"
                            />
                        </View>
                    )}

                    {/* Trending Section */}
                    {feedData?.trending && feedData.trending.length > 0 && (
                        <View style={styles.section}>
                            {renderSectionHeader('Trending Now', 'trending-up')}
                            <FlatList
                                horizontal
                                data={feedData.trending}
                                renderItem={renderHorizontalCard}
                                keyExtractor={(item) => 'trend-' + item.id}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.horizontalListContent}
                            />
                        </View>
                    )}

                    {/* New Arrivals Section */}
                    {feedData?.new && feedData.new.length > 0 && (
                        <View style={styles.section}>
                            {renderSectionHeader('New Arrivals', 'time')}
                            <FlatList
                                horizontal
                                data={feedData.new}
                                renderItem={renderHorizontalCard}
                                keyExtractor={(item) => 'new-' + item.id}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.horizontalListContent}
                            />
                        </View>
                    )}
                    
                    <View style={{ height: 40 }} />
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
  headerContainer: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: theme.spacing(2),
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  screenTitle: {
    fontSize: theme.typography.fontSizeXl,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: theme.spacing(3),
    height: 44,
    marginBottom: theme.spacing(3),
  },
  searchIcon: {
    marginRight: theme.spacing(2),
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSizeMd,
    color: theme.colors.primaryText,
    height: '100%',
  },
  filtersContainer: {
    maxHeight: 32,
  },
  filtersContent: {
    paddingRight: theme.spacing(4),
  },
  filterChip: {
    paddingHorizontal: theme.spacing(3),
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing(2),
    backgroundColor: theme.colors.surface,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.fontSizeSm,
    color: theme.colors.secondaryText,
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: 'white',
  },
  contentContainer: {
    flex: 1,
  },
  section: {
    marginTop: theme.spacing(5),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizeLg,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
  },
  horizontalListContent: {
    paddingHorizontal: theme.spacing(4),
  },
  
  // Horizontal Card
  horizontalCard: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: 16,
    marginRight: theme.spacing(4),
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colors.surfaceHighlight,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(3),
    backgroundColor: 'rgba(0,0,0,0.6)', // Gradient overlay simulation
  },
  cardBadgeContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing(1),
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cardTitleH: {
    fontSize: theme.typography.fontSizeMd,
    fontFamily: theme.typography.fontFamilyBold,
    color: 'white',
    marginBottom: 2,
  },
  cardSubtitleH: {
    fontSize: theme.typography.fontSizeXs,
    color: 'rgba(255,255,255,0.8)',
  },

  // Vertical Card
  verticalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(3),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  verticalCardImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  verticalCardContent: {
    flex: 1,
    marginLeft: theme.spacing(3),
  },
  verticalCardTitle: {
    fontSize: theme.typography.fontSizeMd,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
    marginBottom: 4,
  },
  verticalCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  verticalCardDetail: {
    fontSize: theme.typography.fontSizeXs,
    fontWeight: '600',
  },
  verticalCardMeta: {
    fontSize: theme.typography.fontSizeXs,
    color: theme.colors.secondaryText,
  },
  arrowContainer: {
    marginLeft: theme.spacing(2),
  },
  
  // Results UI
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
  },
  resultsCount: {
    fontSize: theme.typography.fontSizeSm,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
  },
  clearText: {
    fontSize: theme.typography.fontSizeSm,
    color: theme.colors.primary,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    padding: theme.spacing(6),
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.secondaryText,
    textAlign: 'center',
  },
});