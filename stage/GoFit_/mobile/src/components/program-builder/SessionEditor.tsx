// src/components/program-builder/SessionEditor.tsx

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme';
import { useProgramBuilder } from '../../providers/ProgramBuilderProvider';
import {
  BuilderSession,
  BuilderBlock,
  BuilderActivity,
  DAYS_OF_WEEK,
  SESSION_FOCUS_OPTIONS,
  Exercise,
} from '../../lib/types/program';
import { BlockEditor } from './BlockEditor';
import { ExerciseLibrary } from './ExerciseLibrary';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SessionEditorProps {
  visible: boolean;
  session: BuilderSession | null;
  weekTempId: string;
  onClose: () => void;
}

const FOCUS_COLORS: Record<string, string> = {
  'Lift': '#0A84FF',
  'Cardio': '#FF3B30',
  'Stretch': '#34C759',
};

export const SessionEditor: React.FC<SessionEditorProps> = ({
  visible,
  session,
  weekTempId,
  onClose,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { updateSession, addBlock, addActivityFromExercise, addManualActivity } = useProgramBuilder();

  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [targetBlockTempId, setTargetBlockTempId] = useState<string | null>(null);

  const slideAnim = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleAddExercise = useCallback((blockTempId: string) => {
    setTargetBlockTempId(blockTempId);
    setShowExerciseLibrary(true);
  }, []);

  const handleAddManualExercise = useCallback((blockTempId: string) => {
    if (!session) return;
    addManualActivity(weekTempId, session.tempId, blockTempId);
  }, [weekTempId, session?.tempId]);

  const handleExerciseSelect = useCallback((exercise: Exercise) => {
    if (!session || !targetBlockTempId) return;
    addActivityFromExercise(weekTempId, session.tempId, targetBlockTempId, exercise);
    setShowExerciseLibrary(false);
    setTargetBlockTempId(null);
  }, [weekTempId, session?.tempId, targetBlockTempId]);

  if (!session) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.primaryText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Session</Text>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Session Title */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Session Title</Text>
              <TextInput
                style={styles.titleInput}
                value={session.title}
                onChangeText={(text) => 
                  updateSession(weekTempId, session.tempId, { title: text })
                }
                placeholder="e.g., Upper Body Strength"
                placeholderTextColor={theme.colors.secondaryText}
              />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Description (optional)</Text>
              <TextInput
                style={styles.descriptionInput}
                value={session.description}
                onChangeText={(text) => 
                  updateSession(weekTempId, session.tempId, { description: text })
                }
                placeholder="Add a brief description..."
                placeholderTextColor={theme.colors.secondaryText}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Day & Focus Row */}
            <View style={styles.rowSection}>
              {/* Day Selection */}
              <View style={[styles.section, { flex: 1, marginRight: theme.spacing(2) }]}>
                <Text style={styles.sectionLabel}>Day</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.dayScroll}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayChip,
                        session.day_of_week === day.value && styles.dayChipActive,
                      ]}
                      onPress={() => 
                        updateSession(weekTempId, session.tempId, { day_of_week: day.value })
                      }
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          session.day_of_week === day.value && styles.dayChipTextActive,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Focus Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Focus</Text>
              <View style={styles.focusRow}>
                {SESSION_FOCUS_OPTIONS.map((focus) => {
                  const isSelected = session.focus === focus.value;
                  const color = FOCUS_COLORS[focus.value] || theme.colors.primary;
                  return (
                    <TouchableOpacity
                      key={focus.value}
                      style={[
                        styles.focusChip,
                        isSelected && { backgroundColor: color, borderColor: color },
                      ]}
                      onPress={() => 
                        updateSession(weekTempId, session.tempId, { focus: focus.value as any })
                      }
                    >
                      <Text
                        style={[
                          styles.focusChipText,
                          isSelected && { color: theme.colors.surface },
                        ]}
                      >
                        {focus.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Blocks Section */}
            <View style={styles.blocksSection}>
              <View style={styles.blocksSectionHeader}>
                <Text style={styles.blocksSectionTitle}>Workout Blocks</Text>
                <TouchableOpacity
                  style={styles.addBlockButton}
                  onPress={() => addBlock(weekTempId, session.tempId)}
                >
                  <Ionicons name="add" size={18} color={theme.colors.primary} />
                  <Text style={styles.addBlockButtonText}>Add Block</Text>
                </TouchableOpacity>
              </View>

              {session.blocks.length === 0 ? (
                <View style={styles.emptyBlocks}>
                  <Ionicons name="layers-outline" size={48} color={theme.colors.border} />
                  <Text style={styles.emptyBlocksTitle}>No blocks yet</Text>
                  <Text style={styles.emptyBlocksSubtitle}>
                    Add a block to organize your exercises
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyAddButton}
                    onPress={() => addBlock(weekTempId, session.tempId)}
                  >
                    <Ionicons name="add-circle" size={20} color={theme.colors.surface} />
                    <Text style={styles.emptyAddButtonText}>Add Your First Block</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                session.blocks.map((block, index) => (
                  <BlockEditor
                    key={block.tempId}
                    block={block}
                    weekTempId={weekTempId}
                    sessionTempId={session.tempId}
                    index={index}
                    onAddExercise={() => handleAddExercise(block.tempId)}
                    onAddManualExercise={() => handleAddManualExercise(block.tempId)}
                  />
                ))
              )}
            </View>

            {/* Bottom Padding */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>
      </View>

      {/* Exercise Library Modal */}
      <ExerciseLibrary
        visible={showExerciseLibrary}
        onClose={() => {
          setShowExerciseLibrary(false);
          setTargetBlockTempId(null);
        }}
        onSelectExercise={handleExerciseSelect}
      />
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      marginTop: 50,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing(4),
      paddingVertical: theme.spacing(3),
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    closeButton: {
      padding: theme.spacing(1),
    },
    headerTitle: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    doneButton: {
      paddingVertical: theme.spacing(1),
      paddingHorizontal: theme.spacing(3),
    },
    doneButtonText: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primary,
    },

    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing(4),
    },

    section: {
      marginBottom: theme.spacing(4),
    },
    rowSection: {
      flexDirection: 'row',
      marginBottom: theme.spacing(4),
    },
    sectionLabel: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
      color: theme.colors.secondaryText,
      marginBottom: theme.spacing(2),
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    titleInput: {
      fontSize: theme.typography.fontSizeLg,
      fontWeight: '600',
      color: theme.colors.primaryText,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingHorizontal: theme.spacing(4),
      paddingVertical: theme.spacing(3),
    },
    descriptionInput: {
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.primaryText,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingHorizontal: theme.spacing(4),
      paddingVertical: theme.spacing(3),
      minHeight: 80,
    },
    dayScroll: {
      marginHorizontal: -theme.spacing(4),
      paddingHorizontal: theme.spacing(4),
    },
    dayChip: {
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      marginRight: theme.spacing(2),
    },
    dayChipActive: {
      backgroundColor: theme.colors.primary,
    },
    dayChipText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '500',
      color: theme.colors.secondaryText,
    },
    dayChipTextActive: {
      color: theme.colors.surface,
    },
    focusRow: {
      flexDirection: 'row',
      gap: theme.spacing(2),
    },
    focusChip: {
      flex: 1,
      paddingVertical: theme.spacing(3),
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    focusChipText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.secondaryText,
    },

    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing(4),
    },

    blocksSection: {},
    blocksSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing(3),
    },
    blocksSectionTitle: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    addBlockButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing(1),
      paddingHorizontal: theme.spacing(2),
      gap: theme.spacing(1),
    },
    addBlockButtonText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primary,
    },

    emptyBlocks: {
      alignItems: 'center',
      paddingVertical: theme.spacing(8),
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
    },
    emptyBlocksTitle: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginTop: theme.spacing(3),
    },
    emptyBlocksSubtitle: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.secondaryText,
      marginTop: theme.spacing(1),
    },
    emptyAddButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(4),
      borderRadius: 10,
      marginTop: theme.spacing(4),
      gap: theme.spacing(2),
    },
    emptyAddButtonText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.surface,
    },

    bottomPadding: {
      height: theme.spacing(10),
    },
  });

export default SessionEditor;
