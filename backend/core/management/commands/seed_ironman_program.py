import logging
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from core.models import (
    Program, Week, Session, SessionBlock, Activity, 
    ActivityPrescription, Exercise, Equipment
)

User = get_user_model()
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Seeds the database with the 13-Week Ironman Training Program'

    def handle(self, *args, **options):
        self.stdout.write("Starting Ironman Program Seed...")
        
        # 1. Constants & Helper Functions
        METERS_PER_MILE = Decimal("1609.34")
        METERS_PER_YARD = Decimal("0.9144")
        
        def to_meters(val, unit='miles'):
            if unit == 'miles':
                return Decimal(val) * METERS_PER_MILE
            elif unit == 'yards':
                return Decimal(val) * METERS_PER_YARD
            return Decimal(val)

        def get_duration(hours=0, minutes=0):
            return (hours * 3600) + (minutes * 60)

        # 2. Get/Create User and Exercises
        with transaction.atomic():
            # Create a dummy admin user if needed
            user, created = User.objects.get_or_create(
                username="iron_coach",
                defaults={'email': 'coach@example.com', 'is_staff': True}
            )
            if created:
                user.set_password("password123")
                user.save()

            # Create Exercises
            ex_swim, _ = Exercise.objects.get_or_create(name="Open Water Swim", defaults={'category': 'Cardio', 'is_official': True})
            ex_bike, _ = Exercise.objects.get_or_create(name="Bike (Road/Trainer)", defaults={'category': 'Cardio', 'is_official': True})
            ex_run, _ = Exercise.objects.get_or_create(name="Run", defaults={'category': 'Cardio', 'is_official': True})
            ex_strength, _ = Exercise.objects.get_or_create(name="Strength/Core", defaults={'category': 'Strength', 'is_official': True})
            ex_rest, _ = Exercise.objects.get_or_create(name="Rest", defaults={'category': 'Recovery', 'is_official': True})

            # Create Program
            program, _ = Program.objects.get_or_create(
                title="13-Week Ironman Build",
                user=user,
                defaults={
                    "focus": "Triathalon",
                    "difficulty": "Advanced",
                    "description": "A 13-week comprehensive build program for Ironman Florida. Focuses on bike volume, open water confidence, and brick sessions.",
                    "is_public": True,
                    "is_template": True
                }
            )

            # --- DATA DEFINITION ---
            # We define the schedule in a structured list to iterate over
            # Format: (WeekNum, WeekName, WeekNotes, [Sessions])
            # Session Format: (Day, Focus, Title, Description, [Blocks])
            # Block Format: (Name, Scheme, [Activities])
            # Activity Format: (Exercise, Note, [Prescriptions])
            # Prescription: (Metric, Value, Unit, Notes, DurationSeconds, IntensityType, IntensityVal)
            
            schedule = [
                # WEEK 1
                (1, "Foundation & Technique", "Establish structure. Moderate volume (~12 hrs). Emphasize swim technique.", [
                    ("Monday", "Stretch", "Rest Day", "Full recovery.", [(None, "STANDARD", [(ex_rest, "Rest Day", [])])]),
                    ("Tuesday", "Cardio", "Swim & Run", "Swim form & Run Speed", [
                        ("Swim", "STANDARD", [(ex_swim, "Technique Focus", [("distance", 1200, "yards", "Easy continuous, practice sighting", None, "rpe", "Easy")])]),
                        ("Run", "INTERVAL", [(ex_run, "Intervals", [("distance", 5, "miles", "Includes 6x400m fast w/ 200m jog", None, "pace", "5K")])])
                    ]),
                    ("Wednesday", "Cardio", "Bike Intervals", "VO2 Max Effort", [
                        ("Main Set", "INTERVAL", [(ex_bike, "VO2 Intervals", [("time", 60, "min", "5x3 min @ VO2 Max", 3600, "heart_rate_zone", "5")])])
                    ]),
                    ("Thursday", "Cardio", "Run Tempo", "Lactate Threshold", [
                        ("Main Set", "STANDARD", [(ex_run, "Tempo Run", [("distance", 6, "miles", "3 miles @ Tempo", None, "rpe", "7")])])
                    ]),
                    ("Friday", "Cardio", "Swim Endurance", "Continuous Swim", [
                        ("Main Set", "STANDARD", [(ex_swim, "Long Swim", [("distance", 1500, "yards", "Continuous, sighting practice", None, "rpe", "Aerobic")])])
                    ]),
                    ("Saturday", "Cardio", "Long Ride", "Nutrition Practice", [
                        ("Main Set", "STANDARD", [(ex_bike, "Long Ride", [("time", 180, "min", "Zone 2, 50-55 miles", 10800, "heart_rate_zone", "2")])])
                    ]),
                    ("Sunday", "Cardio", "Long Run", "Aerobic Base", [
                        ("Main Set", "STANDARD", [(ex_run, "Long Run", [("distance", 10, "miles", "Zone 2 conversational", None, "heart_rate_zone", "2")])])
                    ]),
                ]),

                # WEEK 2
                (2, "Introducing Bricks & Volume", "Increase volume (~14 hrs). First brick workout.", [
                    ("Monday", "Stretch", "Rest Day", "Rest or gentle yoga.", [(None, "STANDARD", [(ex_rest, "Rest", [])])]),
                    ("Tuesday", "Cardio", "Brick: Bike & Run", "Threshold Intervals + Run off bike", [
                        ("Bike", "INTERVAL", [(ex_bike, "Threshold Intervals", [("time", 75, "min", "4x8 min @ Threshold", 4500, "heart_rate_zone", "4")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("distance", 2, "miles", "Zone 2 immediately off bike", None, "heart_rate_zone", "2")])])
                    ]),
                    ("Wednesday", "Cardio", "Swim Intervals", "Speed and Economy", [
                        ("Main Set", "INTERVAL", [(ex_swim, "Intervals", [("distance", 1600, "yards", "8x2 min hard efforts", None, "rpe", "8-9")])])
                    ]),
                    ("Thursday", "Cardio", "Run Tempo", "Sustained Strength", [
                        ("Main Set", "STANDARD", [(ex_run, "Tempo Run", [("distance", 7, "miles", "4 miles @ Tempo", None, "rpe", "7")])])
                    ]),
                    ("Friday", "Lift", "Bike & Strength", "Active Recovery + Core", [
                        ("Bike", "STANDARD", [(ex_bike, "Easy Spin", [("time", 90, "min", "High cadence, Zone 1-2", 5400, "heart_rate_zone", "1")])]),
                        ("Strength", "STANDARD", [(ex_strength, "Core Routine", [("time", 20, "min", "Planks, glute bridges", 1200, None, None)])])
                    ]),
                    ("Saturday", "Cardio", "Long Brick", "Race Sim", [
                        ("Bike", "STANDARD", [(ex_bike, "Long Ride", [("time", 240, "min", "Zone 2, nutrition practice", 14400, "heart_rate_zone", "2")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("distance", 3, "miles", "Easy off bike", None, "heart_rate_zone", "2")])])
                    ]),
                    ("Sunday", "Cardio", "Long Run", "Fatigue Resistance", [
                        ("Main Set", "STANDARD", [(ex_run, "Long Run", [("distance", 12, "miles", "Zone 2 w/ race pace pickup at end", None, "heart_rate_zone", "2")])])
                    ]),
                ]),

                # WEEK 3
                (3, "Endurance & Intensity", "Volume ~15 hrs. Long swim added.", [
                    ("Monday", "Stretch", "Rest Day", None, [(None, "STANDARD", [(ex_rest, "Rest", [])])]),
                    ("Tuesday", "Cardio", "Swim & Run", "Technique & Hills", [
                        ("Swim", "STANDARD", [(ex_swim, "Drills", [("distance", 1200, "yards", "Technique drills", None, "rpe", "Easy")])]),
                        ("Run", "INTERVAL", [(ex_run, "Hill Repeats", [("distance", 6, "miles", "8x90sec uphill hard", None, "rpe", "9")])])
                    ]),
                    ("Wednesday", "Cardio", "Bike & Brick", "VO2 Intervals", [
                        ("Bike", "INTERVAL", [(ex_bike, "VO2 Max", [("time", 90, "min", "6x4 min very hard", 5400, "heart_rate_zone", "5")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("distance", 2, "miles", "Quick turnover", None, "heart_rate_zone", "2")])])
                    ]),
                    ("Thursday", "Cardio", "Run Tempo & Swim", None, [
                        ("Run", "STANDARD", [(ex_run, "Tempo", [("distance", 8, "miles", "5 miles @ Tempo", None, "rpe", "7")])]),
                        ("Swim", "STANDARD", [(ex_swim, "Endurance", [("distance", 1800, "yards", "Continuous", None, "rpe", "Steady")])])
                    ]),
                    ("Friday", "Cardio", "Bike Recovery", None, [
                        ("Bike", "STANDARD", [(ex_bike, "Easy Ride", [("time", 120, "min", "Zone 2 Aero position", 7200, "heart_rate_zone", "2")])])
                    ]),
                    ("Saturday", "Cardio", "Long Ride Brick", None, [
                        ("Bike", "STANDARD", [(ex_bike, "Long Ride", [("time", 300, "min", "Zone 2 (~80 miles)", 18000, "heart_rate_zone", "2")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("distance", 4, "miles", "30 mins easy", None, "heart_rate_zone", "2")])])
                    ]),
                    ("Sunday", "Cardio", "Long Run", None, [
                        ("Run", "STANDARD", [(ex_run, "Long Run", [("distance", 14, "miles", "Zone 2 steady", None, "heart_rate_zone", "2")])])
                    ])
                ]),

                # WEEK 4 (Recovery)
                (4, "Recovery/Adaptation", "Cut-back week (~13 hrs). Absorb gains.", [
                    ("Monday", "Stretch", "Rest Day", None, [(None, "STANDARD", [(ex_rest, "Rest", [])])]),
                    ("Tuesday", "Cardio", "Swim & Run", "Recovery", [
                        ("Swim", "STANDARD", [(ex_swim, "Easy Swim", [("distance", 1000, "yards", "Relaxed", None, "rpe", "Easy")])]),
                        ("Run", "STANDARD", [(ex_run, "Aerobic Run", [("distance", 5, "miles", "Zone 2 + Strides", None, "heart_rate_zone", "2")])])
                    ]),
                    ("Wednesday", "Cardio", "Bike Fartlek", None, [
                        ("Bike", "INTERVAL", [(ex_bike, "Fartlek", [("time", 75, "min", "10x1 min surges", 4500, "heart_rate_zone", "3")])])
                    ]),
                    ("Thursday", "Cardio", "Run Intervals", None, [
                        ("Run", "INTERVAL", [(ex_run, "Speed", [("distance", 4.5, "miles", "5x2 min hard", None, "pace", "5K")])]),
                        ("Strength", "STANDARD", [(ex_strength, "Core", [("time", 15, "min", "Core/Flexibility", 900, None, None)])])
                    ]),
                    ("Friday", "Cardio", "Swim Tempo", None, [
                        ("Swim", "STANDARD", [(ex_swim, "Tempo", [("distance", 1500, "yards", "Race start simulation", None, "rpe", "Moderate")])])
                    ]),
                    ("Saturday", "Cardio", "Long Ride Brick", "Reduced volume", [
                        ("Bike", "STANDARD", [(ex_bike, "Long Ride", [("time", 240, "min", "Zone 2 (~65 miles)", 14400, "heart_rate_zone", "2")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("time", 20, "min", "Easy", 1200, "heart_rate_zone", "2")])])
                    ]),
                    ("Sunday", "Cardio", "Long Run", "Reduced volume", [
                        ("Run", "STANDARD", [(ex_run, "Long Run", [("distance", 10, "miles", "Zone 2 Relaxed", None, "heart_rate_zone", "2")])])
                    ])
                ]),

                # WEEK 5
                (5, "Build Phase Intensifies", "Volume ramp (~16 hrs). High intensity.", [
                    ("Monday", "Stretch", "Rest Day", None, [(None, "STANDARD", [(ex_rest, "Rest", [])])]),
                    ("Tuesday", "Cardio", "Run Intervals & Swim", None, [
                        ("Run", "INTERVAL", [(ex_run, "Long Intervals", [("distance", 7, "miles", "5x1000m @ 5K pace", None, "pace", "5K")])]),
                        ("Swim", "STANDARD", [(ex_swim, "Aerobic Tech", [("distance", 1200, "yards", "Easy w/ surges", None, "rpe", "Easy")])])
                    ]),
                    ("Wednesday", "Cardio", "Bike Threshold", None, [
                        ("Bike", "INTERVAL", [(ex_bike, "Threshold", [("time", 90, "min", "3x12 min @ FTP", 5400, "power", "100%")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("distance", 3, "miles", "Easy off bike", None, "heart_rate_zone", "2")])])
                    ]),
                    ("Thursday", "Cardio", "Swim & Run Tempo", None, [
                        ("Swim", "INTERVAL", [(ex_swim, "Intervals", [("distance", 2100, "yards", "5x(4min hard/1min easy)", None, "rpe", "Hard")])]),
                        ("Run", "STANDARD", [(ex_run, "Tempo", [("distance", 9, "miles", "6 miles @ Tempo", None, "rpe", "7")])])
                    ]),
                    ("Friday", "Cardio", "Bike & Strength", None, [
                        ("Bike", "STANDARD", [(ex_bike, "Easy Spin", [("time", 150, "min", "Zone 1-2", 9000, "heart_rate_zone", "1")])]),
                        ("Strength", "STANDARD", [(ex_strength, "Functional", [("time", 20, "min", "Lunges, core", 1200, None, None)])])
                    ]),
                    ("Saturday", "Cardio", "Big Brick Session", "Race Simulation", [
                        ("Bike", "STANDARD", [(ex_bike, "Long Ride", [("time", 330, "min", "90-95 miles, 2x20min race pace", 19800, "heart_rate_zone", "2")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("time", 45, "min", "Race Pace shuffle", 2700, "heart_rate_zone", "2")])])
                    ]),
                    ("Sunday", "Cardio", "Long Run", None, [
                        ("Run", "STANDARD", [(ex_run, "Long Run", [("distance", 16, "miles", "Zone 2 on tired legs", None, "heart_rate_zone", "2")])])
                    ])
                ]),
                
                # WEEK 6
                (6, "High Volume Build", "Volume ~17 hrs. Race pace efforts.", [
                    ("Monday", "Stretch", "Rest Day", None, [(None, "STANDARD", [(ex_rest, "Rest", [])])]),
                    ("Tuesday", "Cardio", "Swim & Run", None, [
                        ("Swim", "INTERVAL", [(ex_swim, "Intervals", [("distance", 2400, "yards", "10x100y hard + 500y steady", None, "rpe", "Hard")])]),
                        ("Run", "INTERVAL", [(ex_run, "Threshold", [("distance", 8, "miles", "4x1 mile @ 10K pace", None, "pace", "10K")])])
                    ]),
                    ("Wednesday", "Cardio", "Bike Race Pace", None, [
                        ("Bike", "INTERVAL", [(ex_bike, "Race Pace", [("time", 120, "min", "3x15 min @ Goal IM Power", 7200, "heart_rate_zone", "3")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("time", 20, "min", "Easy", 1200, "heart_rate_zone", "2")])])
                    ]),
                    ("Thursday", "Cardio", "Run Tempo & Swim", None, [
                        ("Run", "STANDARD", [(ex_run, "Tempo", [("distance", 10, "miles", "7 miles @ Marathon Pace", None, "rpe", "7")])]),
                        ("Swim", "STANDARD", [(ex_swim, "Endurance", [("distance", 2600, "yards", "Continuous 1.5 miles", None, "rpe", "Steady")])])
                    ]),
                    ("Friday", "Cardio", "Bike Recovery", None, [
                        ("Bike", "STANDARD", [(ex_bike, "Recovery", [("time", 90, "min", "Zone 1-2 Very Light", 5400, "heart_rate_zone", "1")])])
                    ]),
                    ("Saturday", "Cardio", "Century Ride", "First 100 miler", [
                        ("Bike", "STANDARD", [(ex_bike, "Century Ride", [("time", 360, "min", "100+ miles Zone 2", 21600, "heart_rate_zone", "2")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("time", 30, "min", "Easy survival", 1800, "heart_rate_zone", "2")])])
                    ]),
                    ("Sunday", "Cardio", "Long Run", None, [
                        ("Run", "STANDARD", [(ex_run, "Long Run", [("distance", 18, "miles", "Zone 2 on deep fatigue", None, "heart_rate_zone", "2")])])
                    ])
                ]),

                # WEEK 7 (Peak)
                (7, "Peak Build Continues", "Max volume ~18 hrs. Longest Swim & Run.", [
                    ("Monday", "Stretch", "Rest Day", None, [(None, "STANDARD", [(ex_rest, "Rest", [])])]),
                    ("Tuesday", "Cardio", "Swim & Run", None, [
                        ("Swim", "INTERVAL", [(ex_swim, "Pyramid", [("distance", 2000, "yards", "Pyramid 100-400-100", None, "rpe", "Hard")])]),
                        ("Run", "INTERVAL", [(ex_run, "Intervals", [("distance", 6, "miles", "8x2 min fast", None, "pace", "5K")])])
                    ]),
                    ("Wednesday", "Cardio", "Bike VO2", None, [
                        ("Bike", "INTERVAL", [(ex_bike, "VO2 Max", [("time", 90, "min", "8x3 min @ Zone 5", 5400, "heart_rate_zone", "5")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("distance", 4, "miles", "Easy", None, "heart_rate_zone", "2")])])
                    ]),
                    ("Thursday", "Cardio", "Run Long Tempo", None, [
                        ("Run", "STANDARD", [(ex_run, "Race Pace", [("distance", 12, "miles", "8 miles @ IM Marathon Pace", None, "pace", "Marathon")])])
                    ]),
                    ("Friday", "Cardio", "Full Distance Swim", None, [
                        ("Swim", "STANDARD", [(ex_swim, "Ironman Distance", [("distance", 3800, "yards", "Continuous 2.4 miles", None, "rpe", "Steady")])])
                    ]),
                    ("Saturday", "Cardio", "Long Ride", None, [
                        ("Bike", "STANDARD", [(ex_bike, "Long Ride", [("time", 300, "min", "85-90 miles w/ 30 min @ Race Pace", 18000, "heart_rate_zone", "2")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("time", 20, "min", "Shakeout", 1200, "heart_rate_zone", "2")])])
                    ]),
                    ("Sunday", "Cardio", "Peak Long Run", None, [
                        ("Run", "STANDARD", [(ex_run, "Longest Run", [("distance", 20, "miles", "Zone 2, 3+ hours", None, "heart_rate_zone", "2")])])
                    ])
                ]),

                # WEEK 8 (Recovery)
                (8, "Recovery/Light Cut-Back", "Down week (~15 hrs).", [
                    ("Monday", "Stretch", "Rest Day", None, [(None, "STANDARD", [(ex_rest, "Rest", [])])]),
                    ("Tuesday", "Cardio", "Swim & Run", None, [
                        ("Swim", "STANDARD", [(ex_swim, "Drills", [("distance", 1500, "yards", "Tarzan drills", None, "rpe", "Easy")])]),
                        ("Run", "STANDARD", [(ex_run, "Easy Run", [("distance", 6, "miles", "Easy + Strides", None, "heart_rate_zone", "2")])])
                    ]),
                    ("Wednesday", "Cardio", "Bike Tempo Bricks", None, [
                        ("Bike/Run", "CIRCUIT", [(ex_bike, "Revolving Brick", [("time", 90, "min", "Repeats: 15min Race Pace -> 0.5mi Run -> Repeat", 5400, "heart_rate_zone", "3")])])
                    ]),
                    ("Thursday", "Cardio", "Run Tempo & Swim", None, [
                        ("Run", "STANDARD", [(ex_run, "Tempo", [("distance", 8, "miles", "4 miles @ Tempo", None, "rpe", "7")])]),
                        ("Swim", "STANDARD", [(ex_swim, "Recovery", [("distance", 2000, "yards", "Continuous Easy", None, "rpe", "Easy")])])
                    ]),
                    ("Friday", "Cardio", "Bike Aerobic", None, [
                        ("Bike", "STANDARD", [(ex_bike, "Easy Ride", [("time", 120, "min", "Zone 2", 7200, "heart_rate_zone", "2")])])
                    ]),
                    ("Saturday", "Cardio", "Long Ride", None, [
                        ("Bike", "STANDARD", [(ex_bike, "Long Ride", [("time", 240, "min", "65-70 miles", 14400, "heart_rate_zone", "2")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("time", 20, "min", "Easy", 1200, "heart_rate_zone", "2")])])
                    ]),
                    ("Sunday", "Cardio", "Long Run", None, [
                        ("Run", "STANDARD", [(ex_run, "Long Run", [("distance", 12, "miles", "Zone 2", None, "heart_rate_zone", "2")])])
                    ])
                ]),

                # WEEK 9 (Peak #2)
                (9, "Peak Block #2 Begins", "Max volume ~19 hrs. Big Day Saturday.", [
                    ("Monday", "Stretch", "Rest Day", None, [(None, "STANDARD", [(ex_rest, "Rest", [])])]),
                    ("Tuesday", "Cardio", "Swim & Run", None, [
                        ("Swim", "INTERVAL", [(ex_swim, "Key Set", [("distance", 3000, "yards", "6x500y @ Race Pace", None, "rpe", "Race Pace")])]),
                        ("Run", "INTERVAL", [(ex_run, "Speed", [("distance", 6, "miles", "10x400m Fast", None, "pace", "5K")])])
                    ]),
                    ("Wednesday", "Cardio", "Bike Threshold", None, [
                        ("Bike", "INTERVAL", [(ex_bike, "Threshold", [("time", 105, "min", "2x20 min @ FTP", 6300, "power", "100%")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("distance", 4, "miles", "Last 2 mi moderate", None, "rpe", "6")])])
                    ]),
                    ("Thursday", "Cardio", "Run Tempo", None, [
                        ("Run", "STANDARD", [(ex_run, "Tempo", [("distance", 10, "miles", "5 miles @ Tempo", None, "rpe", "7")])]),
                        ("Swim", "STANDARD", [(ex_swim, "Easy", [("distance", 1500, "yards", "Active Recovery", None, "rpe", "Easy")])])
                    ]),
                    ("Friday", "Recovery", "Rest or Spin", None, [
                        ("Bike", "STANDARD", [(ex_bike, "Optional Spin", [("time", 60, "min", "Very Easy", 3600, "heart_rate_zone", "1")])])
                    ]),
                    ("Saturday", "Cardio", "BIG DAY: Swim + Bike", "Ironman Sim", [
                        ("Swim", "STANDARD", [(ex_swim, "Full Swim", [("distance", 4000, "yards", "Non-stop", None, "rpe", "Moderate")])]),
                        ("Bike", "STANDARD", [(ex_bike, "Century Ride", [("time", 360, "min", "100-105 miles immediately after swim", 21600, "heart_rate_zone", "2")])])
                    ]),
                    ("Sunday", "Cardio", "Long Run", None, [
                        ("Run", "STANDARD", [(ex_run, "Long Run", [("distance", 14, "miles", "Zone 2 on fatigue", None, "heart_rate_zone", "2")])])
                    ])
                ]),

                # WEEK 10 (Peak #3)
                (10, "Peak Week #2 (Final Push)", "Highest load (~20 hrs). Start of taper end of week.", [
                    ("Monday", "Stretch", "Rest Day", None, [(None, "STANDARD", [(ex_rest, "Rest", [])])]),
                    ("Tuesday", "Cardio", "Last Long Run", "Done early for recovery", [
                        ("Run", "STANDARD", [(ex_run, "Long Run", [("distance", 16, "miles", "Dress rehearsal", None, "heart_rate_zone", "2")])]),
                        ("Swim", "STANDARD", [(ex_swim, "Recovery", [("distance", 1500, "yards", "Easy", None, "rpe", "Easy")])])
                    ]),
                    ("Wednesday", "Cardio", "Bike Race Intervals", None, [
                        ("Bike", "INTERVAL", [(ex_bike, "Race Intervals", [("time", 150, "min", "3x20 min @ Goal Power", 9000, "heart_rate_zone", "3")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("time", 30, "min", "10 min race pace", 1800, "heart_rate_zone", "2")])])
                    ]),
                    ("Thursday", "Cardio", "Swim Tempo & Run Speed", None, [
                        ("Swim", "INTERVAL", [(ex_swim, "Tempo", [("distance", 2500, "yards", "3x800y Strong", None, "rpe", "7")])]),
                        ("Run", "INTERVAL", [(ex_run, "Sharpening", [("distance", 5, "miles", "8x400m Fast", None, "pace", "5K")])])
                    ]),
                    ("Friday", "Cardio", "Bike Moderate", None, [
                        ("Bike", "INTERVAL", [(ex_bike, "Moderate Ride", [("time", 240, "min", "70-75 miles w/ 2x30min @ Tempo", 14400, "heart_rate_zone", "3")])])
                    ]),
                    ("Saturday", "Cardio", "Swim Open Water", None, [
                        ("Swim", "STANDARD", [(ex_swim, "Long Swim", [("distance", 3000, "yards", "Race morning sim", None, "rpe", "Race Pace")])])
                    ]),
                    ("Sunday", "Cardio", "Run Aerobic", None, [
                        ("Run", "STANDARD", [(ex_run, "Easy Run", [("distance", 8, "miles", "Zone 2 (Skip if fatigued)", None, "heart_rate_zone", "2")])])
                    ])
                ]),

                # WEEK 11 (Taper 1)
                (11, "Begin Taper Phase", "Volume ~60%. Keeping engine idling.", [
                    ("Monday", "Stretch", "Rest Day", None, [(None, "STANDARD", [(ex_rest, "Rest", [])])]),
                    ("Tuesday", "Cardio", "Brick Race Pace", None, [
                        ("Bike", "INTERVAL", [(ex_bike, "Race Bursts", [("time", 90, "min", "3x10 min Race Pace", 5400, "heart_rate_zone", "3")])]),
                        ("Run", "STANDARD", [(ex_run, "Brick Run", [("time", 20, "min", "10 min Race Pace", 1200, "pace", "Marathon")])])
                    ]),
                    ("Wednesday", "Cardio", "Swim Speed", None, [
                        ("Swim", "INTERVAL", [(ex_swim, "Speed", [("distance", 2000, "yards", "12x75y Sprints", None, "rpe", "Sprint")])]),
                        ("Strength", "STANDARD", [(ex_strength, "Pre-hab", [("time", 20, "min", "Light mobility", 1200, None, None)])])
                    ]),
                    ("Thursday", "Cardio", "Last Longish Ride", None, [
                        ("Bike", "STANDARD", [(ex_bike, "Ride", [("time", 180, "min", "50 miles w/ 2x15m Race Pace", 10800, "heart_rate_zone", "2")])])
                    ]),
                    ("Friday", "Cardio", "Run Aerobic", None, [
                        ("Run", "STANDARD", [(ex_run, "Easy Run", [("time", 60, "min", "Zone 1-2", 3600, "heart_rate_zone", "1-2")])])
                    ]),
                    ("Saturday", "Cardio", "Swim & Jog", None, [
                        ("Swim", "STANDARD", [(ex_swim, "Open Water", [("distance", 1800, "yards", "Steady", None, "rpe", "Steady")])]),
                        ("Run", "STANDARD", [(ex_run, "Optional Jog", [("distance", 2, "miles", "Shakeout", None, "heart_rate_zone", "1")])])
                    ]),
                    ("Sunday", "Cardio", "Run Pace Rehearsal", None, [
                        ("Run", "INTERVAL", [(ex_run, "Pace Work", [("time", 60, "min", "3x5 min Race Pace", 3600, "pace", "Marathon")])])
                    ])
                ]),

                # WEEK 12 (Race Week)
                (12, "Race Week (Taper 2)", "Volume ~30%. Fresh and ready.", [
                    ("Monday", "Stretch", "Rest Day", "Mental prep.", [(None, "STANDARD", [(ex_rest, "Rest", [])])]),
                    ("Tuesday", "Cardio", "Swim Priming", None, [
                        ("Swim", "INTERVAL", [(ex_swim, "Priming", [("distance", 1200, "yards", "4x50y Fast", None, "rpe", "Fast")])])
                    ]),
                    ("Wednesday", "Cardio", "Bike & Run Priming", None, [
                        ("Bike", "INTERVAL", [(ex_bike, "Priming", [("time", 60, "min", "5x90sec Race Power", 3600, "heart_rate_zone", "3")])]),
                        ("Run", "STANDARD", [(ex_run, "Light Brick", [("time", 30, "min", "5x30sec Pickups", 1800, "pace", "5K")])])
                    ]),
                    ("Thursday", "Recovery", "Rest or Easy", None, [
                        ("Activity", "STANDARD", [(ex_bike, "Optional Spin", [("time", 30, "min", "Very Easy", 1800, "heart_rate_zone", "1")])])
                    ]),
                    ("Friday", "Cardio", "Travel/Prep", None, [
                        ("Bike", "STANDARD", [(ex_bike, "Bike Check", [("time", 30, "min", "Gear check w/ 2x1 min race pace", 1800, "heart_rate_zone", "2")])]),
                        ("Run", "STANDARD", [(ex_run, "Shakeout", [("time", 15, "min", "Easy", 900, "heart_rate_zone", "1")])])
                    ]),
                    ("Saturday", "Cardio", "Race Eve", "Stay off feet.", [
                        ("Swim", "STANDARD", [(ex_swim, "Dip", [("time", 10, "min", "Feel water", 600, None, None)])]),
                        ("Bike", "STANDARD", [(ex_bike, "Spin", [("time", 20, "min", "Easy spin", 1200, None, None)])]),
                        ("Run", "STANDARD", [(ex_run, "Jog", [("time", 10, "min", "Easy jog", 600, None, None)])])
                    ]),
                    # Sunday is RACE DAY (Not technically a training day in the plan provided, plan ends Sat)
                ])
            ]

            # 3. Execution Loop
            for w_num, w_name, w_notes, days_data in schedule:
                week = Week.objects.create(
                    program=program,
                    week_number=w_num,
                    week_name=w_name,
                    notes=w_notes
                )
                self.stdout.write(f"Created Week {w_num}: {w_name}")

                day_ordering = 0
                for dow, focus, title, desc, blocks_data in days_data:
                    day_ordering += 1
                    session = Session.objects.create(
                        week=week,
                        day_of_week=dow,
                        day_ordering=day_ordering,
                        focus=focus,
                        title=title,
                        description=desc
                    )

                    block_order = 0
                    for blk_name, scheme, activities_data in blocks_data:
                        block_order += 1
                        block = SessionBlock.objects.create(
                            session=session,
                            block_order=block_order,
                            scheme_type=scheme,
                            block_name=blk_name or "Main Workout"
                        )

                        act_order = 0
                        for exercise_obj, act_note, scripts_data in activities_data:
                            act_order += 1
                            activity = Activity.objects.create(
                                session_block=block,
                                exercise=exercise_obj,
                                order_in_block=act_order,
                                notes=act_note,
                                manual_name=exercise_obj.name if exercise_obj else "Rest"
                            )

                            set_num = 0
                            # Prescription format: (metric, val, unit, notes, duration_sec, int_type, int_val)
                            for metric, val, unit, p_notes, dur_sec, i_type, i_val in scripts_data:
                                set_num += 1
                                
                                # Convert distance to meters
                                dist_m = None
                                if metric == 'distance' and val:
                                    dist_m = to_meters(val, unit)

                                ActivityPrescription.objects.create(
                                    activity=activity,
                                    set_number=set_num,
                                    primary_metric=metric or 'none',
                                    distance=dist_m,
                                    duration_seconds=dur_sec,
                                    prescription_notes=p_notes,
                                    intensity_type=i_type,
                                    intensity_value=i_val,
                                    # Default reps if metric isn't reps
                                    reps="1" if metric != 'reps' else str(val)
                                )

        self.stdout.write(self.style.SUCCESS('Successfully seeded 13-Week Ironman Program'))