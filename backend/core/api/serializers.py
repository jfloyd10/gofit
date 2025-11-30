# core/api/serializers.py

from rest_framework import serializers
from django.db import transaction
from core.models import (
    Exercise,
    Equipment,
    Program,
    ProgramMedia,
    ProgramEquipment,
    Week,
    Session,
    SessionBlock,
    Activity,
    ActivityPrescription,
)


# =============================================================================
# EXERCISE SERIALIZERS
# =============================================================================

class ExerciseSerializer(serializers.ModelSerializer):
    """Serializer for the Exercise model (canonical exercise definitions)."""
    
    # Read-only computed fields
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Exercise
        fields = [
            'id',
            'user',
            'name',
            'description',
            'category',
            'equipment_needed',
            'muscle_groups',
            'image',
            'image_url',
            'video_url',
            'default_sets',
            'default_reps',
            'default_rest',
            'is_official',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'image_url']

    def get_image_url(self, obj):
        """Return the full URL for the image if it exists."""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def create(self, validated_data):
        # Set the user from the request context
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user
        return super().create(validated_data)


class ExerciseMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for Exercise - used in nested contexts."""
    
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Exercise
        fields = ['id', 'name', 'image', 'image_url', 'video_url', 'muscle_groups', 'equipment_needed', 'category']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ExerciseListSerializer(serializers.ModelSerializer):
    """Serializer for Exercise list view with pagination support."""
    
    image_url = serializers.SerializerMethodField()
    
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
            'image_url',
            'video_url',
            'default_sets',
            'default_reps',
            'default_rest',
            'is_official',
        ]

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ExerciseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating custom exercises."""
    
    class Meta:
        model = Exercise
        fields = [
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
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user
        validated_data['is_official'] = False
        return super().create(validated_data)


# =============================================================================
# EQUIPMENT SERIALIZERS
# =============================================================================

class EquipmentSerializer(serializers.ModelSerializer):
    """Serializer for Equipment model."""
    
    class Meta:
        model = Equipment
        fields = ['id', 'name', 'description', 'image', 'video_url']


# =============================================================================
# ACTIVITY PRESCRIPTION SERIALIZERS
# =============================================================================

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


class ActivityPrescriptionWriteSerializer(serializers.ModelSerializer):
    """Writable serializer for ActivityPrescription - used in nested creates."""
    
    id = serializers.IntegerField(required=False, allow_null=True)
    temp_id = serializers.CharField(required=False, allow_null=True, write_only=True)
    
    class Meta:
        model = ActivityPrescription
        fields = [
            'id',
            'temp_id',
            'set_number',
            'set_tag',
            'primary_metric',
            'prescription_notes',
            'reps',
            'rest_seconds',
            'tempo',
            'weight',
            'is_per_side',
            'intensity_value',
            'intensity_type',
            'duration_seconds',
            'distance',
            'calories',
            'extra_data',
        ]


# =============================================================================
# ACTIVITY SERIALIZERS
# =============================================================================

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


class ActivityWriteSerializer(serializers.ModelSerializer):
    """Writable serializer for Activity - used in nested creates."""
    
    id = serializers.IntegerField(required=False, allow_null=True)
    temp_id = serializers.CharField(required=False, allow_null=True, write_only=True)
    exercise_id = serializers.IntegerField(required=False, allow_null=True)
    prescriptions = ActivityPrescriptionWriteSerializer(many=True, required=False)
    
    class Meta:
        model = Activity
        fields = [
            'id',
            'temp_id',
            'order_in_block',
            'exercise_id',
            'manual_name',
            'manual_video_url',
            'manual_image',
            'notes',
            'prescriptions',
        ]


# =============================================================================
# SESSION BLOCK SERIALIZERS
# =============================================================================

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


class SessionBlockWriteSerializer(serializers.ModelSerializer):
    """Writable serializer for SessionBlock - used in nested creates."""
    
    id = serializers.IntegerField(required=False, allow_null=True)
    temp_id = serializers.CharField(required=False, allow_null=True, write_only=True)
    activities = ActivityWriteSerializer(many=True, required=False)
    
    class Meta:
        model = SessionBlock
        fields = [
            'id',
            'temp_id',
            'block_order',
            'scheme_type',
            'block_name',
            'block_notes',
            'duration_target',
            'rounds_target',
            'activities',
        ]


# =============================================================================
# SESSION SERIALIZERS
# =============================================================================

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


class SessionWriteSerializer(serializers.ModelSerializer):
    """Writable serializer for Session - used in nested creates."""
    
    id = serializers.IntegerField(required=False, allow_null=True)
    temp_id = serializers.CharField(required=False, allow_null=True, write_only=True)
    blocks = SessionBlockWriteSerializer(many=True, required=False)
    
    class Meta:
        model = Session
        fields = [
            'id',
            'temp_id',
            'title',
            'description',
            'focus',
            'day_of_week',
            'day_ordering',
            'preview_image',
            'blocks',
        ]


# =============================================================================
# WEEK SERIALIZERS
# =============================================================================

class WeekMinimalSerializer(serializers.ModelSerializer):
    """Minimal Week serializer."""
    
    class Meta:
        model = Week
        fields = ['id', 'week_number', 'week_name', 'notes']


class WeekDetailSerializer(serializers.ModelSerializer):
    """Detailed Week serializer with sessions."""
    
    sessions = SessionDetailSerializer(many=True, read_only=True)
    
    class Meta:
        model = Week
        fields = ['id', 'week_number', 'week_name', 'notes', 'sessions', 'created_at', 'updated_at']


class WeekWriteSerializer(serializers.ModelSerializer):
    """Writable serializer for Week - used in nested creates."""
    
    id = serializers.IntegerField(required=False, allow_null=True)
    temp_id = serializers.CharField(required=False, allow_null=True, write_only=True)
    sessions = SessionWriteSerializer(many=True, required=False)
    
    class Meta:
        model = Week
        fields = [
            'id',
            'temp_id',
            'week_number',
            'week_name',
            'notes',
            'sessions',
        ]


# =============================================================================
# PROGRAM SERIALIZERS
# =============================================================================

class ProgramMinimalSerializer(serializers.ModelSerializer):
    """Minimal Program serializer."""
    
    class Meta:
        model = Program
        fields = ['id', 'title', 'focus', 'difficulty', 'image']


class ProgramListSerializer(serializers.ModelSerializer):
    """Serializer for Program list views."""
    
    week_count = serializers.SerializerMethodField()
    session_count = serializers.SerializerMethodField()
    focus_display = serializers.CharField(source='get_focus_display', read_only=True)
    difficulty_display = serializers.CharField(source='get_difficulty_display', read_only=True)
    
    class Meta:
        model = Program
        fields = [
            'id',
            'title',
            'description',
            'focus',
            'focus_display',
            'difficulty',
            'difficulty_display',
            'image',
            'is_public',
            'is_template',
            'week_count',
            'session_count',
            'created_at',
            'updated_at',
        ]
    
    def get_week_count(self, obj):
        return obj.weeks.count()
    
    def get_session_count(self, obj):
        count = 0
        for week in obj.weeks.all():
            count += week.sessions.count()
        return count


class ProgramDetailSerializer(serializers.ModelSerializer):
    """Full serializer for Program detail view with all nested data."""
    
    weeks = WeekDetailSerializer(many=True, read_only=True)
    focus_display = serializers.CharField(source='get_focus_display', read_only=True)
    difficulty_display = serializers.CharField(source='get_difficulty_display', read_only=True)
    
    class Meta:
        model = Program
        fields = [
            'id',
            'user',
            'title',
            'description',
            'focus',
            'focus_display',
            'difficulty',
            'difficulty_display',
            'image',
            'video_url',
            'price',
            'is_public',
            'is_template',
            'weeks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class ProgramCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating Program (without nested weeks)."""
    
    class Meta:
        model = Program
        fields = [
            'id',
            'title',
            'description',
            'focus',
            'difficulty',
            'image',
            'video_url',
            'price',
            'is_public',
            'is_template',
        ]
        read_only_fields = ['id']
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user
        return super().create(validated_data)


class ProgramFullSaveSerializer(serializers.ModelSerializer):
    """
    Full serializer for bulk saving a Program with all nested data.
    This handles create/update/delete of weeks, sessions, blocks, activities, prescriptions.
    """
    
    id = serializers.IntegerField(required=False, allow_null=True)
    weeks = WeekWriteSerializer(many=True, required=False)
    
    class Meta:
        model = Program
        fields = [
            'id',
            'title',
            'description',
            'focus',
            'difficulty',
            'image',
            'video_url',
            'price',
            'is_public',
            'is_template',
            'weeks',
        ]
    
    @transaction.atomic
    def create(self, validated_data):
        weeks_data = validated_data.pop('weeks', [])
        
        # Set user from context
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user
        
        program = Program.objects.create(**validated_data)
        
        self._save_weeks(program, weeks_data)
        
        return program
    
    @transaction.atomic
    def update(self, instance, validated_data):
        weeks_data = validated_data.pop('weeks', [])
        
        # Update program fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Handle weeks - delete removed, update existing, create new
        self._save_weeks(instance, weeks_data)
        
        return instance
    
    def _save_weeks(self, program, weeks_data):
        """Save weeks with sessions, blocks, activities, and prescriptions."""
        
        existing_week_ids = set(program.weeks.values_list('id', flat=True))
        incoming_week_ids = set()
        
        for week_data in weeks_data:
            sessions_data = week_data.pop('sessions', [])
            week_id = week_data.pop('id', None)
            week_data.pop('temp_id', None)
            
            if week_id and week_id in existing_week_ids:
                # Update existing week
                week = Week.objects.get(id=week_id, program=program)
                for attr, value in week_data.items():
                    setattr(week, attr, value)
                week.save()
                incoming_week_ids.add(week_id)
            else:
                # Create new week
                week = Week.objects.create(program=program, **week_data)
            
            self._save_sessions(week, sessions_data)
        
        # Delete weeks that were removed
        weeks_to_delete = existing_week_ids - incoming_week_ids
        if weeks_to_delete:
            Week.objects.filter(id__in=weeks_to_delete, program=program).delete()
    
    def _save_sessions(self, week, sessions_data):
        """Save sessions with blocks."""
        
        existing_session_ids = set(week.sessions.values_list('id', flat=True))
        incoming_session_ids = set()
        
        for session_data in sessions_data:
            blocks_data = session_data.pop('blocks', [])
            session_id = session_data.pop('id', None)
            session_data.pop('temp_id', None)
            
            if session_id and session_id in existing_session_ids:
                # Update existing session
                session = Session.objects.get(id=session_id, week=week)
                for attr, value in session_data.items():
                    setattr(session, attr, value)
                session.save()
                incoming_session_ids.add(session_id)
            else:
                # Create new session
                session = Session.objects.create(week=week, **session_data)
            
            self._save_blocks(session, blocks_data)
        
        # Delete sessions that were removed
        sessions_to_delete = existing_session_ids - incoming_session_ids
        if sessions_to_delete:
            Session.objects.filter(id__in=sessions_to_delete, week=week).delete()
    
    def _save_blocks(self, session, blocks_data):
        """Save blocks with activities."""
        
        existing_block_ids = set(session.blocks.values_list('id', flat=True))
        incoming_block_ids = set()
        
        for block_data in blocks_data:
            activities_data = block_data.pop('activities', [])
            block_id = block_data.pop('id', None)
            block_data.pop('temp_id', None)
            
            if block_id and block_id in existing_block_ids:
                # Update existing block
                block = SessionBlock.objects.get(id=block_id, session=session)
                for attr, value in block_data.items():
                    setattr(block, attr, value)
                block.save()
                incoming_block_ids.add(block_id)
            else:
                # Create new block
                block = SessionBlock.objects.create(session=session, **block_data)
            
            self._save_activities(block, activities_data)
        
        # Delete blocks that were removed
        blocks_to_delete = existing_block_ids - incoming_block_ids
        if blocks_to_delete:
            SessionBlock.objects.filter(id__in=blocks_to_delete, session=session).delete()
    
    def _save_activities(self, block, activities_data):
        """Save activities with prescriptions."""
        
        existing_activity_ids = set(block.activities.values_list('id', flat=True))
        incoming_activity_ids = set()
        
        for activity_data in activities_data:
            prescriptions_data = activity_data.pop('prescriptions', [])
            activity_id = activity_data.pop('id', None)
            activity_data.pop('temp_id', None)
            
            # Handle exercise_id
            exercise_id = activity_data.pop('exercise_id', None)
            if exercise_id:
                activity_data['exercise_id'] = exercise_id
            
            if activity_id and activity_id in existing_activity_ids:
                # Update existing activity
                activity = Activity.objects.get(id=activity_id, session_block=block)
                for attr, value in activity_data.items():
                    setattr(activity, attr, value)
                activity.save()
                incoming_activity_ids.add(activity_id)
            else:
                # Create new activity
                activity = Activity.objects.create(session_block=block, **activity_data)
            
            self._save_prescriptions(activity, prescriptions_data)
        
        # Delete activities that were removed
        activities_to_delete = existing_activity_ids - incoming_activity_ids
        if activities_to_delete:
            Activity.objects.filter(id__in=activities_to_delete, session_block=block).delete()
    
    def _save_prescriptions(self, activity, prescriptions_data):
        """Save prescriptions."""
        
        existing_prescription_ids = set(activity.prescriptions.values_list('id', flat=True))
        incoming_prescription_ids = set()
        
        for prescription_data in prescriptions_data:
            prescription_id = prescription_data.pop('id', None)
            prescription_data.pop('temp_id', None)
            
            if prescription_id and prescription_id in existing_prescription_ids:
                # Update existing prescription
                prescription = ActivityPrescription.objects.get(id=prescription_id, activity=activity)
                for attr, value in prescription_data.items():
                    setattr(prescription, attr, value)
                prescription.save()
                incoming_prescription_ids.add(prescription_id)
            else:
                # Create new prescription
                ActivityPrescription.objects.create(activity=activity, **prescription_data)
        
        # Delete prescriptions that were removed
        prescriptions_to_delete = existing_prescription_ids - incoming_prescription_ids
        if prescriptions_to_delete:
            ActivityPrescription.objects.filter(id__in=prescriptions_to_delete, activity=activity).delete()
