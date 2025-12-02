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
    help = 'Seeds the database with 10 robust, life-like programs using placeholder images.'

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
            self.stdout.write('Starting robust seeding process...')
            
            # 1. Setup Base Data
            exercises_map = self.create_exercises()
            users = self.create_users(count=10)
            
            # 2. Create The 10 "Hero" Programs
            self.create_hero_programs(users, exercises_map)
            
            # 3. Social Data
            self.create_interactions(users)

            self.stdout.write(self.style.SUCCESS('------------------------------------------'))
            self.stdout.write(self.style.SUCCESS(f'Seed Complete!'))
            self.stdout.write(self.style.SUCCESS(f'Generated ~600 sessions and ~3000 activities.'))
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
        self.stdout.write('Seeding exercises...')
        # Comprehensive list to support "life-like" variety
        data = [
            # Strength - Barbell
            ('Back Squat', 'Legs', 'Barbell'), ('Front Squat', 'Legs', 'Barbell'),
            ('Deadlift', 'Legs', 'Barbell'), ('Sumo Deadlift', 'Legs', 'Barbell'),
            ('Bench Press', 'Push', 'Barbell'), ('Incline Bench Press', 'Push', 'Barbell'),
            ('Overhead Press', 'Push', 'Barbell'), ('Pendlay Row', 'Pull', 'Barbell'),
            
            # Strength - Dumbbell/Machine
            ('Dumbbell Bench Press', 'Push', 'Dumbbells'), ('Dumbbell Row', 'Pull', 'Dumbbells'),
            ('Goblet Squat', 'Legs', 'Dumbbells'), ('Lunges', 'Legs', 'Dumbbells'),
            ('Lateral Raises', 'Push', 'Dumbbells'), ('Bicep Curls', 'Arms', 'Dumbbells'),
            ('Tricep Extensions', 'Arms', 'Cable'), ('Leg Press', 'Legs', 'Machine'),
            ('Lat Pulldown', 'Pull', 'Cable'), ('Face Pulls', 'Pull', 'Cable'),

            # Calisthenics / Cardio
            ('Push Ups', 'Push', 'None'), ('Pull Ups', 'Pull', 'Bar'),
            ('Dips', 'Push', 'Dip Station'), ('Plank', 'Core', 'None'),
            ('Running', 'Cardio', 'None'), ('Rowing', 'Cardio', 'Rower'),
            ('Burpees', 'Cardio', 'None'), ('Box Jumps', 'Legs', 'Box'),
            ('Wall Balls', 'Cardio', 'Medicine Ball'), ('Double Unders', 'Cardio', 'Rope'),

            # Yoga/Mobility
            ('Downward Dog', 'Yoga', 'Mat'), ('Pigeon Pose', 'Yoga', 'Mat'),
            ('World\'s Greatest Stretch', 'Mobility', 'None'), ('Foam Rolling', 'Mobility', 'Foam Roller')
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
        # Ensure specific test user
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
        self.stdout.write('Generating 10 detailed programs...')
        
        # We define 10 "Hero" templates. 
        # Each template has a specific logic for generating weeks and sessions.
        templates = [
            {
                'title': 'Powerlifting Foundations',
                'focus': 'Strength', 'diff': 'Intermediate', 'weeks': 12,
                'desc': 'A 12-week peaking program focusing on the Big 3.',
                'schedule': ['Monday', 'Wednesday', 'Friday', 'Saturday'],
                'style': 'power'
            },
            {
                'title': 'Marathon Mastery',
                'focus': 'Cardio', 'diff': 'Advanced', 'weeks': 16,
                'desc': 'High volume running plan to prepare for 26.2 miles.',
                'schedule': ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Sunday'],
                'style': 'run'
            },
            {
                'title': 'The Daily Yogi',
                'focus': 'Yoga', 'diff': 'Beginner', 'weeks': 8,
                'desc': 'Daily flows to improve flexibility and mindfulness.',
                'schedule': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                'style': 'yoga'
            },
            {
                'title': 'Functional Fitness Open Prep',
                'focus': 'Crossfit', 'diff': 'Advanced', 'weeks': 10,
                'desc': 'High intensity metabolic conditioning and gymnastics.',
                'schedule': ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'],
                'style': 'crossfit'
            },
            {
                'title': 'Summer Shred',
                'focus': 'Hybrid', 'diff': 'Intermediate', 'weeks': 8,
                'desc': 'A mix of heavy lifting and HIIT to burn fat.',
                'schedule': ['Monday', 'Tuesday', 'Thursday', 'Friday'],
                'style': 'bodybuilding'
            },
            {
                'title': 'Couch to 5k',
                'focus': 'Cardio', 'diff': 'Beginner', 'weeks': 9,
                'desc': 'Get off the couch and run your first 5k.',
                'schedule': ['Monday', 'Wednesday', 'Saturday'],
                'style': 'run_beginner'
            },
            {
                'title': 'Garage Gym Athlete',
                'focus': 'Strength', 'diff': 'Intermediate', 'weeks': 12,
                'desc': 'Minimal equipment, maximum gains.',
                'schedule': ['Monday', 'Wednesday', 'Friday'],
                'style': 'minimalist'
            },
            {
                'title': 'Mobility for Lifters',
                'focus': 'Yoga', 'diff': 'Beginner', 'weeks': 4,
                'desc': 'Short routines to fix your squat depth and overhead position.',
                'schedule': ['Tuesday', 'Thursday', 'Saturday'],
                'style': 'mobility'
            },
            {
                'title': 'Hypertrophy 101',
                'focus': 'Strength', 'diff': 'Beginner', 'weeks': 10,
                'desc': 'Volume based training to build muscle mass.',
                'schedule': ['Monday', 'Tuesday', 'Thursday', 'Friday'],
                'style': 'bodybuilding'
            },
            {
                'title': 'Triathlon Sprint',
                'focus': 'Triathalon', 'diff': 'Intermediate', 'weeks': 8,
                'desc': 'Swim, Bike, and Run training for sprint distance.',
                'schedule': ['Monday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
                'style': 'tri'
            },
        ]

        for i, t in enumerate(templates):
            owner = users[i % len(users)]
            
            # CREATE PROGRAM
            program = Program.objects.create(
                user=owner,
                title=t['title'],
                focus=t['focus'],
                difficulty=t['diff'],
                description=t['desc'],
                is_public=True,
                image=f"img/program/img_{i+1}.jpg" # <-- Assigned placeholder image
            )

            self.stdout.write(f"  > Building {program.title} ({t['weeks']} weeks)...")
            self.build_program_content(program, t, ex_map)

    def build_program_content(self, program, template, ex_map):
        weeks = template['weeks']
        schedule = template['schedule']
        style = template['style']

        for w in range(1, weeks + 1):
            # Define Phase
            if w == weeks:
                phase_name = "Deload / Taper"
            elif w > weeks * 0.75:
                phase_name = "Peak / Realization"
            elif w < 4:
                phase_name = "Acclimatization"
            else:
                phase_name = "Accumulation"

            week_obj = Week.objects.create(
                program=program,
                week_number=w,
                week_name=f"Week {w}: {phase_name}",
                notes=f"Focus on {phase_name} logic. Intensity is {'Low' if 'Deload' in phase_name else 'High'}."
            )

            # Create Sessions for this week
            for day_idx, day_name in enumerate(schedule):
                session = Session.objects.create(
                    week=week_obj,
                    title=f"{day_name} Workout",
                    day_of_week=day_name,
                    day_ordering=day_idx,
                    focus=program.focus
                )
                
                # Delegate to style-specific builders
                if style == 'power':
                    self.build_power_session(session, w, day_idx, ex_map)
                elif 'run' in style:
                    self.build_run_session(session, w, day_idx, ex_map, style)
                elif style == 'bodybuilding':
                    self.build_bb_session(session, w, day_idx, ex_map)
                elif style == 'crossfit':
                    self.build_cf_session(session, w, day_idx, ex_map)
                elif style == 'yoga' or style == 'mobility':
                    self.build_yoga_session(session, w, day_idx, ex_map)
                elif style == 'tri':
                    self.build_tri_session(session, w, day_idx, ex_map)
                else:
                    self.build_minimalist_session(session, w, day_idx, ex_map)

    # --- STYLE SPECIFIC BUILDERS ---

    def build_power_session(self, session, week, day_idx, ex_map):
        # Warmup
        self.add_simple_block(session, 0, 'Warmup', [('Rowing', '5 mins'), ('Plank', '3x30s')], ex_map)
        
        # Main Lift (Progressive Overload Logic)
        lifts = ['Back Squat', 'Bench Press', 'Deadlift', 'Overhead Press']
        main_lift = lifts[day_idx % len(lifts)]
        
        reps = "5" if week < 5 else ("3" if week < 9 else "1")
        weight_base = 135 if 'Press' not in main_lift else 95
        weight = weight_base + (week * 5) # +5lbs per week

        main_block = SessionBlock.objects.create(session=session, block_order=1, block_name="Main Lift")
        act = Activity.objects.create(session_block=main_block, exercise=ex_map.get(main_lift))
        
        # 5 Sets
        for s in range(1, 6):
            ActivityPrescription.objects.create(
                activity=act, set_number=s, primary_metric='reps', 
                reps=reps, weight=weight, rest_seconds=180
            )

        # Accessories
        acc_block = SessionBlock.objects.create(session=session, block_order=2, block_name="Accessories")
        acc_exs = [('Dips', '3x10'), ('Pull Ups', '3x8'), ('Lunges', '3x12')]
        for i, (name, scheme) in enumerate(acc_exs):
            self.create_activity_from_scheme(acc_block, i, name, scheme, ex_map)

    def build_run_session(self, session, week, day_idx, ex_map, style):
        is_beginner = 'beginner' in style
        dist_mult = 0.5 if is_beginner else 1.0
        
        # Long run on last day, intervals otherwise
        if day_idx == 0 or day_idx == 2:
            # Easy Run
            dist = (3 + (week * 0.25)) * dist_mult
            block = SessionBlock.objects.create(session=session, block_order=0, block_name="Base Mileage")
            act = Activity.objects.create(session_block=block, exercise=ex_map.get('Running'))
            ActivityPrescription.objects.create(
                activity=act, set_number=1, primary_metric='distance', 
                distance=dist * 1600, # convert miles to meters
                prescription_notes="Zone 2 pace"
            )
        else:
            # Intervals
            block = SessionBlock.objects.create(session=session, block_order=0, block_name="Intervals", scheme_type='INTERVAL')
            act = Activity.objects.create(session_block=block, exercise=ex_map.get('Running'))
            reps = 4 + (week // 2)
            for r in range(1, int(reps) + 1):
                ActivityPrescription.objects.create(
                    activity=act, set_number=r, primary_metric='time',
                    duration_seconds=400 if not is_beginner else 120,
                    rest_seconds=120
                )

    def build_bb_session(self, session, week, day_idx, ex_map):
        # Push / Pull / Legs split logic rough approximation
        split = ['Push', 'Pull', 'Legs', 'Upper'][day_idx % 4]
        
        # Warmup
        self.add_simple_block(session, 0, 'Warmup', [('Running', '5 mins')], ex_map)

        # Body
        block = SessionBlock.objects.create(session=session, block_order=1, block_name="Hypertrophy Work")
        
        exercises = []
        if split == 'Push': exercises = ['Bench Press', 'Incline Bench Press', 'Lateral Raises', 'Tricep Extensions']
        elif split == 'Pull': exercises = ['Deadlift', 'Lat Pulldown', 'Dumbbell Row', 'Bicep Curls']
        elif split == 'Legs': exercises = ['Back Squat', 'Leg Press', 'Lunges', 'Box Jumps']
        else: exercises = ['Overhead Press', 'Pull Ups', 'Dips', 'Face Pulls']

        for i, name in enumerate(exercises):
            act = Activity.objects.create(session_block=block, exercise=ex_map.get(name), order_in_block=i)
            for s in range(1, 4): # 3 sets standard
                ActivityPrescription.objects.create(
                    activity=act, set_number=s, primary_metric='reps',
                    reps='10-12', weight=random.choice([20, 40, 60, 80]),
                    rest_seconds=90
                )

    def build_cf_session(self, session, week, day_idx, ex_map):
        # Strength Part
        str_block = SessionBlock.objects.create(session=session, block_order=0, block_name="Strength")
        lift = 'Front Squat' if day_idx % 2 == 0 else 'Push Press' # Simple toggle
        act = Activity.objects.create(session_block=str_block, exercise=ex_map.get(lift) or ex_map.get('Back Squat'))
        for s in range(1, 6):
            ActivityPrescription.objects.create(activity=act, set_number=s, primary_metric='reps', reps='3', weight=135)

        # WOD Part
        wod_type = random.choice(['AMRAP', 'RFT', 'EMOM'])
        wod_block = SessionBlock.objects.create(
            session=session, block_order=1, block_name="WOD", 
            scheme_type=wod_type, 
            duration_target=900 if wod_type != 'RFT' else None,
            rounds_target=5 if wod_type == 'RFT' else None
        )
        
        movements = random.sample(['Wall Balls', 'Burpees', 'Box Jumps', 'Pull Ups', 'Rowing', 'Double Unders'], 3)
        for i, m in enumerate(movements):
            act = Activity.objects.create(session_block=wod_block, exercise=ex_map.get(m), order_in_block=i)
            ActivityPrescription.objects.create(activity=act, set_number=1, primary_metric='reps', reps='15')

    def build_yoga_session(self, session, week, day_idx, ex_map):
        block = SessionBlock.objects.create(session=session, block_order=0, block_name="Flow")
        poses = ['Downward Dog', 'Pigeon Pose', 'World\'s Greatest Stretch']
        for i, p in enumerate(poses):
            act = Activity.objects.create(session_block=block, exercise=ex_map.get(p), order_in_block=i)
            ActivityPrescription.objects.create(
                activity=act, set_number=1, primary_metric='time', duration_seconds=60 + (week*10)
            )

    def build_tri_session(self, session, week, day_idx, ex_map):
        # Rotate Swim, Bike, Run
        mode = ['Swimming', 'Cycling', 'Running'][day_idx % 3]
        block = SessionBlock.objects.create(session=session, block_order=0, block_name=f"{mode} Session")
        act = Activity.objects.create(session_block=block, exercise=ex_map.get(mode) or ex_map.get('Running'))
        
        ActivityPrescription.objects.create(
            activity=act, set_number=1, primary_metric='time', 
            duration_seconds=1800 + (week * 120), # 30 mins base, +2 mins per week
            prescription_notes="Steady state aerobic effort."
        )

    def build_minimalist_session(self, session, week, day_idx, ex_map):
        block = SessionBlock.objects.create(session=session, block_order=0, block_name="Full Body Circuit", scheme_type='CIRCUIT', rounds_target=4)
        exs = ['Goblet Squat', 'Push Ups', 'Dumbbell Row', 'Plank']
        for i, ex in enumerate(exs):
            self.create_activity_from_scheme(block, i, ex, '15 reps', ex_map)

    # --- HELPERS ---

    def add_simple_block(self, session, order, name, items, ex_map):
        block = SessionBlock.objects.create(session=session, block_order=order, block_name=name)
        for i, (ex_name, scheme) in enumerate(items):
            self.create_activity_from_scheme(block, i, ex_name, scheme, ex_map)

    def create_activity_from_scheme(self, block, order, ex_name, scheme, ex_map):
        ex = ex_map.get(ex_name)
        if not ex: return # Safety
        
        act = Activity.objects.create(session_block=block, exercise=ex, order_in_block=order)
        
        # Simple parsing
        if 'reps' in scheme:
            ActivityPrescription.objects.create(activity=act, set_number=1, primary_metric='reps', reps=scheme.split()[0])
        elif 'mins' in scheme:
            mins = int(scheme.split()[0])
            ActivityPrescription.objects.create(activity=act, set_number=1, primary_metric='time', duration_seconds=mins*60)
        elif 'x' in scheme: # e.g. 3x10
            sets, reps = scheme.split('x')
            for s in range(1, int(sets)+1):
                ActivityPrescription.objects.create(activity=act, set_number=s, primary_metric='reps', reps=reps)
        else:
            ActivityPrescription.objects.create(activity=act, set_number=1, primary_metric='reps', reps='10')

    def create_interactions(self, users):
        self.stdout.write('Wiring up social connections...')
        # All follow testuser
        test = users[0]
        for u in users[1:]:
            UserFollow.objects.create(follower=u, followed=test)
            # Save random programs
            progs = list(Program.objects.filter(is_public=True).exclude(user=u))
            if progs:
                UserSavedProgram.objects.create(user=u, program=random.choice(progs))