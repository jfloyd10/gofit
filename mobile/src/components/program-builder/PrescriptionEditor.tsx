// src/components/program-builder/PrescriptionEditor.tsx

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme';
import { useProgramBuilder } from '../../providers/ProgramBuilderProvider';
import {
  BuilderPrescription,
  SET_TAG_OPTIONS,
  PRIMARY_METRIC_OPTIONS,
  INTENSITY_TYPE_OPTIONS,
} from '../../lib/types/program';

interface PrescriptionEditorProps {
  prescription: BuilderPrescription;
  weekTempId: string;
  sessionTempId: string;
  blockTempId: string;
  activityTempId: string;
  index: number;
}

export const PrescriptionEditor: React.FC<PrescriptionEditorProps> = ({
  prescription,
  weekTempId,
  sessionTempId,
  blockTempId,
  activityTempId,
  index,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { updatePrescription, deletePrescription, duplicatePrescription } = useProgramBuilder();

  const [showDetailModal, setShowDetailModal] = useState(false);

  const selectedTag = SET_TAG_OPTIONS.find(t => t.value === prescription.set_tag);

  const handleUpdate = (updates: Partial<BuilderPrescription>) => {
    updatePrescription(
      weekTempId,
      sessionTempId,
      blockTempId,
      activityTempId,
      prescription.tempId,
      updates
    );
  };

  const handleDelete = () => {
    deletePrescription(weekTempId, sessionTempId, blockTempId, activityTempId, prescription.tempId);
  };

  const handleDuplicate = () => {
    duplicatePrescription(weekTempId, sessionTempId, blockTempId, activityTempId, prescription.tempId);
  };

  const getTargetDisplay = () => {
    const parts: string[] = [];
    
    switch (prescription.primary_metric) {
      case 'reps':
        if (prescription.reps) parts.push(`${prescription.reps} reps`);
        if (prescription.weight) {
          parts.push(`@ ${prescription.weight}kg${prescription.is_per_side ? '/side' : ''}`);
        }
        if (prescription.intensity_value && prescription.intensity_type) {
          parts.push(`(${prescription.intensity_value} ${prescription.intensity_type})`);
        }
        break;
      case 'time':
        if (prescription.duration_seconds) {
          const mins = Math.floor(prescription.duration_seconds / 60);
          const secs = prescription.duration_seconds % 60;
          parts.push(mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`);
        }
        break;
      case 'distance':
        if (prescription.distance) parts.push(`${prescription.distance}m`);
        break;
      case 'calories':
        if (prescription.calories) parts.push(`${prescription.calories} cal`);
        break;
      default:
        parts.push('Tap to configure');
    }
    
    return parts.join(' ') || 'Tap to configure';
  };

  const getRestDisplay = () => {
    if (!prescription.rest_seconds) return '-';
    if (prescription.rest_seconds >= 60) {
      const mins = Math.floor(prescription.rest_seconds / 60);
      const secs = prescription.rest_seconds % 60;
      return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}m`;
    }
    return `${prescription.rest_seconds}s`;
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShowDetailModal(true)}
        activeOpacity={0.7}
      >
        {/* Set Number & Tag */}
        <View style={styles.setColumn}>
          <View style={[styles.setTag, { backgroundColor: selectedTag?.color + '20' }]}>
            <Text style={[styles.setNumber, { color: selectedTag?.color }]}>
              {prescription.set_number}
            </Text>
          </View>
        </View>

        {/* Target */}
        <View style={styles.targetColumn}>
          <Text style={styles.targetText} numberOfLines={1}>
            {getTargetDisplay()}
          </Text>
        </View>

        {/* Rest */}
        <View style={styles.restColumn}>
          <Text style={styles.restText}>{getRestDisplay()}</Text>
        </View>

        {/* Copy Button (Added) */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDuplicate();
          }}
        >
          <Ionicons name="copy-outline" size={16} color={theme.colors.secondaryText} />
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
        >
          <Ionicons name="close" size={16} color={theme.colors.secondaryText} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDetailModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set {prescription.set_number}</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.primaryText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Set Tag */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Set Type</Text>
                <View style={styles.tagRow}>
                  {SET_TAG_OPTIONS.map((tag) => (
                    <TouchableOpacity
                      key={tag.value}
                      style={[
                        styles.tagChip,
                        prescription.set_tag === tag.value && {
                          backgroundColor: tag.color,
                          borderColor: tag.color,
                        },
                      ]}
                      onPress={() => handleUpdate({ set_tag: tag.value as any })}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          prescription.set_tag === tag.value && { color: '#fff' },
                        ]}
                      >
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Primary Metric */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Metric Type</Text>
                <View style={styles.metricRow}>
                  {PRIMARY_METRIC_OPTIONS.slice(0, 5).map((metric) => (
                    <TouchableOpacity
                      key={metric.value}
                      style={[
                        styles.metricChip,
                        prescription.primary_metric === metric.value && styles.metricChipActive,
                      ]}
                      onPress={() => handleUpdate({ primary_metric: metric.value as any })}
                    >
                      <Text
                        style={[
                          styles.metricChipText,
                          prescription.primary_metric === metric.value && styles.metricChipTextActive,
                        ]}
                      >
                        {metric.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Reps-based inputs */}
              {prescription.primary_metric === 'reps' && (
                <>
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Reps</Text>
                      <TextInput
                        style={styles.input}
                        value={prescription.reps || ''}
                        onChangeText={(text) => handleUpdate({ reps: text })}
                        placeholder="8-12"
                        placeholderTextColor={theme.colors.secondaryText}
                        keyboardType="default"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Weight (kg)</Text>
                      <TextInput
                        style={styles.input}
                        value={prescription.weight ? String(prescription.weight) : ''}
                        onChangeText={(text) => handleUpdate({ weight: parseFloat(text) || null })}
                        placeholder="0"
                        placeholderTextColor={theme.colors.secondaryText}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => handleUpdate({ is_per_side: !prescription.is_per_side })}
                  >
                    <View style={[styles.checkbox, prescription.is_per_side && styles.checkboxChecked]}>
                      {prescription.is_per_side && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>Weight per side</Text>
                  </TouchableOpacity>

                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Tempo</Text>
                      <TextInput
                        style={styles.input}
                        value={prescription.tempo || ''}
                        onChangeText={(text) => handleUpdate({ tempo: text })}
                        placeholder="3-1-2-0"
                        placeholderTextColor={theme.colors.secondaryText}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Time-based inputs */}
              {prescription.primary_metric === 'time' && (
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Duration (seconds)</Text>
                    <TextInput
                      style={styles.input}
                      value={prescription.duration_seconds ? String(prescription.duration_seconds) : ''}
                      onChangeText={(text) => handleUpdate({ duration_seconds: parseInt(text) || null })}
                      placeholder="60"
                      placeholderTextColor={theme.colors.secondaryText}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              {/* Distance-based inputs */}
              {prescription.primary_metric === 'distance' && (
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Distance (meters)</Text>
                    <TextInput
                      style={styles.input}
                      value={prescription.distance ? String(prescription.distance) : ''}
                      onChangeText={(text) => handleUpdate({ distance: parseFloat(text) || null })}
                      placeholder="400"
                      placeholderTextColor={theme.colors.secondaryText}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              )}

              {/* Calories-based inputs */}
              {prescription.primary_metric === 'calories' && (
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Target Calories</Text>
                    <TextInput
                      style={styles.input}
                      value={prescription.calories ? String(prescription.calories) : ''}
                      onChangeText={(text) => handleUpdate({ calories: parseInt(text) || null })}
                      placeholder="20"
                      placeholderTextColor={theme.colors.secondaryText}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              {/* Intensity */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Intensity (optional)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.intensityRow}>
                        {INTENSITY_TYPE_OPTIONS.map((intensity) => (
                          <TouchableOpacity
                            key={intensity.value}
                            style={[
                              styles.intensityChip,
                              prescription.intensity_type === intensity.value && styles.intensityChipActive,
                            ]}
                            onPress={() => handleUpdate({
                              intensity_type: prescription.intensity_type === intensity.value ? null : intensity.value,
                            })}
                          >
                            <Text
                              style={[
                                styles.intensityChipText,
                                prescription.intensity_type === intensity.value && styles.intensityChipTextActive,
                              ]}
                            >
                              {intensity.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>
                {prescription.intensity_type && (
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Value</Text>
                      <TextInput
                        style={styles.input}
                        value={prescription.intensity_value || ''}
                        onChangeText={(text) => handleUpdate({ intensity_value: text })}
                        placeholder={prescription.intensity_type === 'rpe' ? '7' : '75%'}
                        placeholderTextColor={theme.colors.secondaryText}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Rest */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Rest</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Rest (seconds)</Text>
                    <TextInput
                      style={styles.input}
                      value={prescription.rest_seconds ? String(prescription.rest_seconds) : ''}
                      onChangeText={(text) => handleUpdate({ rest_seconds: parseInt(text) || null })}
                      placeholder="60"
                      placeholderTextColor={theme.colors.secondaryText}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.restPresets}>
                  {[30, 45, 60, 90, 120, 180].map((seconds) => (
                    <TouchableOpacity
                      key={seconds}
                      style={[
                        styles.restPreset,
                        prescription.rest_seconds === seconds && styles.restPresetActive,
                      ]}
                      onPress={() => handleUpdate({ rest_seconds: seconds })}
                    >
                      <Text
                        style={[
                          styles.restPresetText,
                          prescription.rest_seconds === seconds && styles.restPresetTextActive,
                        ]}
                      >
                        {seconds >= 60 ? `${seconds / 60}m` : `${seconds}s`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={prescription.prescription_notes || ''}
                  onChangeText={(text) => handleUpdate({ prescription_notes: text })}
                  placeholder="Add notes for this set..."
                  placeholderTextColor={theme.colors.secondaryText}
                  multiline
                />
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.duplicateButton} onPress={handleDuplicate}>
                  <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.duplicateButtonText}>Duplicate Set</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    setColumn: {
      width: 50,
    },
    setTag: {
      width: 28,
      height: 28,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    setNumber: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '700',
    },
    targetColumn: {
      flex: 1,
      paddingHorizontal: theme.spacing(2),
    },
    targetText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.primaryText,
    },
    restColumn: {
      width: 60,
    },
    restText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      textAlign: 'center',
    },
    
    // Updated Action Button Style
    actionButton: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '85%',
      paddingBottom: theme.spacing(4),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing(4),
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: theme.typography.fontSizeLg,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    modalSection: {
      paddingHorizontal: theme.spacing(4),
      paddingTop: theme.spacing(4),
    },
    modalSectionLabel: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
      color: theme.colors.secondaryText,
      marginBottom: theme.spacing(2),
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    // Tags
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing(2),
    },
    tagChip: {
      paddingVertical: theme.spacing(1.5),
      paddingHorizontal: theme.spacing(3),
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    tagChipText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
      color: theme.colors.secondaryText,
    },

    // Metrics
    metricRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing(2),
    },
    metricChip: {
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      borderRadius: 8,
      backgroundColor: theme.colors.background,
    },
    metricChipActive: {
      backgroundColor: theme.colors.primary,
    },
    metricChipText: {
      fontSize: theme.typography.fontSizeXs,
      fontWeight: '600',
      color: theme.colors.secondaryText,
    },
    metricChipTextActive: {
      color: theme.colors.surface,
    },

    // Inputs
    inputRow: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing(4),
      paddingTop: theme.spacing(3),
      gap: theme.spacing(3),
    },
    inputGroup: {
      flex: 1,
    },
    inputLabel: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      marginBottom: theme.spacing(1),
    },
    input: {
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      paddingHorizontal: theme.spacing(3),
      paddingVertical: theme.spacing(2),
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.primaryText,
    },

    // Checkbox
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing(4),
      paddingTop: theme.spacing(2),
      gap: theme.spacing(2),
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxLabel: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.primaryText,
    },

    // Intensity
    intensityRow: {
      flexDirection: 'row',
      gap: theme.spacing(2),
    },
    intensityChip: {
      paddingVertical: theme.spacing(1.5),
      paddingHorizontal: theme.spacing(3),
      borderRadius: 6,
      backgroundColor: theme.colors.background,
    },
    intensityChipActive: {
      backgroundColor: theme.colors.primarySoft,
    },
    intensityChipText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
    },
    intensityChipTextActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },

    // Rest presets
    restPresets: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing(2),
      marginTop: theme.spacing(2),
    },
    restPreset: {
      paddingVertical: theme.spacing(1.5),
      paddingHorizontal: theme.spacing(3),
      borderRadius: 6,
      backgroundColor: theme.colors.background,
    },
    restPresetActive: {
      backgroundColor: theme.colors.primary,
    },
    restPresetText: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
    },
    restPresetTextActive: {
      color: theme.colors.surface,
      fontWeight: '600',
    },

    // Notes
    notesInput: {
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      paddingHorizontal: theme.spacing(3),
      paddingVertical: theme.spacing(2),
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.primaryText,
      minHeight: 60,
    },

    // Actions
    modalActions: {
      paddingHorizontal: theme.spacing(4),
      paddingTop: theme.spacing(4),
    },
    duplicateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing(2),
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      gap: theme.spacing(2),
    },
    duplicateButtonText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });

export default PrescriptionEditor;