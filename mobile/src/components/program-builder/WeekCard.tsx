// src/components/program-builder/WeekCard.tsx

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme';
import { useProgramBuilder } from '../../providers/ProgramBuilderProvider';
import { BuilderWeek, BuilderSession } from '../../lib/types/program';
import { SessionCard } from './SessionCard';

interface WeekCardProps {
  week: BuilderWeek;
  onSessionPress: (session: BuilderSession) => void;
}

export const WeekCard: React.FC<WeekCardProps> = ({ week, onSessionPress }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { 
    updateWeek, 
    deleteWeek, 
    duplicateWeek,
    toggleWeekCollapse, 
    addSession,
  } = useProgramBuilder();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(week.week_name || `Week ${week.week_number}`);
  const [showMenu, setShowMenu] = useState(false);

  const handleSaveName = () => {
    updateWeek(week.tempId, { week_name: editName.trim() || `Week ${week.week_number}` });
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Week',
      `Are you sure you want to delete "${week.week_name || `Week ${week.week_number}`}" and all its sessions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteWeek(week.tempId),
        },
      ]
    );
    setShowMenu(false);
  };

  const handleDuplicate = () => {
    duplicateWeek(week.tempId);
    setShowMenu(false);
  };

  const totalActivities = week.sessions.reduce(
    (acc, session) => acc + session.blocks.reduce(
      (blockAcc, block) => blockAcc + block.activities.length, 0
    ), 0
  );

  return (
    <View style={styles.container}>
      {/* Week Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => toggleWeekCollapse(week.tempId)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.weekBadge}>
            <Text style={styles.weekBadgeText}>{week.week_number}</Text>
          </View>
          
          {isEditing ? (
            <TextInput
              style={styles.weekNameInput}
              value={editName}
              onChangeText={setEditName}
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity 
              onPress={() => setIsEditing(true)}
              style={styles.weekNameContainer}
            >
              <Text style={styles.weekName} numberOfLines={1}>
                {week.week_name || `Week ${week.week_number}`}
              </Text>
              <Ionicons name="pencil" size={14} color={theme.colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerRight}>
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.secondaryText} />
              <Text style={styles.statText}>{week.sessions.length}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="barbell-outline" size={14} color={theme.colors.secondaryText} />
              <Text style={styles.statText}>{totalActivities}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenu(!showMenu)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.secondaryText} />
          </TouchableOpacity>

          <Ionicons
            name={week.isCollapsed ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={theme.colors.secondaryText}
          />
        </View>
      </TouchableOpacity>

      {/* Menu Dropdown */}
      {showMenu && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity style={styles.menuItem} onPress={handleDuplicate}>
            <Ionicons name="copy-outline" size={18} color={theme.colors.primaryText} />
            <Text style={styles.menuItemText}>Duplicate Week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            <Text style={[styles.menuItemText, { color: theme.colors.error }]}>Delete Week</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Week Content */}
      {!week.isCollapsed && (
        <View style={styles.content}>
          {/* Notes */}
          {week.notes ? (
            <View style={styles.notesContainer}>
              <Ionicons name="document-text-outline" size={14} color={theme.colors.secondaryText} />
              <Text style={styles.notesText}>{week.notes}</Text>
            </View>
          ) : null}

          {/* Sessions */}
          {week.sessions.map((session, index) => (
            <SessionCard
              key={session.tempId}
              session={session}
              weekTempId={week.tempId}
              index={index}
              onPress={() => onSessionPress(session)}
            />
          ))}

          {/* Add Session Button */}
          <TouchableOpacity
            style={styles.addSessionButton}
            onPress={() => addSession(week.tempId)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.addSessionText}>Add Session</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      marginBottom: theme.spacing(3),
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing(4),
      backgroundColor: theme.colors.surface,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    weekBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing(3),
    },
    weekBadgeText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '700',
      color: theme.colors.surface,
    },
    weekNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(2),
      flex: 1,
    },
    weekName: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    weekNameInput: {
      flex: 1,
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primaryText,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      paddingHorizontal: theme.spacing(2),
      paddingVertical: theme.spacing(1),
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(2),
    },
    statsContainer: {
      flexDirection: 'row',
      gap: theme.spacing(3),
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(1),
    },
    statText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
    },
    menuButton: {
      padding: theme.spacing(1),
    },

    // Menu Dropdown
    menuDropdown: {
      position: 'absolute',
      right: theme.spacing(4),
      top: 56,
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

    // Content
    content: {
      padding: theme.spacing(4),
      paddingTop: 0,
    },
    notesContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: theme.spacing(3),
      marginBottom: theme.spacing(3),
      gap: theme.spacing(2),
    },
    notesText: {
      flex: 1,
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      lineHeight: 18,
    },

    // Add Session
    addSessionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing(3),
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      borderStyle: 'dashed',
      gap: theme.spacing(2),
      marginTop: theme.spacing(2),
    },
    addSessionText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });

export default WeekCard;
