// src/components/program-builder/ProgramHeader.tsx

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme';
import { useProgramBuilder } from '../../providers/ProgramBuilderProvider';
import {
  PROGRAM_FOCUS_OPTIONS,
  DIFFICULTY_OPTIONS,
  ProgramFocus,
  ProgramDifficulty,
} from '../../lib/types/program';

/**
 * Step 1 Content: The Form for editing metadata
 */
export const ProgramMetadataForm: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { program, updateProgramInfo } = useProgramBuilder();

  return (
    <View style={styles.formContainer}>
      {/* Title Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Program Title</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="e.g., 12-Week Strength Builder"
          placeholderTextColor={theme.colors.secondaryText}
          value={program.title}
          onChangeText={(text) => updateProgramInfo({ title: text })}
        />
      </View>

      {/* Description Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe your program..."
          placeholderTextColor={theme.colors.secondaryText}
          value={program.description}
          onChangeText={(text) => updateProgramInfo({ description: text })}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Focus Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Focus</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.optionsScroll}
          contentContainerStyle={{ paddingRight: theme.spacing(4) }}
        >
          {PROGRAM_FOCUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionChip,
                program.focus === option.value && styles.optionChipActive,
              ]}
              onPress={() => updateProgramInfo({ focus: option.value })}
            >
              <Text
                style={[
                  styles.optionChipText,
                  program.focus === option.value && styles.optionChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Difficulty Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Difficulty</Text>
        <View style={styles.difficultyRow}>
          {DIFFICULTY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.difficultyChip,
                program.difficulty === option.value && {
                  backgroundColor: option.color,
                  borderColor: option.color,
                },
              ]}
              onPress={() => updateProgramInfo({ difficulty: option.value })}
            >
              <Text
                style={[
                  styles.difficultyChipText,
                  program.difficulty === option.value && styles.difficultyChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Visibility Toggle */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Ionicons
            name={program.is_public ? 'globe-outline' : 'lock-closed-outline'}
            size={20}
            color={theme.colors.primaryText}
          />
          <View style={styles.toggleTextContainer}>
            <Text style={styles.toggleTitle}>
              {program.is_public ? 'Public Program' : 'Private Program'}
            </Text>
            <Text style={styles.toggleDescription}>
              {program.is_public
                ? 'Anyone can discover and use this program'
                : 'Only you can see and use this program'
              }
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.toggleSwitch,
            program.is_public && styles.toggleSwitchActive,
          ]}
          onPress={() => updateProgramInfo({ is_public: !program.is_public })}
        >
          <View
            style={[
              styles.toggleKnob,
              program.is_public && styles.toggleKnobActive,
            ]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Step 2 Header: Static summary view
 */
export const ProgramSummaryHeader: React.FC<{ onEditPress?: () => void }> = ({ onEditPress }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { program } = useProgramBuilder();

  const selectedDifficulty = DIFFICULTY_OPTIONS.find(d => d.value === program.difficulty);

  return (
    <View style={styles.summaryContainer}>
      <View style={styles.titleSection}>
        <Text style={styles.programTitle} numberOfLines={1}>
          {program.title || 'Untitled Program'}
        </Text>
        <View style={styles.metaTags}>
          <View style={[styles.metaTag, { backgroundColor: theme.colors.primarySoft }]}>
            <Text style={[styles.metaTagText, { color: theme.colors.primary }]}>
              {program.focus}
            </Text>
          </View>
          <View style={[styles.metaTag, { backgroundColor: selectedDifficulty?.color + '20' }]}>
            <Text style={[styles.metaTagText, { color: selectedDifficulty?.color }]}>
              {program.difficulty}
            </Text>
          </View>
        </View>
      </View>
      {onEditPress && (
        <TouchableOpacity onPress={onEditPress} style={styles.editButton}>
          <Ionicons name="pencil" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Deprecated: Kept only if needed for backward compatibility in other screens, 
// though we are refactoring the main usage.
export const ProgramHeader: React.FC<{ isExpanded: boolean; onToggleExpand: () => void }> = ({
  isExpanded,
  onToggleExpand,
}) => {
  // Wrapper that mimics old behavior if necessary
  return isExpanded ? <ProgramMetadataForm /> : <ProgramSummaryHeader />;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Form Container
    formContainer: {
      padding: theme.spacing(4),
    },
    
    // Summary Container
    summaryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing(4),
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    editButton: {
      padding: theme.spacing(2),
      backgroundColor: theme.colors.background,
      borderRadius: 8,
    },

    // Shared Styles
    titleSection: {
      flex: 1,
      marginRight: theme.spacing(3),
    },
    programTitle: {
      fontSize: theme.typography.fontSizeLg,
      fontWeight: '700',
      color: theme.colors.primaryText,
      marginBottom: theme.spacing(1),
    },
    metaTags: {
      flexDirection: 'row',
      gap: theme.spacing(2),
    },
    metaTag: {
      paddingVertical: theme.spacing(0.5),
      paddingHorizontal: theme.spacing(2),
      borderRadius: 6,
    },
    metaTagText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '500',
    },

    // Inputs
    inputGroup: {
      marginBottom: theme.spacing(5),
    },
    inputLabel: {
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
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    descriptionInput: {
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.primaryText,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingHorizontal: theme.spacing(4),
      paddingVertical: theme.spacing(3),
      minHeight: 100,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    // Options
    optionsScroll: {
      marginHorizontal: -theme.spacing(4),
      paddingHorizontal: theme.spacing(4),
    },
    optionChip: {
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(4),
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      marginRight: theme.spacing(2),
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    optionChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    optionChipText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '500',
      color: theme.colors.secondaryText,
    },
    optionChipTextActive: {
      color: theme.colors.surface,
    },

    // Difficulty
    difficultyRow: {
      flexDirection: 'row',
      gap: theme.spacing(2),
    },
    difficultyChip: {
      flex: 1,
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    difficultyChipText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.secondaryText,
    },
    difficultyChipTextActive: {
      color: theme.colors.surface,
    },

    // Toggle
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: theme.spacing(3),
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    toggleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    toggleTextContainer: {
      marginLeft: theme.spacing(3),
      flex: 1,
    },
    toggleTitle: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    toggleDescription: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },
    toggleSwitch: {
      width: 50,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.border,
      padding: 2,
      justifyContent: 'center',
    },
    toggleSwitchActive: {
      backgroundColor: theme.colors.primary,
    },
    toggleKnob: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.surface,
    },
    toggleKnobActive: {
      alignSelf: 'flex-end',
    },
  });