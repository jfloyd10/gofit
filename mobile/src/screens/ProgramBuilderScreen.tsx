// src/screens/ProgramBuilderScreen.tsx

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useAuth } from '../providers/AuthProvider';
import { ProgramBuilderProvider, useProgramBuilder } from '../providers/ProgramBuilderProvider';
import { ProgramMetadataForm, ProgramSummaryHeader } from '../components/program-builder/ProgramHeader';
import { WeekCard } from '../components/program-builder/WeekCard';
import { SessionEditor } from '../components/program-builder/SessionEditor';
import { BuilderSession } from '../lib/types/program';
import { programsApi } from '../lib/api/programs';

interface ProgramBuilderScreenProps {
  programId?: number;
  onBack?: () => void;
  onSaveSuccess?: (programId: number) => void;
}

type BuilderStep = 'metadata' | 'builder';

const ProgramBuilderContent: React.FC<ProgramBuilderScreenProps> = ({
  programId,
  onBack,
  onSaveSuccess,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { accessToken } = useAuth();
  const { program, addWeek, isValid, validationErrors } = useProgramBuilder();

  // State
  const [currentStep, setCurrentStep] = useState<BuilderStep>('metadata');
  const [selectedSession, setSelectedSession] = useState<{
    session: BuilderSession;
    weekTempId: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Handlers
  const handleSessionPress = useCallback((session: BuilderSession, weekTempId: string) => {
    setSelectedSession({ session, weekTempId });
  }, []);

  const handleCloseSessionEditor = useCallback(() => {
    setSelectedSession(null);
  }, []);

  const handleContinue = () => {
    if (!program.title.trim()) {
      Alert.alert('Required', 'Please enter a program title to continue.');
      return;
    }
    setCurrentStep('builder');
  };

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

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={currentStep === 'metadata' ? handleDiscard : () => setCurrentStep('metadata')}>
          <Ionicons name={currentStep === 'metadata' ? "close" : "arrow-back"} size={24} color={theme.colors.primaryText} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {programId ? 'Edit Program' : 'New Program'}
          </Text>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, currentStep === 'metadata' && styles.stepDotActive]} />
            <View style={[styles.stepDot, currentStep === 'builder' && styles.stepDotActive]} />
          </View>
        </View>

        {/* Placeholder for right side balance */}
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 1: METADATA */}
          {currentStep === 'metadata' && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Program Details</Text>
                <Text style={styles.stepSubtitle}>Start by setting up the basic information for your program.</Text>
              </View>
              
              <ProgramMetadataForm />
            </View>
          )}

          {/* STEP 2: BUILDER */}
          {currentStep === 'builder' && (
            <View style={styles.stepContainer}>
               {/* Summary Header of Step 1 */}
              <ProgramSummaryHeader onEditPress={() => setCurrentStep('metadata')} />

              {/* Weeks Section */}
              <View style={styles.weeksSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Structure</Text>
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
              
              {/* Validation Errors for Step 2 */}
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
            </View>
          )}

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Bottom Actions */}
      <View style={styles.bottomActions}>
        {currentStep === 'metadata' ? (
           <PrimaryButton
             title="Continue"
             onPress={handleContinue}
             disabled={!program.title.trim()}
           />
        ) : (
          <PrimaryButton
            title={isSaving ? 'Saving...' : 'Save Program'}
            onPress={handleSave}
            loading={isSaving}
            disabled={!isValid}
          />
        )}
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
    stepIndicator: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 6,
    },
    stepDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.border,
    },
    stepDotActive: {
      backgroundColor: theme.colors.primary,
      width: 12,
    },

    scrollView: {
      flex: 1,
    },
    scrollContent: {
      // padding handled in step containers
    },
    stepContainer: {
      paddingTop: theme.spacing(2),
    },
    
    // Step 1 Header
    stepHeader: {
      paddingHorizontal: theme.spacing(4),
      paddingVertical: theme.spacing(4),
      marginBottom: theme.spacing(2),
    },
    stepTitle: {
      fontSize: theme.typography.fontSizeXl,
      fontWeight: '700',
      color: theme.colors.primaryText,
      marginBottom: theme.spacing(1),
    },
    stepSubtitle: {
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.secondaryText,
      lineHeight: 22,
    },

    // Weeks Section
    weeksSection: {
      paddingHorizontal: theme.spacing(4),
      marginTop: theme.spacing(4),
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
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
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
      marginHorizontal: theme.spacing(4),
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

    bottomPadding: {
      height: theme.spacing(20),
    },
  });

export default ProgramBuilderScreen;