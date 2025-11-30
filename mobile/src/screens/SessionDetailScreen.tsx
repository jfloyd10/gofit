// src/screens/SessionDetailScreen.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import { useAuth } from '../providers/AuthProvider';
import { sessionsApi } from '../lib/api/sessions';
import { ApiError } from '../lib/api/auth';
import {
  Session,
  SessionBlock,
  Activity,
  ActivityPrescription,
  formatDuration,
  formatWeight,
  formatDistance,
  SET_TAG_COLORS,
} from '../lib/types/session';

interface SessionDetailScreenProps {
  sessionId: number;
  onBack?: () => void;
}

export const SessionDetailScreen: React.FC<SessionDetailScreenProps> = ({
  sessionId,
  onBack,
}) => {
  const { accessToken } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async (showLoadingIndicator = true) => {
    if (!accessToken) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    if (showLoadingIndicator) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await sessionsApi.getSession(sessionId, accessToken);
      setSession(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load session. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [sessionId, accessToken]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSession(false);
  };

  const handleVideoPress = (url: string) => {
    Linking.openURL(url);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchSession()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primaryText} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {session.title}
          </Text>
          {session.program_title && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {session.program_title} • Week {session.week_number}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Session Hero */}
        <SessionHero session={session} theme={theme} styles={styles} />

        {/* Session Blocks */}
        {session.blocks.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            theme={theme}
            styles={styles}
            onVideoPress={handleVideoPress}
          />
        ))}

        {/* Bottom padding for scroll */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

// Sub-components

interface SessionHeroProps {
  session: Session;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}

const SessionHero: React.FC<SessionHeroProps> = ({ session, theme, styles }) => {
  return (
    <View style={styles.heroContainer}>
      {session.preview_image && (
        <Image source={{ uri: session.preview_image }} style={styles.heroImage} />
      )}
      
      <View style={styles.heroContent}>
        {/* Meta tags */}
        <View style={styles.metaRow}>
          <View style={[styles.metaTag, { backgroundColor: theme.colors.primarySoft }]}>
            <Ionicons name="fitness-outline" size={14} color={theme.colors.primary} />
            <Text style={[styles.metaTagText, { color: theme.colors.primary }]}>
              {session.focus_display}
            </Text>
          </View>
          
          <View style={styles.metaTag}>
            <Ionicons name="time-outline" size={14} color={theme.colors.secondaryText} />
            <Text style={styles.metaTagText}>{session.estimated_session_time}</Text>
          </View>
          
          <View style={styles.metaTag}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.secondaryText} />
            <Text style={styles.metaTagText}>{session.day_of_week_display}</Text>
          </View>
        </View>

        {/* Description */}
        {session.description && (
          <Text style={styles.description}>{session.description}</Text>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {session.blocks.reduce((acc, b) => acc + b.activities.length, 0)}
            </Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{session.blocks.length}</Text>
            <Text style={styles.statLabel}>Blocks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {session.blocks.reduce(
                (acc, b) => acc + b.activities.reduce((a, act) => a + act.prescriptions.length, 0),
                0
              )}
            </Text>
            <Text style={styles.statLabel}>Total Sets</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

interface BlockCardProps {
  block: SessionBlock;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
  onVideoPress: (url: string) => void;
}

const BlockCard: React.FC<BlockCardProps> = ({ block, theme, styles, onVideoPress }) => {
  const getSchemeLabel = () => {
    let label = block.scheme_type_display;
    if (block.scheme_type === 'AMRAP' && block.duration_target) {
      label += ` ${Math.floor(block.duration_target / 60)} min`;
    } else if (block.scheme_type === 'RFT' && block.rounds_target) {
      label += ` ${block.rounds_target} Rounds`;
    } else if (block.scheme_type === 'EMOM' && block.duration_target) {
      label += ` ${Math.floor(block.duration_target / 60)} min`;
    }
    return label;
  };

  return (
    <View style={styles.blockCard}>
      {/* Block Header */}
      <View style={styles.blockHeader}>
        <View style={styles.blockTitleRow}>
          <Text style={styles.blockTitle}>
            {block.block_name || `Block ${block.block_order + 1}`}
          </Text>
          {block.scheme_type !== 'STANDARD' && (
            <View style={styles.schemeTag}>
              <Text style={styles.schemeTagText}>{getSchemeLabel()}</Text>
            </View>
          )}
        </View>
        {block.block_notes && (
          <Text style={styles.blockNotes}>{block.block_notes}</Text>
        )}
      </View>

      {/* Activities */}
      {block.activities.map((activity, index) => (
        <ActivityRow
          key={activity.id}
          activity={activity}
          isLast={index === block.activities.length - 1}
          theme={theme}
          styles={styles}
          onVideoPress={onVideoPress}
        />
      ))}
    </View>
  );
};

interface ActivityRowProps {
  activity: Activity;
  isLast: boolean;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
  onVideoPress: (url: string) => void;
}

const ActivityRow: React.FC<ActivityRowProps> = ({
  activity,
  isLast,
  theme,
  styles,
  onVideoPress,
}) => {
  const [expanded, setExpanded] = useState(true);

  const imageUrl = activity.exercise?.image || activity.manual_image;
  const videoUrl = activity.exercise?.video_url || activity.manual_video_url;

  return (
    <View style={[styles.activityContainer, !isLast && styles.activityBorder]}>
      {/* Activity Header */}
      <TouchableOpacity
        style={styles.activityHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.activityInfo}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.activityImage} />
          ) : (
            <View style={styles.activityImagePlaceholder}>
              <Ionicons name="barbell-outline" size={20} color={theme.colors.secondaryText} />
            </View>
          )}
          
          <View style={styles.activityDetails}>
            <Text style={styles.activityName}>{activity.display_name}</Text>
            {activity.exercise?.muscle_groups && (
              <Text style={styles.activityMuscles}>{activity.exercise.muscle_groups}</Text>
            )}
          </View>
        </View>

        <View style={styles.activityActions}>
          {videoUrl && (
            <TouchableOpacity
              style={styles.videoButton}
              onPress={() => onVideoPress(videoUrl)}
            >
              <Ionicons name="play-circle-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.secondaryText}
          />
        </View>
      </TouchableOpacity>

      {/* Activity Notes */}
      {activity.notes && expanded && (
        <Text style={styles.activityNotes}>{activity.notes}</Text>
      )}

      {/* Prescriptions */}
      {expanded && activity.prescriptions.length > 0 && (
        <View style={styles.prescriptionsContainer}>
          <PrescriptionHeader styles={styles} />
          {activity.prescriptions.map((prescription) => (
            <PrescriptionRow
              key={prescription.id}
              prescription={prescription}
              theme={theme}
              styles={styles}
            />
          ))}
        </View>
      )}
    </View>
  );
};

interface PrescriptionHeaderProps {
  styles: ReturnType<typeof createStyles>;
}

const PrescriptionHeader: React.FC<PrescriptionHeaderProps> = ({ styles }) => {
  return (
    <View style={styles.prescriptionHeader}>
      <Text style={[styles.prescriptionHeaderText, styles.prescriptionSetCol]}>Set</Text>
      <Text style={[styles.prescriptionHeaderText, styles.prescriptionMainCol]}>Target</Text>
      <Text style={[styles.prescriptionHeaderText, styles.prescriptionRestCol]}>Rest</Text>
    </View>
  );
};

interface PrescriptionRowProps {
  prescription: ActivityPrescription;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}

const PrescriptionRow: React.FC<PrescriptionRowProps> = ({ prescription, theme, styles }) => {
  const tagColor = SET_TAG_COLORS[prescription.set_tag] || theme.colors.primary;
  
  const getTargetDisplay = () => {
    const parts: string[] = [];
    
    // Reps
    if (prescription.reps) {
      parts.push(`${prescription.reps} reps`);
    }
    
    // Weight
    if (prescription.weight !== null) {
      let weightStr = formatWeight(Number(prescription.weight));
      if (prescription.is_per_side) {
        weightStr += '/side';
      }
      parts.push(weightStr);
    }
    
    // Intensity
    if (prescription.intensity_value && prescription.intensity_type) {
      if (prescription.intensity_type === 'percent_1rm') {
        parts.push(`@ ${prescription.intensity_value}% 1RM`);
      } else if (prescription.intensity_type === 'rpe') {
        parts.push(`@ RPE ${prescription.intensity_value}`);
      } else {
        parts.push(`@ ${prescription.intensity_value}`);
      }
    }
    
    // Duration (for cardio)
    if (prescription.duration_seconds) {
      parts.push(formatDuration(prescription.duration_seconds));
    }
    
    // Distance
    if (prescription.distance) {
      parts.push(formatDistance(Number(prescription.distance)));
    }
    
    // Calories
    if (prescription.calories) {
      parts.push(`${prescription.calories} cal`);
    }
    
    // Tempo
    if (prescription.tempo) {
      parts.push(`Tempo: ${prescription.tempo}`);
    }
    
    return parts.join(' • ') || '-';
  };

  return (
    <View style={styles.prescriptionRow}>
      <View style={[styles.prescriptionSetCol, styles.prescriptionSetContainer]}>
        <View style={[styles.setTagIndicator, { backgroundColor: tagColor }]} />
        <Text style={styles.prescriptionSetText}>{prescription.set_number}</Text>
        {prescription.set_tag !== 'N' && (
          <Text style={[styles.setTagLabel, { color: tagColor }]}>
            {prescription.set_tag_display}
          </Text>
        )}
      </View>
      
      <Text style={[styles.prescriptionMainCol, styles.prescriptionTargetText]} numberOfLines={2}>
        {getTargetDisplay()}
      </Text>
      
      <Text style={[styles.prescriptionRestCol, styles.prescriptionRestText]}>
        {prescription.rest_seconds ? formatDuration(prescription.rest_seconds) : '-'}
      </Text>
    </View>
  );
};

// Styles
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      padding: theme.spacing(4),
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing(4),
    },
    
    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing(4),
      paddingVertical: theme.spacing(3),
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: theme.spacing(2),
      padding: theme.spacing(1),
    },
    headerTitleContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: theme.typography.fontSizeLg,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    headerSubtitle: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },

    // Error state
    errorText: {
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.secondaryText,
      textAlign: 'center',
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

    // Hero section
    heroContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      marginTop: theme.spacing(4),
      overflow: 'hidden',
    },
    heroImage: {
      width: '100%',
      height: 180,
      backgroundColor: theme.colors.border,
    },
    heroContent: {
      padding: theme.spacing(4),
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing(2),
      marginBottom: theme.spacing(3),
    },
    metaTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      paddingVertical: theme.spacing(1),
      paddingHorizontal: theme.spacing(2),
      borderRadius: 6,
      gap: 4,
    },
    metaTagText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
    },
    description: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.secondaryText,
      lineHeight: 20,
      marginBottom: theme.spacing(3),
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingTop: theme.spacing(3),
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: theme.typography.fontSizeXl,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    statLabel: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: theme.colors.border,
    },

    // Block Card
    blockCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      marginTop: theme.spacing(4),
      overflow: 'hidden',
    },
    blockHeader: {
      padding: theme.spacing(4),
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    blockTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    blockTitle: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    schemeTag: {
      backgroundColor: theme.colors.primarySoft,
      paddingVertical: theme.spacing(1),
      paddingHorizontal: theme.spacing(2),
      borderRadius: 6,
    },
    schemeTagText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    blockNotes: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      marginTop: theme.spacing(2),
    },

    // Activity
    activityContainer: {
      paddingHorizontal: theme.spacing(4),
      paddingVertical: theme.spacing(3),
    },
    activityBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    activityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    activityInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    activityImage: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: theme.colors.border,
    },
    activityImagePlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activityDetails: {
      marginLeft: theme.spacing(3),
      flex: 1,
    },
    activityName: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    activityMuscles: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },
    activityActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(2),
    },
    videoButton: {
      padding: theme.spacing(1),
    },
    activityNotes: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      fontStyle: 'italic',
      marginTop: theme.spacing(2),
      marginLeft: 44 + theme.spacing(3),
    },

    // Prescriptions
    prescriptionsContainer: {
      marginTop: theme.spacing(3),
      marginLeft: 44 + theme.spacing(3),
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      overflow: 'hidden',
    },
    prescriptionHeader: {
      flexDirection: 'row',
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    prescriptionHeaderText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
      color: theme.colors.secondaryText,
      textTransform: 'uppercase',
    },
    prescriptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    prescriptionSetCol: {
      width: 60,
    },
    prescriptionMainCol: {
      flex: 1,
      paddingHorizontal: theme.spacing(2),
    },
    prescriptionRestCol: {
      width: 50,
      textAlign: 'right',
    },
    prescriptionSetContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    setTagIndicator: {
      width: 3,
      height: 20,
      borderRadius: 2,
      marginRight: theme.spacing(2),
    },
    prescriptionSetText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    setTagLabel: {
      fontSize: 10,
      marginLeft: theme.spacing(1),
      fontWeight: '500',
    },
    prescriptionTargetText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.primaryText,
    },
    prescriptionRestText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
    },

    bottomPadding: {
      height: theme.spacing(8),
    },
  });

export default SessionDetailScreen;
