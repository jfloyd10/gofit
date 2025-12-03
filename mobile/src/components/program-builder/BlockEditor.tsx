// src/components/program-builder/BlockEditor.tsx

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
import { BuilderBlock, SCHEME_TYPE_OPTIONS } from '../../lib/types/program';
import { SchemeType } from '../../lib/types/session';
import { ActivityEditor } from './ActivityEditor';

interface BlockEditorProps {
  block: BuilderBlock;
  weekTempId: string;
  sessionTempId: string;
  index: number;
  onAddExercise: () => void;
  onAddManualExercise: () => void;
}

const SCHEME_ICONS: Record<SchemeType, string> = {
  'STANDARD': 'list-outline',
  'CIRCUIT': 'sync-outline',
  'INTERVAL': 'timer-outline',
  'EMOM': 'alarm-outline',
  'AMRAP': 'infinite-outline',
  'RFT': 'trophy-outline',
  'TABATA': 'pulse-outline',
};

export const BlockEditor: React.FC<BlockEditorProps> = ({
  block,
  weekTempId,
  sessionTempId,
  index,
  onAddExercise,
  onAddManualExercise,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { updateBlock, deleteBlock } = useProgramBuilder();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showSchemeSelect, setShowSchemeSelect] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(block.block_name || '');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Block',
      'Are you sure you want to delete this block and all its exercises?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteBlock(weekTempId, sessionTempId, block.tempId),
        },
      ]
    );
  };

  const handleSaveName = () => {
    updateBlock(weekTempId, sessionTempId, block.tempId, { 
      block_name: editName.trim() || null 
    });
    setIsEditingName(false);
  };

  const handleSchemeChange = (schemeType: SchemeType) => {
    updateBlock(weekTempId, sessionTempId, block.tempId, { scheme_type: schemeType });
    setShowSchemeSelect(false);
  };

  const selectedScheme = SCHEME_TYPE_OPTIONS.find(s => s.value === block.scheme_type);
  const schemeIcon = SCHEME_ICONS[block.scheme_type];

  const needsDuration = ['AMRAP', 'EMOM', 'TABATA'].includes(block.scheme_type);
  const needsRounds = block.scheme_type === 'RFT';

  return (
    <View style={styles.container}>
      {/* Block Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.blockIndex}>
            <Ionicons name={schemeIcon as any} size={16} color={theme.colors.primary} />
          </View>
          
          {isEditingName ? (
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
              placeholder={`Block ${index + 1}`}
              placeholderTextColor={theme.colors.secondaryText}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity
              style={styles.nameContainer}
              onPress={() => {
                setEditName(block.block_name || '');
                setIsEditingName(true);
              }}
            >
              <Text style={styles.blockName} numberOfLines={1}>
                {block.block_name || `Block ${index + 1}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerRight}>
          {/* Scheme Tag */}
          <TouchableOpacity
            style={styles.schemeTag}
            onPress={(e) => {
              e.stopPropagation();
              setShowSchemeSelect(true);
            }}
          >
            <Text style={styles.schemeTagText}>{selectedScheme?.label}</Text>
            <Ionicons name="chevron-down" size={12} color={theme.colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
          </TouchableOpacity>

          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.secondaryText}
          />
        </View>
      </TouchableOpacity>

      {/* Scheme Selector Dropdown */}
      {showSchemeSelect && (
        <>
          <TouchableOpacity
            style={styles.schemeOverlay}
            onPress={() => setShowSchemeSelect(false)}
          />
          <View style={styles.schemeDropdown}>
            {SCHEME_TYPE_OPTIONS.map((scheme) => (
              <TouchableOpacity
                key={scheme.value}
                style={[
                  styles.schemeOption,
                  block.scheme_type === scheme.value && styles.schemeOptionActive,
                ]}
                onPress={() => handleSchemeChange(scheme.value)}
              >
                <Ionicons
                  name={SCHEME_ICONS[scheme.value] as any}
                  size={18}
                  color={block.scheme_type === scheme.value ? theme.colors.primary : theme.colors.secondaryText}
                />
                <View style={styles.schemeOptionText}>
                  <Text style={[
                    styles.schemeOptionLabel,
                    block.scheme_type === scheme.value && styles.schemeOptionLabelActive,
                  ]}>
                    {scheme.label}
                  </Text>
                  <Text style={styles.schemeOptionDescription}>{scheme.description}</Text>
                </View>
                {block.scheme_type === scheme.value && (
                  <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Duration/Rounds Input */}
          {(needsDuration || needsRounds) && (
            <View style={styles.schemeSettings}>
              {needsDuration && (
                <View style={styles.schemeSettingItem}>
                  <Text style={styles.schemeSettingLabel}>Duration (min)</Text>
                  <TextInput
                    style={styles.schemeSettingInput}
                    value={block.duration_target ? String(block.duration_target / 60) : ''}
                    onChangeText={(text) => {
                      const mins = parseInt(text) || 0;
                      updateBlock(weekTempId, sessionTempId, block.tempId, {
                        duration_target: mins * 60,
                      });
                    }}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor={theme.colors.secondaryText}
                  />
                </View>
              )}
              {needsRounds && (
                <View style={styles.schemeSettingItem}>
                  <Text style={styles.schemeSettingLabel}>Rounds</Text>
                  <TextInput
                    style={styles.schemeSettingInput}
                    value={block.rounds_target ? String(block.rounds_target) : ''}
                    onChangeText={(text) => {
                      updateBlock(weekTempId, sessionTempId, block.tempId, {
                        rounds_target: parseInt(text) || null,
                      });
                    }}
                    keyboardType="numeric"
                    placeholder="3"
                    placeholderTextColor={theme.colors.secondaryText}
                  />
                </View>
              )}
            </View>
          )}

          {/* Block Notes*/}
          {(block.block_notes || isAddingNote) ? (
            <TextInput
              style={styles.notesInput}
              value={block.block_notes || ''}
              onChangeText={(text) =>
                updateBlock(weekTempId, sessionTempId, block.tempId, { block_notes: text || null })
              }
              placeholder="Add notes for this block..."
              placeholderTextColor={theme.colors.secondaryText}
              multiline
              autoFocus={isAddingNote}
              onBlur={() => {
                // If the user clears the notes and leaves, revert to the button
                if (!block.block_notes?.trim()) {
                  setIsAddingNote(false);
                }
              }}
            />
          ) : (
            <TouchableOpacity 
              style={styles.addNoteButton}
              onPress={() => setIsAddingNote(true)}
            >
              <Ionicons name="chatbox-outline" size={14} color={theme.colors.secondaryText} />
              <Text style={styles.addNoteText}>Click to add Note</Text>
            </TouchableOpacity>
          )}

          {/* Activities */}
          {block.activities.map((activity, activityIndex) => (
            <ActivityEditor
              key={activity.tempId}
              activity={activity}
              weekTempId={weekTempId}
              sessionTempId={sessionTempId}
              blockTempId={block.tempId}
              index={activityIndex}
            />
          ))}

          {/* Add Exercise Buttons */}
          <View style={styles.addExerciseRow}>
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={onAddExercise}
            >
              <Ionicons name="search-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.addExerciseText}>From Library</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={onAddManualExercise}
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.addExerciseText}>Custom</Text>
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
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      marginBottom: theme.spacing(3),
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing(3),
      backgroundColor: theme.colors.surface,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    blockIndex: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing(3),
    },
    nameContainer: {
      flex: 1,
    },
    blockName: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    nameInput: {
      flex: 1,
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primaryText,
      backgroundColor: theme.colors.background,
      borderRadius: 6,
      paddingHorizontal: theme.spacing(2),
      paddingVertical: theme.spacing(1),
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(2),
    },
    schemeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primarySoft,
      paddingVertical: theme.spacing(1),
      paddingHorizontal: theme.spacing(2),
      borderRadius: 6,
      gap: theme.spacing(1),
    },
    schemeTagText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    deleteButton: {
      padding: theme.spacing(1),
    },

    // Scheme Dropdown
    schemeOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99,
    },
    schemeDropdown: {
      position: 'absolute',
      right: theme.spacing(3),
      top: 50,
      width: 280,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 100,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    schemeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      gap: theme.spacing(3),
    },
    schemeOptionActive: {
      backgroundColor: theme.colors.primarySoft,
    },
    schemeOptionText: {
      flex: 1,
    },
    schemeOptionLabel: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '500',
      color: theme.colors.primaryText,
    },
    schemeOptionLabelActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    schemeOptionDescription: {
      fontSize: 11,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },

    // Content
    content: {
      paddingHorizontal: theme.spacing(3),
      paddingBottom: theme.spacing(3),
    },
    schemeSettings: {
      flexDirection: 'row',
      gap: theme.spacing(3),
      marginBottom: theme.spacing(3),
    },
    schemeSettingItem: {
      flex: 1,
    },
    schemeSettingLabel: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      marginBottom: theme.spacing(1),
    },
    schemeSettingInput: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      paddingHorizontal: theme.spacing(3),
      paddingVertical: theme.spacing(2),
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.primaryText,
      textAlign: 'center',
      fontWeight: '600',
    },
    notesInput: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      paddingHorizontal: theme.spacing(3),
      paddingVertical: theme.spacing(2),
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.primaryText,
      marginBottom: theme.spacing(3),
      minHeight: 40,
    },
    // New styles for the "Click to add" button
    addNoteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: theme.spacing(2),
      marginBottom: theme.spacing(3),
      paddingVertical: theme.spacing(1),
      paddingHorizontal: theme.spacing(1),
    },
    addNoteText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      fontStyle: 'italic',
    },

    // Add Exercise
    addExerciseRow: {
      flexDirection: 'row',
      gap: theme.spacing(2),
      marginTop: theme.spacing(2),
    },
    addExerciseButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing(2),
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      borderStyle: 'dashed',
      gap: theme.spacing(2),
    },
    addExerciseText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });

export default BlockEditor;
