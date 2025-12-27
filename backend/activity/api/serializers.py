from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from decimal import Decimal

# Import models from core app
from core.models import Exercise, Session, Activity, ActivityPrescription, Program, Week

# Import models from activity app
from activity.models import (
    WorkoutLog, ActivityLog, SetLog, LapLog,
    RecordDataPoint, DeviceInfo, FitFileImport,
    PersonalRecord, ProgramSubscription,
    WorkoutSource, SportType, SubSportType, IntensityLevel, LapTrigger
)


# =============================================================================
# NESTED / READ-ONLY SERIALIZERS
# =============================================================================

class ExerciseMinimalSerializer(serializers.ModelSerializer):
    """Minimal exercise info for nested representations"""
    class Meta:
        model = Exercise
        fields = ['id', 'name', 'category', 'muscle_groups', 'image']
        read_only_fields = fields


class SessionMinimalSerializer(serializers.ModelSerializer):
    """Minimal session info for nested representations"""
    program_title = serializers.CharField(source='week.program.title', read_only=True)
    week_number = serializers.IntegerField(source='week.week_number', read_only=True)
    
    class Meta:
        model = Session
        fields = ['id', 'title', 'focus', 'day_of_week', 'program_title', 'week_number']
        read_only_fields = fields


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for nested representations"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']
        read_only_fields = fields


# =============================================================================
# SET LOG SERIALIZERS
# =============================================================================

class SetLogSerializer(serializers.ModelSerializer):
    """Full serializer for individual set records"""
    volume = serializers.SerializerMethodField()
    prescription_comparison = serializers.SerializerMethodField()
    
    class Meta:
        model = SetLog
        fields = [
            'id', 'activity_log', 'activity_prescription',
            'set_number', 'set_type',
            'weight', 'is_per_side', 'reps', 'is_to_failure',
            'rpe', 'rir',
            'duration_seconds', 'rest_after_seconds', 'tempo',
            'distance', 'calories',
            'avg_power', 'peak_power', 'avg_velocity',
            'started_at', 'completed_at',
            'notes', 'is_completed',
            'volume', 'prescription_comparison',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'volume', 'prescription_comparison', 'created_at', 'updated_at']
    
    def get_volume(self, obj):
        return obj.volume
    
    def get_prescription_comparison(self, obj):
        """Compare actual vs prescribed if linked to a prescription"""
        if not obj.activity_prescription:
            return None
        
        rx = obj.activity_prescription
        comparison = {}
        
        if rx.weight and obj.weight:
            comparison['weight'] = {
                'prescribed': float(rx.weight),
                'actual': float(obj.weight),
                'diff': float(obj.weight - rx.weight),
                'diff_pct': round((float(obj.weight) / float(rx.weight) - 1) * 100, 1) if rx.weight else 0
            }
        
        if rx.reps and obj.reps:
            try:
                prescribed_reps = int(rx.reps)
                comparison['reps'] = {
                    'prescribed': prescribed_reps,
                    'actual': obj.reps,
                    'diff': obj.reps - prescribed_reps
                }
            except ValueError:
                pass  # reps might be a range like "8-12"
        
        return comparison if comparison else None


class SetLogCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating set logs"""
    class Meta:
        model = SetLog
        fields = [
            'activity_log', 'activity_prescription',
            'set_number', 'set_type',
            'weight', 'is_per_side', 'reps', 'is_to_failure',
            'rpe', 'rir',
            'duration_seconds', 'rest_after_seconds', 'tempo',
            'distance', 'calories',
            'avg_power', 'peak_power', 'avg_velocity',
            'started_at', 'completed_at',
            'notes', 'is_completed'
        ]
    
    def validate(self, data):
        # Auto-set set_number if not provided
        if 'set_number' not in data or data['set_number'] is None:
            activity_log = data.get('activity_log')
            if activity_log:
                max_set = SetLog.objects.filter(activity_log=activity_log).count()
                data['set_number'] = max_set + 1
        return data


class SetLogBulkSerializer(serializers.Serializer):
    """Serializer for bulk creating sets"""
    sets = SetLogCreateSerializer(many=True)
    
    def create(self, validated_data):
        sets_data = validated_data.pop('sets')
        created_sets = []
        for set_data in sets_data:
            created_sets.append(SetLog.objects.create(**set_data))
        return created_sets


# =============================================================================
# ACTIVITY LOG SERIALIZERS
# =============================================================================

class ActivityLogSerializer(serializers.ModelSerializer):
    """Full serializer for activity logs with nested sets"""
    exercise = ExerciseMinimalSerializer(read_only=True)
    exercise_id = serializers.PrimaryKeyRelatedField(
        queryset=Exercise.objects.all(),
        source='exercise',
        write_only=True,
        required=False,
        allow_null=True
    )
    set_logs = SetLogSerializer(many=True, read_only=True)
    display_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'workout_log', 'activity',
            'exercise', 'exercise_id', 'manual_name',
            'order_in_workout',
            'total_sets', 'total_reps', 'total_volume', 'max_weight',
            'total_distance', 'total_duration', 'avg_pace',
            'notes', 'display_name',
            'set_logs',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'display_name', 'created_at', 'updated_at']


class ActivityLogCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating activity logs with optional inline sets"""
    exercise_id = serializers.PrimaryKeyRelatedField(
        queryset=Exercise.objects.all(),
        source='exercise',
        required=False,
        allow_null=True
    )
    sets = SetLogCreateSerializer(many=True, required=False, write_only=True)
    
    class Meta:
        model = ActivityLog
        fields = [
            'workout_log', 'activity',
            'exercise_id', 'manual_name',
            'order_in_workout',
            'notes',
            'sets'
        ]
    
    def validate(self, data):
        # Must have either exercise or manual_name
        if not data.get('exercise') and not data.get('manual_name'):
            raise serializers.ValidationError(
                "Either exercise_id or manual_name must be provided"
            )
        
        # Auto-set order if not provided
        if 'order_in_workout' not in data or data['order_in_workout'] is None:
            workout_log = data.get('workout_log')
            if workout_log:
                max_order = ActivityLog.objects.filter(workout_log=workout_log).count()
                data['order_in_workout'] = max_order + 1
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        sets_data = validated_data.pop('sets', [])
        activity_log = ActivityLog.objects.create(**validated_data)
        
        # Create sets if provided
        for i, set_data in enumerate(sets_data, 1):
            set_data['activity_log'] = activity_log
            if 'set_number' not in set_data:
                set_data['set_number'] = i
            SetLog.objects.create(**set_data)
        
        # Recalculate aggregates
        activity_log.total_sets = activity_log.set_logs.count()
        activity_log.total_reps = sum(s.reps or 0 for s in activity_log.set_logs.all())
        activity_log.total_volume = sum(s.volume or 0 for s in activity_log.set_logs.all())
        max_weight_set = activity_log.set_logs.order_by('-weight').first()
        activity_log.max_weight = max_weight_set.weight if max_weight_set else None
        activity_log.save()
        
        return activity_log


# =============================================================================
# LAP LOG SERIALIZERS
# =============================================================================

class LapLogSerializer(serializers.ModelSerializer):
    """Full serializer for lap/interval records"""
    pace_formatted = serializers.SerializerMethodField()
    duration_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = LapLog
        fields = [
            'id', 'workout_log', 'activity_prescription',
            'lap_number', 'lap_trigger', 'intensity',
            'start_time', 'end_time',
            'total_elapsed_time', 'total_timer_time',
            'total_distance',
            'total_ascent', 'total_descent',
            'min_altitude', 'max_altitude',
            'total_calories', 'total_work',
            'avg_heart_rate', 'max_heart_rate',
            'avg_speed', 'max_speed',
            'avg_power', 'max_power', 'normalized_power',
            'avg_cadence', 'max_cadence',
            'avg_vertical_oscillation', 'avg_stance_time',
            'avg_stride_length', 'avg_vertical_ratio',
            'start_lat', 'start_long', 'end_lat', 'end_long',
            'notes',
            'pace_formatted', 'duration_formatted',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'pace_formatted', 'duration_formatted', 'created_at', 'updated_at']
    
    def get_pace_formatted(self, obj):
        """Calculate pace in min/km"""
        if not obj.avg_speed or obj.avg_speed == 0:
            return None
        pace_seconds = 1000 / float(obj.avg_speed)
        minutes = int(pace_seconds // 60)
        seconds = int(pace_seconds % 60)
        return f"{minutes}:{seconds:02d}"
    
    def get_duration_formatted(self, obj):
        """Format duration as MM:SS or HH:MM:SS"""
        if not obj.total_elapsed_time:
            return None
        total_seconds = int(obj.total_elapsed_time)
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        return f"{minutes}:{seconds:02d}"


class LapLogCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating lap logs"""
    class Meta:
        model = LapLog
        fields = [
            'workout_log', 'activity_prescription',
            'lap_number', 'lap_trigger', 'intensity',
            'start_time', 'end_time',
            'total_elapsed_time', 'total_timer_time',
            'total_distance',
            'total_ascent', 'total_descent',
            'total_calories', 'total_work',
            'avg_heart_rate', 'max_heart_rate',
            'avg_speed', 'max_speed',
            'avg_power', 'max_power',
            'avg_cadence', 'max_cadence',
            'notes'
        ]
    
    def validate(self, data):
        if 'lap_number' not in data or data['lap_number'] is None:
            workout_log = data.get('workout_log')
            if workout_log:
                max_lap = LapLog.objects.filter(workout_log=workout_log).count()
                data['lap_number'] = max_lap + 1
        return data


# =============================================================================
# WORKOUT LOG SERIALIZERS
# =============================================================================

class WorkoutLogListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing workouts"""
    session = SessionMinimalSerializer(read_only=True)
    duration_formatted = serializers.CharField(read_only=True)
    avg_pace = serializers.CharField(read_only=True)
    activity_count = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkoutLog
        fields = [
            'id', 'title', 'source', 'sport', 'sub_sport',
            'started_at', 'ended_at',
            'total_elapsed_time', 'total_timer_time',
            'total_distance', 'total_calories',
            'avg_heart_rate', 'max_heart_rate',
            'avg_power', 'avg_cadence',
            'total_sets_completed', 'total_reps_completed', 'total_volume',
            'duration_formatted', 'avg_pace',
            'session', 'activity_count',
            'is_public', 'cover_image',
            'created_at'
        ]
        read_only_fields = fields
    
    def get_activity_count(self, obj):
        return obj.activity_logs.count()


class WorkoutLogDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer for a single workout"""
    session = SessionMinimalSerializer(read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(
        queryset=Session.objects.all(),
        source='session',
        write_only=True,
        required=False,
        allow_null=True
    )
    activity_logs = ActivityLogSerializer(many=True, read_only=True)
    laps = LapLogSerializer(many=True, read_only=True)
    devices = serializers.SerializerMethodField()
    duration_formatted = serializers.CharField(read_only=True)
    avg_pace = serializers.CharField(read_only=True)
    
    class Meta:
        model = WorkoutLog
        fields = [
            'id', 'user', 'session', 'session_id',
            'title', 'notes', 'source', 'external_id',
            'sport', 'sub_sport',
            'started_at', 'ended_at',
            'total_elapsed_time', 'total_timer_time', 'total_moving_time',
            'total_distance',
            'total_ascent', 'total_descent', 'min_altitude', 'max_altitude',
            'total_calories', 'total_work',
            'avg_heart_rate', 'max_heart_rate', 'min_heart_rate',
            'avg_speed', 'max_speed',
            'avg_power', 'max_power', 'normalized_power',
            'avg_cadence', 'max_cadence',
            'training_stress_score', 'intensity_factor',
            'training_effect_aerobic', 'training_effect_anaerobic',
            'avg_vertical_oscillation', 'avg_stance_time',
            'avg_stride_length', 'avg_vertical_ratio',
            'total_strokes', 'avg_stroke_distance', 'pool_length',
            'total_sets_completed', 'total_reps_completed', 'total_volume',
            'start_lat', 'start_long', 'end_lat', 'end_long',
            'perceived_exertion', 'mood_before', 'mood_after',
            'temperature', 'humidity', 'weather_condition',
            'cover_image', 'is_public',
            'duration_formatted', 'avg_pace',
            'activity_logs', 'laps', 'devices',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'duration_formatted', 'avg_pace',
            'activity_logs', 'laps', 'devices',
            'created_at', 'updated_at'
        ]
    
    def get_devices(self, obj):
        return DeviceInfoSerializer(obj.devices.all(), many=True).data


class WorkoutLogCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating workouts with optional inline activities"""
    session_id = serializers.PrimaryKeyRelatedField(
        queryset=Session.objects.all(),
        source='session',
        required=False,
        allow_null=True
    )
    activities = ActivityLogCreateSerializer(many=True, required=False, write_only=True)
    
    class Meta:
        model = WorkoutLog
        fields = [
            'session_id',
            'title', 'notes', 'source',
            'sport', 'sub_sport',
            'started_at', 'ended_at',
            'total_distance', 'total_calories',
            'perceived_exertion', 'mood_before', 'mood_after',
            'is_public',
            'activities'
        ]
    
    def validate(self, data):
        # Set defaults
        if 'source' not in data:
            data['source'] = WorkoutSource.MANUAL
        if 'started_at' not in data:
            data['started_at'] = timezone.now()
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        activities_data = validated_data.pop('activities', [])
        user = self.context['request'].user
        validated_data['user'] = user
        
        workout_log = WorkoutLog.objects.create(**validated_data)
        
        # Create activities if provided
        for i, activity_data in enumerate(activities_data, 1):
            sets_data = activity_data.pop('sets', [])
            activity_data['workout_log'] = workout_log
            if 'order_in_workout' not in activity_data:
                activity_data['order_in_workout'] = i
            
            activity_log = ActivityLog.objects.create(**activity_data)
            
            # Create sets
            for j, set_data in enumerate(sets_data, 1):
                set_data['activity_log'] = activity_log
                if 'set_number' not in set_data:
                    set_data['set_number'] = j
                SetLog.objects.create(**set_data)
            
            # Update activity aggregates
            self._update_activity_aggregates(activity_log)
        
        # Update workout aggregates
        self._update_workout_aggregates(workout_log)
        
        return workout_log
    
    def _update_activity_aggregates(self, activity_log):
        """Recalculate activity-level aggregates"""
        sets = activity_log.set_logs.all()
        activity_log.total_sets = sets.count()
        activity_log.total_reps = sum(s.reps or 0 for s in sets)
        activity_log.total_volume = Decimal(sum(s.volume or 0 for s in sets))
        max_weight_set = sets.order_by('-weight').first()
        activity_log.max_weight = max_weight_set.weight if max_weight_set else None
        activity_log.save()
    
    def _update_workout_aggregates(self, workout_log):
        """Recalculate workout-level aggregates"""
        activities = workout_log.activity_logs.all()
        workout_log.total_sets_completed = sum(a.total_sets or 0 for a in activities)
        workout_log.total_reps_completed = sum(a.total_reps or 0 for a in activities)
        workout_log.total_volume = sum(a.total_volume or 0 for a in activities)
        workout_log.save()


class WorkoutLogUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating workout metadata"""
    class Meta:
        model = WorkoutLog
        fields = [
            'title', 'notes',
            'perceived_exertion', 'mood_before', 'mood_after',
            'is_public'
        ]


# =============================================================================
# DEVICE INFO SERIALIZER
# =============================================================================

class DeviceInfoSerializer(serializers.ModelSerializer):
    """Serializer for device information"""
    class Meta:
        model = DeviceInfo
        fields = [
            'id', 'workout_log', 'device_index',
            'manufacturer', 'product_name', 'product_id',
            'serial_number', 'device_type',
            'software_version', 'hardware_version',
            'battery_status', 'battery_level',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# =============================================================================
# FIT FILE IMPORT SERIALIZERS
# =============================================================================

class FitFileImportSerializer(serializers.ModelSerializer):
    """Serializer for FIT file import records"""
    workout_log = WorkoutLogListSerializer(read_only=True)
    
    class Meta:
        model = FitFileImport
        fields = [
            'id', 'user', 'workout_log',
            'original_filename', 'file_size', 'file_hash',
            'storage_path',
            'fit_serial_number', 'fit_time_created',
            'fit_manufacturer', 'fit_product', 'fit_type',
            'status', 'error_message',
            'uploaded_at', 'processed_at'
        ]
        read_only_fields = fields


class FitFileUploadSerializer(serializers.Serializer):
    """Serializer for uploading FIT files"""
    file = serializers.FileField()
    session_id = serializers.PrimaryKeyRelatedField(
        queryset=Session.objects.all(),
        required=False,
        allow_null=True,
        help_text="Optional: Link to a planned session"
    )
    
    def validate_file(self, value):
        # Check file extension
        if not value.name.lower().endswith('.fit'):
            raise serializers.ValidationError("File must be a .FIT file")
        
        # Check file size (max 50MB)
        if value.size > 50 * 1024 * 1024:
            raise serializers.ValidationError("File size must be less than 50MB")
        
        return value


# =============================================================================
# PERSONAL RECORD SERIALIZERS
# =============================================================================

class PersonalRecordSerializer(serializers.ModelSerializer):
    """Serializer for personal records"""
    exercise = ExerciseMinimalSerializer(read_only=True)
    display_value = serializers.SerializerMethodField()
    
    class Meta:
        model = PersonalRecord
        fields = [
            'id', 'user',
            'exercise', 'manual_name', 'sport',
            'record_type',
            'weight_kg', 'reps', 'time_seconds',
            'distance_meters', 'power_watts', 'volume_kg',
            'achieved_at', 'workout_log', 'set_log',
            'is_current',
            'display_value',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields
    
    def get_display_value(self, obj):
        """Format the PR value for display"""
        if obj.record_type == '1rm' and obj.weight_kg:
            return f"{obj.weight_kg} kg"
        elif obj.record_type == 'max_weight' and obj.weight_kg:
            return f"{obj.weight_kg} kg x {obj.reps or '?'}"
        elif obj.record_type == 'max_reps' and obj.reps:
            return f"{obj.reps} reps"
        elif obj.record_type == 'fastest_time' and obj.time_seconds:
            mins = int(obj.time_seconds // 60)
            secs = int(obj.time_seconds % 60)
            return f"{mins}:{secs:02d}"
        elif obj.record_type == 'longest_distance' and obj.distance_meters:
            if obj.distance_meters >= 1000:
                return f"{obj.distance_meters / 1000:.2f} km"
            return f"{obj.distance_meters} m"
        elif obj.record_type == 'max_power' and obj.power_watts:
            return f"{obj.power_watts} W"
        return None


class PersonalRecordHistorySerializer(serializers.ModelSerializer):
    """Serializer for PR history (all records, not just current)"""
    class Meta:
        model = PersonalRecord
        fields = [
            'id', 'record_type',
            'weight_kg', 'reps', 'time_seconds',
            'distance_meters', 'power_watts',
            'achieved_at', 'is_current'
        ]


# =============================================================================
# PROGRAM SUBSCRIPTION SERIALIZERS
# =============================================================================

class ProgramMinimalSerializer(serializers.ModelSerializer):
    """Minimal program info for nested representations"""
    class Meta:
        model = Program
        fields = ['id', 'title', 'focus', 'difficulty', 'image']
        read_only_fields = fields


class ProgramSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for program subscriptions"""
    program = ProgramMinimalSerializer(read_only=True)
    program_id = serializers.PrimaryKeyRelatedField(
        queryset=Program.objects.all(),
        source='program',
        write_only=True
    )
    completion_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=1, read_only=True
    )
    
    class Meta:
        model = ProgramSubscription
        fields = [
            'id', 'user', 'program', 'program_id',
            'status', 'current_week',
            'started_at', 'completed_at', 'paused_at',
            'start_date', 'preferred_days',
            'notes',
            'completion_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'started_at', 'completion_percentage',
            'created_at', 'updated_at'
        ]
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# =============================================================================
# RECORD DATA POINT SERIALIZERS
# =============================================================================

class RecordDataPointSerializer(serializers.ModelSerializer):
    """Serializer for time-series data points"""
    class Meta:
        model = RecordDataPoint
        fields = [
            'id', 'timestamp', 'elapsed_seconds',
            'latitude', 'longitude', 'altitude',
            'distance', 'speed',
            'heart_rate', 'power', 'cadence',
            'vertical_oscillation', 'stance_time',
            'stride_length', 'vertical_ratio',
            'temperature', 'activity_type'
        ]
        read_only_fields = fields


class RecordDataPointSummarySerializer(serializers.Serializer):
    """Aggregated/sampled time-series data for charts"""
    timestamps = serializers.ListField(child=serializers.DateTimeField())
    elapsed_seconds = serializers.ListField(child=serializers.FloatField())
    heart_rate = serializers.ListField(child=serializers.IntegerField(), required=False)
    power = serializers.ListField(child=serializers.IntegerField(), required=False)
    speed = serializers.ListField(child=serializers.FloatField(), required=False)
    cadence = serializers.ListField(child=serializers.IntegerField(), required=False)
    altitude = serializers.ListField(child=serializers.FloatField(), required=False)
    coordinates = serializers.ListField(required=False)


# =============================================================================
# ANALYTICS SERIALIZERS
# =============================================================================

class TrainingLoadSerializer(serializers.Serializer):
    """Serializer for training load data"""
    date = serializers.DateField()
    workout_count = serializers.IntegerField()
    total_duration = serializers.FloatField(help_text="Total duration in minutes")
    total_distance = serializers.FloatField(help_text="Total distance in km")
    total_volume = serializers.FloatField(help_text="Total weight volume in kg")
    total_tss = serializers.FloatField(help_text="Total Training Stress Score")
    sports = serializers.DictField(child=serializers.IntegerField())


class ExerciseProgressSerializer(serializers.Serializer):
    """Serializer for exercise progress chart data"""
    exercise = ExerciseMinimalSerializer()
    data_points = serializers.ListField(child=serializers.DictField())
    best_set = serializers.DictField()
    estimated_1rm = serializers.FloatField(required=False)
    volume_trend = serializers.ListField(child=serializers.DictField())


class WorkoutStreakSerializer(serializers.Serializer):
    """Serializer for workout streak data"""
    current_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    total_workouts = serializers.IntegerField()
    workouts_this_week = serializers.IntegerField()
    workouts_this_month = serializers.IntegerField()