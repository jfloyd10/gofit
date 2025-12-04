import { ActivityPrescription, Session } from '../types/session';

/**
 * Determines the dominant domain of a prescription to decide how to render it.
 */
export type PrescriptionDomain = 'STRENGTH' | 'CARDIO' | 'HYBRID';

export const getPrescriptionDomain = (p: ActivityPrescription): PrescriptionDomain => {
  if (['distance', 'time', 'calories'].includes(p.primary_metric)) {
    // If it has weight, it might be a weighted carry (Hybrid)
    if (p.weight) return 'HYBRID';
    return 'CARDIO';
  }
  return 'STRENGTH';
};

/**
 * Formats intensity into a readable badge (e.g., "RPE 8", "Zone 2", "80%")
 */
export const formatIntensity = (p: ActivityPrescription): string | null => {
  if (!p.intensity_value || !p.intensity_type) return null;

  switch (p.intensity_type) {
    case 'rpe': return `RPE ${p.intensity_value}`;
    case 'percent_1rm': return `${p.intensity_value}% 1RM`;
    case 'heart_rate_zone': return `Zone ${p.intensity_value}`;
    case 'perc_ftp': return `${p.intensity_value}% FTP`;
    case 'heart_rate': return `${p.intensity_value} BPM`;
    case 'pace': return `${p.intensity_value} /km`; // Assuming metric for now
    default: return `${p.intensity_value}`;
  }
};

/**
 * Formats the "Work" portion of a prescription based on domain
 */
export const formatWork = (p: ActivityPrescription): string => {
  const parts = [];

  // STRENGTH
  if (p.reps) parts.push(`${p.reps} reps`);
  
  // CARDIO / DURATION
  if (p.distance) {
    // Simple logic: if > 1000m use km
    const dist = Number(p.distance);
    parts.push(dist >= 1000 ? `${(dist/1000).toFixed(2)} km` : `${dist} m`);
  }
  if (p.duration_seconds) {
    const mins = Math.floor(p.duration_seconds / 60);
    const secs = p.duration_seconds % 60;
    const timeStr = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
    parts.push(timeStr);
  }
  if (p.calories) parts.push(`${p.calories} cal`);

  return parts.join(' / ');
};

/**
 * Formats the "Load" portion (Weight)
 */
export const formatLoad = (p: ActivityPrescription): string | null => {
  if (!p.weight) return null;
  return `${p.weight}kg${p.is_per_side ? '/side' : ''}`;
};