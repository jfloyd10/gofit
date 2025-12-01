// app/(main)/home.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../src/providers/AuthProvider';
import { useTheme, Theme } from '../../src/theme';
import { Screen } from '../../src/components/ui/Screen';
import { programsApi, ProgramListItem } from '../../src/lib/api/programs';
import { DIFFICULTY_OPTIONS, ProgramDifficulty } from '../../src/lib/types/program';

export default function HomeScreen() {
  const { user, accessToken, signOut, isLoading: authLoading } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  const [programs, setPrograms] = useState<ProgramListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPrograms = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await programsApi.getPrograms(accessToken);
      setPrograms(response.results);
    } catch (error) {
      console.error('Failed to fetch programs:', error);
      Alert.alert('Error', 'Could not load programs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrograms();
  };

  const handleCreateProgram = () => {
    router.push('/program-builder');
  };

  const handleProgramPress = (programId: number) => {
    // Navigate to the builder for editing/viewing
    router.push(`/program-builder/${programId}`);
  };

  if (authLoading) {
    return (
      <Screen center>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </Screen>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View>
        <Text style={styles.headerTitle}>My Programs</Text>
        <Text style={styles.headerSubtitle}>
          {programs.length} {programs.length === 1 ? 'Program' : 'Programs'} Created
        </Text>
      </View>
      <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
        <Ionicons name="log-out-outline" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="barbell-outline" size={64} color={theme.colors.border} />
      <Text style={styles.emptyStateTitle}>No Programs Yet</Text>
      <Text style={styles.emptyStateText}>
        Create your first workout program to get started.
      </Text>
      <TouchableOpacity style={styles.createButtonEmpty} onPress={handleCreateProgram}>
        <Text style={styles.createButtonEmptyText}>Create Program</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProgramItem = ({ item }: { item: ProgramListItem }) => {
    const difficultyColor = DIFFICULTY_OPTIONS.find(
      (d) => d.value === (item.difficulty as ProgramDifficulty)
    )?.color || theme.colors.primary;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handleProgramPress(item.id)}
      >
        <View style={styles.cardHeader}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImagePlaceholder, { backgroundColor: theme.colors.surfaceHighlight }]}>
              <Ionicons name="fitness" size={32} color={theme.colors.secondaryText} />
            </View>
          )}
          <View style={styles.badgeContainer}>
             {!item.is_public && (
                <View style={styles.privateBadge}>
                   <Ionicons name="lock-closed" size={12} color="white" />
                </View>
             )}
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={[styles.tag, { backgroundColor: theme.colors.primarySoft }]}>
              <Text style={[styles.tagText, { color: theme.colors.primary }]}>{item.focus}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: difficultyColor + '20' }]}>
               <Text style={[styles.tagText, { color: difficultyColor }]}>{item.difficulty}</Text>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.secondaryText} />
              <Text style={styles.statText}>{item.week_count} Weeks</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="list-outline" size={14} color={theme.colors.secondaryText} />
              <Text style={styles.statText}>{item.session_count} Sessions</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Screen style={styles.screenPadding}>
        {renderHeader()}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={programs}
            renderItem={renderProgramItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={programs.length === 0 ? styles.listContentEmpty : styles.listContent}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </Screen>

      {/* Floating Action Button */}
      {!loading && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateProgram}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    screenPadding: {
      paddingHorizontal: theme.spacing(4),
      paddingTop: theme.spacing(2), // Add some top padding
      paddingBottom: 0, 
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing(4),
      marginTop: theme.spacing(2),
    },
    headerTitle: {
      fontSize: theme.typography.fontSizeXl,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
    },
    headerSubtitle: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },
    signOutButton: {
      padding: theme.spacing(2),
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 200,
    },
    listContent: {
      paddingBottom: 100, // Space for FAB
    },
    listContentEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    
    // Card Styles
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      marginBottom: theme.spacing(4),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    cardHeader: {
      height: 140,
      width: '100%',
      position: 'relative',
    },
    cardImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    cardImagePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeContainer: {
        position: 'absolute',
        top: theme.spacing(2),
        right: theme.spacing(2),
        flexDirection: 'row',
    },
    privateBadge: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 20,
        padding: 6,
    },
    cardContent: {
      padding: theme.spacing(3),
    },
    cardTopRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing(2),
    },
    tag: {
      paddingHorizontal: theme.spacing(2),
      paddingVertical: 4,
      borderRadius: 6,
      marginRight: theme.spacing(2),
    },
    tagText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    cardTitle: {
      fontSize: theme.typography.fontSizeMd,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
      marginBottom: theme.spacing(2),
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: theme.spacing(4),
    },
    statText: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.secondaryText,
      marginLeft: 6,
    },

    // Empty State
    emptyStateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing(6),
    },
    emptyStateTitle: {
      fontSize: theme.typography.fontSizeLg,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
      marginTop: theme.spacing(4),
      marginBottom: theme.spacing(2),
    },
    emptyStateText: {
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      marginBottom: theme.spacing(6),
    },
    createButtonEmpty: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing(3),
      paddingHorizontal: theme.spacing(6),
      borderRadius: 50,
    },
    createButtonEmptyText: {
      color: 'white',
      fontWeight: '600',
      fontSize: theme.typography.fontSizeMd,
    },

    // FAB
    fab: {
      position: 'absolute',
      bottom: theme.spacing(6),
      right: theme.spacing(6),
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
  });