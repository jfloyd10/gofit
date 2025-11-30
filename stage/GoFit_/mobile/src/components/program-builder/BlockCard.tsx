// src/components/program-builder/BlockCard.tsx

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
import { BuilderBlock, BuilderActivity, SCHEME_TYPE_OPTIONS, Exercise } from '../../lib/types/program';
import { ActivityCard } from './ActivityCard';

interface BlockCardProps {
  block: BuilderBlock;
  weekTempId: string;
  sessionTempId: string;
  onAddExercise: () => void;
}

const getSchemeIcon = (schemeType: string): string => {
  switch (schemeType) {
    case 'STANDARD':
      return 'list-outline';
    case 'CIRCUIT':
      return 'sync-outline';
    case 'INTERVAL':
      return 'timer-outline';
    case 'EMOM':
      return 'alarm-outline';
    case 'AMRAP':
      return 'infinite-outline';
    case 'RFT':
      return 'stopwatch-outline';
    case 'TABATA':
      return 'flash-outline';
    default:
      return 'list-outline';
  }
};

const getSchemeColor = (schemeType: string): string => {
  switch (schemeType) {
    case 'STANDARD':
      return '#0A84FF';
    case 'CIRCUIT':
      return '#FF9500';
    case 'INTERVAL':
      return '#FF3B30';
    case 'EMOM':
      return '#AF52DE';
    case 'AMRAP':
      return '#FF2D55';
    case 'RFT':
      return '#5856D6';
    case 'TABATA':
      return '#FF9500';
    default:
      return '#0A84FF';
  }
};

export const BlockCard: React.FC<BlockCardProps> = ({
  block,
  weekTempId,
  sessionTempId,
  onAddExercise,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { updateBlock, deleteBlock } = useProgramBuilder();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(block.block_name || '');
  const [showSchemeOptions, setShowSchemeOptions] = useState(false);

  const schemeInfo = SCHEME_TYPE_OPTIONS.find(s => s.value === block.scheme_type);
  const schemeColor = getSchemeColor(block.scheme_type);

  const handleSaveName = () => {
    updateBlock(weekTempId, sessionTempId, block.tempId, {
      block_name: editName.trim(),
    });
    setIsEditingName(false);
  };

  const handleSchemeChange = (schemeType: string) => {
    updateBlock(weekTempId, sessionTempId, block.tempId, {
      scheme_type: schemeType as any,
    });
    setShowSchemeOptions(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Block',
      `Are you sure you want to delete "${block.block_name || schemeInfo?.label || 'this block'}" and all its exercises?`,
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

  const totalSets = block.activities.reduce(
    (acc, activity) => acc + activity.prescriptions.length,
    0
  );

  return (
    <View style={styles.container}>
      {/* Block Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        {/* Scheme indicator */}
        <View style={[styles.schemeIndicator, { backgroundColor: schemeColor }]}>
          <Ionicons
            name={getSchemeIcon(block.scheme_type) as any}
            size={16}
            color="#FFFFFF"
          />
        </View>

        {/* Title area */}
        <View style={styles.titleArea}>
          {isEditingName ? (
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
              placeholder="Block name"
              placeholderTextColor={theme.colors.secondaryText}
              autoFocus
            />
          ) : (
            <TouchableOpacity
              onPress={() => {
                setEditName(block.block_name || '');
                setIsEditingName(true);
              }}
              style={styles.nameContainer}
            >
              <Text style={styles.blockName} numberOfLines={1}>
                {block.block_name || schemeInfo?.label || 'Block'}
              </Text>
              <Ionicons name="pencil" size={12} color={theme.colors.secondaryText} />
            </TouchableOpacity>
          )}

          {/* Scheme badge */}
          <TouchableOpacity
            style={[styles.schemeBadge, { backgroundColor: schemeColor + '20' }]}
            onPress={() => setShowSchemeOptions(!showSchemeOptions)}
          >
            <Text style={[styles.schemeBadgeText, { color: schemeColor }]}>
              {schemeInfo?.label}
            </Text>
            <Ionicons name="chevron-down" size={12} color={schemeColor} />
          </TouchableOpacity>
        </View>

        {/* Stats and actions */}
        <View style={styles.headerRight}>
          <View style={styles.stats}>
            <Text style={styles.statText}>
              {block.activities.length} ex · {totalSets} sets
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

      {/* Scheme Options Dropdown */}
      {showSchemeOptions && (
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
              <View style={[styles.schemeOptionIcon, { backgroundColor: getSchemeColor(scheme.value) }]}>
                <Ionicons
                  name={getSchemeIcon(scheme.value) as any}
                  size={14}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.schemeOptionInfo}>
                <Text style={styles.schemeOptionLabel}>{scheme.label}</Text>
                <Text style={styles.schemeOptionDesc}>{scheme.description}</Text>
              </View>
              {block.scheme_type === scheme.value && (
                <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Scheme-specific settings */}
      {isExpanded && (block.scheme_type === 'AMRAP' || block.scheme_type === 'EMOM') && (
        <View style={styles.schemeSettings}>
          <View style={styles.schemeSettingRow}>
            <Text style={styles.schemeSettingLabel}>
              Duration (minutes)
            </Text>
            <TextInput
              style={styles.schemeSettingInput}
              value={block.duration_target ? String(Math.floor(block.duration_target / 60)) : ''}
              onChangeText={(text) => {
                const mins = parseInt(text) || 0;
                updateBlock(weekTempId, sessionTempId, block.tempId, {
                  duration_target: mins * 60,
                });
              }}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor={theme.colors.secondaryText}
            />
          </View>
        </View>
      )}

      {isExpanded && block.scheme_type === 'RFT' && (
        <View style={styles.schemeSettings}>
          <View style={styles.schemeSettingRow}>
            <Text style={styles.schemeSettingLabel}>
              Target Rounds
            </Text>
            <TextInput
              style={styles.schemeSettingInput}
              value={block.rounds_target ? String(block.rounds_target) : ''}
              onChangeText={(text) => {
                const rounds = parseInt(text) || 0;
                updateBlock(weekTempId, sessionTempId, block.tempId, {
                  rounds_target: rounds,
                });
              }}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={theme.colors.secondaryText}
            />
          </View>
        </View>
      )}

      {/* Activities List */}
      {isExpanded && (
        <View style={styles.activitiesContainer}>
          {block.activities.map((activity, index) => (
            <ActivityCard
              key={activity.tempId}
              activity={activity}
              index={index}
              weekTempId={weekTempId}
              sessionTempId={sessionTempId}
              blockTempId={block.tempId}
            />
          ))}

          {/* Add Exercise Button */}
          <TouchableOpacity
            style={styles.addExerciseButton}
            onPress={onAddExercise}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color={theme.colors.primary} />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
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
      borderRadius: 12,
      marginBottom: theme.spacing(3),
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing(3),
    },
    schemeIndicator: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing(3),
    },
    titleArea: {
      flex: 1,
    },
    nameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(1),
    },
    blockName: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    nameInput: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primaryText,
      backgroundColor: theme.colors.background,
      borderRadius: 6,
      paddingHorizontal: theme.spacing(2),
      paddingVertical: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
    schemeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: theme.spacing(2),
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: theme.spacing(1),
      gap: 4,
    },
    schemeBadgeText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(2),
    },
    stats: {
      paddingHorizontal: theme.spacing(2),
    },
    statText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
    },
    deleteButton: {
      padding: theme.spacing(1),
    },

    // Scheme Dropdown
    schemeDropdown: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingVertical: theme.spacing(2),
    },
    schemeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
    },
    schemeOptionActive: {
      backgroundColor: theme.colors.primarySoft,
    },
    schemeOptionIcon: {
      width: 28,
      height: 28,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing(3),
    },
    schemeOptionInfo: {
      flex: 1,
    },
    schemeOptionLabel: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    schemeOptionDesc: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },

    // Scheme Settings
    schemeSettings: {
      paddingHorizontal: theme.spacing(3),
      paddingBottom: theme.spacing(3),
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing(3),
    },
    schemeSettingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    schemeSettingLabel: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.primaryText,
    },
    schemeSettingInput: {
      width: 80,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      paddingHorizontal: theme.spacing(3),
      paddingVertical: theme.spacing(2),
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.primaryText,
      textAlign: 'center',
    },

    // Activities
    activitiesContainer: {
      paddingHorizontal: theme.spacing(3),
      paddingBottom: theme.spacing(3),
    },
    addExerciseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing(3),
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      borderStyle: 'dashed',
      gap: theme.spacing(2),
      marginTop: theme.spacing(2),
    },
    addExerciseText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });

export default BlockCard;
