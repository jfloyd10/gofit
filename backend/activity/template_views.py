"""
GoFit Activity App - Template Views
=====================================

Django template views for the activity app.
"""

import os
import tempfile

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views import View
from django.utils.decorators import method_decorator
from django.http import JsonResponse

from activity.models import FitFileImport, WorkoutLog
from activity.services.fit_parser import FitFileParserService


@method_decorator(login_required, name='dispatch')
class FitFileUploadView(View):
    """
    Template view for uploading FIT files.
    """
    template_name = 'activity/fit_upload.html'
    
    def get(self, request):
        """Display the upload form and recent imports."""
        recent_imports = FitFileImport.objects.filter(
            user=request.user
        ).select_related('workout_log').order_by('-uploaded_at')[:10]
        
        context = {
            'recent_imports': recent_imports,
            'page_title': 'Upload FIT File',
            'active_nav': 'upload',
        }
        return render(request, self.template_name, context)
    
    def post(self, request):
        """Handle FIT file upload."""
        uploaded_file = request.FILES.get('fit_file')
        
        if not uploaded_file:
            messages.error(request, 'Please select a FIT file to upload.')
            return redirect('/activity/upload/')
        
        # Validate file extension
        if not uploaded_file.name.lower().endswith('.fit'):
            messages.error(request, 'Invalid file type. Please upload a .FIT file.')
            return redirect('/activity/upload/')
        
        # Validate file size (max 50MB)
        if uploaded_file.size > 50 * 1024 * 1024:
            messages.error(request, 'File too large. Maximum size is 50MB.')
            return redirect('/activity/upload/')
        
        # Save to temporary file
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.fit') as tmp:
                for chunk in uploaded_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
            
            # Parse and import
            parser = FitFileParserService(user=request.user)
            workout_log, fit_import = parser.parse_and_import(
                tmp_path,
                check_duplicates=True
            )
            
            if workout_log:
                messages.success(
                    request, 
                    f'Successfully imported "{workout_log.title}" - '
                    f'{workout_log.get_sport_display()} workout from {workout_log.started_at.strftime("%b %d, %Y")}'
                )
                
                # Show any warnings
                for warning in parser.warnings:
                    messages.warning(request, warning)
            else:
                messages.warning(request, 'File was a duplicate and was not imported again.')
                
        except ValueError as e:
            messages.error(request, f'Invalid FIT file: {str(e)}')
        except Exception as e:
            messages.error(request, f'Error processing file: {str(e)}')
        finally:
            # Cleanup temp file
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
        return redirect('/activity/upload/')


@method_decorator(login_required, name='dispatch')
class WorkoutManagementView(View):
    """
    Simple UI for managing/deleting workouts quickly.
    """
    template_name = 'activity/workout_management.html'
    
    def get(self, request):
        """Display workouts list."""
        workouts = WorkoutLog.objects.filter(
            user=request.user
        ).order_by('-started_at')[:100]
        
        # Get counts for display
        workout_count = WorkoutLog.objects.filter(user=request.user).count()
        
        context = {
            'workouts': workouts,
            'workout_count': workout_count,
            'page_title': 'Manage Workouts',
        }
        return render(request, self.template_name, context)
    
    def post(self, request):
        """Handle delete actions."""
        action = request.POST.get('action')
        
        if action == 'delete_selected':
            # Delete selected workouts
            workout_ids = request.POST.getlist('workout_ids')
            if workout_ids:
                deleted = self._bulk_delete_workouts(request.user, workout_ids)
                messages.success(request, f'Successfully deleted {deleted} workout(s).')
        
        elif action == 'delete_all':
            # Delete ALL workouts for this user
            deleted = self._bulk_delete_all_workouts(request.user)
            messages.success(request, f'Successfully deleted all {deleted} workout(s).')
        
        elif action == 'delete_one':
            # Delete a single workout
            workout_id = request.POST.get('workout_id')
            if workout_id:
                deleted = self._bulk_delete_workouts(request.user, [workout_id])
                if deleted:
                    messages.success(request, 'Workout deleted successfully.')
                else:
                    messages.error(request, 'Workout not found.')
        
        return redirect('/activity/manage/')
    
    def _bulk_delete_workouts(self, user, workout_ids):
        """Efficiently delete workouts by ID using bulk operations."""
        from django.db import connection
        
        # Get workouts owned by this user
        workouts = WorkoutLog.objects.filter(user=user, id__in=workout_ids)
        workout_pks = list(workouts.values_list('id', flat=True))
        
        if not workout_pks:
            return 0
        
        # Delete related objects in order (most efficient with raw SQL for large datasets)
        from activity.models import RecordDataPoint, LapLog, SetLog, ActivityLog, DeviceInfo, FitFileImport, PersonalRecord
        
        # Delete in reverse dependency order
        RecordDataPoint.objects.filter(workout_log_id__in=workout_pks).delete()
        
        # Get activity log IDs for set deletion
        activity_log_ids = list(ActivityLog.objects.filter(
            workout_log_id__in=workout_pks
        ).values_list('id', flat=True))
        
        if activity_log_ids:
            SetLog.objects.filter(activity_log_id__in=activity_log_ids).delete()
        
        ActivityLog.objects.filter(workout_log_id__in=workout_pks).delete()
        LapLog.objects.filter(workout_log_id__in=workout_pks).delete()
        DeviceInfo.objects.filter(workout_log_id__in=workout_pks).delete()
        PersonalRecord.objects.filter(workout_log_id__in=workout_pks).delete()
        FitFileImport.objects.filter(workout_log_id__in=workout_pks).delete()
        
        # Finally delete the workouts
        count = workouts.delete()[0]
        return len(workout_pks)
    
    def _bulk_delete_all_workouts(self, user):
        """Delete ALL workouts for a user efficiently."""
        from activity.models import RecordDataPoint, LapLog, SetLog, ActivityLog, DeviceInfo, FitFileImport, PersonalRecord
        
        # Get all workout IDs
        workout_pks = list(WorkoutLog.objects.filter(user=user).values_list('id', flat=True))
        
        if not workout_pks:
            return 0
        
        # Get all activity log IDs
        activity_log_ids = list(ActivityLog.objects.filter(
            workout_log_id__in=workout_pks
        ).values_list('id', flat=True))
        
        # Bulk delete in order
        RecordDataPoint.objects.filter(workout_log_id__in=workout_pks).delete()
        
        if activity_log_ids:
            SetLog.objects.filter(activity_log_id__in=activity_log_ids).delete()
        
        ActivityLog.objects.filter(workout_log_id__in=workout_pks).delete()
        LapLog.objects.filter(workout_log_id__in=workout_pks).delete()
        DeviceInfo.objects.filter(workout_log_id__in=workout_pks).delete()
        PersonalRecord.objects.filter(workout_log_id__in=workout_pks).delete()
        FitFileImport.objects.filter(workout_log_id__in=workout_pks).delete()
        
        # Delete workouts
        WorkoutLog.objects.filter(user=user).delete()
        
        return len(workout_pks)


@method_decorator(login_required, name='dispatch')
class WorkoutAdminView(View):
    """
    Simple admin view for managing workouts - fast bulk deletion.
    """
    template_name = 'activity/workout_admin.html'
    
    def get(self, request):
        """Display workouts with delete options."""
        workouts = WorkoutLog.objects.filter(
            user=request.user
        ).order_by('-started_at')[:100]
        
        # Get counts for display
        stats = {
            'total_workouts': WorkoutLog.objects.filter(user=request.user).count(),
            'total_imports': FitFileImport.objects.filter(user=request.user).count(),
        }
        
        context = {
            'workouts': workouts,
            'stats': stats,
            'page_title': 'Workout Admin',
            'active_nav': 'admin',
        }
        return render(request, self.template_name, context)
    
    def post(self, request):
        """Handle deletion requests."""
        action = request.POST.get('action')
        
        if action == 'delete_selected':
            # Delete selected workouts
            workout_ids = request.POST.getlist('workout_ids')
            if workout_ids:
                deleted = self._delete_workouts(request.user, workout_ids)
                messages.success(request, f'Deleted {deleted} workout(s) and all related data.')
        
        elif action == 'delete_all':
            # Delete ALL user's workout data
            deleted = self._delete_all_workouts(request.user)
            messages.success(request, f'Deleted all workout data: {deleted} workout(s) removed.')
        
        elif action == 'delete_imports':
            # Delete all FIT imports (but keep workouts)
            deleted = FitFileImport.objects.filter(user=request.user).delete()
            messages.success(request, f'Deleted {deleted[0]} import record(s).')
        
        return redirect('/activity/admin/')
    
    def _delete_workouts(self, user, workout_ids):
        """Efficiently delete specific workouts and all related data."""
        from django.db import connection
        
        workouts = WorkoutLog.objects.filter(user=user, id__in=workout_ids)
        count = workouts.count()
        
        # Delete in order to avoid FK issues (or let CASCADE handle it)
        # The CASCADE should handle this, but explicit is faster for large datasets
        for workout in workouts:
            # Delete time-series data first (usually the biggest table)
            workout.records.all().delete()
            # Delete laps
            workout.laps.all().delete()
            # Delete activity logs and their sets
            for activity in workout.activity_logs.all():
                activity.set_logs.all().delete()
            workout.activity_logs.all().delete()
            # Delete devices
            workout.devices.all().delete()
        
        # Finally delete the workouts
        workouts.delete()
        
        # Also clean up orphaned FIT imports
        FitFileImport.objects.filter(user=user, workout_log__isnull=True).delete()
        
        return count
    
    def _delete_all_workouts(self, user):
        """Efficiently delete ALL workout data for a user."""
        from activity.models import RecordDataPoint, LapLog, SetLog, ActivityLog, DeviceInfo, PersonalRecord
        
        # Get all workout IDs for this user
        workout_ids = list(WorkoutLog.objects.filter(user=user).values_list('id', flat=True))
        
        if not workout_ids:
            return 0
        
        # Delete in order from most nested to least nested
        # 1. Time-series records (usually millions of rows)
        RecordDataPoint.objects.filter(workout_log_id__in=workout_ids).delete()
        
        # 2. Set logs (via activity logs)
        activity_ids = list(ActivityLog.objects.filter(workout_log_id__in=workout_ids).values_list('id', flat=True))
        SetLog.objects.filter(activity_log_id__in=activity_ids).delete()
        
        # 3. Activity logs
        ActivityLog.objects.filter(workout_log_id__in=workout_ids).delete()
        
        # 4. Lap logs
        LapLog.objects.filter(workout_log_id__in=workout_ids).delete()
        
        # 5. Device info
        DeviceInfo.objects.filter(workout_log_id__in=workout_ids).delete()
        
        # 6. Personal records
        PersonalRecord.objects.filter(user=user).delete()
        
        # 7. FIT imports
        FitFileImport.objects.filter(user=user).delete()
        
        # 8. Finally, workouts themselves
        count = len(workout_ids)
        WorkoutLog.objects.filter(id__in=workout_ids).delete()
        
        return count


@method_decorator(login_required, name='dispatch')
class WorkoutDetailView(View):
    """
    Detailed view of a single workout with all logs.
    """
    template_name = 'activity/workout_detail.html'
    
    def get(self, request, workout_id):
        """Display workout detail."""
        from django.shortcuts import get_object_or_404
        from activity.models import RecordDataPoint
        from decimal import Decimal
        import json
        
        workout = get_object_or_404(
            WorkoutLog.objects.select_related('session', 'session__week', 'session__week__program'),
            id=workout_id,
            user=request.user
        )
        
        # Get activity logs with sets
        activity_logs = workout.activity_logs.select_related(
            'exercise', 'activity'
        ).prefetch_related('set_logs').order_by('order_in_workout')
        
        # Get laps
        laps = workout.laps.all().order_by('lap_number')
        
        # Get devices
        devices = workout.devices.all()
        
        # Get time-series data summary (sample for charts)
        records_count = workout.records.count()
        records_sample = []
        
        if records_count > 0:
            # Sample every Nth record for charting (aim for ~200 points)
            sample_rate = max(1, records_count // 200)
            records_qs = workout.records.order_by('elapsed_seconds')
            
            # Get sampled records
            record_ids = list(records_qs.values_list('id', flat=True)[::sample_rate])
            records_raw = list(records_qs.filter(id__in=record_ids).values(
                'elapsed_seconds', 'heart_rate', 'speed', 'power', 
                'cadence', 'altitude', 'latitude', 'longitude'
            ))
            
            # Convert Decimal values to float for JSON serialization
            for record in records_raw:
                converted = {}
                for key, value in record.items():
                    if isinstance(value, Decimal):
                        converted[key] = float(value)
                    else:
                        converted[key] = value
                records_sample.append(converted)
        
        # Serialize to JSON string for safe JavaScript embedding
        records_json = json.dumps(records_sample)
        
        # Get FIT import info if exists
        fit_import = FitFileImport.objects.filter(workout_log=workout).first()
        
        # Calculate some additional stats
        stats = {
            'total_activities': activity_logs.count(),
            'total_sets': sum(a.total_sets or 0 for a in activity_logs),
            'total_reps': sum(a.total_reps or 0 for a in activity_logs),
            'total_laps': laps.count(),
            'total_records': records_count,
        }
        
        context = {
            'workout': workout,
            'activity_logs': activity_logs,
            'laps': laps,
            'devices': devices,
            'records_json': records_json,
            'has_records': records_count > 0,
            'fit_import': fit_import,
            'stats': stats,
            'page_title': workout.title or 'Workout Detail',
            'active_nav': 'admin',
        }
        return render(request, self.template_name, context)


@method_decorator(login_required, name='dispatch')
class FitFileUploadAjaxView(View):
    """
    AJAX endpoint for FIT file uploads (for drag-and-drop).
    """
    
    def post(self, request):
        """Handle AJAX FIT file upload."""
        uploaded_file = request.FILES.get('fit_file')
        
        if not uploaded_file:
            return JsonResponse({
                'success': False,
                'error': 'No file provided'
            }, status=400)
        
        # Validate file extension
        if not uploaded_file.name.lower().endswith('.fit'):
            return JsonResponse({
                'success': False,
                'error': 'Invalid file type. Please upload a .FIT file.'
            }, status=400)
        
        # Validate file size (max 50MB)
        if uploaded_file.size > 50 * 1024 * 1024:
            return JsonResponse({
                'success': False,
                'error': 'File too large. Maximum size is 50MB.'
            }, status=400)
        
        # Save to temporary file
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.fit') as tmp:
                for chunk in uploaded_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
            
            # Parse and import
            parser = FitFileParserService(user=request.user)
            workout_log, fit_import = parser.parse_and_import(
                tmp_path,
                check_duplicates=True
            )
            
            if workout_log:
                return JsonResponse({
                    'success': True,
                    'message': f'Successfully imported "{workout_log.title}"',
                    'workout': {
                        'id': workout_log.id,
                        'title': workout_log.title,
                        'sport': workout_log.get_sport_display(),
                        'date': workout_log.started_at.strftime('%b %d, %Y'),
                        'duration': workout_log.duration_formatted,
                        'distance': f'{float(workout_log.total_distance or 0) / 1000:.2f} km' if workout_log.total_distance else None,
                        'calories': workout_log.total_calories,
                    },
                    'warnings': parser.warnings
                })
            else:
                return JsonResponse({
                    'success': True,
                    'message': 'File was a duplicate and was not imported again.',
                    'duplicate': True
                })
                
        except ValueError as e:
            return JsonResponse({
                'success': False,
                'error': f'Invalid FIT file: {str(e)}'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Error processing file: {str(e)}'
            }, status=500)
        finally:
            # Cleanup temp file
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)