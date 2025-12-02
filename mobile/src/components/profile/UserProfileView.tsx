import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme, Theme } from '../../theme';
import { usersApi } from '../../lib/api/users';
import { PublicUser } from '../../lib/types/user';
import { Program } from '../../lib/types/program';
import { useAuth } from '../../providers/AuthProvider';

interface UserProfileViewProps {
  username: string;
  showBack?: boolean; // Option to hide back button on the main tab
}

export function UserProfileView({ username, showBack = true }: UserProfileViewProps) {
  const theme = useTheme();
  const router = useRouter();
  // 1. Destructure accessToken
  const { user: currentUser, accessToken } = useAuth(); 
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [profileUser, setProfileUser] = useState<PublicUser | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isMe = currentUser?.username === username;

  useEffect(() => {
    loadData();
  }, [username, accessToken]); // Add accessToken to dependency

  const loadData = async () => {
    try {
      // 2. Ensure we have the token before making requests
      if (!username || !accessToken) return; 
      
      setIsLoading(true);
      
      // 3. Pass accessToken and isMe flag
      const [userData, userPrograms] = await Promise.all([
        usersApi.getUser(username, accessToken),
        usersApi.getUserPrograms(username, isMe, accessToken)
      ]);

      setProfileUser(userData);
      setPrograms(userPrograms);
    } catch (error) {
      console.error("Failed to load user profile", error);
    } finally {
      setIsLoading(false);
    }
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
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>User not found.</Text>
      </View>
    );
  }

  const { profile } = profileUser;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.header}>
        {showBack && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.primaryText} />
            </TouchableOpacity>
        )}

        <View style={styles.avatarContainer}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>
                {(profile.display_name?.[0] || username?.[0] || '?').toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.nameContainer}>
          <Text style={styles.displayName}>
            {profile.display_name || username}
            {'  '}
            {profile.is_verified && (
              <MaterialCommunityIcons 
                  name="dumbbell" 
                  size={20} 
                  color={theme.colors.primary} 
                  style={styles.verifiedIcon}
              />
            )}
          </Text>
          <Text style={styles.username}>@{username}</Text>
        </View>

        {profile.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : null}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profileUser.followers_count}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profileUser.following_count}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profileUser.programs_count}</Text>
            <Text style={styles.statLabel}>Programs</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {isMe ? (
            <TouchableOpacity style={styles.editButton} onPress={() => router.push('/(main)/profile/edit')}> 
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.followButton}>
              <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content Tabs Area */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>
           {programs.length > 0 ? "Created Programs" : "Programs"}
        </Text>

        {programs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {profileUser.username} hasn't created any programs yet.
            </Text>
          </View>
        ) : (
          <View style={styles.programGrid}>
            {programs.map((prog) => (
              <TouchableOpacity 
                  key={prog.id} 
                  style={styles.programCard}
                  onPress={() => router.push(`/program-details/${prog.id}`)}
              >
                <Image 
                  source={prog.image ? { uri: prog.image } : require('../../../assets/images/adaptive-icon.png')} 
                  style={styles.programImage} 
                />
                <View style={styles.programInfo}>
                  <Text style={styles.programTitle} numberOfLines={1}>{prog.title}</Text>
                  <Text style={styles.programFocus}>{prog.focus}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 20,
    fontSize: theme.typography.fontSizeMd,
  },
  header: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 10,
  },
  avatarContainer: {
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.border,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 40,
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamilyBold,
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  displayName: {
    fontSize: theme.typography.fontSizeLg,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  username: {
    fontSize: theme.typography.fontSizeSm,
    color: theme.colors.secondaryText,
  },
  bio: {
    fontSize: theme.typography.fontSizeSm,
    color: theme.colors.primaryText,
    textAlign: 'center',
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: theme.spacing(3),
    paddingHorizontal: theme.spacing(2),
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSizeMd,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
  },
  statLabel: {
    fontSize: theme.typography.fontSizeXs,
    color: theme.colors.secondaryText,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
  },
  followButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  followButtonText: {
    color: '#fff',
    fontFamily: theme.typography.fontFamilyBold,
  },
  editButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  editButtonText: {
    color: theme.colors.primaryText,
    fontFamily: theme.typography.fontFamilyBold,
  },
  contentSection: {
    padding: theme.spacing(2),
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizeMd,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
    marginBottom: theme.spacing(2),
    marginLeft: theme.spacing(1),
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing(4),
  },
  emptyStateText: {
    color: theme.colors.secondaryText,
    fontStyle: 'italic',
  },
  programGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  programCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: theme.spacing(2),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  programImage: {
    width: '100%',
    height: 100,
    backgroundColor: theme.colors.border,
  },
  programInfo: {
    padding: theme.spacing(1.5),
  },
  programTitle: {
    fontSize: theme.typography.fontSizeSm,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
    marginBottom: 2,
  },
  programFocus: {
    fontSize: theme.typography.fontSizeXs,
    color: theme.colors.secondaryText,
  },
});