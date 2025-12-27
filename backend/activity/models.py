from django.db import models
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

# Import models from core app
from core.models import Exercise, Session, Activity, ActivityPrescription, Program


# =============================================================================
# ENUMS / CHOICES
# =============================================================================

class WorkoutSource(models.TextChoices):
    """How the workout data was captured"""
    MANUAL = 'manual', 'Manual Entry'
    GARMIN_FIT = 'garmin_fit', 'Garmin FIT File'
    GARMIN_CONNECT = 'garmin_connect', 'Garmin Connect API'
    APPLE_HEALTH = 'apple_health', 'Apple Health'
    STRAVA = 'strava', 'Strava'
    WAHOO = 'wahoo', 'Wahoo'
    POLAR = 'polar', 'Polar'
    WHOOP = 'whoop', 'Whoop'
    OTHER = 'other', 'Other'


class SportType(models.TextChoices):
    """Sport categories aligned with FIT SDK sport types"""
    RUNNING = 'running', 'Running'
    CYCLING = 'cycling', 'Cycling'
    SWIMMING = 'swimming', 'Swimming'
    STRENGTH = 'strength', 'Strength Training'
    CROSSFIT = 'crossfit', 'CrossFit'
    ROWING = 'rowing', 'Rowing'
    WALKING = 'walking', 'Walking'
    HIKING = 'hiking', 'Hiking'
    YOGA = 'yoga', 'Yoga'
    ELLIPTICAL = 'elliptical', 'Elliptical'
    STAIR_CLIMBING = 'stair_climbing', 'Stair Climbing'
    SKIING = 'skiing', 'Skiing'
    OTHER = 'other', 'Other'


class SubSportType(models.TextChoices):
    """Sub-sport categories for more specific activity types"""
    GENERIC = 'generic', 'Generic'
    TREADMILL = 'treadmill', 'Treadmill'
    STREET = 'street', 'Street/Road'
    TRAIL = 'trail', 'Trail'
    TRACK = 'track', 'Track'
    VIRTUAL = 'virtual_activity', 'Virtual/Indoor'
    INDOOR_CYCLING = 'indoor_cycling', 'Indoor Cycling'
    MOUNTAIN = 'mountain', 'Mountain'
    OPEN_WATER = 'open_water', 'Open Water'
    LAP_SWIMMING = 'lap_swimming', 'Lap Swimming'
    FREESTYLE = 'freestyle', 'Freestyle'


class IntensityLevel(models.TextChoices):
    """Perceived or measured intensity levels"""
    REST = 'rest', 'Rest'
    WARMUP = 'warmup', 'Warmup'
    ACTIVE = 'active', 'Active'
    RECOVERY = 'recovery', 'Recovery'
    TEMPO = 'tempo', 'Tempo'
    THRESHOLD = 'threshold', 'Threshold'
    VO2MAX = 'vo2max', 'VO2 Max'
    ANAEROBIC = 'anaerobic', 'Anaerobic'
    SPRINT = 'sprint', 'Sprint'
    COOLDOWN = 'cooldown', 'Cooldown'


class LapTrigger(models.TextChoices):
    """What triggered a lap to be recorded"""
    MANUAL = 'manual', 'Manual/Button Press'
    TIME = 'time', 'Time-based'
    DISTANCE = 'distance', 'Distance-based'
    POSITION = 'position_start', 'Position/GPS Start'
    HEART_RATE = 'fitness_equipment', 'Fitness Equipment'
    SESSION_END = 'session_end', 'Session End'


# =============================================================================
# CORE LOGGING MODELS
# =============================================================================

class WorkoutLog(models.Model):
    """
    The main container for a logged workout session.
    
    This is the top-level record for any workout that was actually performed.
    It can be:
    - Linked to a planned Session (from a subscribed Program)
    - Standalone/ad-hoc (no Session link)
    """
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='workout_logs'
    )
    
    # Optional link to planned session from core app
    session = models.ForeignKey(
        'core.Session',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workout_logs',
        help_text="Link to planned session if following a program"
    )
    
    # Basic metadata
    title = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="User-provided or auto-generated title"
    )
    notes = models.TextField(
        blank=True, 
        null=True,
        help_text="User notes about the workout"
    )
    
    # Data source
    source = models.CharField(
        max_length=50,
        choices=WorkoutSource.choices,
        default=WorkoutSource.MANUAL
    )
    external_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="ID from external source (Garmin activity ID, etc.)"
    )
    
    # Sport classification
    sport = models.CharField(
        max_length=50,
        choices=SportType.choices,
        default=SportType.OTHER
    )
    sub_sport = models.CharField(
        max_length=50,
        choices=SubSportType.choices,
        default=SubSportType.GENERIC
    )
    
    # Timing
    started_at = models.DateTimeField(
        help_text="When the workout started"
    )
    ended_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the workout ended"
    )
    
    # Duration metrics (in seconds)
    total_elapsed_time = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total elapsed time including rest (seconds)"
    )
    total_timer_time = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Active timer time (seconds)"
    )
    total_moving_time = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Time spent moving (seconds)"
    )
    
    # Distance (always in meters)
    total_distance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total distance in meters"
    )
    
    # Elevation (always in meters)
    total_ascent = models.IntegerField(
        null=True,
        blank=True,
        help_text="Total elevation gain in meters"
    )
    total_descent = models.IntegerField(
        null=True,
        blank=True,
        help_text="Total elevation loss in meters"
    )
    min_altitude = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Minimum altitude in meters"
    )
    max_altitude = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum altitude in meters"
    )
    
    # Energy
    total_calories = models.IntegerField(
        null=True,
        blank=True,
        help_text="Total calories burned"
    )
    total_work = models.IntegerField(
        null=True,
        blank=True,
        help_text="Total work in kilojoules"
    )
    
    # Heart Rate
    avg_heart_rate = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(30), MaxValueValidator(250)]
    )
    max_heart_rate = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(30), MaxValueValidator(250)]
    )
    min_heart_rate = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(30), MaxValueValidator(250)]
    )
    
    # Speed (always in m/s)
    avg_speed = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Average speed in m/s"
    )
    max_speed = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Maximum speed in m/s"
    )
    
    # Power (watts)
    avg_power = models.IntegerField(
        null=True,
        blank=True,
        help_text="Average power in watts"
    )
    max_power = models.IntegerField(
        null=True,
        blank=True,
        help_text="Maximum power in watts"
    )
    normalized_power = models.IntegerField(
        null=True,
        blank=True,
        help_text="Normalized power (cycling/running power)"
    )
    
    # Cadence
    avg_cadence = models.IntegerField(
        null=True,
        blank=True,
        help_text="Average cadence (rpm or spm)"
    )
    max_cadence = models.IntegerField(
        null=True,
        blank=True,
        help_text="Maximum cadence"
    )
    
    # Training metrics
    training_stress_score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="TSS (Training Stress Score)"
    )
    intensity_factor = models.DecimalField(
        max_digits=4,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="IF (Intensity Factor)"
    )
    training_effect_aerobic = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Aerobic training effect (0-5)"
    )
    training_effect_anaerobic = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Anaerobic training effect (0-5)"
    )
    
    # Running dynamics
    avg_vertical_oscillation = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Average vertical oscillation in mm"
    )
    avg_stance_time = models.DecimalField(
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Average ground contact time in ms"
    )
    avg_stride_length = models.DecimalField(
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Average stride length in mm"
    )
    avg_vertical_ratio = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Average vertical ratio %"
    )
    
    # Swimming
    total_strokes = models.IntegerField(
        null=True,
        blank=True
    )
    avg_stroke_distance = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Average distance per stroke in meters"
    )
    pool_length = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Pool length in meters"
    )
    
    # Strength training aggregates
    total_sets_completed = models.IntegerField(
        null=True,
        blank=True,
        help_text="Total number of sets completed"
    )
    total_reps_completed = models.IntegerField(
        null=True,
        blank=True,
        help_text="Total number of reps completed"
    )
    total_volume = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total volume (weight x reps) in kg"
    )
    
    # Location
    start_lat = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    start_long = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    end_lat = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    end_long = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    
    # User feedback
    perceived_exertion = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="User's RPE rating 1-10"
    )
    mood_before = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Mood before workout 1-5"
    )
    mood_after = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Mood after workout 1-5"
    )
    
    # Weather (for outdoor activities)
    temperature = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Temperature in Celsius"
    )
    humidity = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    weather_condition = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="e.g., Sunny, Rainy, Cloudy"
    )
    
    # Media
    cover_image = models.ImageField(
        upload_to='img/workout_logs/',
        blank=True,
        null=True
    )
    
    # Privacy
    is_public = models.BooleanField(
        default=False,
        help_text="Whether this workout is visible to others"
    )


    map_polyline = models.TextField(blank=True, null=True, help_text="Encoded polyline string of the route")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'workout_log'
        verbose_name = 'Workout Log'
        verbose_name_plural = 'Workout Logs'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', '-started_at']),
            models.Index(fields=['user', 'sport']),
            models.Index(fields=['session']),
            models.Index(fields=['source']),
            models.Index(fields=['external_id']),
        ]
    
    def __str__(self):
        title = self.title or f"{self.get_sport_display()} Workout"
        return f"{self.user.username} - {title} ({self.started_at.date()})"
    
    @property
    def duration_formatted(self):
        """Returns duration in HH:MM:SS format"""
        if not self.total_timer_time:
            return None
        total_seconds = int(self.total_timer_time)
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        return f"{minutes}:{seconds:02d}"
    
    @property
    def avg_pace(self):
        """Returns average pace in min/km for running/walking"""
        if not self.avg_speed or self.avg_speed == 0:
            return None
        pace_seconds = 1000 / float(self.avg_speed)
        minutes = int(pace_seconds // 60)
        seconds = int(pace_seconds % 60)
        return f"{minutes}:{seconds:02d}"


class LapLog(models.Model):
    """
    Represents a single lap or interval within a workout.
    """
    
    id = models.AutoField(primary_key=True)
    workout_log = models.ForeignKey(
        WorkoutLog,
        on_delete=models.CASCADE,
        related_name='laps'
    )
    
    # Optional link to prescribed activity from core app
    activity_prescription = models.ForeignKey(
        'core.ActivityPrescription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lap_logs',
        help_text="Link to planned interval/set if from program"
    )
    
    # Lap identification
    lap_number = models.PositiveIntegerField(
        help_text="Sequential lap number (1-indexed)"
    )
    lap_trigger = models.CharField(
        max_length=50,
        choices=LapTrigger.choices,
        default=LapTrigger.MANUAL
    )
    intensity = models.CharField(
        max_length=50,
        choices=IntensityLevel.choices,
        default=IntensityLevel.ACTIVE
    )
    
    # Timing
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    total_elapsed_time = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Elapsed time in seconds"
    )
    total_timer_time = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Timer time in seconds"
    )
    
    # Distance
    total_distance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Distance in meters"
    )
    
    # Elevation
    total_ascent = models.IntegerField(null=True, blank=True)
    total_descent = models.IntegerField(null=True, blank=True)
    min_altitude = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    max_altitude = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    
    # Energy
    total_calories = models.IntegerField(null=True, blank=True)
    total_work = models.IntegerField(null=True, blank=True, help_text="Work in joules")
    
    # Heart Rate
    avg_heart_rate = models.IntegerField(null=True, blank=True)
    max_heart_rate = models.IntegerField(null=True, blank=True)
    
    # Speed
    avg_speed = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    max_speed = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    
    # Power
    avg_power = models.IntegerField(null=True, blank=True)
    max_power = models.IntegerField(null=True, blank=True)
    normalized_power = models.IntegerField(null=True, blank=True)
    
    # Cadence
    avg_cadence = models.IntegerField(null=True, blank=True)
    max_cadence = models.IntegerField(null=True, blank=True)
    
    # Running dynamics
    avg_vertical_oscillation = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    avg_stance_time = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    avg_stride_length = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    avg_vertical_ratio = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Position
    start_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    start_long = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    end_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    end_long = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True, null=True)

   
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'lap_log'
        verbose_name = 'Lap Log'
        verbose_name_plural = 'Lap Logs'
        ordering = ['workout_log', 'lap_number']
        unique_together = ('workout_log', 'lap_number')
        indexes = [
            models.Index(fields=['workout_log', 'lap_number']),
        ]
    
    def __str__(self):
        return f"Lap {self.lap_number} - {self.workout_log}"


class ActivityLog(models.Model):
    """
    Logs performance for a specific exercise/activity within a workout.
    """
    
    id = models.AutoField(primary_key=True)
    workout_log = models.ForeignKey(
        WorkoutLog,
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )
    
    # Link to planned activity from core app (if following program)
    activity = models.ForeignKey(
        'core.Activity',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs',
        help_text="Link to planned activity if from program"
    )
    
    # Link to exercise definition from core app
    exercise = models.ForeignKey(
        'core.Exercise',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs'
    )
    
    # For manual/custom exercises
    manual_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Custom exercise name if not using Exercise library"
    )
    
    # Ordering within workout
    order_in_workout = models.PositiveIntegerField(
        default=0,
        help_text="Order this activity was performed in the workout"
    )
    
    # Aggregate metrics for this activity
    total_sets = models.IntegerField(null=True, blank=True)
    total_reps = models.IntegerField(null=True, blank=True)
    total_volume = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total volume (weight x reps) in kg"
    )
    max_weight = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Heaviest weight used in kg"
    )
    
    # For cardio activities within the workout
    total_distance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total distance in meters"
    )
    total_duration = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total duration in seconds"
    )
    avg_pace = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Average pace in seconds per km"
    )
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'activity_log'
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'
        ordering = ['workout_log', 'order_in_workout']
        indexes = [
            models.Index(fields=['workout_log', 'order_in_workout']),
            models.Index(fields=['exercise']),
        ]
    
    def __str__(self):
        name = self.exercise.name if self.exercise else self.manual_name or "Unknown"
        return f"{name} - {self.workout_log}"
    
    @property
    def display_name(self):
        if self.exercise:
            return self.exercise.name
        return self.manual_name or "Unknown Exercise"


class SetLog(models.Model):
    """
    Records a single set of an exercise.
    """
    
    SET_TYPE_CHOICES = (
        ('working', 'Working Set'),
        ('warmup', 'Warmup'),
        ('dropset', 'Drop Set'),
        ('failure', 'To Failure'),
        ('cooldown', 'Cooldown'),
        ('cluster', 'Cluster Set'),
        ('rest_pause', 'Rest-Pause'),
    )
    
    id = models.AutoField(primary_key=True)
    activity_log = models.ForeignKey(
        ActivityLog,
        on_delete=models.CASCADE,
        related_name='set_logs'
    )
    
    # Optional link to planned prescription from core app
    activity_prescription = models.ForeignKey(
        'core.ActivityPrescription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='set_logs',
        help_text="Link to planned set if from program"
    )
    
    # Set identification
    set_number = models.PositiveIntegerField(
        help_text="Sequential set number for this exercise"
    )
    set_type = models.CharField(
        max_length=20,
        choices=SET_TYPE_CHOICES,
        default='working'
    )
    
    # Core metrics
    weight = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Weight in kg"
    )
    is_per_side = models.BooleanField(
        default=False,
        help_text="If True, weight is per side (unilateral)"
    )
    reps = models.IntegerField(
        null=True,
        blank=True,
        help_text="Reps completed"
    )
    is_to_failure = models.BooleanField(
        default=False,
        help_text="Set was taken to failure"
    )
    
    # Intensity
    rpe = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Rate of Perceived Exertion 1-10"
    )
    rir = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        help_text="Reps in Reserve"
    )
    
    # Timing
    duration_seconds = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Time under tension or set duration"
    )
    rest_after_seconds = models.IntegerField(
        null=True,
        blank=True,
        help_text="Rest taken after this set"
    )
    tempo = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Tempo notation (e.g., 3-1-2-0)"
    )
    
    # Distance/Cardio (for rowing, ski erg, etc.)
    distance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Distance in meters"
    )
    calories = models.IntegerField(
        null=True,
        blank=True,
        help_text="Calories burned"
    )
    
    # Power (for power-based movements)
    avg_power = models.IntegerField(null=True, blank=True)
    peak_power = models.IntegerField(null=True, blank=True)
    avg_velocity = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Average bar velocity in m/s"
    )
    
    # Timestamps
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    
    # Was this set completed as planned?
    is_completed = models.BooleanField(
        default=True,
        help_text="False if set was skipped or partial"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'set_log'
        verbose_name = 'Set Log'
        verbose_name_plural = 'Set Logs'
        ordering = ['activity_log', 'set_number']
        unique_together = ('activity_log', 'set_number')
        indexes = [
            models.Index(fields=['activity_log', 'set_number']),
        ]
    
    def __str__(self):
        return f"Set {self.set_number}: {self.weight}kg x {self.reps}"
    
    @property
    def volume(self):
        """Calculate volume for this set (weight x reps)"""
        if self.weight and self.reps:
            multiplier = 2 if self.is_per_side else 1
            return float(self.weight) * self.reps * multiplier
        return 0


# =============================================================================
# TIME-SERIES DATA
# =============================================================================

class RecordDataPoint(models.Model):
    """
    Stores individual time-series data points from a workout.
    """
    
    id = models.AutoField(primary_key=True)
    workout_log = models.ForeignKey(
        WorkoutLog,
        on_delete=models.CASCADE,
        related_name='records'
    )
    
    # Timestamp
    timestamp = models.DateTimeField(
        help_text="Exact timestamp of this data point"
    )
    elapsed_seconds = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Seconds since workout start"
    )
    
    # Position
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    altitude = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Altitude in meters"
    )
    
    # Distance
    distance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Cumulative distance in meters"
    )
    
    # Speed
    speed = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Instantaneous speed in m/s"
    )
    
    # Heart Rate
    heart_rate = models.IntegerField(null=True, blank=True)
    
    # Power
    power = models.IntegerField(
        null=True,
        blank=True,
        help_text="Instantaneous power in watts"
    )
    accumulated_power = models.IntegerField(
        null=True,
        blank=True,
        help_text="Cumulative power in watts"
    )
    
    # Cadence
    cadence = models.IntegerField(
        null=True,
        blank=True,
        help_text="Cadence in rpm or spm"
    )
    
    # Running dynamics
    vertical_oscillation = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Vertical oscillation in mm"
    )
    stance_time = models.DecimalField(
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Ground contact time in ms"
    )
    stride_length = models.DecimalField(
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Step length in mm"
    )
    vertical_ratio = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Vertical ratio %"
    )
    
    # Temperature
    temperature = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Temperature in Celsius"
    )
    
    # Activity type (for multi-sport)
    activity_type = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )
    
    class Meta:
        db_table = 'record_data_point'
        verbose_name = 'Record Data Point'
        verbose_name_plural = 'Record Data Points'
        ordering = ['workout_log', 'elapsed_seconds']
        indexes = [
            models.Index(fields=['workout_log', 'elapsed_seconds']),
            models.Index(fields=['workout_log', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.workout_log} @ {self.elapsed_seconds}s"


# =============================================================================
# DEVICE & IMPORT TRACKING
# =============================================================================

class DeviceInfo(models.Model):
    """
    Tracks devices used during workouts.
    """
    
    id = models.AutoField(primary_key=True)
    workout_log = models.ForeignKey(
        WorkoutLog,
        on_delete=models.CASCADE,
        related_name='devices'
    )
    
    # Device identification
    device_index = models.CharField(
        max_length=50,
        default='creator',
        help_text="Device role: creator, 1, 2, etc."
    )
    manufacturer = models.CharField(max_length=100, blank=True, null=True)
    product_name = models.CharField(max_length=255, blank=True, null=True)
    product_id = models.IntegerField(null=True, blank=True)
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    
    # Device type
    device_type = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="e.g., heart_rate_monitor, bike_power, running_dynamics"
    )
    
    # Firmware/Software
    software_version = models.CharField(max_length=50, blank=True, null=True)
    hardware_version = models.CharField(max_length=50, blank=True, null=True)
    
    # Battery
    battery_status = models.CharField(max_length=50, blank=True, null=True)
    battery_level = models.IntegerField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'device_info'
        verbose_name = 'Device Info'
        verbose_name_plural = 'Device Info'
        unique_together = ('workout_log', 'device_index')
    
    def __str__(self):
        return f"{self.manufacturer} - {self.product_name}"


class FitFileImport(models.Model):
    """
    Tracks imported FIT files for audit and reprocessing.
    """
    
    IMPORT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('duplicate', 'Duplicate'),
    )
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='fit_imports'
    )
    workout_log = models.ForeignKey(
        WorkoutLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fit_imports',
        help_text="Resulting workout log from import"
    )
    
    # File metadata
    original_filename = models.CharField(max_length=255)
    file_size = models.IntegerField(help_text="File size in bytes")
    file_hash = models.CharField(
        max_length=64,
        help_text="SHA-256 hash for duplicate detection"
    )
    
    # Cloud storage reference
    storage_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Path in cloud storage (GCS bucket)"
    )
    
    # FIT file metadata (from file_id message)
    fit_serial_number = models.CharField(max_length=50, blank=True, null=True)
    fit_time_created = models.DateTimeField(null=True, blank=True)
    fit_manufacturer = models.CharField(max_length=100, blank=True, null=True)
    fit_product = models.CharField(max_length=100, blank=True, null=True)
    fit_type = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="FIT file type: activity, workout, course, etc."
    )
    
    # Processing status
    status = models.CharField(
        max_length=20,
        choices=IMPORT_STATUS_CHOICES,
        default='pending'
    )
    error_message = models.TextField(blank=True, null=True)
    
    # Timing
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'fit_file_import'
        verbose_name = 'FIT File Import'
        verbose_name_plural = 'FIT File Imports'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['user', '-uploaded_at']),
            models.Index(fields=['file_hash']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.original_filename} ({self.status})"


# =============================================================================
# PERSONAL RECORDS & ACHIEVEMENTS
# =============================================================================

class PersonalRecord(models.Model):
    """
    Tracks personal records (PRs) for exercises and activities.
    """
    
    RECORD_TYPE_CHOICES = (
        ('1rm', '1 Rep Max'),
        ('max_weight', 'Max Weight (any reps)'),
        ('max_reps', 'Max Reps (any weight)'),
        ('max_volume', 'Max Volume'),
        ('fastest_time', 'Fastest Time'),
        ('longest_distance', 'Longest Distance'),
        ('max_power', 'Max Power'),
        ('best_pace', 'Best Pace'),
    )
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='personal_records'
    )
    
    # What the record is for - references core.Exercise
    exercise = models.ForeignKey(
        'core.Exercise',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='personal_records'
    )
    manual_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="For non-exercise records (5K, Fran, etc.)"
    )
    sport = models.CharField(
        max_length=50,
        choices=SportType.choices,
        null=True,
        blank=True
    )
    
    # Record type and value
    record_type = models.CharField(
        max_length=20,
        choices=RECORD_TYPE_CHOICES
    )
    
    # Value storage (flexible for different types)
    weight_kg = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )
    reps = models.IntegerField(null=True, blank=True)
    time_seconds = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    distance_meters = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    power_watts = models.IntegerField(null=True, blank=True)
    volume_kg = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # When and where it was achieved
    achieved_at = models.DateTimeField()
    workout_log = models.ForeignKey(
        WorkoutLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='personal_records'
    )
    set_log = models.ForeignKey(
        SetLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='personal_records'
    )
    
    # Is this the current record?
    is_current = models.BooleanField(
        default=True,
        help_text="True if this is the current best"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'personal_record'
        verbose_name = 'Personal Record'
        verbose_name_plural = 'Personal Records'
        ordering = ['-achieved_at']
        indexes = [
            models.Index(fields=['user', 'exercise', 'record_type']),
            models.Index(fields=['user', 'is_current']),
        ]
    
    def __str__(self):
        name = self.exercise.name if self.exercise else self.manual_name
        return f"{self.user.username} - {name} {self.record_type}"


# =============================================================================
# PROGRAM SUBSCRIPTION
# =============================================================================

class ProgramSubscription(models.Model):
    """
    Represents a user's subscription/enrollment in a workout program.
    """
    
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
    )
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='program_subscriptions'
    )
    # References core.Program
    program = models.ForeignKey(
        'core.Program',
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    
    # Progress tracking
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    current_week = models.PositiveIntegerField(
        default=1,
        help_text="Current week number"
    )
    
    # Dates
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    paused_at = models.DateTimeField(null=True, blank=True)
    
    # Scheduling
    start_date = models.DateField(
        null=True,
        blank=True,
        help_text="When the program officially starts"
    )
    preferred_days = models.JSONField(
        default=list,
        blank=True,
        help_text="List of preferred workout days"
    )
    
    # Customization
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'program_subscription'
        verbose_name = 'Program Subscription'
        verbose_name_plural = 'Program Subscriptions'
        unique_together = ('user', 'program')
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['program']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.program.title}"
    
    @property
    def completion_percentage(self):
        """Calculate program completion percentage"""
        from django.db.models import Count
        total_sessions = self.program.weeks.aggregate(
            total=Count('sessions')
        )['total'] or 0
        
        if total_sessions == 0:
            return 0
        
        completed_sessions = WorkoutLog.objects.filter(
            user=self.user,
            session__week__program=self.program
        ).count()
        
        return round((completed_sessions / total_sessions) * 100, 1)