import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any, List, Tuple
from pathlib import Path
import polyline


try:
    import fitparse
except ImportError:
    fitparse = None

from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone as django_timezone

# Import models from activity app
from activity.models import (
    WorkoutLog, LapLog, RecordDataPoint, DeviceInfo, FitFileImport,
    WorkoutSource, SportType, SubSportType, IntensityLevel, LapTrigger
)


class FitFileParserService:
    """
    Service for parsing and importing FIT files into the GoFit database.
    """
    
    # Semicircle to degrees conversion factor
    SEMICIRCLE_TO_DEGREES = 180.0 / (2**31)
    
    # Sport type mapping from FIT SDK
    SPORT_MAP = {
        'running': SportType.RUNNING,
        'cycling': SportType.CYCLING,
        'swimming': SportType.SWIMMING,
        'fitness_equipment': SportType.STRENGTH,
        'training': SportType.STRENGTH,
        'walking': SportType.WALKING,
        'hiking': SportType.HIKING,
        'rowing': SportType.ROWING,
        'elliptical': SportType.ELLIPTICAL,
        'stair_climbing': SportType.STAIR_CLIMBING,
        'alpine_skiing': SportType.SKIING,
        'snowboarding': SportType.SKIING,
    }
    
    SUB_SPORT_MAP = {
        'generic': SubSportType.GENERIC,
        'treadmill': SubSportType.TREADMILL,
        'street': SubSportType.STREET,
        'trail': SubSportType.TRAIL,
        'track': SubSportType.TRACK,
        'spin': SubSportType.INDOOR_CYCLING,
        'indoor_cycling': SubSportType.INDOOR_CYCLING,
        'virtual_activity': SubSportType.VIRTUAL,
        'open_water': SubSportType.OPEN_WATER,
        'lap_swimming': SubSportType.LAP_SWIMMING,
    }
    
    def __init__(self, user: User):
        """
        Initialize the parser service.
        
        Args:
            user: The user to associate imported workouts with
        """
        if fitparse is None:
            raise ImportError(
                "fitparse is required for FIT file parsing. "
                "Install with: pip install fitparse"
            )
        self.user = user
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of file for duplicate detection."""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def parse_fit_file(self, file_path: str) -> Dict[str, Any]:
        """
        Parse a FIT file and extract all relevant data.
        
        Args:
            file_path: Path to the FIT file
            
        Returns:
            Dictionary containing parsed data organized by message type
        """
        fitfile = fitparse.FitFile(file_path)
        
        data = {
            'file_id': None,
            'session': None,
            'laps': [],
            'records': [],
            'devices': [],
            'workout': None,
            'workout_steps': [],
            'events': [],
        }
        
        for record in fitfile.get_messages():
            record_data = self._extract_record_data(record)
            
            if record.name == 'file_id':
                data['file_id'] = record_data
            elif record.name == 'session':
                data['session'] = record_data
            elif record.name == 'lap':
                data['laps'].append(record_data)
            elif record.name == 'record':
                data['records'].append(record_data)
            elif record.name == 'device_info':
                data['devices'].append(record_data)
            elif record.name == 'workout':
                data['workout'] = record_data
            elif record.name == 'workout_step':
                data['workout_steps'].append(record_data)
            elif record.name == 'event':
                data['events'].append(record_data)
        
        return data
    
    def _extract_record_data(self, record) -> Dict[str, Any]:
        """Extract field data from a FIT record."""
        data = {}
        for field in record.fields:
            value = field.value
            # Handle special types
            if isinstance(value, datetime):
                value = value.replace(tzinfo=timezone.utc)
            data[field.name] = value
        return data
    
    def _convert_semicircles_to_degrees(self, semicircles: int) -> Optional[Decimal]:
        """Convert semicircle coordinates to decimal degrees."""
        if semicircles is None:
            return None
        return Decimal(str(semicircles * self.SEMICIRCLE_TO_DEGREES))
    
    def _safe_decimal(self, value: Any, precision: int = 2) -> Optional[Decimal]:
        """Safely convert a value to Decimal."""
        if value is None:
            return None
        try:
            return Decimal(str(round(float(value), precision)))
        except (ValueError, TypeError):
            return None
    
    def _safe_int(self, value: Any) -> Optional[int]:
        """Safely convert a value to int."""
        if value is None:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
    
    def _map_sport(self, sport: str) -> str:
        """Map FIT sport type to our sport type."""
        if sport is None:
            return SportType.OTHER
        sport_lower = str(sport).lower()
        return self.SPORT_MAP.get(sport_lower, SportType.OTHER)
    
    def _map_sub_sport(self, sub_sport: str) -> str:
        """Map FIT sub_sport type to our sub_sport type."""
        if sub_sport is None:
            return SubSportType.GENERIC
        sub_sport_lower = str(sub_sport).lower()
        return self.SUB_SPORT_MAP.get(sub_sport_lower, SubSportType.GENERIC)
    
    @transaction.atomic
    def parse_and_import(
        self, 
        file_path: str,
        storage_path: Optional[str] = None,
        check_duplicates: bool = True
    ) -> Tuple[WorkoutLog, FitFileImport]:
        """
        Parse a FIT file and import it into the database.
        
        Args:
            file_path: Path to the FIT file
            storage_path: Cloud storage path (if already uploaded)
            check_duplicates: Whether to check for duplicate imports
            
        Returns:
            Tuple of (WorkoutLog, FitFileImport) objects
        """
        file_path = Path(file_path)
        file_hash = self.calculate_file_hash(str(file_path))
        file_size = file_path.stat().st_size
        
        # Check for duplicates
        if check_duplicates:
            existing = FitFileImport.objects.filter(
                user=self.user,
                file_hash=file_hash,
                status='completed'
            ).first()
            if existing:
                self.warnings.append(f"Duplicate file detected: {existing.original_filename}")
                return existing.workout_log, existing
        
        # Parse the FIT file
        data = self.parse_fit_file(str(file_path))
        
        if not data['session']:
            raise ValueError("FIT file does not contain session data")
        
        # Create the import record
        file_id = data.get('file_id', {})
        fit_import = FitFileImport.objects.create(
            user=self.user,
            original_filename=file_path.name,
            file_size=file_size,
            file_hash=file_hash,
            storage_path=storage_path,
            fit_serial_number=str(file_id.get('serial_number', '')),
            fit_time_created=file_id.get('time_created'),
            fit_manufacturer=str(file_id.get('manufacturer', '')),
            fit_product=str(file_id.get('product_name', file_id.get('product', ''))),
            fit_type=str(file_id.get('type', 'activity')),
            status='processing'
        )
        
        try:
            # Create the workout log
            session = data['session']
            workout_log = self._create_workout_log(session, data)
            
            # Create lap records
            for i, lap_data in enumerate(data['laps'], 1):
                self._create_lap_log(workout_log, lap_data, i)
            
            # Create time-series records (with sampling for performance)
            self._create_record_data_points(workout_log, data['records'])
            
            # Create device info
            for device_data in data['devices']:
                self._create_device_info(workout_log, device_data)
            
            # Update import record
            fit_import.workout_log = workout_log
            fit_import.status = 'completed'
            fit_import.processed_at = django_timezone.now()
            fit_import.save()
            
            return workout_log, fit_import
            
        except Exception as e:
            fit_import.status = 'failed'
            fit_import.error_message = str(e)
            fit_import.save()
            raise
    
    def _create_workout_log(self, session: Dict, data: Dict) -> WorkoutLog:
            """Create a WorkoutLog from session data."""
            # Determine start and end times
            start_time = session.get('start_time')
            if not start_time:
                start_time = session.get('timestamp')
            
            end_time = session.get('timestamp')
            
            # Build title
            sport = self._map_sport(session.get('sport'))
            sub_sport = self._map_sub_sport(session.get('sub_sport'))
            
            workout_name = data.get('workout', {}).get('wkt_name') if data.get('workout') else None
            if workout_name:
                title = workout_name
            else:
                sport_display = dict(SportType.choices).get(sport, sport)
                title = f"{sport_display}"
                if sub_sport != SubSportType.GENERIC:
                    sub_sport_display = dict(SubSportType.choices).get(sub_sport, sub_sport)
                    title += f" ({sub_sport_display})"
            
            # Get position data from first/last records for start/end points
            first_record = data['records'][0] if data['records'] else {}
            last_record = data['records'][-1] if data['records'] else {}

            # --- LOGIC START: Generate Map Polyline ---
            map_polyline_str = None
            records = data.get('records', [])
            
            # Only process coordinates if we have records
            if records:
                coordinates = []
                for record in records:
                    lat_semi = record.get('position_lat')
                    lng_semi = record.get('position_long')
                    
                    # Check if valid coordinates exist
                    if lat_semi is not None and lng_semi is not None:
                        # Convert semicircles to degrees (float required for polyline lib)
                        # Formula: semicircles * (180 / 2^31)
                        lat = lat_semi * self.SEMICIRCLE_TO_DEGREES
                        lng = lng_semi * self.SEMICIRCLE_TO_DEGREES
                        coordinates.append((lat, lng))
                
                # Encode if we found points
                if coordinates:
                    try:
                        map_polyline_str = polyline.encode(coordinates)
                    except Exception as e:
                        self.warnings.append(f"Failed to encode map polyline: {str(e)}")
            # --- LOGIC END ---

            workout_log = WorkoutLog.objects.create(
                user=self.user,
                title=title,
                source=WorkoutSource.GARMIN_FIT,
                external_id=str(data.get('file_id', {}).get('serial_number', '')),
                sport=sport,
                sub_sport=sub_sport,
                started_at=start_time,
                ended_at=end_time,
                
                # NEW FIELD
                map_polyline=map_polyline_str,

                # Duration
                total_elapsed_time=self._safe_decimal(session.get('total_elapsed_time'), 2),
                total_timer_time=self._safe_decimal(session.get('total_timer_time'), 2),
                total_moving_time=self._safe_decimal(session.get('total_moving_time'), 2),
                
                # Distance
                total_distance=self._safe_decimal(session.get('total_distance'), 2),
                
                # Elevation
                total_ascent=self._safe_int(session.get('total_ascent')),
                total_descent=self._safe_int(session.get('total_descent')),
                min_altitude=self._safe_decimal(session.get('enhanced_min_altitude') or session.get('min_altitude'), 2),
                max_altitude=self._safe_decimal(session.get('enhanced_max_altitude') or session.get('max_altitude'), 2),
                
                # Energy
                total_calories=self._safe_int(session.get('total_calories')),
                total_work=self._safe_int(session.get('total_work')),
                
                # Heart Rate
                avg_heart_rate=self._safe_int(session.get('avg_heart_rate')),
                max_heart_rate=self._safe_int(session.get('max_heart_rate')),
                min_heart_rate=self._safe_int(session.get('min_heart_rate')),
                
                # Speed
                avg_speed=self._safe_decimal(session.get('enhanced_avg_speed') or session.get('avg_speed'), 3),
                max_speed=self._safe_decimal(session.get('enhanced_max_speed') or session.get('max_speed'), 3),
                
                # Power
                avg_power=self._safe_int(session.get('avg_power')),
                max_power=self._safe_int(session.get('max_power')),
                normalized_power=self._safe_int(session.get('normalized_power')),
                
                # Cadence
                avg_cadence=self._safe_int(session.get('avg_cadence') or session.get('avg_running_cadence')),
                max_cadence=self._safe_int(session.get('max_cadence') or session.get('max_running_cadence')),
                
                # Training metrics
                training_stress_score=self._safe_decimal(session.get('training_stress_score'), 2),
                intensity_factor=self._safe_decimal(session.get('intensity_factor'), 3),
                training_effect_aerobic=self._safe_decimal(session.get('total_training_effect'), 1),
                training_effect_anaerobic=self._safe_decimal(session.get('total_anaerobic_training_effect'), 1),
                
                # Running dynamics
                avg_vertical_oscillation=self._safe_decimal(session.get('avg_vertical_oscillation'), 1),
                avg_stance_time=self._safe_decimal(session.get('avg_stance_time'), 1),
                avg_stride_length=self._safe_decimal(session.get('avg_step_length'), 1),
                avg_vertical_ratio=self._safe_decimal(session.get('avg_vertical_ratio'), 2),
                
                # Position
                start_lat=self._convert_semicircles_to_degrees(first_record.get('position_lat')),
                start_long=self._convert_semicircles_to_degrees(first_record.get('position_long')),
                end_lat=self._convert_semicircles_to_degrees(last_record.get('position_lat')),
                end_long=self._convert_semicircles_to_degrees(last_record.get('position_long')),
            )
            
            return workout_log
    
    def _create_lap_log(self, workout_log: WorkoutLog, lap_data: Dict, lap_number: int) -> LapLog:
        """Create a LapLog from lap data."""
        # Map lap trigger
        trigger_map = {
            'manual': LapTrigger.MANUAL,
            'time': LapTrigger.TIME,
            'distance': LapTrigger.DISTANCE,
            'position_start': LapTrigger.POSITION,
            'session_end': LapTrigger.SESSION_END,
        }
        trigger = trigger_map.get(
            str(lap_data.get('lap_trigger', '')).lower(),
            LapTrigger.MANUAL
        )
        
        # Map intensity
        intensity_map = {
            'warmup': IntensityLevel.WARMUP,
            'cooldown': IntensityLevel.COOLDOWN,
            'rest': IntensityLevel.REST,
            'recovery': IntensityLevel.RECOVERY,
            'active': IntensityLevel.ACTIVE,
        }
        intensity = intensity_map.get(
            str(lap_data.get('intensity', '')).lower(),
            IntensityLevel.ACTIVE
        )
        
        lap = LapLog.objects.create(
            workout_log=workout_log,
            lap_number=lap_number,
            lap_trigger=trigger,
            intensity=intensity,
            
            start_time=lap_data.get('start_time'),
            end_time=lap_data.get('timestamp'),
            total_elapsed_time=self._safe_decimal(lap_data.get('total_elapsed_time'), 2),
            total_timer_time=self._safe_decimal(lap_data.get('total_timer_time'), 2),
            
            total_distance=self._safe_decimal(lap_data.get('total_distance'), 2),
            total_ascent=self._safe_int(lap_data.get('total_ascent')),
            total_descent=self._safe_int(lap_data.get('total_descent')),
            min_altitude=self._safe_decimal(lap_data.get('enhanced_min_altitude'), 2),
            max_altitude=self._safe_decimal(lap_data.get('enhanced_max_altitude'), 2),
            
            total_calories=self._safe_int(lap_data.get('total_calories')),
            total_work=self._safe_int(lap_data.get('total_work')),
            
            avg_heart_rate=self._safe_int(lap_data.get('avg_heart_rate')),
            max_heart_rate=self._safe_int(lap_data.get('max_heart_rate')),
            
            avg_speed=self._safe_decimal(lap_data.get('enhanced_avg_speed'), 3),
            max_speed=self._safe_decimal(lap_data.get('enhanced_max_speed'), 3),
            
            avg_power=self._safe_int(lap_data.get('avg_power')),
            max_power=self._safe_int(lap_data.get('max_power')),
            normalized_power=self._safe_int(lap_data.get('normalized_power')),
            
            avg_cadence=self._safe_int(lap_data.get('avg_cadence') or lap_data.get('avg_running_cadence')),
            max_cadence=self._safe_int(lap_data.get('max_cadence') or lap_data.get('max_running_cadence')),
            
            avg_vertical_oscillation=self._safe_decimal(lap_data.get('avg_vertical_oscillation'), 1),
            avg_stance_time=self._safe_decimal(lap_data.get('avg_stance_time'), 1),
            avg_stride_length=self._safe_decimal(lap_data.get('avg_step_length'), 1),
            avg_vertical_ratio=self._safe_decimal(lap_data.get('avg_vertical_ratio'), 2),
            
            start_lat=self._convert_semicircles_to_degrees(lap_data.get('start_position_lat')),
            start_long=self._convert_semicircles_to_degrees(lap_data.get('start_position_long')),
            end_lat=self._convert_semicircles_to_degrees(lap_data.get('end_position_lat')),
            end_long=self._convert_semicircles_to_degrees(lap_data.get('end_position_long')),
        )
        
        return lap
    
    def _create_record_data_points(
        self, 
        workout_log: WorkoutLog, 
        records: List[Dict],
        sample_rate: int = 1
    ):
        """
        Create RecordDataPoint entries from record data.
        
        Args:
            workout_log: Parent workout log
            records: List of record data dictionaries
            sample_rate: Only keep every Nth record (1 = all, 2 = every other, etc.)
        """
        if not records:
            return
        
        start_time = records[0].get('timestamp')
        data_points = []
        
        for i, record in enumerate(records):
            # Apply sampling
            if sample_rate > 1 and i % sample_rate != 0:
                continue
            
            timestamp = record.get('timestamp')
            if not timestamp or not start_time:
                continue
            
            elapsed = (timestamp - start_time).total_seconds()
            
            data_points.append(RecordDataPoint(
                workout_log=workout_log,
                timestamp=timestamp,
                elapsed_seconds=Decimal(str(elapsed)),
                
                latitude=self._convert_semicircles_to_degrees(record.get('position_lat')),
                longitude=self._convert_semicircles_to_degrees(record.get('position_long')),
                altitude=self._safe_decimal(record.get('enhanced_altitude') or record.get('altitude'), 2),
                
                distance=self._safe_decimal(record.get('distance'), 2),
                speed=self._safe_decimal(record.get('enhanced_speed') or record.get('speed'), 3),
                
                heart_rate=self._safe_int(record.get('heart_rate')),
                power=self._safe_int(record.get('power')),
                accumulated_power=self._safe_int(record.get('accumulated_power')),
                cadence=self._safe_int(record.get('cadence')),
                
                vertical_oscillation=self._safe_decimal(record.get('vertical_oscillation'), 1),
                stance_time=self._safe_decimal(record.get('stance_time'), 1),
                stride_length=self._safe_decimal(record.get('step_length'), 1),
                vertical_ratio=self._safe_decimal(record.get('vertical_ratio'), 2),
                
                temperature=self._safe_decimal(record.get('temperature'), 2),
                activity_type=str(record.get('activity_type')) if record.get('activity_type') else None,
            ))
        
        # Bulk create for performance
        RecordDataPoint.objects.bulk_create(data_points, batch_size=1000)
    
    def _create_device_info(self, workout_log: WorkoutLog, device_data: Dict) -> DeviceInfo:
        """Create a DeviceInfo entry from device data."""
        device = DeviceInfo.objects.create(
            workout_log=workout_log,
            device_index=str(device_data.get('device_index', 'unknown')),
            manufacturer=str(device_data.get('manufacturer', '')),
            product_name=str(device_data.get('product_name', '')),
            product_id=self._safe_int(device_data.get('product')),
            serial_number=str(device_data.get('serial_number', '')) if device_data.get('serial_number') else None,
            device_type=str(device_data.get('device_type', '')) if device_data.get('device_type') else None,
            software_version=str(device_data.get('software_version', '')) if device_data.get('software_version') else None,
        )
        
        return device