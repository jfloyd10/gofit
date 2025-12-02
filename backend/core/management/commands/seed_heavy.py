import random
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction
from accounts.models import UserProfile, UserFollow, UserSavedProgram
from core.models import (
    Exercise,
    Program,
    Week,
    Session,
    SessionBlock,
    Activity,
    ActivityPrescription,
)

class Command(BaseCommand):
    help = 'Seeds the database with 10 highly detailed, rich programs with deep session structures.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete existing data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            self.clear_data()

        with transaction.atomic():
            self.stdout.write('Starting high-fidelity seeding process...')
            
            # 1. Setup Base Data
            exercises_map = self.create_exercises()
            users = self.create_users(count=10)
            
            # 2. Create The 10 "Hero" Programs
            self.create_hero_programs(users, exercises_map)
            
            # 3. Social Data
            self.create_interactions(users)

            self.stdout.write(self.style.SUCCESS('------------------------------------------'))
            self.stdout.write(self.style.SUCCESS(f'Seed Complete!'))
            self.stdout.write(self.style.SUCCESS(f'Database populated with rich, multi-block session data.'))
            self.stdout.write(self.style.SUCCESS('------------------------------------------'))

    def clear_data(self):
        ActivityPrescription.objects.all().delete()
        Activity.objects.all().delete()
        SessionBlock.objects.all().delete()
        Session.objects.all().delete()
        Week.objects.all().delete()
        Program.objects.all().delete()
        UserFollow.objects.all().delete()
        UserSavedProgram.objects.all().delete()
        UserProfile.objects.all().delete()
        User.objects.exclude(is_superuser=True).delete()

    def create_exercises(self):
        self.stdout.write('Seeding expanded exercise library...')
        data = [
            # Strength - Barbell
            ('Back Squat', 'Legs', 'Barbell'), ('Front Squat', 'Legs', 'Barbell'),
            ('Deadlift', 'Legs', 'Barbell'), ('Sumo Deadlift', 'Legs', 'Barbell'),
            ('Bench Press', 'Push', 'Barbell'), ('Incline Bench Press', 'Push', 'Barbell'),
            ('Overhead Press', 'Push', 'Barbell'), ('Pendlay Row', 'Pull', 'Barbell'),
            ('Hip Thrust', 'Legs', 'Barbell'), ('Good Morning', 'Legs', 'Barbell'),
            ('Snatch', 'Olympic', 'Barbell'), ('Clean & Jerk', 'Olympic', 'Barbell'),

            # Strength - Dumbbell/Machine
            ('Dumbbell Bench Press', 'Push', 'Dumbbells'), ('Dumbbell Row', 'Pull', 'Dumbbells'),
            ('Goblet Squat', 'Legs', 'Dumbbells'), ('Walking Lunges', 'Legs', 'Dumbbells'),
            ('Bulgarian Split Squat', 'Legs', 'Dumbbells'), ('Lateral Raises', 'Push', 'Dumbbells'),
            ('Arnold Press', 'Push', 'Dumbbells'), ('Bicep Curls', 'Arms', 'Dumbbells'),
            ('Hammer Curls', 'Arms', 'Dumbbells'), ('Tricep Extensions', 'Arms', 'Cable'),
            ('Leg Press', 'Legs', 'Machine'), ('Leg Extension', 'Legs', 'Machine'),
            ('Hamstring Curl', 'Legs', 'Machine'), ('Lat Pulldown', 'Pull', 'Cable'),
            ('Seated Cable Row', 'Pull', 'Cable'), ('Face Pulls', 'Pull', 'Cable'),

            # Calisthenics / Cardio
            ('Push Ups', 'Push', 'None'), ('Pull Ups', 'Pull', 'Bar'),
            ('Chin Ups', 'Pull', 'Bar'), ('Dips', 'Push', 'Dip Station'),
            ('Plank', 'Core', 'None'), ('Side Plank', 'Core', 'None'),
            ('Hanging Leg Raise', 'Core', 'Bar'), ('Sit Ups', 'Core', 'None'),
            ('Running', 'Cardio', 'None'), ('Rowing', 'Cardio', 'Rower'),
            ('Assault Bike', 'Cardio', 'Bike'), ('Burpees', 'Cardio', 'None'),
            ('Box Jumps', 'Legs', 'Box'), ('Wall Balls', 'Cardio', 'Medicine Ball'),
            ('Double Unders', 'Cardio', 'Rope'), ('Kettlebell Swing', 'Legs', 'Kettlebell'),

            # Yoga/Mobility
            ('Downward Dog', 'Yoga', 'Mat'), ('Pigeon Pose', 'Yoga', 'Mat'),
            ('Warrior I', 'Yoga', 'Mat'), ('Warrior II', 'Yoga', 'Mat'),
            ('Cat-Cow', 'Mobility', 'None'), ('90/90 Hip Stretch', 'Mobility', 'None'),
            ('Foam Rolling', 'Mobility', 'Foam Roller')
        ]

        ex_map = {}
        for name, cat, equip in data:
            ex, _ = Exercise.objects.get_or_create(
                name=name,
                defaults={
                    'category': cat, 
                    'equipment_needed': equip,
                    'is_official': True,
                    'description': f"Standard {name} movement."
                }
            )
            ex_map[name] = ex
        return ex_map

    def create_users(self, count):
        self.stdout.write(f'Creating {count} users...')
        users = []
        test_user, _ = User.objects.get_or_create(username='testuser', defaults={'email':'test@example.com'})
        test_user.set_password('testpass123')
        test_user.save()
        users.append(test_user)

        names = [
            ("James", "Smith"), ("Sarah", "Connor"), ("Mike", "Ross"), 
            ("Rachel", "Green"), ("Tony", "Stark"), ("Bruce", "Wayne"),
            ("Natasha", "Romanoff"), ("Steve", "Rogers"), ("Peter", "Parker")
        ]

        for i in range(count - 1):
            fname, lname = names[i] if i < len(names) else (f"User{i}", "Doe")
            u, _ = User.objects.get_or_create(username=f"{fname.lower()}.{lname.lower()}")
            u.set_password('password123')
            u.save()
            UserProfile.objects.get_or_create(
                user=u, defaults={'display_name': f"{fname} {lname}", 'bio': "Fitness enthusiast."}
            )
            users.append(u)
        return users

    def create_hero_programs(self, users, ex_map):
        self.stdout.write('Generating 10 rich "Hero" programs...')
        
        templates = [
            {
                'title': 'Powerlifting Foundations',
                'focus': 'Strength', 'diff': 'Intermediate', 'weeks': 12,
                'desc': 'A comprehensive 12-week peaking block. Includes SBD days, hypertrophy accessories, and mobility work.',
                'schedule': ['Monday', 'Wednesday', 'Friday', 'Saturday'],
                'style': 'power'
            },
            {
                'title': 'Marathon Mastery',
                'focus': 'Cardio', 'diff': 'Advanced', 'weeks': 16,
                'desc': 'High volume running plan. Includes track intervals, tempo runs, and strength maintenance.',
                'schedule': ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
                'style': 'run'
            },
            {
                'title': 'The Daily Yogi',
                'focus': 'Yoga', 'diff': 'Beginner', 'weeks': 8,
                'desc': 'Daily flows to improve flexibility and mindfulness. Morning and evening routines.',
                'schedule': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                'style': 'yoga'
            },
            {
                'title': 'Functional Fitness Open Prep',
                'focus': 'Crossfit', 'diff': 'Advanced', 'weeks': 10,
                'desc': 'Prepare for competition with high-skill gymnastics, olympic lifting, and metabolic conditioning.',
                'schedule': ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'],
                'style': 'crossfit'
            },
            {
                'title': 'Summer Shred',
                'focus': 'Hybrid', 'diff': 'Intermediate', 'weeks': 8,
                'desc': 'A high-volume bodybuilding split combined with high-intensity interval training.',
                'schedule': ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'],
                'style': 'bodybuilding'
            },
            {
                'title': 'Couch to 5k',
                'focus': 'Cardio', 'diff': 'Beginner', 'weeks': 9,
                'desc': 'The definitive guide to running your first 5k. Walk/Run intervals graduating to continuous running.',
                'schedule': ['Monday', 'Wednesday', 'Saturday'],
                'style': 'run_beginner'
            },
            {
                'title': 'Garage Gym Athlete',
                'focus': 'Strength', 'diff': 'Intermediate', 'weeks': 12,
                'desc': 'Minimal equipment, maximum gains. Focused on dumbbells, kettlebells, and bodyweight.',
                'schedule': ['Monday', 'Wednesday', 'Friday'],
                'style': 'minimalist'
            },
            {
                'title': 'Mobility for Lifters',
                'focus': 'Yoga', 'diff': 'Beginner', 'weeks': 4,
                'desc': 'Short 20-minute routines designed to unlock hips and shoulders for deep squats.',
                'schedule': ['Tuesday', 'Thursday', 'Saturday', 'Sunday'],
                'style': 'mobility'
            },
            {
                'title': 'Hypertrophy 101',
                'focus': 'Strength', 'diff': 'Beginner', 'weeks': 10,
                'desc': 'Classic high-volume muscle building. 4-day upper/lower split.',
                'schedule': ['Monday', 'Tuesday', 'Thursday', 'Friday'],
                'style': 'bodybuilding'
            },
            {
                'title': 'Triathlon Sprint',
                'focus': 'Triathalon', 'diff': 'Intermediate', 'weeks': 8,
                'desc': 'Balanced training for Swim, Bike, and Run. Includes brick sessions.',
                'schedule': ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
                'style': 'tri'
            },
        ]

        for i, t in enumerate(templates):
            owner = users[i % len(users)]
            
            program = Program.objects.create(
                user=owner,
                title=t['title'],
                focus=t['focus'],
                difficulty=t['diff'],
                description=t['desc'],
                is_public=True,
                image=f"img/program/img_{i+1}.jpg"
            )

            self.stdout.write(f"  > Building {program.title} ({t['weeks']} weeks)...")
            self.build_program_content(program, t, ex_map)

    def build_program_content(self, program, template, ex_map):
        weeks = template['weeks']
        schedule = template['schedule']
        style = template['style']

        for w in range(1, weeks + 1):
            if w == weeks: phase = "Deload / Taper"
            elif w > weeks * 0.75: phase = "Peaking"
            elif w < 4: phase = "Base Building"
            else: phase = "Accumulation"

            week_obj = Week.objects.create(
                program=program,
                week_number=w,
                week_name=f"Week {w}: {phase}",
                notes=f"Intensity: {'Low' if 'Deload' in phase else 'High'}. Focus on perfect form."
            )

            for day_idx, day_name in enumerate(schedule):
                session = Session.objects.create(
                    week=week_obj,
                    title=f"{day_name} Training",
                    day_of_week=day_name,
                    day_ordering=day_idx,
                    focus=program.focus
                )
                
                if style == 'power': self.build_power_session(session, w, day_idx, ex_map)
                elif 'run' in style: self.build_run_session(session, w, day_idx, ex_map, style)
                elif style == 'bodybuilding': self.build_bb_session(session, w, day_idx, ex_map)
                elif style == 'crossfit': self.build_cf_session(session, w, day_idx, ex_map)
                elif style == 'yoga' or style == 'mobility': self.build_yoga_session(session, w, day_idx, ex_map)
                elif style == 'tri': self.build_tri_session(session, w, day_idx, ex_map)
                else: self.build_minimalist_session(session, w, day_idx, ex_map)

    # --- RICH SESSION BUILDERS ---

    def build_power_session(self, session, week, day_idx, ex_map):
        # 1. GENERAL WARMUP
        self.add_block(session, 0, 'General Warmup', 'STANDARD', [
            ('Rowing', '5 mins'), ('Cat-Cow', '1 min'), ('Plank', '3x30s')
        ], ex_map)

        # 2. SPECIFIC WARMUP
        self.add_block(session, 1, 'Movement Prep', 'CIRCUIT', [
            ('Goblet Squat', '2x10'), ('Band Pull Aparts', '2x15') # Fallback if missing
        ], ex_map)

        # 3. MAIN LIFT
        lifts = ['Back Squat', 'Bench Press', 'Deadlift', 'Overhead Press']
        main_lift = lifts[day_idx % len(lifts)]
        weight = 135 + (week * 5)
        
        main_block = SessionBlock.objects.create(
            session=session, block_order=2, block_name=f"Primary: {main_lift}", block_notes="Rest 3-5 mins between sets."
        )
        act = Activity.objects.create(session_block=main_block, exercise=ex_map.get(main_lift))
        for s in range(1, 6):
            ActivityPrescription.objects.create(
                activity=act, set_number=s, primary_metric='reps', 
                reps='5' if week < 8 else '3', weight=weight, rest_seconds=180
            )

        # 4. SUPPLEMENTAL LIFT (Variation)
        supp_lift = 'Front Squat' if 'Squat' in main_lift else ('Incline Bench Press' if 'Bench' in main_lift else 'Good Morning')
        supp_block = SessionBlock.objects.create(session=session, block_order=3, block_name="Supplemental Volume")
        act_supp = Activity.objects.create(session_block=supp_block, exercise=ex_map.get(supp_lift) or ex_map.get('Back Squat'))
        for s in range(1, 4):
            ActivityPrescription.objects.create(activity=act_supp, set_number=s, primary_metric='reps', reps='8', weight=weight*0.7)

        # 5. ACCESSORIES
        acc_exercises = [('Walking Lunges', '3x12'), ('Leg Extension', '3x15'), ('Hanging Leg Raise', '3x15')]
        if 'Bench' in main_lift or 'Press' in main_lift:
            acc_exercises = [('Dips', '3x10'), ('Face Pulls', '3x15'), ('Tricep Extensions', '3x12')]
        
        self.add_block(session, 4, 'Accessories', 'CIRCUIT', acc_exercises, ex_map)

    def build_run_session(self, session, week, day_idx, ex_map, style):
        is_beginner = 'beginner' in style
        
        # 1. DYNAMIC WARMUP
        self.add_block(session, 0, 'Dynamic Warmup', 'STANDARD', [
            ('Walking Lunges', '20 reps'), ('Leg Swings', '20 reps'), ('High Knees', '30s')
        ], ex_map)

        # 2. MAIN RUN
        if day_idx == 0: # Easy
            dist = (2 + (week * 0.2)) if is_beginner else (4 + (week * 0.5))
            self.add_block(session, 1, 'Easy Run', 'STANDARD', [('Running', f'{dist} miles')], ex_map)
        elif day_idx == 1: # Intervals / Tempo
            scheme = 'INTERVAL'
            reps = 4 + (week // 2)
            duration = 60 if is_beginner else 400 # seconds (beginner walks/jogs, advanced runs 400m)
            self.add_block(session, 1, 'Track Intervals', scheme, [('Running', f'{reps}x{duration}s')], ex_map)
        else: # Long Run
            dist = (3 + (week * 0.5)) if is_beginner else (8 + week)
            self.add_block(session, 1, 'Long Run', 'STANDARD', [('Running', f'{dist} miles')], ex_map)

        # 3. POST-RUN STRENGTH
        self.add_block(session, 2, 'Core & Stability', 'CIRCUIT', [
            ('Plank', '3x45s'), ('Side Plank', '3x30s'), ('Glute Bridge', '3x15')
        ], ex_map)

    def build_bb_session(self, session, week, day_idx, ex_map):
        # 1. WARMUP
        self.add_block(session, 0, 'Warmup', 'STANDARD', [('Assault Bike', '5 mins'), ('Rotator Cuff', '2x15')], ex_map)

        split = ['Upper', 'Lower', 'Push', 'Pull', 'Legs'][day_idx % 5]
        
        # 2. COMPOUND POWER
        compounds = {
            'Upper': 'Bench Press', 'Lower': 'Back Squat', 
            'Push': 'Overhead Press', 'Pull': 'Deadlift', 'Legs': 'Leg Press'
        }
        main_lift = compounds.get(split, 'Bench Press')
        self.add_block(session, 1, 'Heavy Compound', 'STANDARD', [(main_lift, '4x6')], ex_map)

        # 3. HYPERTROPHY A
        self.add_block(session, 2, 'Volume I', 'STANDARD', [
            ('Dumbbell Bench Press', '3x10') if split in ['Upper', 'Push'] else ('Walking Lunges', '3x12'),
            ('Lat Pulldown', '3x10') if split in ['Upper', 'Pull'] else ('Leg Extension', '3x15')
        ], ex_map)

        # 4. HYPERTROPHY B
        self.add_block(session, 3, 'Volume II', 'CIRCUIT', [
            ('Lateral Raises', '3x15'), ('Bicep Curls', '3x12'), ('Tricep Extensions', '3x12')
        ], ex_map)

        # 5. FINISHER
        self.add_block(session, 4, 'Pump Chaser', 'AMRAP', [('Push Ups', '1xAMRAP'), ('Sit Ups', '1xAMRAP')], ex_map)

    def build_cf_session(self, session, week, day_idx, ex_map):
        # 1. GENERAL WARMUP
        self.add_block(session, 0, 'Warmup', 'AMRAP', [('Rowing', '20 cals'), ('Burpees', '10 reps'), ('Air Squat', '15 reps')], ex_map, duration=600)

        # 2. SKILL / STRENGTH
        skill = 'Snatch' if day_idx % 2 == 0 else 'Clean & Jerk'
        self.add_block(session, 1, 'Olympic Skill', 'EMOM', [(skill, '10x2')], ex_map, duration=600)

        # 3. METCON (WOD)
        wod_name = f"WOD {week}.{day_idx}"
        scheme = random.choice(['RFT', 'AMRAP'])
        self.add_block(session, 2, 'Metcon', scheme, [
            ('Thruster', '21-15-9') if scheme == 'RFT' else ('Wall Balls', '15 reps'),
            ('Pull Ups', '21-15-9') if scheme == 'RFT' else ('Double Unders', '30 reps'),
            ('Burpees', '21-15-9') if scheme == 'RFT' else ('Box Jumps', '10 reps')
        ], ex_map, rounds=3 if scheme=='RFT' else None, duration=900 if scheme=='AMRAP' else None)

        # 4. ACCESSORY
        self.add_block(session, 3, 'Midline', 'CIRCUIT', [('Hanging Leg Raise', '3x10'), ('Plank', '3x60s')], ex_map)

    def build_yoga_session(self, session, week, day_idx, ex_map):
        # 1. CENTER & BREATH
        self.add_block(session, 0, 'Centering', 'STANDARD', [('Cat-Cow', '2 mins'), ('Downward Dog', '2 mins')], ex_map)
        # 2. FLOW A
        self.add_block(session, 1, 'Sun Salutations', 'CIRCUIT', [('Warrior I', '1 min'), ('Warrior II', '1 min'), ('Downward Dog', '1 min')], ex_map)
        # 3. FLOW B
        self.add_block(session, 2, 'Deep Stretch', 'STANDARD', [('Pigeon Pose', '3 mins'), ('90/90 Hip Stretch', '2 mins')], ex_map)

    def build_tri_session(self, session, week, day_idx, ex_map):
        focus = ['Swim', 'Bike', 'Run', 'Brick'][day_idx % 4]
        if focus == 'Swim':
            self.add_block(session, 0, 'Pool', 'STANDARD', [('Rowing', '2000m')], ex_map) # Placeholder for swim
        elif focus == 'Bike':
            self.add_block(session, 0, 'Ride', 'STANDARD', [('Assault Bike', '45 mins')], ex_map)
        elif focus == 'Run':
            self.add_block(session, 0, 'Run', 'STANDARD', [('Running', '5 miles')], ex_map)
        else:
            self.add_block(session, 0, 'Brick', 'STANDARD', [('Assault Bike', '30 mins'), ('Running', '3 miles')], ex_map)

    def build_minimalist_session(self, session, week, day_idx, ex_map):
        self.add_block(session, 0, 'Mobility', 'STANDARD', [('World\'s Greatest Stretch', '2 mins')], ex_map)
        self.add_block(session, 1, 'Strength Circuit', 'CIRCUIT', [
            ('Goblet Squat', '4x15'), ('Push Ups', '4x20'), ('Dumbbell Row', '4x12'), ('Walking Lunges', '4x20')
        ], ex_map)
        self.add_block(session, 2, 'Finisher', 'EMOM', [('Burpees', '10 reps'), ('Kettlebell Swing', '15 reps')], ex_map, duration=600)

    # --- HELPER ---

    def add_block(self, session, order, name, scheme, activities, ex_map, rounds=None, duration=None, block_notes=""):
        block = SessionBlock.objects.create(
            session=session, block_order=order, block_name=name, scheme_type=scheme,
            rounds_target=rounds, duration_target=duration, block_notes=block_notes
        )
        
        for i, (ex_name, prescription) in enumerate(activities):
            ex = ex_map.get(ex_name) or ex_map.get('Burpees') # Fallback
            act = Activity.objects.create(session_block=block, exercise=ex, order_in_block=i)
            
            # Simple Parser
            if 'x' in prescription and prescription.split('x')[0].isdigit():
                # "3x10" or "3x10s"
                sets, val = prescription.split('x')
                metric = 'time' if 's' in val or 'min' in val else 'reps'
                val_clean = val.replace('s','').replace(' reps','')
                
                for s in range(1, int(sets)+1):
                    ActivityPrescription.objects.create(
                        activity=act, set_number=s, primary_metric=metric,
                        reps=val_clean if metric=='reps' else None,
                        duration_seconds=int(val_clean) if metric=='time' and val_clean.isdigit() else 60
                    )
            elif 'mile' in prescription:
                dist = float(prescription.split()[0])
                ActivityPrescription.objects.create(activity=act, set_number=1, primary_metric='distance', distance=dist*1600)
            elif 'min' in prescription:
                mins = int(prescription.split()[0])
                ActivityPrescription.objects.create(activity=act, set_number=1, primary_metric='time', duration_seconds=mins*60)
            else:
                ActivityPrescription.objects.create(activity=act, set_number=1, primary_metric='reps', reps=prescription)

    def create_interactions(self, users):
        self.stdout.write('Wiring up social connections...')
        test = users[0]
        for u in users[1:]:
            UserFollow.objects.create(follower=u, followed=test)
            progs = list(Program.objects.filter(is_public=True).exclude(user=u))
            if progs:
                UserSavedProgram.objects.create(user=u, program=random.choice(progs))