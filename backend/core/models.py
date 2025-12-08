from django.db import models
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone


#################################
# 1) Canonical/Master Tables
#################################    
class Exercise(models.Model):
    """
    Represents the 'definition' of an exercise. These will only be created by application admins. 
     - Name (e.g. 'Bench Press')
     - Description
     - Category & muscle groups
     - Equipment needed
    """
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, blank=True, null=True, on_delete=models.CASCADE, related_name="exercises")    

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)

    category = models.CharField(max_length=200, blank=True, null=True)
    equipment_needed = models.CharField(max_length=200, blank=True, null=True)    
    muscle_groups = models.CharField(max_length=200, blank=True, null=True)

    image = models.ImageField(blank=True, null=True, upload_to='img/exercises/')
    video_url = models.URLField(blank=True, null=True)

    default_sets = models.IntegerField(default=3)
    default_reps = models.IntegerField(default=8)
    default_rest = models.IntegerField(default=60)

    is_official = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "exercise"
        verbose_name = 'D_Exercise'
        verbose_name_plural = 'D_Exercise'


class Equipment(models.Model):
    """
    Equpment master table
    """
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)

    image = models.ImageField(blank=True, null=True, upload_to='img/equipment/')
    video_url = models.URLField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.equipment_name

    class Meta:
        db_table = "equipment"
        verbose_name = 'D_Equipment'
        verbose_name_plural = 'D_Equipment'


##############################
# 2) Core Tables
##############################
class Program(models.Model):
    """
    A workout program. Owned by a user, can be public or private. Stores all attributes of the workout program, can have multiple weeks, sessions, activities, & prescriptions.
    """

    FOCUS_CHOICES = (
        ("Crossfit", "Crossfit"),
        ("Yoga", "Yoga"),
        ("Hybrid", "Hybrid"),
        ("Cardio", "Cardio"),
        ("Strength", "Strength"),
        ("Triathalon", "Triathalon"),
    )
    DIFFICULTY_CHOICES = (
        ("Beginner", "Beginner"),
        ("Intermediate", "Intermediate"),
        ("Advanced", "Advanced"),
    )

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="programs")    

    title = models.CharField(max_length=250)
    description = models.TextField(blank=True, null=True)
    focus = models.CharField(max_length=150, choices=FOCUS_CHOICES, default="Strength")
    difficulty = models.CharField(max_length=50, choices=DIFFICULTY_CHOICES, default="Beginner")

    #This Image below represents the "cover image" for the program
    image = models.ImageField(blank=True, null=True, upload_to='img/program/')
    video_url = models.URLField(blank=True, null=True)
    
    price = models.DecimalField(max_digits=12, decimal_places=4,default=0.00)
      
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_public = models.BooleanField(default=False)
    is_template = models.BooleanField(default=False)


    def __str__(self):
        return f"{self.id}-{self.title}"
    

    class Meta:
        db_table = "program"
        verbose_name = 'F_Program'
        verbose_name_plural = 'F_Program'
        unique_together = ('user', 'title')

class ProgramMedia(models.Model):
    """
    Contains user uploaded media for their program
    """
    id = models.AutoField(primary_key=True)
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='media')
    image = models.ImageField(upload_to='img/program_media/')
    caption = models.CharField(max_length=255, blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.caption}"
    
    class Meta:
        db_table = "program_media"
        verbose_name = 'F_Program_Media'
        verbose_name_plural = 'F_Program_Media'

class ProgramEquipment(models.Model):
    """
    Program creaters link all required equipment to complete the program.
    """
    id = models.AutoField(primary_key=True)
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='program_equipment')
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='program_equipment')

    class Meta:
        db_table = "program_equipment"
        verbose_name = 'F_Program_Equipment'
        verbose_name_plural = 'F_Program_Equipment'


class Week(models.Model):
    """
    Designates one calendar week inside a workout program (Program). Sessions will be tied to this.
    """

    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name="weeks")
    week_number = models.PositiveIntegerField()
    week_name = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True) 

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Week {self.week_number}: {self.week_name} (Plan: {self.program.title})"
    
    class Meta:
        db_table = "week"
        verbose_name = 'F_Week'
        verbose_name_plural = 'F_Week'
        ordering = ['week_number']
        unique_together = ('program', 'week_number')


class Session(models.Model):
    """
    Designates one full workout session. Will have several activities and sets underneath.
    """

    DOW_CHOICES = (
        ("Sunday", "Sunday"),
        ("Monday", "Monday"),
        ("Tuesday", "Tuesday"),
        ("Wednesday", "Wednesday"),
        ("Thursday", "Thursday"),
        ("Friday", "Friday"),
        ("Saturday", "Saturday"),
    )
    FOCUS_CHOICES = (
        ("Lift", "Lift"),
        ("Cardio", "Cardio"),
        ("Stretch", "Stretch"),
    )

    id = models.AutoField(primary_key=True)
    week = models.ForeignKey(Week, on_delete=models.CASCADE, blank=True, null=True, related_name="sessions")
    preview_image = models.ImageField(upload_to='img/session/', blank=True, null=True)

    title = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    focus = models.CharField(max_length=255, choices=FOCUS_CHOICES, default="Lift")

    day_of_week = models.CharField(max_length=255, choices=DOW_CHOICES, default="Monday")
    day_ordering = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    @property
    def estimated_session_time(self):
        SECONDS_PER_REP = 2
        TRANSITION_TIME = 30
        total = 0
        for activity in self.activities.all():
            for s in activity.prescriptions.all():
                total += s.rest_seconds + (s.reps * SECONDS_PER_REP)
            total += TRANSITION_TIME
        minutes = total // 60
        seconds = total % 60
        return f"{minutes} min"
    

    @property
    def has_program(self):
        if self.week:
            return True
        else:
            return False
    

    def __str__(self):
        return f"{self.id}"

    class Meta:
        db_table = "session"
        verbose_name = 'F_Session'
        verbose_name_plural = 'F_Session'


class SessionBlock(models.Model):
    """
    Groups activities together.
    Examples:
    - "Warmup" (Standard list)
    - "Metcon A" (3 Rounds For Time)
    """
    SCHEME_CHOICES = (
        ('STANDARD', 'Standard List'),
        ('EMOM', 'Every Minute on the Minute'),
        ('AMRAP', 'As Many Rounds as Possible'),
        ('RFT', 'Rounds for Time')
    )

    session = models.ForeignKey(Session, related_name="blocks", on_delete=models.CASCADE)
    block_order = models.PositiveIntegerField(default=0)
    scheme_type = models.CharField(max_length=20, choices=SCHEME_CHOICES, default='STANDARD')

    block_name = models.CharField(max_length=255, blank=True, null=True)
    block_notes = models.TextField(blank=True, null=True)
    
    # For things like "AMRAP 10 mins" or "3 Rounds"
    duration_target = models.PositiveIntegerField(null=True, blank=True, help_text="Seconds for AMRAP/EMOM") 
    rounds_target = models.PositiveIntegerField(null=True, blank=True, help_text="Number of rounds for RFT")

    class Meta:
        db_table = "session_block"
        verbose_name = 'F_Session_Block'
        verbose_name_plural = 'F_Session_Block'
        ordering = ['block_order']
        unique_together = ('session', 'block_order')
        


class Activity(models.Model):
    """
    Designates a single activity, event, or lift inside the session. ActivityPrescription table determines the sets, reps, weight, time etc.
    """

    id = models.AutoField(primary_key=True)
    session_block = models.ForeignKey(SessionBlock, related_name="activities", on_delete=models.CASCADE)
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="activities", blank=True, null=True)
    
    order_in_block = models.IntegerField(default=0)

    # Name is for manual exercises only, where the reference to exercise is not present.
    manual_name = models.CharField(max_length=255, blank=True, null=True)
    manual_video_url = models.URLField(blank=True, null=True)
    manual_image = models.ImageField(blank=True, null=True, upload_to='img/manual_activites/')


    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def display_name(self):
        if self.manual_name:
            return self.manual_name
        if self.exercise:
            return self.exercise.name
        return "Untitled Activity"

    
    def __str__(self):
        return f'{self.id}'
    
    class Meta:
        db_table = "activity"
        verbose_name = 'F_Activity'
        verbose_name_plural = 'F_Activity'
        ordering = ['order_in_block']
        unique_together = ('session_block', 'order_in_block')




class ActivityPrescription(models.Model):
    """
    Stores the detail behind all Activites. Allows multiple sets with
    varied reps, rest times, and optional % of 1RM or a fixed weight.
    """

    TAG_CHOICES = (
        ('N', 'Normal / Working Set'),
        ('W', 'Warmup'),
        ('D', 'Drop Set'),
        ('F', 'Failure / AMRAP'),
        ('C', 'Cool Down'),
    )

    INTENSITY_TYPE_CHOICES = (
        ("weight", "Weight"),
        ("rpe", "RPE"),
        ("power", "Power"),
        ("perc_ftp", "%FTP"),
        ("percent_1rm", "%1RM"),
        ("heart_rate_zone", "HR Zone"),
        ("heart_rate", "Heart Rate"),
        ("pace", "Pace"),
        ("watts", "Watts"),
    )

    id = models.AutoField(primary_key=True)
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name="prescriptions")
            
    set_number = models.PositiveIntegerField()
    set_tag = models.CharField(max_length=1, choices=TAG_CHOICES, default='N')
    prescription_notes = models.TextField(blank=True, null=True)

    ## WEIGHTLIFTING BASED FIELDS ##
    reps = models.CharField(max_length=255, blank=True, null=True)
    rest_seconds = models.PositiveIntegerField(default=None, blank=True, null=True)
    tempo = models.CharField(max_length=255, blank=True, null=True)

    # Actual Weight Values stored in kg
    weight = models.DecimalField(max_digits=12, decimal_places=4, blank=True, null=True, help_text="Always stored in kg")
    is_per_side = models.BooleanField(default=False)
    
    # Intensity Value = Relative Weight Values
    intensity_value = models.CharField(max_length=50, blank=True, null=True) # "RPE 8", "Zone 2", "75%"
    intensity_type = models.CharField(max_length=50, choices=INTENSITY_TYPE_CHOICES, blank=True, null=True) # %1RM, RPE, HR_ZONE, PACE    

    # Cardio/Endurance-based fields
    duration_seconds = models.PositiveIntegerField(blank=True, null=True)
    distance = models.DecimalField(max_digits=12, decimal_places=4, blank=True, null=True, help_text="Always stored in meters. Frontend converts to miles/km/yards.")
    calories = models.PositiveIntegerField(blank=True, null=True, help_text="Target calories for Row/Ski/Bike")


    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    @property
    def display_label(self):
        parts = []
        if self.reps:
            parts.append(f"{self.reps} reps")
        if self.weight is not None:
            parts.append(f"{self.weight} kg" + (" per side" if self.is_per_side else ""))
        if self.intensity_type and self.intensity_value:
            # e.g. "(@ 80% 1RM)" or "(@ RPE 8)"
            parts.append(f"@ {self.intensity_value} {self.intensity_type}")
        if self.duration_seconds:
            parts.append(f"{self.duration_seconds}s")
        if self.distance:
            parts.append(f"{self.distance} m")
        return " ".join(parts)


    def __str__(self):
        return f'{self.id}'
    

    @property
    def session_detail_ui_config(self):
        """
        Infers which UI elements should be visible based on non-null data.
        Returns a list of field keys to instruct the frontend what to render.
        """
        config = {
            "primary_component": [],
            "secondary_components": [],
            "meta_badges": []
        }

        # 1. Check Weight (Strength context)
        # We check for not None, because 0.00 might be a valid weight in some edge cases, 
        # but usually we check > 0. Let's assume explicit None means "no weight".
        if self.weight is not None:
            config["secondary_components"].append({
                "type": "weight",
                "value": self.weight,
                "label": "kg",
                "is_per_side": self.is_per_side
            })

        # 2. Check Distance (if not primary)
        if self.distance:
            config["secondary_components"].append({
                "type": "distance", 
                "value": self.distance, 
                "label": "m"
            })

        # 3. Check Duration/Time (if not primary)
        # Useful for "Plank (Time primary) + Weight (Secondary)" 
        # or "Run (Distance primary) + Time cap (Secondary)"
        if self.duration_seconds:
             config["secondary_components"].append({
                "type": "duration", 
                "value": self.duration_seconds, 
                "label": "s"
            })

        # 4. Intensity Logic (RPE, %1RM, Zone, Pace)
        if self.intensity_type and self.intensity_value:
            config["meta_badges"].append({
                "type": "intensity",
                "label": self.get_intensity_type_display(), # e.g., "RPE"
                "value": self.intensity_value               # e.g., "8"
            })
            
        # 5. Tempo (Specific to lifting)
        if self.tempo:
            config["meta_badges"].append({
                "type": "tempo",
                "value": self.tempo
            })

        # 6. Calories (Row/Ski erg)
        if self.calories:
             config["secondary_components"].append({
                "type": "calories",
                "value": self.calories
            })

        return config


    class Meta:
        db_table = "activity_prescription"
        verbose_name = 'F_Activity_Prescription'
        verbose_name_plural = 'F_Activity_Prescription'
        unique_together = ('activity', 'set_number')



    

