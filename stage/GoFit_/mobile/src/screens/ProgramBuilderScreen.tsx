// src/screens/ProgramBuilderScreen.tsx

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import { Screen } from '../components/ui/Screen';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useAuth } from '../providers/AuthProvider';
import { ProgramBuilderProvider, useProgramBuilder } from '../providers/ProgramBuilderProvider';
import { ProgramHeader } from '../components/program-builder/ProgramHeader';
import { WeekCard } from '../components/program-builder/WeekCard';
import { SessionEditor } from '../components/program-builder/SessionEditor';
import { BuilderSession } from '../lib/types/program';
import { programsApi } from '../lib/api/programs';

interface ProgramBuilderScreenProps {
  programId?: number;
  onBack?: () => void;
  onSaveSuccess?: (programId: number) => void;
}

const ProgramBuilderContent: React.FC<ProgramBuilderScreenProps> = ({
  programId,
  onBack,
  onSaveSuccess,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { accessToken } = useAuth();
  const { program, addWeek, isValid, validationErrors } = useProgramBuilder();

  const [headerExpanded, setHeaderExpanded] = useState(true);
  const [selectedSession, setSelectedSession] = useState<{
    session: BuilderSession;
    weekTempId: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSessionPress = useCallback((session: BuilderSession, weekTempId: string) => {
    setSelectedSession({ session, weekTempId });
  }, []);

  const handleCloseSessionEditor = useCallback(() => {
    setSelectedSession(null);
  }, []);

  const handleSave = async () => {
    if (!accessToken) {
      Alert.alert('Error', 'You must be logged in to save a program.');
      return;
    }

    if (!isValid) {
      Alert.alert(
        'Validation Error',
        validationErrors.join('\n'),
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSaving(true);
    try {
      const savedProgram = await programsApi.saveFullProgram(program, accessToken);
      Alert.alert('Success', 'Your program has been saved!', [
        { 
          text: 'OK', 
          onPress: () => onSaveSuccess?.(savedProgram.id) 
        },
      ]);
    } catch (error) {
      console.error('Failed to save program:', error);
      Alert.alert('Error', 'Failed to save program. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard all changes? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onBack },
      ]
    );
  };

  const totalSessions = program.weeks.reduce((acc, week) => acc + week.sessions.length, 0);
  const totalExercises = program.weeks.reduce(
    (acc, week) => acc + week.sessions.reduce(
      (sAcc, session) => sAcc + session.blocks.reduce(
        (bAcc, block) => bAcc + block.activities.length, 0
      ), 0
    ), 0
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleDiscard}>
          <Ionicons name="close" size={24} color={theme.colors.primaryText} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {programId ? 'Edit Program' : 'New Program'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving || !isValid}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={[
              styles.saveButtonText,
              !isValid && styles.saveButtonTextDisabled,
            ]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Program Header */}
        <ProgramHeader
          isExpanded={headerExpanded}
          onToggleExpand={() => setHeaderExpanded(!headerExpanded)}
        />

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{program.weeks.length}</Text>
            <Text style={styles.statLabel}>Weeks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalExercises}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
        </View>

        {/* Weeks Section */}
        <View style={styles.weeksSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Program Structure</Text>
          </View>

          {program.weeks.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.border} />
              </View>
              <Text style={styles.emptyTitle}>No weeks added yet</Text>
              <Text style={styles.emptySubtitle}>
                Start building your program by adding your first week
              </Text>
              <TouchableOpacity style={styles.emptyAddButton} onPress={addWeek}>
                <Ionicons name="add-circle" size={20} color={theme.colors.surface} />
                <Text style={styles.emptyAddButtonText}>Add First Week</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {program.weeks.map((week) => (
                <WeekCard
                  key={week.tempId}
                  week={week}
                  onSessionPress={(session) => handleSessionPress(session, week.tempId)}
                />
              ))}
              
              <TouchableOpacity style={styles.addWeekButton} onPress={addWeek}>
                <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.addWeekText}>Add Week</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <View style={styles.validationContainer}>
            <View style={styles.validationHeader}>
              <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
              <Text style={styles.validationTitle}>To Complete</Text>
            </View>
            {validationErrors.map((error, index) => (
              <Text key={index} style={styles.validationError}>• {error}</Text>
            ))}
          </View>
        )}

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Fixed Bottom Actions */}
      <View style={styles.bottomActions}>
        <PrimaryButton
          title={isSaving ? 'Saving...' : 'Save Program'}
          onPress={handleSave}
          loading={isSaving}
          disabled={!isValid}
          style={styles.saveFullButton}
        />
      </View>

      {/* Session Editor Modal */}
      {selectedSession && (
        <SessionEditor
          visible={!!selectedSession}
          session={program.weeks
            .find(w => w.tempId === selectedSession.weekTempId)
            ?.sessions.find(s => s.tempId === selectedSession.session.tempId) || null}
          weekTempId={selectedSession.weekTempId}
          onClose={handleCloseSessionEditor}
        />
      )}
    </View>
  );
};

// Main export with Provider wrapper
export const ProgramBuilderScreen: React.FC<ProgramBuilderScreenProps> = (props) => {
  return (
    <ProgramBuilderProvider>
      <ProgramBuilderContent {...props} />
    </ProgramBuilderProvider>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing(4),
      paddingVertical: theme.spacing(3),
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: theme.spacing(1),
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    saveButton: {
      paddingVertical: theme.spacing(1),
      paddingHorizontal: theme.spacing(2),
    },
    saveButtonText: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    saveButtonTextDisabled: {
      color: theme.colors.secondaryText,
    },

    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing(4),
    },

    // Stats Bar
    statsBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: theme.spacing(3),
      marginBottom: theme.spacing(4),
      alignItems: 'center',
      justifyContent: 'space-around',
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
      height: 30,
      backgroundColor: theme.colors.border,
    },

    // Weeks Section
    weeksSection: {
      marginBottom: theme.spacing(4),
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing(3),
    },
    sectionTitle: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },

    // Empty State
    emptyState: {
      alignItems: 'center',
      paddingVertical: theme.spacing(10),
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
    },
    emptyIcon: {
      marginBottom: theme.spacing(3),
    },
    emptyTitle: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: theme.spacing(1),
    },
    emptySubtitle: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      paddingHorizontal: theme.spacing(6),
      marginBottom: theme.spacing(4),
    },
    emptyAddButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(4),
      borderRadius: 10,
      gap: theme.spacing(2),
    },
    emptyAddButtonText: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.surface,
    },

    // Add Week Button
    addWeekButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing(4),
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderStyle: 'dashed',
      gap: theme.spacing(2),
    },
    addWeekText: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.primary,
    },

    // Validation
    validationContainer: {
      backgroundColor: theme.colors.errorSoft,
      borderRadius: 12,
      padding: theme.spacing(3),
      marginBottom: theme.spacing(4),
    },
    validationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(2),
      marginBottom: theme.spacing(2),
    },
    validationTitle: {
      fontSize: theme.typography.fontSizeSm,
      fontWeight: '600',
      color: theme.colors.error,
    },
    validationError: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.error,
      marginLeft: theme.spacing(5),
      marginBottom: theme.spacing(1),
    },

    // Bottom Actions
    bottomActions: {
      padding: theme.spacing(4),
      paddingBottom: theme.spacing(6),
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    saveFullButton: {
      // uses default PrimaryButton styles
    },

    bottomPadding: {
      height: theme.spacing(20),
    },
  });

export default ProgramBuilderScreen;
