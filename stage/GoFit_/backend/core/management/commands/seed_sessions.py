# core/management/commands/seed_sessions.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
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
    help = 'Seed the database with sample session data for testing'

    def handle(self, *args, **options):
        self.stdout.write('Seeding session data...')

        # Get or create a test user
        user, created = User.objects.get_or_create(
            username='testuser',
            defaults={
                'email': 'test@example.com',
                'first_name': 'Test',
                'last_name': 'User',
            }
        )
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write(f'Created test user: {user.username}')

        # Create some exercises
        exercises = {
            'bench_press': Exercise.objects.get_or_create(
                name='Bench Press',
                defaults={
                    'description': 'Barbell bench press for chest development',
                    'category': 'Push',
                    'equipment_needed': 'Barbell, Bench',
                    'muscle_groups': 'Chest, Triceps, Shoulders',
                    'default_sets': 4,
                    'default_reps': 8,
                    'default_rest': 90,
                    'is_official': True,
                }
            )[0],
            'squat': Exercise.objects.get_or_create(
                name='Back Squat',
                defaults={
                    'description': 'Barbell back squat for leg and core strength',
                    'category': 'Legs',
                    'equipment_needed': 'Barbell, Squat Rack',
                    'muscle_groups': 'Quads, Glutes, Hamstrings',
                    'default_sets': 5,
                    'default_reps': 5,
                    'default_rest': 120,
                    'is_official': True,
                }
            )[0],
            'deadlift': Exercise.objects.get_or_create(
                name='Deadlift',
                defaults={
                    'description': 'Conventional barbell deadlift',
                    'category': 'Pull',
                    'equipment_needed': 'Barbell',
                    'muscle_groups': 'Back, Hamstrings, Glutes',
                    'default_sets': 3,
                    'default_reps': 5,
                    'default_rest': 180,
                    'is_official': True,
                }
            )[0],
            'pull_ups': Exercise.objects.get_or_create(
                name='Pull Ups',
                defaults={
                    'description': 'Bodyweight pull ups',
                    'category': 'Pull',
                    'equipment_needed': 'Pull Up Bar',
                    'muscle_groups': 'Lats, Biceps, Core',
                    'default_sets': 3,
                    'default_reps': 10,
                    'default_rest': 60,
                    'is_official': True,
                }
            )[0],
            'burpees': Exercise.objects.get_or_create(
                name='Burpees',
                defaults={
                    'description': 'Full body explosive movement',
                    'category': 'Cardio',
                    'equipment_needed': 'None',
                    'muscle_groups': 'Full Body',
                    'default_sets': 3,
                    'default_reps': 10,
                    'default_rest': 30,
                    'is_official': True,
                }
            )[0],
            'rowing': Exercise.objects.get_or_create(
                name='Rowing',
                defaults={
                    'description': 'Rowing machine cardio',
                    'category': 'Cardio',
                    'equipment_needed': 'Rowing Machine',
                    'muscle_groups': 'Full Body',
                    'default_sets': 1,
                    'default_reps': 1,
                    'default_rest': 0,
                    'is_official': True,
                }
            )[0],
            'db_curl': Exercise.objects.get_or_create(
                name='Dumbbell Curl',
                defaults={
                    'description': 'Bicep curls with dumbbells',
                    'category': 'Arms',
                    'equipment_needed': 'Dumbbells',
                    'muscle_groups': 'Biceps',
                    'default_sets': 3,
                    'default_reps': 12,
                    'default_rest': 60,
                    'is_official': True,
                }
            )[0],
            'plank': Exercise.objects.get_or_create(
                name='Plank',
                defaults={
                    'description': 'Core stability hold',
                    'category': 'Core',
                    'equipment_needed': 'None',
                    'muscle_groups': 'Core',
                    'default_sets': 3,
                    'default_reps': 1,
                    'default_rest': 30,
                    'is_official': True,
                }
            )[0],
        }
        self.stdout.write(f'Created {len(exercises)} exercises')

        # Create a program
        program, _ = Program.objects.get_or_create(
            user=user,
            title='Strength Builder',
            defaults={
                'description': 'A 4-week strength building program focusing on compound lifts.',
                'focus': 'Strength',
                'difficulty': 'Intermediate',
                'is_public': True,
            }
        )

        # Create Week 1
        week, _ = Week.objects.get_or_create(
            program=program,
            week_number=1,
            defaults={
                'week_name': 'Foundation Week',
                'notes': 'Focus on form and establishing baseline weights.',
            }
        )

        # Create Session 1: Upper Body Strength
        session1, created = Session.objects.get_or_create(
            week=week,
            title='Upper Body Strength',
            defaults={
                'description': 'Focus on compound pushing and pulling movements for upper body development.',
                'focus': 'Lift',
                'day_of_week': 'Monday',
                'day_ordering': 1,
            }
        )

        if created:
            # Block 1: Warmup
            warmup_block = SessionBlock.objects.create(
                session=session1,
                block_order=0,
                scheme_type='STANDARD',
                block_name='Warmup',
                block_notes='Light cardio and dynamic stretching',
            )

            rowing_activity = Activity.objects.create(
                session_block=warmup_block,
                exercise=exercises['rowing'],
                order_in_block=0,
                notes='Easy pace warmup',
            )
            ActivityPrescription.objects.create(
                activity=rowing_activity,
                set_number=1,
                set_tag='W',
                primary_metric='time',
                duration_seconds=300,
            )

            # Block 2: Main Lifts
            main_block = SessionBlock.objects.create(
                session=session1,
                block_order=1,
                scheme_type='STANDARD',
                block_name='Main Lifts',
                block_notes='Focus on controlled movements and proper form',
            )

            # Bench Press
            bench_activity = Activity.objects.create(
                session_block=main_block,
                exercise=exercises['bench_press'],
                order_in_block=0,
                notes='Keep shoulder blades retracted throughout',
            )
            for i in range(1, 5):
                ActivityPrescription.objects.create(
                    activity=bench_activity,
                    set_number=i,
                    set_tag='W' if i == 1 else 'N',
                    primary_metric='reps',
                    reps='5' if i == 1 else '8',
                    weight=50 if i == 1 else 70,
                    rest_seconds=90,
                    intensity_type='percent_1rm' if i > 1 else None,
                    intensity_value='70' if i > 1 else None,
                )

            # Pull Ups
            pullup_activity = Activity.objects.create(
                session_block=main_block,
                exercise=exercises['pull_ups'],
                order_in_block=1,
                notes='Full range of motion, dead hang at bottom',
            )
            for i in range(1, 4):
                ActivityPrescription.objects.create(
                    activity=pullup_activity,
                    set_number=i,
                    set_tag='N' if i < 3 else 'F',
                    primary_metric='reps',
                    reps='8-10' if i < 3 else 'AMRAP',
                    rest_seconds=60,
                )

            # Block 3: Accessories
            accessory_block = SessionBlock.objects.create(
                session=session1,
                block_order=2,
                scheme_type='CIRCUIT',
                block_name='Finisher Circuit',
                block_notes='Minimal rest between exercises',
                rounds_target=3,
            )

            curl_activity = Activity.objects.create(
                session_block=accessory_block,
                exercise=exercises['db_curl'],
                order_in_block=0,
            )
            ActivityPrescription.objects.create(
                activity=curl_activity,
                set_number=1,
                primary_metric='reps',
                reps='12',
                weight=10,
                is_per_side=True,
            )

            plank_activity = Activity.objects.create(
                session_block=accessory_block,
                exercise=exercises['plank'],
                order_in_block=1,
            )
            ActivityPrescription.objects.create(
                activity=plank_activity,
                set_number=1,
                primary_metric='time',
                duration_seconds=45,
            )

        # Create Session 2: Lower Body Power
        session2, created = Session.objects.get_or_create(
            week=week,
            title='Lower Body Power',
            defaults={
                'description': 'Build leg strength and explosive power with squats and deadlifts.',
                'focus': 'Lift',
                'day_of_week': 'Wednesday',
                'day_ordering': 2,
            }
        )

        if created:
            # Main Block
            main_block = SessionBlock.objects.create(
                session=session2,
                block_order=0,
                scheme_type='STANDARD',
                block_name='Strength',
            )

            # Squats
            squat_activity = Activity.objects.create(
                session_block=main_block,
                exercise=exercises['squat'],
                order_in_block=0,
                notes='Descend until hip crease is below knee',
            )
            for i in range(1, 6):
                ActivityPrescription.objects.create(
                    activity=squat_activity,
                    set_number=i,
                    set_tag='W' if i <= 2 else 'N',
                    primary_metric='reps',
                    reps='5',
                    weight=40 + (i * 10),
                    rest_seconds=120 if i > 2 else 90,
                    tempo='3-1-1-0' if i > 2 else None,
                )

            # Deadlifts
            deadlift_activity = Activity.objects.create(
                session_block=main_block,
                exercise=exercises['deadlift'],
                order_in_block=1,
                notes='Maintain neutral spine throughout',
            )
            for i in range(1, 4):
                ActivityPrescription.objects.create(
                    activity=deadlift_activity,
                    set_number=i,
                    set_tag='N',
                    primary_metric='reps',
                    reps='5',
                    weight=80 + (i * 10),
                    rest_seconds=180,
                    intensity_type='rpe',
                    intensity_value='7-8',
                )

        # Create Session 3: AMRAP Workout (standalone)
        session3, created = Session.objects.get_or_create(
            week=None,  # Standalone session
            title='20 Min AMRAP Challenge',
            defaults={
                'description': 'High intensity metabolic conditioning workout.',
                'focus': 'Cardio',
                'day_of_week': 'Friday',
                'day_ordering': 0,
            }
        )

        if created:
            amrap_block = SessionBlock.objects.create(
                session=session3,
                block_order=0,
                scheme_type='AMRAP',
                block_name='The Grinder',
                block_notes='Move at a sustainable pace. Scale as needed.',
                duration_target=1200,  # 20 minutes
            )

            burpee_activity = Activity.objects.create(
                session_block=amrap_block,
                exercise=exercises['burpees'],
                order_in_block=0,
            )
            ActivityPrescription.objects.create(
                activity=burpee_activity,
                set_number=1,
                primary_metric='reps',
                reps='10',
            )

            squat_activity = Activity.objects.create(
                session_block=amrap_block,
                exercise=exercises['squat'],
                order_in_block=1,
                notes='Air squats or goblet squats',
            )
            ActivityPrescription.objects.create(
                activity=squat_activity,
                set_number=1,
                primary_metric='reps',
                reps='15',
            )

            pullup_activity = Activity.objects.create(
                session_block=amrap_block,
                exercise=exercises['pull_ups'],
                order_in_block=2,
            )
            ActivityPrescription.objects.create(
                activity=pullup_activity,
                set_number=1,
                primary_metric='reps',
                reps='5',
            )

            row_activity = Activity.objects.create(
                session_block=amrap_block,
                exercise=exercises['rowing'],
                order_in_block=3,
            )
            ActivityPrescription.objects.create(
                activity=row_activity,
                set_number=1,
                primary_metric='calories',
                calories=20,
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded session data!'))
        self.stdout.write(f'\nTest credentials:')
        self.stdout.write(f'  Username: testuser')
        self.stdout.write(f'  Password: testpass123')
        self.stdout.write(f'\nCreated sessions:')
        self.stdout.write(f'  - Session ID {session1.id}: {session1.title}')
        self.stdout.write(f'  - Session ID {session2.id}: {session2.title}')
        self.stdout.write(f'  - Session ID {session3.id}: {session3.title}')
