from rest_framework import serializers
from core.models import (
    Exercise,
    Equipment,
    Program,
    Week,
    Session,
    SessionBlock,
    Activity,
    ActivityPrescription,
)


class ExerciseSerializer(serializers.ModelSerializer):
    """Serializer for the Exercise model (canonical exercise definitions)."""
    
    class Meta:
        model = Exercise
        fields = [
            'id',
            'name',
            'description',
            'category',
            'equipment_needed',
            'muscle_groups',
            'image',
            'video_url',
            'default_sets',
            'default_reps',
            'default_rest',
            'is_official',
        ]


class ExerciseMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for Exercise - used in nested contexts."""
    
    class Meta:
        model = Exercise
        fields = ['id', 'name', 'image', 'video_url', 'muscle_groups', 'equipment_needed']


class ActivityPrescriptionSerializer(serializers.ModelSerializer):
    """Serializer for ActivityPrescription - the sets/reps/weight/time details."""
    
    set_tag_display = serializers.CharField(source='get_set_tag_display', read_only=True)
    primary_metric_display = serializers.CharField(source='get_primary_metric_display', read_only=True)
    intensity_type_display = serializers.CharField(source='get_intensity_type_display', read_only=True)
    display_label = serializers.CharField(read_only=True)
    
    class Meta:
        model = ActivityPrescription
        fields = [
            'id',
            'set_number',
            'set_tag',
            'set_tag_display',
            'primary_metric',
            'primary_metric_display',
            'prescription_notes',
            # Weightlifting fields
            'reps',
            'rest_seconds',
            'tempo',
            'weight',
            'is_per_side',
            # Intensity fields
            'intensity_value',
            'intensity_type',
            'intensity_type_display',
            # Cardio fields
            'duration_seconds',
            'distance',
            'calories',
            # Extra
            'extra_data',
            'display_label',
        ]


class ActivitySerializer(serializers.ModelSerializer):
    """Serializer for Activity - a single exercise within a session block."""
    
    exercise = ExerciseMinimalSerializer(read_only=True)
    prescriptions = ActivityPrescriptionSerializer(many=True, read_only=True)
    display_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = Activity
        fields = [
            'id',
            'order_in_block',
            'exercise',
            'manual_name',
            'manual_video_url',
            'manual_image',
            'notes',
            'display_name',
            'prescriptions',
        ]


class SessionBlockSerializer(serializers.ModelSerializer):
    """Serializer for SessionBlock - groups activities together."""
    
    scheme_type_display = serializers.CharField(source='get_scheme_type_display', read_only=True)
    activities = ActivitySerializer(many=True, read_only=True)
    
    class Meta:
        model = SessionBlock
        fields = [
            'id',
            'block_order',
            'scheme_type',
            'scheme_type_display',
            'block_name',
            'block_notes',
            'duration_target',
            'rounds_target',
            'activities',
        ]


class SessionDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for Session detail view - includes all nested blocks, 
    activities, and prescriptions.
    """
    
    focus_display = serializers.CharField(source='get_focus_display', read_only=True)
    day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)
    blocks = SessionBlockSerializer(many=True, read_only=True)
    estimated_session_time = serializers.CharField(read_only=True)
    has_program = serializers.BooleanField(read_only=True)
    
    # Week/Program context (if session belongs to a program)
    week_number = serializers.IntegerField(source='week.week_number', read_only=True, allow_null=True)
    week_name = serializers.CharField(source='week.week_name', read_only=True, allow_null=True)
    program_id = serializers.IntegerField(source='week.program.id', read_only=True, allow_null=True)
    program_title = serializers.CharField(source='week.program.title', read_only=True, allow_null=True)
    
    class Meta:
        model = Session
        fields = [
            'id',
            'title',
            'description',
            'focus',
            'focus_display',
            'day_of_week',
            'day_of_week_display',
            'day_ordering',
            'preview_image',
            'estimated_session_time',
            'has_program',
            'week_number',
            'week_name',
            'program_id',
            'program_title',
            'blocks',
            'created_at',
            'updated_at',
        ]


class SessionListSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for Session list views - doesn't include nested data.
    """
    
    focus_display = serializers.CharField(source='get_focus_display', read_only=True)
    day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)
    estimated_session_time = serializers.CharField(read_only=True)
    activity_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = [
            'id',
            'title',
            'description',
            'focus',
            'focus_display',
            'day_of_week',
            'day_of_week_display',
            'preview_image',
            'estimated_session_time',
            'activity_count',
        ]
    
    def get_activity_count(self, obj):
        count = 0
        for block in obj.blocks.all():
            count += block.activities.count()
        return count


# Program-related serializers (for context)
class WeekMinimalSerializer(serializers.ModelSerializer):
    """Minimal Week serializer."""
    
    class Meta:
        model = Week
        fields = ['id', 'week_number', 'week_name', 'notes']


class ProgramMinimalSerializer(serializers.ModelSerializer):
    """Minimal Program serializer."""
    
    class Meta:
        model = Program
        fields = ['id', 'title', 'focus', 'difficulty', 'image']
