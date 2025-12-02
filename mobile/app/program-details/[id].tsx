import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../src/providers/AuthProvider';
import { useTheme, Theme } from '../../src/theme';
import { programsApi } from '../../src/lib/api/programs';
import { Program, Week, Session, ProgramDifficulty } from '../../src/lib/types/program';
import { DIFFICULTY_OPTIONS } from '../../src/lib/types/program';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

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
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const isPublicView = type === 'public';

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
      // Auto expand first week
      if (data.weeks.length > 0) {
        setExpandedWeek(data.weeks[0].id);
      }
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
      "Start Program",
      `Would you like to add "${program.title}" to your library?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Add to Library", 
          onPress: async () => {
            try {
              setCopying(true);
              const newProgram = await programsApi.copyPublicProgram(program.id, accessToken);
              Alert.alert("Success", "Program added to your library!", [
                { text: "View Now", onPress: () => router.push(`/program-details/${newProgram.id}?type=private`) },
                { text: "OK" }
              ]);
            } catch (error) {
              Alert.alert("Error", "Failed to copy program.");
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

  const renderDifficultyBadge = (difficulty: ProgramDifficulty) => {
    const option = DIFFICULTY_OPTIONS.find(d => d.value === difficulty);
    const color = option?.color || theme.colors.primary;
    return (
      <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
        <Text style={[styles.badgeText, { color: color }]}>{difficulty}</Text>
      </View>
    );
  };

  const toggleWeek = (weekId: number) => {
    setExpandedWeek(expandedWeek === weekId ? null : weekId);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!program) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: theme.colors.secondaryText }}>Program not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Image Area */}
        <View style={styles.headerImageContainer}>
          <Image 
            source={program.image ? { uri: program.image } : require('../../assets/images/adaptive-icon.png')}
            style={styles.headerImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.headerGradient}
          />
          
          {/* Back Button */}
          <TouchableOpacity 
            style={[styles.backButton, { top: insets.top + 10 }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          {/* Header Content */}
          <View style={styles.headerContent}>
            <View style={styles.badgesRow}>
              {renderDifficultyBadge(program.difficulty)}
              <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}>
                <Text style={[styles.badgeText, { color: theme.colors.primary }]}>{program.focus}</Text>
              </View>
            </View>
            <Text style={styles.title}>{program.title}</Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{program.weeks.length}</Text>
              <Text style={styles.statLabel}>Weeks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {program.weeks.reduce((acc, week) => acc + week.sessions.length, 0)}
              </Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                 {/* Simple estimation: 1hr per session * sessions */}
                 {program.weeks.reduce((acc, week) => acc + week.sessions.length, 0)} hrs
              </Text>
              <Text style={styles.statLabel}>Est. Time</Text>
            </View>
          </View>

          {/* Description */}
          {program.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this Program</Text>
              <Text style={styles.descriptionText}>{program.description}</Text>
            </View>
          )}

          {/* Program Outline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Program Schedule</Text>
            
            {program.weeks.map((week) => (
              <View key={week.id} style={styles.weekContainer}>
                <TouchableOpacity 
                  style={styles.weekHeader} 
                  onPress={() => toggleWeek(week.id)}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={styles.weekTitle}>Week {week.week_number}</Text>
                    {week.week_name ? <Text style={styles.weekSubtitle}>{week.week_name}</Text> : null}
                  </View>
                  <Ionicons 
                    name={expandedWeek === week.id ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={theme.colors.secondaryText} 
                  />
                </TouchableOpacity>
                
                {expandedWeek === week.id && (
                  <View style={styles.sessionsList}>
                    {week.sessions.map((session) => (
                      <View key={session.id} style={styles.sessionItem}>
                        <View style={styles.sessionIcon}>
                          <Ionicons 
                            name={session.focus === 'Cardio' ? 'bicycle' : session.focus === 'Stretch' ? 'body' : 'barbell'} 
                            size={16} 
                            color={theme.colors.surface} 
                          />
                        </View>
                        <View style={styles.sessionInfo}>
                          <Text style={styles.sessionTitle}>{session.title}</Text>
                          <Text style={styles.sessionMeta}>
                            {session.day_of_week} • {session.blocks.length} Blocks
                          </Text>
                        </View>
                      </View>
                    ))}
                    {week.sessions.length === 0 && (
                      <Text style={styles.emptySessionsText}>No sessions planned for this week.</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer Action */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
        {isPublicView ? (
          <PrimaryButton 
            label={copying ? "Adding..." : "Add to Library"}
            onPress={handleCopyProgram}
            isLoading={copying}
            icon="duplicate-outline"
          />
        ) : (
          <PrimaryButton 
            label="Edit Program"
            onPress={handleEditProgram}
            variant="outline"
            icon="create-outline"
          />
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  
  // Header
  headerImageContainer: {
    height: HEADER_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(4),
  },
  badgesRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing(2),
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontFamily: theme.typography.fontFamilyBold,
    color: 'white',
    lineHeight: 34,
  },

  // Content
  contentContainer: {
    flex: 1,
    marginTop: -20,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(4),
  },
  
  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing(3),
    borderRadius: 16,
    marginBottom: theme.spacing(4),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primaryText,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.secondaryText,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
  },

  // Section
  section: {
    marginBottom: theme.spacing(5),
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizeLg,
    fontFamily: theme.typography.fontFamilyBold,
    color: theme.colors.primaryText,
    marginBottom: theme.spacing(2),
  },
  descriptionText: {
    fontSize: theme.typography.fontSizeMd,
    color: theme.colors.secondaryText,
    lineHeight: 22,
  },

  // Weeks
  weekContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: theme.spacing(2),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.colors.surface,
  },
  weekTitle: {
    fontSize: theme.typography.fontSizeMd,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  weekSubtitle: {
    fontSize: theme.typography.fontSizeXs,
    color: theme.colors.secondaryText,
    marginTop: 2,
  },
  sessionsList: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(3),
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: theme.typography.fontSizeSm,
    fontWeight: '600',
    color: theme.colors.primaryText,
    marginBottom: 2,
  },
  sessionMeta: {
    fontSize: 11,
    color: theme.colors.secondaryText,
  },
  emptySessionsText: {
    padding: theme.spacing(3),
    fontStyle: 'italic',
    color: theme.colors.secondaryText,
    fontSize: 12,
    textAlign: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
});