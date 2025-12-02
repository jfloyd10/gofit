import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Animated,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, Theme } from '../../theme';
import { usersApi } from '../../lib/api/users';
import { PublicUser } from '../../lib/types/user';
import { Program } from '../../lib/types/program';
import { useAuth } from '../../providers/AuthProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const PROGRAM_CARD_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

interface UserProfileViewProps {
  username: string;
  showBack?: boolean;
}

type ContentTab = 'programs' | 'saved' | 'tagged';

export function UserProfileView({ username, showBack = true }: UserProfileViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const { user: currentUser, accessToken } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [profileUser, setProfileUser] = useState<PublicUser | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('programs');
  const [isFollowing, setIsFollowing] = useState(false);

  // Animation values
  const headerOpacity = useMemo(() => new Animated.Value(0), []);
  const contentOpacity = useMemo(() => new Animated.Value(0), []);

  const isMe = currentUser?.username === username;
  const isCreator = profileUser?.profile?.is_verified || (programs.length > 0);

  useEffect(() => {
    loadData();
  }, [username, accessToken]);

  const loadData = async () => {
    try {
      if (!username || !accessToken) return;

      setIsLoading(true);

      const [userData, userPrograms] = await Promise.all([
        usersApi.getUser(username, accessToken),
        usersApi.getUserPrograms(username, isMe, accessToken),
      ]);

      setProfileUser(userData);
      setPrograms(userPrograms);

      // Animate in
      Animated.stagger(150, [
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Failed to load user profile', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [username, accessToken]);

  const handleFollowPress = () => {
    setIsFollowing(!isFollowing);
    // TODO: Implement actual follow/unfollow API call
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 10000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons
          name="account-question-outline"
          size={64}
          color={theme.colors.secondaryText}
        />
        <Text style={styles.errorTitle}>User Not Found</Text>
        <Text style={styles.errorSubtitle}>
          The profile you're looking for doesn't exist or has been removed.
        </Text>
        {showBack && (
          <TouchableOpacity style={styles.errorBackButton} onPress={() => router.back()}>
            <Text style={styles.errorBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const { profile } = profileUser;

  return (
    <View style={styles.container}>
      {/* Custom Header Bar */}
      <View style={styles.headerBar}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primaryText} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerUsername} numberOfLines={1}>
            {profileUser.username}
          </Text>
          {profile.is_verified && (
            <View style={styles.headerVerifiedBadge}>
              <MaterialCommunityIcons name="dumbbell" size={14} color="#fff" />
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.headerButton}>
          <Feather name="more-horizontal" size={24} color={theme.colors.primaryText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Animated.View style={[styles.profileHeader, { opacity: headerOpacity }]}>
          {/* Profile Info Row - Instagram Style */}
          <View style={styles.profileInfoRow}>
            {/* Avatar with Verified Badge Overlay */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrapper}>
                {profile.avatar ? (
                  <Image source={{ uri: profile.avatar }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={[theme.colors.primary, '#667eea']}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarInitials}>
                      {(profile.display_name?.[0] || username?.[0] || '?').toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}

                {/* Verified Badge Overlay - Blue Barbell */}
                {profile.is_verified && (
                  <View style={styles.verifiedBadgeOverlay}>
                    <LinearGradient
                      colors={['#0095f6', '#0077cc']}
                      style={styles.verifiedBadgeGradient}
                    >
                      <MaterialCommunityIcons name="dumbbell" size={12} color="#fff" />
                    </LinearGradient>
                  </View>
                )}
              </View>
            </View>

            {/* Stats Section */}
            <View style={styles.statsSection}>
              <TouchableOpacity style={styles.statItem}>
                <Text style={styles.statValue}>{formatCount(profileUser.programs_count)}</Text>
                <Text style={styles.statLabel}>Programs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statItem}
                onPress={() => {
                  /* Navigate to followers list */
                }}
              >
                <Text style={styles.statValue}>{formatCount(profileUser.followers_count)}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statItem}
                onPress={() => {
                  /* Navigate to following list */
                }}
              >
                <Text style={styles.statValue}>{formatCount(profileUser.following_count)}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name and Bio Section */}
          <View style={styles.bioSection}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{profile.display_name || username}</Text>
              {isCreator && (
                <View style={styles.creatorBadge}>
                  <Text style={styles.creatorBadgeText}>Creator</Text>
                </View>
              )}
            </View>

            {profile.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : isMe ? (
              <TouchableOpacity onPress={() => router.push('/(main)/profile/edit')}>
                <Text style={styles.addBioText}>+ Add a bio</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            {isMe ? (
              <>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => router.push('/(main)/profile/edit')}
                >
                  <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareProfileButton}>
                  <Text style={styles.shareProfileButtonText}>Share Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                  <Feather name="user-plus" size={16} color={theme.colors.primaryText} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    isFollowing && styles.followingButton,
                  ]}
                  onPress={handleFollowPress}
                >
                  <Text
                    style={[
                      styles.followButtonText,
                      isFollowing && styles.followingButtonText,
                    ]}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.messageButton}>
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                  <Feather name="chevron-down" size={16} color={theme.colors.primaryText} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>

        {/* Content Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'programs' && styles.activeTab]}
            onPress={() => setActiveTab('programs')}
          >
            <MaterialCommunityIcons
              name="grid"
              size={24}
              color={activeTab === 'programs' ? theme.colors.primaryText : theme.colors.secondaryText}
            />
          </TouchableOpacity>

          {isMe && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
              onPress={() => setActiveTab('saved')}
            >
              <Feather
                name="bookmark"
                size={22}
                color={activeTab === 'saved' ? theme.colors.primaryText : theme.colors.secondaryText}
              />
            </TouchableOpacity>
          )}

          {!isMe && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'tagged' && styles.activeTab]}
              onPress={() => setActiveTab('tagged')}
            >
              <MaterialCommunityIcons
                name="account-box-outline"
                size={24}
                color={activeTab === 'tagged' ? theme.colors.primaryText : theme.colors.secondaryText}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Content Grid */}
        <Animated.View style={[styles.contentGrid, { opacity: contentOpacity }]}>
          {activeTab === 'programs' && (
            <>
              {programs.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIconContainer}>
                    <MaterialCommunityIcons
                      name="weight-lifter"
                      size={48}
                      color={theme.colors.secondaryText}
                    />
                  </View>
                  <Text style={styles.emptyStateTitle}>
                    {isMe ? 'Create Your First Program' : 'No Programs Yet'}
                  </Text>
                  <Text style={styles.emptyStateSubtitle}>
                    {isMe
                      ? 'Share your fitness expertise with the community by creating a program.'
                      : `${profile.display_name || username} hasn't created any programs yet.`}
                  </Text>
                  {isMe && (
                    <TouchableOpacity
                      style={styles.createProgramButton}
                      onPress={() => router.push('/(main)/programs/create')}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={styles.createProgramButtonText}>Create Program</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.programsGrid}>
                  {programs.map((program, index) => (
                    <Pressable
                      key={program.id}
                      style={({ pressed }) => [
                        styles.programCard,
                        pressed && styles.programCardPressed,
                      ]}
                      onPress={() => router.push(`/program-details/${program.id}`)}
                    >
                      <Image
                        source={
                          program.image_url
                            ? { uri: program.image_url }
                            : require('../../../assets/images/adaptive-icon.png')
                        }
                        style={styles.programImage}
                        resizeMode="cover"
                      />
                      {/* Program Overlay Info */}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.programOverlay}
                      >
                        <View style={styles.programStats}>
                          <View style={styles.programStatItem}>
                            <Ionicons name="people-outline" size={12} color="#fff" />
                            <Text style={styles.programStatText}>
                              {program.subscribers_count || 0}
                            </Text>
                          </View>
                        </View>
                      </LinearGradient>

                      {/* Premium/Featured Badge */}
                      {program.is_featured && (
                        <View style={styles.featuredBadge}>
                          <Ionicons name="star" size={10} color="#FFD700" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}

          {activeTab === 'saved' && isMe && (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconContainer}>
                <Feather name="bookmark" size={48} color={theme.colors.secondaryText} />
              </View>
              <Text style={styles.emptyStateTitle}>Save Programs</Text>
              <Text style={styles.emptyStateSubtitle}>
                Save programs you want to try later. Only you can see what you've saved.
              </Text>
            </View>
          )}

          {activeTab === 'tagged' && !isMe && (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconContainer}>
                <MaterialCommunityIcons
                  name="account-box-outline"
                  size={48}
                  color={theme.colors.secondaryText}
                />
              </View>
              <Text style={styles.emptyStateTitle}>No Tagged Programs</Text>
              <Text style={styles.emptyStateSubtitle}>
                Programs that {profile.display_name || username} is featured in will appear here.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      paddingHorizontal: 40,
    },
    errorTitle: {
      fontSize: 20,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
      marginTop: 16,
    },
    errorSubtitle: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
    errorBackButton: {
      marginTop: 24,
      paddingVertical: 12,
      paddingHorizontal: 32,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
    },
    errorBackButtonText: {
      color: '#fff',
      fontFamily: theme.typography.fontFamilyBold,
      fontSize: 14,
    },

    // Header Bar
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    headerUsername: {
      fontSize: 16,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
    },
    headerVerifiedBadge: {
      marginLeft: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#0095f6',
      justifyContent: 'center',
      alignItems: 'center',
    },

    scrollContent: {
      paddingBottom: 40,
    },

    // Profile Header Section
    profileHeader: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    profileInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    // Avatar
    avatarSection: {
      marginRight: 28,
    },
    avatarWrapper: {
      position: 'relative',
    },
    avatar: {
      width: 86,
      height: 86,
      borderRadius: 43,
      backgroundColor: theme.colors.border,
    },
    avatarGradient: {
      width: 86,
      height: 86,
      borderRadius: 43,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitials: {
      fontSize: 32,
      color: '#fff',
      fontFamily: theme.typography.fontFamilyBold,
    },
    verifiedBadgeOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      borderWidth: 3,
      borderColor: theme.colors.background,
      borderRadius: 12,
    },
    verifiedBadgeGradient: {
      width: 22,
      height: 22,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Stats
    statsSection: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    statValue: {
      fontSize: 18,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
    },
    statLabel: {
      fontSize: 13,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },

    // Bio Section
    bioSection: {
      marginTop: 16,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    displayName: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
    },
    creatorBadge: {
      marginLeft: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: theme.colors.primary + '20',
      borderRadius: 4,
    },
    creatorBadgeText: {
      fontSize: 11,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primary,
    },
    bio: {
      fontSize: 14,
      color: theme.colors.primaryText,
      marginTop: 4,
      lineHeight: 20,
    },
    addBioText: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      marginTop: 4,
    },

    // Action Buttons
    actionButtonsRow: {
      flexDirection: 'row',
      marginTop: 16,
      gap: 8,
    },
    editProfileButton: {
      flex: 1,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    editProfileButtonText: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
    },
    shareProfileButton: {
      flex: 1,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    shareProfileButtonText: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
    },
    iconButton: {
      width: 34,
      height: 34,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    followButton: {
      flex: 1,
      paddingVertical: 8,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      alignItems: 'center',
    },
    followButtonText: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamilyBold,
      color: '#fff',
    },
    followingButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    followingButtonText: {
      color: theme.colors.primaryText,
    },
    messageButton: {
      flex: 1,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    messageButtonText: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
    },

    // Tabs
    tabsContainer: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      marginTop: 20,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomColor: theme.colors.primaryText,
    },

    // Content Grid
    contentGrid: {
      minHeight: 300,
    },
    programsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    programCard: {
      width: PROGRAM_CARD_SIZE,
      height: PROGRAM_CARD_SIZE,
      marginLeft: GRID_GAP,
      marginTop: GRID_GAP,
      position: 'relative',
    },
    programCardPressed: {
      opacity: 0.8,
    },
    programImage: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.border,
    },
    programOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 6,
      paddingVertical: 4,
      paddingTop: 20,
    },
    programStats: {
      flexDirection: 'row',
    },
    programStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    programStatText: {
      color: '#fff',
      fontSize: 11,
      fontFamily: theme.typography.fontFamilyBold,
      marginLeft: 3,
    },
    featuredBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Empty States
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 40,
    },
    emptyStateIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
      textAlign: 'center',
    },
    emptyStateSubtitle: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
    createProgramButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
      paddingVertical: 10,
      paddingHorizontal: 20,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
    },
    createProgramButtonText: {
      color: '#fff',
      fontFamily: theme.typography.fontFamilyBold,
      fontSize: 14,
      marginLeft: 6,
    },
  });
