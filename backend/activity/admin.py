from django.contrib import admin
from django.utils.html import format_html

from activity.models import (
    WorkoutLog, ActivityLog, SetLog, LapLog,
    RecordDataPoint, DeviceInfo, FitFileImport,
    PersonalRecord, ProgramSubscription
)


@admin.register(WorkoutLog)
class WorkoutLogAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'title', 'sport', 'source',
        'started_at', 'duration_display', 'distance_display',
        'created_at'
    ]
    list_filter = ['sport', 'source', 'created_at', 'started_at']
    search_fields = ['title', 'user__username', 'notes']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'started_at'
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'session', 'title', 'notes', 'source', 'sport', 'sub_sport')
        }),
        ('Timing', {
            'fields': ('started_at', 'ended_at', 'total_elapsed_time', 'total_timer_time', 'total_moving_time')
        }),
        ('Distance & Elevation', {
            'fields': ('total_distance', 'total_ascent', 'total_descent', 'min_altitude', 'max_altitude')
        }),
        ('Energy', {
            'fields': ('total_calories', 'total_work')
        }),
        ('Heart Rate', {
            'fields': ('avg_heart_rate', 'max_heart_rate', 'min_heart_rate')
        }),
        ('Speed & Power', {
            'fields': ('avg_speed', 'max_speed', 'avg_power', 'max_power', 'normalized_power')
        }),
        ('Cadence', {
            'fields': ('avg_cadence', 'max_cadence')
        }),
        ('Training Metrics', {
            'fields': ('training_stress_score', 'intensity_factor', 'training_effect_aerobic', 'training_effect_anaerobic')
        }),
        ('Strength Training', {
            'fields': ('total_sets_completed', 'total_reps_completed', 'total_volume'),
            'classes': ('collapse',)
        }),
        ('User Feedback', {
            'fields': ('perceived_exertion', 'mood_before', 'mood_after'),
            'classes': ('collapse',)
        }),
        ('Location', {
            'fields': ('start_lat', 'start_long', 'end_lat', 'end_long'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('is_public', 'cover_image', 'created_at', 'updated_at')
        }),
    )
    
    def duration_display(self, obj):
        return obj.duration_formatted or '-'
    duration_display.short_description = 'Duration'
    
    def distance_display(self, obj):
        if obj.total_distance:
            km = float(obj.total_distance) / 1000
            return f"{km:.2f} km"
        return '-'
    distance_display.short_description = 'Distance'


class SetLogInline(admin.TabularInline):
    model = SetLog
    extra = 0
    fields = ['set_number', 'set_type', 'weight', 'reps', 'rpe', 'is_completed']


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'workout_log', 'display_name', 'order_in_workout',
        'total_sets', 'total_reps', 'total_volume'
    ]
    list_filter = ['workout_log__sport', 'exercise__category']
    search_fields = ['exercise__name', 'manual_name', 'workout_log__title']
    inlines = [SetLogInline]
    
    def display_name(self, obj):
        return obj.display_name
    display_name.short_description = 'Exercise'


@admin.register(SetLog)
class SetLogAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'activity_log', 'set_number', 'set_type',
        'weight', 'reps', 'rpe', 'is_completed'
    ]
    list_filter = ['set_type', 'is_completed', 'is_to_failure']
    search_fields = ['activity_log__exercise__name', 'activity_log__manual_name']


@admin.register(LapLog)
class LapLogAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'workout_log', 'lap_number', 'intensity',
        'total_distance', 'total_elapsed_time', 'avg_heart_rate'
    ]
    list_filter = ['intensity', 'lap_trigger']
    search_fields = ['workout_log__title']


@admin.register(RecordDataPoint)
class RecordDataPointAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'workout_log', 'elapsed_seconds',
        'heart_rate', 'power', 'speed', 'cadence'
    ]
    list_filter = ['workout_log__sport']
    search_fields = ['workout_log__title']
    
    def get_queryset(self, request):
        # Limit records shown for performance
        return super().get_queryset(request)[:1000]


@admin.register(DeviceInfo)
class DeviceInfoAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'workout_log', 'manufacturer', 'product_name',
        'device_type', 'serial_number'
    ]
    list_filter = ['manufacturer', 'device_type']
    search_fields = ['manufacturer', 'product_name', 'serial_number']


@admin.register(FitFileImport)
class FitFileImportAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'original_filename', 'status',
        'fit_manufacturer', 'uploaded_at', 'processed_at'
    ]
    list_filter = ['status', 'fit_manufacturer', 'uploaded_at']
    search_fields = ['original_filename', 'user__username', 'file_hash']
    readonly_fields = ['file_hash', 'uploaded_at', 'processed_at']
    
    def status_display(self, obj):
        colors = {
            'pending': 'orange',
            'processing': 'blue',
            'completed': 'green',
            'failed': 'red',
            'duplicate': 'gray',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {};">{}</span>',
            color, obj.get_status_display()
        )
    status_display.short_description = 'Status'


@admin.register(PersonalRecord)
class PersonalRecordAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'exercise', 'record_type',
        'weight_kg', 'reps', 'achieved_at', 'is_current'
    ]
    list_filter = ['record_type', 'is_current', 'sport', 'achieved_at']
    search_fields = ['user__username', 'exercise__name', 'manual_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ProgramSubscription)
class ProgramSubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'program', 'status',
        'current_week', 'started_at', 'completion_display'
    ]
    list_filter = ['status', 'started_at']
    search_fields = ['user__username', 'program__title']
    readonly_fields = ['started_at', 'created_at', 'updated_at']
    
    def completion_display(self, obj):
        pct = obj.completion_percentage
        if pct >= 75:
            color = 'green'
        elif pct >= 50:
            color = 'orange'
        else:
            color = 'gray'
        return format_html(
            '<span style="color: {};">{:.1f}%</span>',
            color, pct
        )
    completion_display.short_description = 'Completion'