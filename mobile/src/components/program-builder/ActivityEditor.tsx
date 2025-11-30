// src/components/program-builder/ActivityEditor.tsx

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
import { BuilderActivity } from '../../lib/types/program';
import { PrescriptionEditor } from './PrescriptionEditor';

interface ActivityEditorProps {
  activity: BuilderActivity;
  weekTempId: string;
  sessionTempId: string;
  blockTempId: string;
  index: number;
}

export const ActivityEditor: React.FC<ActivityEditorProps> = ({
  activity,
  weekTempId,
  sessionTempId,
  blockTempId,
  index,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { updateActivity, deleteActivity, duplicateActivity, addPrescription } = useProgramBuilder();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const displayName = activity.exercise?.name || activity.manual_name || 'Untitled Exercise';
  const isManual = !activity.exercise;

  const handleDelete = () => {
    Alert.alert(
      'Delete Exercise',
      `Are you sure you want to remove "${displayName}"?`,
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

  const imageSource = activity.exercise?.image || activity.manual_image;

  return (
    <View style={styles.container}>
      {/* Activity Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandle}>
          <Ionicons name="menu" size={18} color={theme.colors.border} />
        </View>

        {/* Exercise Image/Icon */}
        <View style={styles.imageContainer}>
          {imageSource ? (
            <Image source={{ uri: imageSource }} style={styles.exerciseImage} />
          ) : (
            <View style={styles.exerciseImagePlaceholder}>
              <Ionicons 
                name={isManual ? 'create-outline' : 'barbell-outline'} 
                size={20} 
                color={theme.colors.secondaryText} 
              />
            </View>
          )}
        </View>

        {/* Exercise Info */}
        <View style={styles.infoContainer}>
          {isEditingName && isManual ? (
            <TextInput
              style={styles.nameInput}
              value={activity.manual_name || ''}
              onChangeText={(text) => 
                updateActivity(weekTempId, sessionTempId, blockTempId, activity.tempId, {
                  manual_name: text,
                })
              }
              onBlur={() => setIsEditingName(false)}
              autoFocus
              selectTextOnFocus
              placeholder="Exercise name"
              placeholderTextColor={theme.colors.secondaryText}
            />
          ) : (
            <TouchableOpacity
              onPress={() => isManual && setIsEditingName(true)}
              disabled={!isManual}
            >
              <Text style={styles.exerciseName} numberOfLines={1}>
                {displayName}
              </Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.metaRow}>
            {activity.exercise?.muscle_groups && (
              <Text style={styles.muscleGroups} numberOfLines={1}>
                {activity.exercise.muscle_groups}
              </Text>
            )}
            <Text style={styles.setsCount}>
              {activity.prescriptions.length} {activity.prescriptions.length === 1 ? 'set' : 'sets'}
            </Text>
          </View>
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
          
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.secondaryText}
          />
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
              <Ionicons name="copy-outline" size={16} color={theme.colors.primaryText} />
              <Text style={styles.menuItemText}>Duplicate</Text>
            </TouchableOpacity>
            {isManual && (
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  setIsEditingName(true);
                  setShowMenu(false);
                }}
              >
                <Ionicons name="pencil-outline" size={16} color={theme.colors.primaryText} />
                <Text style={styles.menuItemText}>Rename</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
              <Text style={[styles.menuItemText, { color: theme.colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Notes */}
          <TextInput
            style={styles.notesInput}
            value={activity.notes || ''}
            onChangeText={(text) =>
              updateActivity(weekTempId, sessionTempId, blockTempId, activity.tempId, {
                notes: text || null,
              })
            }
            placeholder="Add notes (optional)..."
            placeholderTextColor={theme.colors.secondaryText}
            multiline
          />

          {/* Prescriptions (Sets) */}
          <View style={styles.prescriptionsContainer}>
            {/* Header Row */}
            <View style={styles.prescriptionHeader}>
              <Text style={[styles.prescriptionHeaderText, { width: 50 }]}>Set</Text>
              <Text style={[styles.prescriptionHeaderText, { flex: 1 }]}>Target</Text>
              <Text style={[styles.prescriptionHeaderText, { width: 60 }]}>Rest</Text>
              <View style={{ width: 30 }} />
            </View>

            {/* Prescription Rows */}
            {activity.prescriptions.map((prescription, prescriptionIndex) => (
              <PrescriptionEditor
                key={prescription.tempId}
                prescription={prescription}
                weekTempId={weekTempId}
                sessionTempId={sessionTempId}
                blockTempId={blockTempId}
                activityTempId={activity.tempId}
                index={prescriptionIndex}
              />
            ))}

            {/* Add Set Button */}
            <TouchableOpacity
              style={styles.addSetButton}
              onPress={() => addPrescription(weekTempId, sessionTempId, blockTempId, activity.tempId)}
            >
              <Ionicons name="add" size={16} color={theme.colors.primary} />
              <Text style={styles.addSetText}>Add Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      marginBottom: theme.spacing(2),
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing(3),
    },
    dragHandle: {
      padding: theme.spacing(1),
      marginRight: theme.spacing(1),
    },
    imageContainer: {
      marginRight: theme.spacing(3),
    },
    exerciseImage: {
      width: 44,
      height: 44,
      borderRadius: 8,
    },
    exerciseImagePlaceholder: {
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
    nameInput: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primaryText,
      backgroundColor: theme.colors.surface,
      borderRadius: 6,
      paddingHorizontal: theme.spacing(2),
      paddingVertical: theme.spacing(1),
      marginRight: theme.spacing(2),
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing(0.5),
      gap: theme.spacing(2),
    },
    muscleGroups: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      flex: 1,
    },
    setsCount: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    actionsContainer: {
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
      top: 50,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
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
      paddingHorizontal: theme.spacing(3),
      gap: theme.spacing(2),
    },
    menuItemText: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.primaryText,
    },

    // Content
    content: {
      paddingHorizontal: theme.spacing(3),
      paddingBottom: theme.spacing(3),
    },
    notesInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      paddingHorizontal: theme.spacing(3),
      paddingVertical: theme.spacing(2),
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.primaryText,
      marginBottom: theme.spacing(3),
    },

    // Prescriptions
    prescriptionsContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      overflow: 'hidden',
    },
    prescriptionHeader: {
      flexDirection: 'row',
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    prescriptionHeaderText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.secondaryText,
      textTransform: 'uppercase',
    },

    // Add Set Button
    addSetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing(2),
      gap: theme.spacing(1),
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    addSetText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });

export default ActivityEditor;
