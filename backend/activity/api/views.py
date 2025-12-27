import os
import tempfile
from datetime import timedelta
from decimal import Decimal
from collections import defaultdict

from django.db import transaction
from django.db.models import Sum, Avg, Max, Min, Count, F, Q
from django.db.models.functions import TruncDate, TruncWeek
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.core.files.storage import default_storage

from rest_framework import viewsets, views, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend

# Import models from core app
from core.models import Exercise, Session, Program

# Import models from activity app
from activity.models import (
    WorkoutLog, ActivityLog, SetLog, LapLog,
    RecordDataPoint, DeviceInfo, FitFileImport,
    PersonalRecord, ProgramSubscription,
    WorkoutSource, SportType
)

# Import serializers from activity.api
from activity.api.serializers import (
    WorkoutLogListSerializer, WorkoutLogDetailSerializer,
    WorkoutLogCreateSerializer, WorkoutLogUpdateSerializer,
    ActivityLogSerializer, ActivityLogCreateSerializer,
    SetLogSerializer, SetLogCreateSerializer, SetLogBulkSerializer,
    LapLogSerializer, LapLogCreateSerializer,
    RecordDataPointSerializer, RecordDataPointSummarySerializer,
    DeviceInfoSerializer,
    FitFileImportSerializer, FitFileUploadSerializer,
    PersonalRecordSerializer, PersonalRecordHistorySerializer,
    ProgramSubscriptionSerializer,
    TrainingLoadSerializer, ExerciseProgressSerializer, WorkoutStreakSerializer
)

# Import services from activity
from activity.services.fit_parser import FitFileParserService


# =============================================================================
# WORKOUT LOG VIEWSET
# =============================================================================

class WorkoutLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workout logs.
    
    list: Get all workouts for the authenticated user
    create: Create a new workout (manual entry)
    retrieve: Get workout detail with activities, sets, and laps
    update: Update workout metadata
    destroy: Delete a workout
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sport', 'source', 'session']
    search_fields = ['title', 'notes']
    ordering_fields = ['started_at', 'created_at', 'total_distance', 'total_calories']
    ordering = ['-started_at']
    
    def get_queryset(self):
        queryset = WorkoutLog.objects.filter(user=self.request.user)
        
        # Date range filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(started_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(started_at__date__lte=end_date)
        
        return queryset.select_related('session', 'session__week', 'session__week__program')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return WorkoutLogListSerializer
        elif self.action == 'create':
            return WorkoutLogCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return WorkoutLogUpdateSerializer
        return WorkoutLogDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def time_series(self, request, pk=None):
        """
        Get time-series data for charts.
        Supports downsampling for performance.
        
        Query params:
        - fields: comma-separated list of fields (heart_rate,power,speed,cadence,altitude)
        - sample_rate: take every Nth point (default: auto based on duration)
        """
        workout = self.get_object()
        
        # Get requested fields
        fields_param = request.query_params.get('fields', 'heart_rate,power,speed')
        requested_fields = [f.strip() for f in fields_param.split(',')]
        
        # Get sample rate
        sample_rate = request.query_params.get('sample_rate')
        if sample_rate:
            sample_rate = int(sample_rate)
        else:
            # Auto-calculate: aim for ~500 points max
            total_points = workout.records.count()
            sample_rate = max(1, total_points // 500)
        
        # Query data points
        records = workout.records.order_by('elapsed_seconds')
        
        if sample_rate > 1:
            # Downsample by taking every Nth record
            record_ids = list(records.values_list('id', flat=True)[::sample_rate])
            records = records.filter(id__in=record_ids)
        
        # Build response
        data = {
            'timestamps': [],
            'elapsed_seconds': [],
            'coordinates': []
        }
        
        for field in requested_fields:
            data[field] = []
        
        for record in records:
            data['timestamps'].append(record.timestamp)
            data['elapsed_seconds'].append(float(record.elapsed_seconds))
            
            if record.latitude and record.longitude:
                data['coordinates'].append([float(record.latitude), float(record.longitude)])
            
            for field in requested_fields:
                value = getattr(record, field, None)
                if value is not None:
                    if isinstance(value, Decimal):
                        value = float(value)
                data[field].append(value)
        
        return Response(data)
    
    @action(detail=True, methods=['post'])
    def add_activity(self, request, pk=None):
        """Add an activity (exercise) to a workout"""
        workout = self.get_object()
        
        serializer = ActivityLogCreateSerializer(data={
            **request.data,
            'workout_log': workout.id
        })
        serializer.is_valid(raise_exception=True)
        activity = serializer.save()
        
        # Update workout aggregates
        self._update_workout_aggregates(workout)
        
        return Response(
            ActivityLogSerializer(activity).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def add_lap(self, request, pk=None):
        """Add a lap/interval to a workout"""
        workout = self.get_object()
        
        serializer = LapLogCreateSerializer(data={
            **request.data,
            'workout_log': workout.id
        })
        serializer.is_valid(raise_exception=True)
        lap = serializer.save()
        
        return Response(
            LapLogSerializer(lap).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Mark a workout as complete and calculate final aggregates.
        Optionally accepts end time and user feedback.
        """
        workout = self.get_object()
        
        # Update with request data
        workout.ended_at = request.data.get('ended_at', timezone.now())
        workout.perceived_exertion = request.data.get('perceived_exertion')
        workout.mood_after = request.data.get('mood_after')
        workout.notes = request.data.get('notes', workout.notes)
        
        # Calculate duration
        if workout.started_at and workout.ended_at:
            duration = (workout.ended_at - workout.started_at).total_seconds()
            workout.total_elapsed_time = Decimal(str(duration))
            workout.total_timer_time = Decimal(str(duration))
        
        # Update aggregates
        self._update_workout_aggregates(workout)
        workout.save()
        
        # Check for personal records
        self._check_personal_records(workout)
        
        return Response(WorkoutLogDetailSerializer(workout).data)
    
    @action(detail=True, methods=['get'])
    def comparison(self, request, pk=None):
        """
        Compare this workout to the planned session (if linked).
        Returns planned vs actual metrics.
        """
        workout = self.get_object()
        
        if not workout.session:
            return Response(
                {'detail': 'Workout is not linked to a planned session'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comparison = {
            'session': {
                'id': workout.session.id,
                'title': workout.session.title,
            },
            'activities': []
        }
        
        # Compare each activity
        for activity_log in workout.activity_logs.all():
            if not activity_log.activity:
                continue
            
            activity_comparison = {
                'exercise': activity_log.display_name,
                'planned': {},
                'actual': {},
                'sets': []
            }
            
            # Get planned prescriptions
            prescriptions = activity_log.activity.prescriptions.all()
            activity_comparison['planned']['total_sets'] = prescriptions.count()
            activity_comparison['planned']['total_volume'] = sum(
                (float(p.weight or 0) * int(p.reps or 0))
                for p in prescriptions
            )
            
            # Get actual
            activity_comparison['actual']['total_sets'] = activity_log.total_sets
            activity_comparison['actual']['total_volume'] = float(activity_log.total_volume or 0)
            
            # Compare sets
            for set_log in activity_log.set_logs.all():
                if set_log.activity_prescription:
                    rx = set_log.activity_prescription
                    set_comparison = {
                        'set_number': set_log.set_number,
                        'planned_weight': float(rx.weight) if rx.weight else None,
                        'planned_reps': rx.reps,
                        'actual_weight': float(set_log.weight) if set_log.weight else None,
                        'actual_reps': set_log.reps,
                    }
                    activity_comparison['sets'].append(set_comparison)
            
            comparison['activities'].append(activity_comparison)
        
        return Response(comparison)
    
    def _update_workout_aggregates(self, workout):
        """Recalculate workout-level aggregates from activities"""
        activities = workout.activity_logs.all()
        
        workout.total_sets_completed = sum(a.total_sets or 0 for a in activities)
        workout.total_reps_completed = sum(a.total_reps or 0 for a in activities)
        workout.total_volume = sum(float(a.total_volume or 0) for a in activities)
        workout.save()
    
    def _check_personal_records(self, workout):
        """Check if any sets in this workout are personal records"""
        for activity_log in workout.activity_logs.all():
            if not activity_log.exercise:
                continue
            
            exercise = activity_log.exercise
            
            for set_log in activity_log.set_logs.filter(is_completed=True):
                if not set_log.weight or not set_log.reps:
                    continue
                
                # Check for max weight PR
                existing_pr = PersonalRecord.objects.filter(
                    user=workout.user,
                    exercise=exercise,
                    record_type='max_weight',
                    is_current=True
                ).first()
                
                if not existing_pr or (set_log.weight > existing_pr.weight_kg):
                    # New PR!
                    if existing_pr:
                        existing_pr.is_current = False
                        existing_pr.save()
                    
                    PersonalRecord.objects.create(
                        user=workout.user,
                        exercise=exercise,
                        record_type='max_weight',
                        weight_kg=set_log.weight,
                        reps=set_log.reps,
                        achieved_at=workout.started_at,
                        workout_log=workout,
                        set_log=set_log,
                        is_current=True
                    )


# =============================================================================
# ACTIVITY LOG VIEWSET
# =============================================================================

class ActivityLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing activity logs within workouts.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ActivityLog.objects.filter(
            workout_log__user=self.request.user
        ).select_related('exercise', 'workout_log')
    
    def get_serializer_class(self):
        if self.action in ['create']:
            return ActivityLogCreateSerializer
        return ActivityLogSerializer
    
    @action(detail=True, methods=['post'])
    def add_set(self, request, pk=None):
        """Add a set to an activity"""
        activity = self.get_object()
        
        serializer = SetLogCreateSerializer(data={
            **request.data,
            'activity_log': activity.id
        })
        serializer.is_valid(raise_exception=True)
        set_log = serializer.save()
        
        # Update activity aggregates
        self._update_activity_aggregates(activity)
        
        return Response(
            SetLogSerializer(set_log).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def bulk_add_sets(self, request, pk=None):
        """Add multiple sets at once"""
        activity = self.get_object()
        
        sets_data = request.data.get('sets', [])
        created_sets = []
        
        for i, set_data in enumerate(sets_data, 1):
            set_data['activity_log'] = activity.id
            if 'set_number' not in set_data:
                set_data['set_number'] = activity.set_logs.count() + i
            
            serializer = SetLogCreateSerializer(data=set_data)
            serializer.is_valid(raise_exception=True)
            created_sets.append(serializer.save())
        
        # Update aggregates
        self._update_activity_aggregates(activity)
        
        return Response(
            SetLogSerializer(created_sets, many=True).data,
            status=status.HTTP_201_CREATED
        )
    
    def _update_activity_aggregates(self, activity):
        """Recalculate activity-level aggregates"""
        sets = activity.set_logs.all()
        activity.total_sets = sets.count()
        activity.total_reps = sum(s.reps or 0 for s in sets)
        activity.total_volume = Decimal(sum(s.volume or 0 for s in sets))
        max_weight_set = sets.order_by('-weight').first()
        activity.max_weight = max_weight_set.weight if max_weight_set else None
        activity.save()
        
        # Also update parent workout
        workout = activity.workout_log
        activities = workout.activity_logs.all()
        workout.total_sets_completed = sum(a.total_sets or 0 for a in activities)
        workout.total_reps_completed = sum(a.total_reps or 0 for a in activities)
        workout.total_volume = sum(float(a.total_volume or 0) for a in activities)
        workout.save()


# =============================================================================
# SET LOG VIEWSET
# =============================================================================

class SetLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing individual set logs.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SetLogSerializer
    
    def get_queryset(self):
        return SetLog.objects.filter(
            activity_log__workout_log__user=self.request.user
        ).select_related('activity_log', 'activity_log__exercise')
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SetLogCreateSerializer
        return SetLogSerializer
    
    def perform_update(self, serializer):
        set_log = serializer.save()
        # Recalculate aggregates
        activity = set_log.activity_log
        activity.total_reps = sum(s.reps or 0 for s in activity.set_logs.all())
        activity.total_volume = Decimal(sum(s.volume or 0 for s in activity.set_logs.all()))
        activity.save()


# =============================================================================
# LAP LOG VIEWSET
# =============================================================================

class LapLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing lap/interval logs.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return LapLog.objects.filter(
            workout_log__user=self.request.user
        ).select_related('workout_log')
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return LapLogCreateSerializer
        return LapLogSerializer


# =============================================================================
# FIT FILE IMPORT VIEW
# =============================================================================

class FitFileImportView(views.APIView):
    """
    Handle FIT file uploads and imports.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        """List import history"""
        imports = FitFileImport.objects.filter(
            user=request.user
        ).order_by('-uploaded_at')[:50]
        
        serializer = FitFileImportSerializer(imports, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Upload and process a FIT file"""
        serializer = FitFileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        uploaded_file = serializer.validated_data['file']
        session = serializer.validated_data.get('session_id')
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.fit') as tmp:
            for chunk in uploaded_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name
        
        try:
            # Parse and import
            parser = FitFileParserService(user=request.user)
            workout_log, fit_import = parser.parse_and_import(
                tmp_path,
                check_duplicates=True
            )
            
            # Link to session if provided
            if session and workout_log:
                workout_log.session = session
                workout_log.save()
            
            return Response({
                'status': 'success',
                'import_id': fit_import.id,
                'workout_log': WorkoutLogDetailSerializer(workout_log).data,
                'warnings': parser.warnings
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Failed to process FIT file: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        finally:
            # Cleanup temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


class FitFileImportDetailView(views.APIView):
    """Get details of a specific FIT import"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, pk):
        fit_import = get_object_or_404(
            FitFileImport,
            pk=pk,
            user=request.user
        )
        serializer = FitFileImportSerializer(fit_import)
        return Response(serializer.data)


# =============================================================================
# PERSONAL RECORDS VIEWSET
# =============================================================================

class PersonalRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing personal records.
    Records are created automatically when workouts are logged.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PersonalRecordSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['exercise', 'record_type', 'sport', 'is_current']
    ordering_fields = ['achieved_at', 'weight_kg', 'time_seconds']
    ordering = ['-achieved_at']
    
    def get_queryset(self):
        return PersonalRecord.objects.filter(
            user=self.request.user
        ).select_related('exercise', 'workout_log')
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get only current (best) records"""
        records = self.get_queryset().filter(is_current=True)
        serializer = self.get_serializer(records, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='exercise/(?P<exercise_id>[^/.]+)')
    def by_exercise(self, request, exercise_id=None):
        """Get all PRs for a specific exercise"""
        records = self.get_queryset().filter(
            exercise_id=exercise_id
        ).order_by('record_type', '-achieved_at')
        
        # Group by record type
        grouped = defaultdict(list)
        for record in records:
            grouped[record.record_type].append(record)
        
        result = {}
        for record_type, type_records in grouped.items():
            result[record_type] = {
                'current': PersonalRecordSerializer(type_records[0]).data if type_records else None,
                'history': PersonalRecordHistorySerializer(type_records, many=True).data
            }
        
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get PR summary by category"""
        records = self.get_queryset().filter(is_current=True)
        
        # Group by exercise category
        summary = {}
        for record in records.select_related('exercise'):
            if record.exercise:
                category = record.exercise.category or 'Other'
                if category not in summary:
                    summary[category] = []
                summary[category].append(PersonalRecordSerializer(record).data)
        
        return Response(summary)


# =============================================================================
# PROGRAM SUBSCRIPTION VIEWSET
# =============================================================================

class ProgramSubscriptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing program subscriptions.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProgramSubscriptionSerializer
    
    def get_queryset(self):
        return ProgramSubscription.objects.filter(
            user=self.request.user
        ).select_related('program')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause a subscription"""
        subscription = self.get_object()
        subscription.status = 'paused'
        subscription.paused_at = timezone.now()
        subscription.save()
        return Response(ProgramSubscriptionSerializer(subscription).data)
    
    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume a paused subscription"""
        subscription = self.get_object()
        subscription.status = 'active'
        subscription.paused_at = None
        subscription.save()
        return Response(ProgramSubscriptionSerializer(subscription).data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark subscription as completed"""
        subscription = self.get_object()
        subscription.status = 'completed'
        subscription.completed_at = timezone.now()
        subscription.save()
        return Response(ProgramSubscriptionSerializer(subscription).data)
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Get detailed progress for a subscription"""
        subscription = self.get_object()
        program = subscription.program
        
        # Get all sessions in program
        sessions = Session.objects.filter(
            week__program=program
        ).select_related('week')
        
        # Get completed workouts
        completed_workouts = WorkoutLog.objects.filter(
            user=request.user,
            session__in=sessions
        ).values_list('session_id', flat=True)
        
        # Build progress by week
        weeks_progress = []
        for week in program.weeks.all().order_by('week_number'):
            week_sessions = sessions.filter(week=week)
            week_data = {
                'week_number': week.week_number,
                'week_name': week.week_name,
                'sessions': []
            }
            
            for session in week_sessions:
                session_data = {
                    'id': session.id,
                    'title': session.title,
                    'day_of_week': session.day_of_week,
                    'completed': session.id in completed_workouts
                }
                week_data['sessions'].append(session_data)
            
            week_data['completion'] = (
                sum(1 for s in week_data['sessions'] if s['completed']) /
                len(week_data['sessions']) * 100
                if week_data['sessions'] else 0
            )
            weeks_progress.append(week_data)
        
        return Response({
            'program': {
                'id': program.id,
                'title': program.title
            },
            'subscription': ProgramSubscriptionSerializer(subscription).data,
            'weeks': weeks_progress,
            'overall_completion': subscription.completion_percentage
        })


# =============================================================================
# ANALYTICS VIEWS
# =============================================================================

class TrainingLoadView(views.APIView):
    """
    Get training load analytics over time.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Get training load by day/week.
        
        Query params:
        - period: 'day' or 'week' (default: 'day')
        - start_date: Start date (default: 30 days ago)
        - end_date: End date (default: today)
        """
        period = request.query_params.get('period', 'day')
        
        # Date range
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        if request.query_params.get('start_date'):
            start_date = timezone.datetime.strptime(
                request.query_params.get('start_date'), '%Y-%m-%d'
            ).date()
        if request.query_params.get('end_date'):
            end_date = timezone.datetime.strptime(
                request.query_params.get('end_date'), '%Y-%m-%d'
            ).date()
        
        # Query workouts
        workouts = WorkoutLog.objects.filter(
            user=request.user,
            started_at__date__gte=start_date,
            started_at__date__lte=end_date
        )
        
        # Truncate function based on period
        if period == 'week':
            trunc_func = TruncWeek('started_at')
        else:
            trunc_func = TruncDate('started_at')
        
        # Aggregate by period
        data = workouts.annotate(
            period=trunc_func
        ).values('period').annotate(
            workout_count=Count('id'),
            total_duration=Sum('total_timer_time'),
            total_distance=Sum('total_distance'),
            total_volume=Sum('total_volume'),
            total_tss=Sum('training_stress_score'),
            total_calories=Sum('total_calories')
        ).order_by('period')
        
        # Format response
        result = []
        for row in data:
            result.append({
                'date': row['period'],
                'workout_count': row['workout_count'],
                'total_duration': float(row['total_duration'] or 0) / 60,  # minutes
                'total_distance': float(row['total_distance'] or 0) / 1000,  # km
                'total_volume': float(row['total_volume'] or 0),
                'total_tss': float(row['total_tss'] or 0),
                'total_calories': row['total_calories'] or 0
            })
        
        return Response(result)


class ExerciseProgressView(views.APIView):
    """
    Get progress analytics for a specific exercise.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, exercise_id):
        """
        Get progress chart data for an exercise.
        
        Query params:
        - start_date: Start date (default: 90 days ago)
        - end_date: End date (default: today)
        """
        exercise = get_object_or_404(Exercise, pk=exercise_id)
        
        # Date range
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=90)
        
        if request.query_params.get('start_date'):
            start_date = timezone.datetime.strptime(
                request.query_params.get('start_date'), '%Y-%m-%d'
            ).date()
        
        # Get all sets for this exercise
        sets = SetLog.objects.filter(
            activity_log__exercise=exercise,
            activity_log__workout_log__user=request.user,
            activity_log__workout_log__started_at__date__gte=start_date,
            activity_log__workout_log__started_at__date__lte=end_date,
            is_completed=True
        ).select_related(
            'activity_log__workout_log'
        ).order_by('activity_log__workout_log__started_at')
        
        # Build data points
        data_points = []
        volume_by_date = defaultdict(float)
        best_set = None
        
        for set_log in sets:
            workout_date = set_log.activity_log.workout_log.started_at.date()
            
            point = {
                'date': workout_date.isoformat(),
                'weight': float(set_log.weight) if set_log.weight else None,
                'reps': set_log.reps,
                'rpe': float(set_log.rpe) if set_log.rpe else None,
                'volume': set_log.volume
            }
            data_points.append(point)
            
            volume_by_date[workout_date] += set_log.volume or 0
            
            # Track best set (by weight)
            if set_log.weight:
                if not best_set or set_log.weight > best_set['weight']:
                    best_set = {
                        'weight': float(set_log.weight),
                        'reps': set_log.reps,
                        'date': workout_date.isoformat()
                    }
        
        # Calculate estimated 1RM from best set (Brzycki formula)
        estimated_1rm = None
        if best_set and best_set['reps'] and best_set['reps'] < 37:
            estimated_1rm = best_set['weight'] / (1.0278 - 0.0278 * best_set['reps'])
            estimated_1rm = round(estimated_1rm, 1)
        
        # Volume trend
        volume_trend = [
            {'date': date.isoformat(), 'volume': vol}
            for date, vol in sorted(volume_by_date.items())
        ]
        
        return Response({
            'exercise': {
                'id': exercise.id,
                'name': exercise.name,
                'category': exercise.category
            },
            'data_points': data_points,
            'best_set': best_set,
            'estimated_1rm': estimated_1rm,
            'volume_trend': volume_trend,
            'total_sets': len(data_points),
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        })


class WorkoutStreakView(views.APIView):
    """
    Get workout streak statistics.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Get all workout dates
        workout_dates = WorkoutLog.objects.filter(
            user=request.user
        ).annotate(
            date=TruncDate('started_at')
        ).values_list('date', flat=True).distinct().order_by('date')
        
        workout_dates = list(workout_dates)
        
        if not workout_dates:
            return Response({
                'current_streak': 0,
                'longest_streak': 0,
                'total_workouts': 0,
                'workouts_this_week': 0,
                'workouts_this_month': 0
            })
        
        # Calculate streaks
        current_streak = 0
        longest_streak = 0
        streak = 0
        prev_date = None
        today = timezone.now().date()
        
        for date in workout_dates:
            if prev_date is None:
                streak = 1
            elif (date - prev_date).days == 1:
                streak += 1
            elif (date - prev_date).days > 1:
                longest_streak = max(longest_streak, streak)
                streak = 1
            
            prev_date = date
        
        longest_streak = max(longest_streak, streak)
        
        # Check if current streak is active
        if workout_dates:
            last_workout = workout_dates[-1]
            if (today - last_workout).days <= 1:
                current_streak = streak
        
        # This week/month counts
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        
        workouts_this_week = WorkoutLog.objects.filter(
            user=request.user,
            started_at__date__gte=week_start
        ).count()
        
        workouts_this_month = WorkoutLog.objects.filter(
            user=request.user,
            started_at__date__gte=month_start
        ).count()
        
        return Response({
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'total_workouts': WorkoutLog.objects.filter(user=request.user).count(),
            'workouts_this_week': workouts_this_week,
            'workouts_this_month': workouts_this_month
        })


class VolumeTrendView(views.APIView):
    """
    Get volume trend by muscle group or category.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Query params:
        - group_by: 'muscle_group' or 'category' (default: 'category')
        - period: 'week' or 'month' (default: 'week')
        """
        group_by = request.query_params.get('group_by', 'category')
        period = request.query_params.get('period', 'week')
        
        # Date range (last 12 weeks or 6 months)
        end_date = timezone.now().date()
        if period == 'month':
            start_date = end_date - timedelta(days=180)
            trunc_func = TruncDate('activity_log__workout_log__started_at')
        else:
            start_date = end_date - timedelta(days=84)  # 12 weeks
            trunc_func = TruncWeek('activity_log__workout_log__started_at')
        
        # Query
        sets = SetLog.objects.filter(
            activity_log__workout_log__user=request.user,
            activity_log__workout_log__started_at__date__gte=start_date,
            activity_log__exercise__isnull=False,
            is_completed=True
        ).select_related('activity_log__exercise')
        
        # Group data
        if group_by == 'muscle_group':
            group_field = 'activity_log__exercise__muscle_groups'
        else:
            group_field = 'activity_log__exercise__category'
        
        data = sets.annotate(
            period=trunc_func
        ).values('period', group_field).annotate(
            total_volume=Sum(F('weight') * F('reps'))
        ).order_by('period')
        
        # Format response
        result = defaultdict(lambda: defaultdict(float))
        all_groups = set()
        
        for row in data:
            period_key = row['period'].isoformat() if row['period'] else 'Unknown'
            group = row[group_field] or 'Other'
            all_groups.add(group)
            result[period_key][group] = float(row['total_volume'] or 0)
        
        # Convert to list format
        formatted = []
        for period_key in sorted(result.keys()):
            entry = {'date': period_key}
            for group in all_groups:
                entry[group] = result[period_key].get(group, 0)
            formatted.append(entry)
        
        return Response({
            'data': formatted,
            'groups': sorted(list(all_groups))
        })


class SportDistributionView(views.APIView):
    """
    Get workout distribution by sport type.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Query params:
        - start_date: Start date (default: 30 days ago)
        - metric: 'count', 'duration', or 'distance' (default: 'count')
        """
        metric = request.query_params.get('metric', 'count')
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        if request.query_params.get('start_date'):
            start_date = timezone.datetime.strptime(
                request.query_params.get('start_date'), '%Y-%m-%d'
            ).date()
        
        workouts = WorkoutLog.objects.filter(
            user=request.user,
            started_at__date__gte=start_date,
            started_at__date__lte=end_date
        )
        
        if metric == 'duration':
            data = workouts.values('sport').annotate(
                value=Sum('total_timer_time')
            )
        elif metric == 'distance':
            data = workouts.values('sport').annotate(
                value=Sum('total_distance')
            )
        else:
            data = workouts.values('sport').annotate(
                value=Count('id')
            )
        
        result = []
        for row in data:
            sport_display = dict(SportType.choices).get(row['sport'], row['sport'])
            value = float(row['value'] or 0)
            
            if metric == 'duration':
                value = value / 60  # Convert to minutes
            elif metric == 'distance':
                value = value / 1000  # Convert to km
            
            result.append({
                'sport': row['sport'],
                'sport_display': sport_display,
                'value': round(value, 1)
            })
        
        return Response(result)