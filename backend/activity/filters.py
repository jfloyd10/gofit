import django_filters
from django.db.models import Q, F, ExpressionWrapper, FloatField
from django.utils import timezone
from datetime import timedelta

from activity.models import (
    WorkoutLog, ActivityLog, SetLog, LapLog,
    PersonalRecord, ProgramSubscription,
    SportType, WorkoutSource
)


class WorkoutLogFilter(django_filters.FilterSet):
    """
    Advanced filters for WorkoutLog queries.
    """
    # Date filters
    started_after = django_filters.DateTimeFilter(
        field_name='started_at',
        lookup_expr='gte'
    )
    started_before = django_filters.DateTimeFilter(
        field_name='started_at',
        lookup_expr='lte'
    )
    date = django_filters.DateFilter(
        field_name='started_at',
        lookup_expr='date'
    )
    
    # Range filters
    min_duration = django_filters.NumberFilter(
        field_name='total_timer_time',
        lookup_expr='gte'
    )
    max_duration = django_filters.NumberFilter(
        field_name='total_timer_time',
        lookup_expr='lte'
    )
    min_distance = django_filters.NumberFilter(
        field_name='total_distance',
        lookup_expr='gte'
    )
    max_distance = django_filters.NumberFilter(
        field_name='total_distance',
        lookup_expr='lte'
    )
    min_calories = django_filters.NumberFilter(
        field_name='total_calories',
        lookup_expr='gte'
    )
    
    # Sport filters
    sport = django_filters.ChoiceFilter(choices=SportType.choices)
    sports = django_filters.MultipleChoiceFilter(
        field_name='sport',
        choices=SportType.choices
    )
    
    # Source filters
    source = django_filters.ChoiceFilter(choices=WorkoutSource.choices)
    
    # Relationship filters
    has_session = django_filters.BooleanFilter(
        method='filter_has_session',
        label='Has linked session'
    )
    program = django_filters.NumberFilter(
        field_name='session__week__program__id',
        label='Program ID'
    )
    
    # Time period shortcuts
    period = django_filters.CharFilter(
        method='filter_period',
        label='Time period (today, week, month, year)'
    )
    
    class Meta:
        model = WorkoutLog
        fields = [
            'sport', 'source', 'session', 'is_public',
            'started_after', 'started_before', 'date',
            'min_duration', 'max_duration',
            'min_distance', 'max_distance',
            'min_calories', 'has_session', 'program', 'period'
        ]
    
    def filter_has_session(self, queryset, name, value):
        if value:
            return queryset.filter(session__isnull=False)
        return queryset.filter(session__isnull=True)
    
    def filter_period(self, queryset, name, value):
        today = timezone.now().date()
        
        if value == 'today':
            return queryset.filter(started_at__date=today)
        elif value == 'week':
            week_start = today - timedelta(days=today.weekday())
            return queryset.filter(started_at__date__gte=week_start)
        elif value == 'month':
            month_start = today.replace(day=1)
            return queryset.filter(started_at__date__gte=month_start)
        elif value == 'year':
            year_start = today.replace(month=1, day=1)
            return queryset.filter(started_at__date__gte=year_start)
        elif value.startswith('last_'):
            # Handle last_7, last_30, last_90 days
            try:
                days = int(value.split('_')[1])
                start_date = today - timedelta(days=days)
                return queryset.filter(started_at__date__gte=start_date)
            except (IndexError, ValueError):
                pass
        
        return queryset


class ActivityLogFilter(django_filters.FilterSet):
    """
    Filters for ActivityLog queries.
    """
    exercise = django_filters.NumberFilter(field_name='exercise__id')
    exercise_name = django_filters.CharFilter(
        field_name='exercise__name',
        lookup_expr='icontains'
    )
    exercise_category = django_filters.CharFilter(
        field_name='exercise__category',
        lookup_expr='iexact'
    )
    muscle_group = django_filters.CharFilter(
        field_name='exercise__muscle_groups',
        lookup_expr='icontains'
    )
    
    min_volume = django_filters.NumberFilter(
        field_name='total_volume',
        lookup_expr='gte'
    )
    min_sets = django_filters.NumberFilter(
        field_name='total_sets',
        lookup_expr='gte'
    )
    
    # Date filters via workout
    workout_date = django_filters.DateFilter(
        field_name='workout_log__started_at',
        lookup_expr='date'
    )
    workout_after = django_filters.DateFilter(
        field_name='workout_log__started_at',
        lookup_expr='date__gte'
    )
    workout_before = django_filters.DateFilter(
        field_name='workout_log__started_at',
        lookup_expr='date__lte'
    )
    
    class Meta:
        model = ActivityLog
        fields = [
            'workout_log', 'exercise', 'activity',
            'exercise_name', 'exercise_category', 'muscle_group',
            'min_volume', 'min_sets',
            'workout_date', 'workout_after', 'workout_before'
        ]


class SetLogFilter(django_filters.FilterSet):
    """
    Filters for SetLog queries.
    """
    exercise = django_filters.NumberFilter(
        field_name='activity_log__exercise__id'
    )
    exercise_name = django_filters.CharFilter(
        field_name='activity_log__exercise__name',
        lookup_expr='icontains'
    )
    
    min_weight = django_filters.NumberFilter(
        field_name='weight',
        lookup_expr='gte'
    )
    max_weight = django_filters.NumberFilter(
        field_name='weight',
        lookup_expr='lte'
    )
    min_reps = django_filters.NumberFilter(
        field_name='reps',
        lookup_expr='gte'
    )
    max_reps = django_filters.NumberFilter(
        field_name='reps',
        lookup_expr='lte'
    )
    
    set_type = django_filters.ChoiceFilter(
        choices=[
            ('working', 'Working Set'),
            ('warmup', 'Warmup'),
            ('dropset', 'Drop Set'),
            ('failure', 'To Failure'),
        ]
    )
    
    is_pr = django_filters.BooleanFilter(
        method='filter_is_pr',
        label='Is a personal record'
    )
    
    class Meta:
        model = SetLog
        fields = [
            'activity_log', 'exercise', 'exercise_name',
            'min_weight', 'max_weight', 'min_reps', 'max_reps',
            'set_type', 'is_completed', 'is_to_failure'
        ]
    
    def filter_is_pr(self, queryset, name, value):
        if value:
            return queryset.filter(personal_records__isnull=False)
        return queryset.filter(personal_records__isnull=True)


class LapLogFilter(django_filters.FilterSet):
    """
    Filters for LapLog queries.
    """
    intensity = django_filters.CharFilter()
    lap_trigger = django_filters.CharFilter()
    
    min_distance = django_filters.NumberFilter(
        field_name='total_distance',
        lookup_expr='gte'
    )
    max_distance = django_filters.NumberFilter(
        field_name='total_distance',
        lookup_expr='lte'
    )
    min_duration = django_filters.NumberFilter(
        field_name='total_elapsed_time',
        lookup_expr='gte'
    )
    max_duration = django_filters.NumberFilter(
        field_name='total_elapsed_time',
        lookup_expr='lte'
    )
    
    # Pace filter (seconds per km)
    max_pace = django_filters.NumberFilter(
        method='filter_max_pace',
        label='Max pace (sec/km)'
    )
    
    class Meta:
        model = LapLog
        fields = [
            'workout_log', 'intensity', 'lap_trigger',
            'min_distance', 'max_distance',
            'min_duration', 'max_duration'
        ]
    
    def filter_max_pace(self, queryset, name, value):
        """Filter laps faster than given pace"""
        return queryset.annotate(
            pace=ExpressionWrapper(
                F('total_elapsed_time') / (F('total_distance') / 1000),
                output_field=FloatField()
            )
        ).filter(pace__lte=value)


class PersonalRecordFilter(django_filters.FilterSet):
    """
    Filters for PersonalRecord queries.
    """
    exercise = django_filters.NumberFilter(field_name='exercise__id')
    exercise_name = django_filters.CharFilter(
        field_name='exercise__name',
        lookup_expr='icontains'
    )
    exercise_category = django_filters.CharFilter(
        field_name='exercise__category',
        lookup_expr='iexact'
    )
    
    record_type = django_filters.ChoiceFilter(
        choices=[
            ('1rm', '1 Rep Max'),
            ('max_weight', 'Max Weight'),
            ('max_reps', 'Max Reps'),
            ('max_volume', 'Max Volume'),
            ('fastest_time', 'Fastest Time'),
            ('longest_distance', 'Longest Distance'),
            ('max_power', 'Max Power'),
            ('best_pace', 'Best Pace'),
        ]
    )
    
    achieved_after = django_filters.DateFilter(
        field_name='achieved_at',
        lookup_expr='date__gte'
    )
    achieved_before = django_filters.DateFilter(
        field_name='achieved_at',
        lookup_expr='date__lte'
    )
    
    class Meta:
        model = PersonalRecord
        fields = [
            'exercise', 'exercise_name', 'exercise_category',
            'record_type', 'is_current', 'sport',
            'achieved_after', 'achieved_before'
        ]


class ProgramSubscriptionFilter(django_filters.FilterSet):
    """
    Filters for ProgramSubscription queries.
    """
    status = django_filters.ChoiceFilter(
        choices=[
            ('active', 'Active'),
            ('paused', 'Paused'),
            ('completed', 'Completed'),
            ('abandoned', 'Abandoned'),
        ]
    )
    
    program = django_filters.NumberFilter(field_name='program__id')
    program_title = django_filters.CharFilter(
        field_name='program__title',
        lookup_expr='icontains'
    )
    program_focus = django_filters.CharFilter(
        field_name='program__focus',
        lookup_expr='iexact'
    )
    
    started_after = django_filters.DateFilter(
        field_name='started_at',
        lookup_expr='date__gte'
    )
    
    class Meta:
        model = ProgramSubscription
        fields = [
            'status', 'program', 'program_title', 'program_focus',
            'started_after', 'current_week'
        ]