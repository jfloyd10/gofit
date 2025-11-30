// src/components/program-builder/ActivityCard.tsx

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme';
import { useProgramBuilder } from '../../providers/ProgramBuilderProvider';
import { BuilderActivity, BuilderPrescription, SET_TAG_OPTIONS } from '../../lib/types/program';
import { PrescriptionRow } from './PrescriptionRow';

interface ActivityCardProps {
  activity: BuilderActivity;
  index: number;
  weekTempId: string;
  sessionTempId: string;
  blockTempId: string;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  index,
  weekTempId,
  sessionTempId,
  blockTempId,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    updateActivity,
    deleteActivity,
    duplicateActivity,
    addPrescription,
  } = useProgramBuilder();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(activity.notes || '');

  const displayName = activity.exercise?.name || activity.manual_name || 'Untitled Exercise';
  const hasImage = activity.exercise?.image || activity.manual_image;

  const handleDelete = () => {
    Alert.alert(
      'Delete Exercise',
      `Remove "${displayName}" from this block?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteActivity(weekTempId, sessionTempId, blockTempId, activity.tempId),
        },
      ]
    );
    setShowMenu(false);
  };

  const handleDuplicate = () => {
    duplicateActivity(weekTempId, sessionTempId, blockTempId, activity.tempId);
    setShowMenu(false);
  };

  const handleSaveNotes = () => {
    updateActivity(weekTempId, sessionTempId, blockTempId, activity.tempId, {
      notes: notes.trim(),
    });
    setIsEditingNotes(false);
  };

  const handleAddSet = () => {
    addPrescription(weekTempId, sessionTempId, blockTempId, activity.tempId);
  };

  const totalSets = activity.prescriptions.length;

  return (
    <View style={styles.container}>
      {/* Activity Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          {/* Index badge */}
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{index + 1}</Text>
          </View>

          {/* Exercise image or icon */}
          <View style={styles.imageContainer}>
            {hasImage ? (
              <Image
                source={{ uri: activity.exercise?.image || activity.manual_image || undefined }}
                style={styles.image}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="barbell-outline" size={20} color={theme.colors.secondaryText} />
              </View>
            )}
          </View>

          {/* Exercise info */}
          <View style={styles.infoContainer}>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.metaRow}>
              {activity.exercise?.muscle_groups && (
                <Text style={styles.metaText}>{activity.exercise.muscle_groups}</Text>
              )}
              <Text style={styles.setsText}>
                {totalSets} {totalSets === 1 ? 'set' : 'sets'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenu(!showMenu)}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.secondaryText}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Dropdown */}
      {showMenu && (
        <>
          <TouchableOpacity
            style={styles.menuOverlay}
            onPress={() => setShowMenu(false)}
            activeOpacity={1}
          />
          <View style={styles.menuDropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={handleDuplicate}>
              <Ionicons name="copy-outline" size={18} color={theme.colors.primaryText} />
              <Text style={styles.menuItemText}>Duplicate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setIsEditingNotes(true);
                setShowMenu(false);
              }}
            >
              <Ionicons name="document-text-outline" size={18} color={theme.colors.primaryText} />
              <Text style={styles.menuItemText}>Edit Notes</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
              <Text style={[styles.menuItemText, { color: theme.colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Notes Section */}
          {(isEditingNotes || activity.notes) && (
            <View style={styles.notesSection}>
              {isEditingNotes ? (
                <View style={styles.notesEditContainer}>
                  <TextInput
                    style={styles.notesInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add notes for this exercise..."
                    placeholderTextColor={theme.colors.secondaryText}
                    multiline
                    numberOfLines={2}
                    autoFocus
                  />
                  <View style={styles.notesActions}>
                    <TouchableOpacity
                      style={styles.notesActionButton}
                      onPress={() => {
                        setNotes(activity.notes || '');
                        setIsEditingNotes(false);
                      }}
                    >
                      <Text style={styles.notesActionText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.notesActionButton, styles.notesSaveButton]}
                      onPress={handleSaveNotes}
                    >
                      <Text style={styles.notesSaveText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.notesDisplay}
                  onPress={() => setIsEditingNotes(true)}
                >
                  <Ionicons name="document-text-outline" size={14} color={theme.colors.secondaryText} />
                  <Text style={styles.notesText}>{activity.notes}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Prescriptions Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.setColumn]}>Set</Text>
            <Text style={[styles.tableHeaderText, styles.repsColumn]}>Reps</Text>
            <Text style={[styles.tableHeaderText, styles.weightColumn]}>Weight</Text>
            <Text style={[styles.tableHeaderText, styles.restColumn]}>Rest</Text>
            <View style={styles.actionColumn} />
          </View>

          {/* Prescriptions List */}
          {activity.prescriptions.map((prescription, prescriptionIndex) => (
            <PrescriptionRow
              key={prescription.tempId}
              prescription={prescription}
              index={prescriptionIndex}
              weekTempId={weekTempId}
              sessionTempId={sessionTempId}
              blockTempId={blockTempId}
              activityTempId={activity.tempId}
            />
          ))}

          {/* Add Set Button */}
          <TouchableOpacity
            style={styles.addSetButton}
            onPress={handleAddSet}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={theme.colors.primary} />
            <Text style={styles.addSetText}>Add Set</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      marginBottom: theme.spacing(2),
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing(3),
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    indexBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing(2),
    },
    indexText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    imageContainer: {
      marginRight: theme.spacing(3),
    },
    image: {
      width: 44,
      height: 44,
      borderRadius: 8,
    },
    imagePlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoContainer: {
      flex: 1,
    },
    exerciseName: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
      gap: theme.spacing(2),
    },
    metaText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
    },
    setsText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(1),
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
      right: theme.spacing(3),
      top: theme.spacing(12),
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
      minWidth: 150,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      gap: theme.spacing(2),
    },
    menuItemText: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.primaryText,
    },
    menuDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing(1),
    },

    // Content
    content: {
      paddingHorizontal: theme.spacing(3),
      paddingBottom: theme.spacing(3),
    },

    // Notes
    notesSection: {
      marginBottom: theme.spacing(3),
    },
    notesDisplay: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: theme.spacing(2),
      gap: theme.spacing(2),
    },
    notesText: {
      flex: 1,
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      lineHeight: 16,
    },
    notesEditContainer: {},
    notesInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: theme.spacing(2),
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.primaryText,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    notesActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: theme.spacing(2),
      marginTop: theme.spacing(2),
    },
    notesActionButton: {
      paddingVertical: theme.spacing(1),
      paddingHorizontal: theme.spacing(3),
    },
    notesActionText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
    },
    notesSaveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 6,
    },
    notesSaveText: {
      fontSize: theme.typography.fontSizeXs,
      color: '#FFFFFF',
      fontWeight: '600',
    },

    // Table
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing(2),
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tableHeaderText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    setColumn: {
      width: 40,
      textAlign: 'center',
    },
    repsColumn: {
      flex: 1,
      textAlign: 'center',
    },
    weightColumn: {
      flex: 1,
      textAlign: 'center',
    },
    restColumn: {
      flex: 1,
      textAlign: 'center',
    },
    actionColumn: {
      width: 32,
    },

    // Add Set
    addSetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing(2),
      marginTop: theme.spacing(2),
      gap: theme.spacing(1),
    },
    addSetText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });

export default ActivityCard;
