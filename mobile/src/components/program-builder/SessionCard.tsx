// src/components/program-builder/SessionCard.tsx

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme';
import { useProgramBuilder } from '../../providers/ProgramBuilderProvider';
import { BuilderSession, DAYS_OF_WEEK, SESSION_FOCUS_OPTIONS } from '../../lib/types/program';

interface SessionCardProps {
  session: BuilderSession;
  weekTempId: string;
  index: number;
  onPress: () => void;
}

const FOCUS_ICONS: Record<string, string> = {
  'Lift': 'barbell-outline',
  'Cardio': 'heart-outline',
  'Stretch': 'body-outline',
};

const FOCUS_COLORS: Record<string, string> = {
  'Lift': '#0A84FF',
  'Cardio': '#FF3B30',
  'Stretch': '#34C759',
};

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  weekTempId,
  index,
  onPress,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { deleteSession, duplicateSession } = useProgramBuilder();
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Session',
      `Are you sure you want to delete "${session.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteSession(weekTempId, session.tempId),
        },
      ]
    );
    setShowMenu(false);
  };

  const handleDuplicate = () => {
    duplicateSession(weekTempId, session.tempId);
    setShowMenu(false);
  };

  const totalActivities = session.blocks.reduce(
    (acc, block) => acc + block.activities.length, 0
  );

  const totalSets = session.blocks.reduce(
    (acc, block) => acc + block.activities.reduce(
      (actAcc, activity) => actAcc + activity.prescriptions.length, 0
    ), 0
  );

  const focusColor = FOCUS_COLORS[session.focus] || theme.colors.primary;
  const focusIcon = FOCUS_ICONS[session.focus] || 'fitness-outline';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Day Label */}
        <View style={styles.dayLabelContainer}>
          <View style={[styles.dayLabel, { backgroundColor: focusColor + '20' }]}>
            <Ionicons name={focusIcon as any} size={14} color={focusColor} />
            <Text style={[styles.dayLabelText, { color: focusColor }]}>
              {DAYS_OF_WEEK.find(d => d.value === session.day_of_week)?.label || session.day_of_week}
            </Text>
          </View>
        </View>

        {/* Session Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {session.title || 'Untitled Session'}
          </Text>
          
          {session.description ? (
            <Text style={styles.sessionDescription} numberOfLines={2}>
              {session.description}
            </Text>
          ) : null}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="layers-outline" size={14} color={theme.colors.secondaryText} />
              <Text style={styles.statText}>{session.blocks.length} blocks</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="barbell-outline" size={14} color={theme.colors.secondaryText} />
              <Text style={styles.statText}>{totalActivities} exercises</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="repeat-outline" size={14} color={theme.colors.secondaryText} />
              <Text style={styles.statText}>{totalSets} sets</Text>
            </View>
          </View>

          {/* Exercise Preview */}
          {totalActivities > 0 && (
            <View style={styles.exercisePreview}>
              {session.blocks.slice(0, 1).map(block => 
                block.activities.slice(0, 3).map((activity, idx) => (
                  <View key={activity.tempId} style={styles.exerciseTag}>
                    <Text style={styles.exerciseTagText} numberOfLines={1}>
                      {activity.exercise?.name || activity.manual_name || 'Exercise'}
                    </Text>
                  </View>
                ))
              )}
              {totalActivities > 3 && (
                <View style={styles.moreTag}>
                  <Text style={styles.moreTagText}>+{totalActivities - 3}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.secondaryText} />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.secondaryText} />
        </View>
      </TouchableOpacity>

      {/* Menu Dropdown */}
      {showMenu && (
        <>
          <TouchableOpacity 
            style={styles.menuOverlay}
            onPress={() => setShowMenu(false)}
          />
          <View style={styles.menuDropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={handleDuplicate}>
              <Ionicons name="copy-outline" size={18} color={theme.colors.primaryText} />
              <Text style={styles.menuItemText}>Duplicate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
              <Text style={[styles.menuItemText, { color: theme.colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing(2),
    },
    card: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: theme.spacing(3),
      alignItems: 'flex-start',
    },
    dayLabelContainer: {
      marginRight: theme.spacing(3),
    },
    dayLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing(1),
      paddingHorizontal: theme.spacing(2),
      borderRadius: 6,
      gap: theme.spacing(1),
    },
    dayLabelText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
    },
    infoContainer: {
      flex: 1,
    },
    sessionTitle: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: theme.spacing(0.5),
    },
    sessionDescription: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      marginBottom: theme.spacing(2),
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing(3),
      marginBottom: theme.spacing(2),
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(1),
    },
    statText: {
      fontSize: 11,
      color: theme.colors.secondaryText,
    },
    exercisePreview: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing(1),
    },
    exerciseTag: {
      backgroundColor: theme.colors.surface,
      paddingVertical: 2,
      paddingHorizontal: theme.spacing(2),
      borderRadius: 4,
      maxWidth: 100,
    },
    exerciseTagText: {
      fontSize: 10,
      color: theme.colors.secondaryText,
    },
    moreTag: {
      backgroundColor: theme.colors.primarySoft,
      paddingVertical: 2,
      paddingHorizontal: theme.spacing(2),
      borderRadius: 4,
    },
    moreTagText: {
      fontSize: 10,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(1),
      marginLeft: theme.spacing(2),
    },
    menuButton: {
      padding: theme.spacing(1),
    },

    // Menu
    menuOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99,
    },
    menuDropdown: {
      position: 'absolute',
      right: theme.spacing(4),
      top: 40,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingVertical: theme.spacing(1),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 100,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(4),
      gap: theme.spacing(2),
    },
    menuItemText: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.primaryText,
    },
  });

export default SessionCard;
