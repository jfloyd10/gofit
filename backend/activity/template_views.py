import os
import tempfile
import json 
import polyline 

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views import View
from django.utils.decorators import method_decorator
from django.http import JsonResponse

from activity.models import FitFileImport, WorkoutLog, RecordDataPoint, LapLog, SetLog, ActivityLog
from activity.services.fit_parser import FitFileParserService

# Import standardized utils from the main backend app
from backend.utils import (
    convert_distance,
    convert_elevation,
    convert_weight,
    get_speed_or_pace,
    convert_speed_to_unit
)

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
        RecordDataPoint.objects.filter(workout_log_id__in=workout_ids).delete()
        
        activity_ids = list(ActivityLog.objects.filter(workout_log_id__in=workout_ids).values_list('id', flat=True))
        SetLog.objects.filter(activity_log_id__in=activity_ids).delete()
        
        ActivityLog.objects.filter(workout_log_id__in=workout_ids).delete()
        LapLog.objects.filter(workout_log_id__in=workout_ids).delete()
        DeviceInfo.objects.filter(workout_log_id__in=workout_ids).delete()
        PersonalRecord.objects.filter(user=user).delete()
        FitFileImport.objects.filter(user=user).delete()
        
        # Finally, workouts themselves
        count = len(workout_ids)
        WorkoutLog.objects.filter(id__in=workout_ids).delete()
        
        return count


@method_decorator(login_required, name='dispatch')
class WorkoutDetailView(View):
    """
    Detailed view of a single workout with all logs.
    Uses standardized utils for unit conversion.
    """
    template_name = 'activity/workout_detail.html'
    
    def get(self, request, workout_id):
        workout = get_object_or_404(
            WorkoutLog.objects.select_related('session', 'session__week', 'session__week__program'),
            id=workout_id,
            user=request.user
        )
        
        # 1. Determine User Units Preference
        try:
            user_units = request.user.user_profile.units
        except Exception:
            user_units = 'imperial' # Default
            
        is_metric = (user_units == 'metric')

        # 2. Format Main Workout Stats
        dist_val, dist_unit = convert_distance(workout.total_distance, is_metric)
        elev_val, elev_unit = convert_elevation(workout.total_ascent, is_metric)
        speed_val, speed_label = get_speed_or_pace(workout.avg_speed, is_metric, workout.sport)
        
        # Create a display object for the template
        formatted_workout = {
            'distance': f"{dist_val:,.2f}" if dist_val is not None else None,
            'distance_label': f"Distance ({dist_unit})" if dist_val else "Distance",
            'elevation': f"{elev_val:,.0f}" if elev_val is not None else None,
            'elevation_label': f"Elev Gain ({elev_unit})" if elev_val else "Elev Gain",
            'avg_speed': speed_val,
            'avg_speed_label': f"Avg {speed_label}",
            'calories': f"{workout.total_calories:,}" if workout.total_calories else None,
            'tss': f"{workout.training_stress_score:.0f}" if workout.training_stress_score else None,
        }

        # 3. Process Activities & Sets (Weight conversion)
        activity_logs_qs = workout.activity_logs.select_related(
            'exercise', 'activity'
        ).prefetch_related('set_logs').order_by('order_in_workout')
        
        formatted_activities = []
        for activity in activity_logs_qs:
            act_wrapper = {
                'obj': activity,
                'sets': []
            }
            
            # Calculate total volume for header
            vol_val, vol_unit = convert_weight(activity.total_volume, is_metric)
            act_wrapper['formatted_volume'] = f"{vol_val:,.0f}{vol_unit}" if vol_val else None

            for s in activity.set_logs.all():
                w_val, w_unit = convert_weight(s.weight, is_metric)
                v_val, v_unit = convert_weight(s.volume, is_metric)
                
                act_wrapper['sets'].append({
                    'set_number': s.set_number,
                    'weight_display': f"{w_val:.1f}{w_unit}" if w_val else "—",
                    'is_per_side': s.is_per_side,
                    'reps': s.reps,
                    'is_to_failure': s.is_to_failure,
                    'rpe': s.rpe,
                    'volume_display': f"{v_val:.0f}{v_unit}" if v_val else "—",
                    'is_completed': s.is_completed
                })
            formatted_activities.append(act_wrapper)

        # 4. Process Laps
        laps_qs = workout.laps.all().order_by('lap_number')
        formatted_laps = []
        for lap in laps_qs:
            l_dist, l_dist_u = convert_distance(lap.total_distance, is_metric)
            l_speed, l_speed_u = get_speed_or_pace(lap.avg_speed, is_metric, workout.sport)
            
            formatted_laps.append({
                'lap_number': lap.lap_number,
                'time': f"{lap.total_elapsed_time:.0f}s" if lap.total_elapsed_time else "—",
                'distance': f"{l_dist:,.2f}{l_dist_u}" if l_dist else "—",
                'speed': l_speed if l_speed else "—",
                'power': lap.avg_power,
                'hr': lap.avg_heart_rate,
                'cadence': lap.avg_cadence,
                'intensity': lap.intensity
            })

        # 5. Process Charts (Convert raw data points)
        records_count = workout.records.count()
        records_sample = []
        
        if records_count > 0:
            sample_rate = max(1, records_count // 200)
            records_qs = workout.records.order_by('elapsed_seconds')
            
            # Fetch raw data
            raw_records = list(records_qs.values(
                'id', 'elapsed_seconds', 'heart_rate', 'speed', 
                'power', 'cadence', 'altitude', 'latitude', 'longitude'
            )[::sample_rate])
            
            for r in raw_records:
                # Use convert_speed_to_unit for charts (returns float)
                chart_speed = convert_speed_to_unit(r['speed'], is_metric)
                
                # Use convert_elevation (returns tuple, index 0 is val)
                chart_alt_val, _ = convert_elevation(r['altitude'], is_metric)
                chart_alt = chart_alt_val if chart_alt_val else 0
                
                records_sample.append({
                    'elapsed_seconds': float(r['elapsed_seconds']),
                    'heart_rate': r['heart_rate'],
                    'speed': chart_speed, 
                    'altitude': chart_alt,
                    'power': r['power'],
                    'cadence': r['cadence'],
                    'latitude': float(r['latitude']) if r['latitude'] else None,
                    'longitude': float(r['longitude']) if r['longitude'] else None,
                })
        
        records_json = json.dumps(records_sample)

        # Map Polyline
        map_coords_json = None
        if workout.map_polyline:
            try:
                coords = polyline.decode(workout.map_polyline)
                map_coords_json = json.dumps([list(c) for c in coords])
            except Exception:
                pass
        
        stats = {
            'total_activities': len(formatted_activities),
            'total_sets': sum(len(a['sets']) for a in formatted_activities),
            'total_laps': laps_qs.count(),
            'total_records': records_count,
        }
        
        chart_units = {
            'speed': 'km/h' if is_metric else 'mph',
            'altitude': 'm' if is_metric else 'ft'
        }
        
        context = {
            'workout': workout,
            'formatted_workout': formatted_workout,
            'formatted_activities': formatted_activities,
            'formatted_laps': formatted_laps,
            'devices': workout.devices.all(),
            'records_json': records_json,
            'map_coords_json': map_coords_json,
            'has_records': records_count > 0,
            'fit_import': FitFileImport.objects.filter(workout_log=workout).first(),
            'stats': stats,
            'page_title': workout.title or 'Workout Detail',
            'chart_units': chart_units,
            'speed_label_header': speed_label, 
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