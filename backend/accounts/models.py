from django.conf import settings
from django.db import models
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from core.models import Program


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_profile")
    display_name = models.CharField(max_length=150, blank=True)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(blank=True, null=True, upload_to='img/profiles/')
    date_of_birth = models.DateField(null=True, blank=True)
    height_cm = models.PositiveIntegerField(null=True, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    units = models.CharField( max_length=10, choices=(("metric", "Metric"), ("imperial", "Imperial")), default="imperial")

    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.display_name or self.user.get_username()

    @receiver(post_save, sender=User)
    def create_user_profile(sender, instance, created, **kwargs):
        if created:
            UserProfile.objects.create(user=instance)

    @receiver(post_save, sender=User)
    def save_user_profile(sender, instance, **kwargs):
        instance.user_profile.save()

    class Meta:
        db_table = "user_profile"
        verbose_name = 'D_User_Profile'
        verbose_name_plural = 'D_User_Profile'


class UserSavedProgram(models.Model):
    """
    A model to store which user has saved which program.
    """
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_programs')
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='saved_by_users')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_saved_program"
        unique_together = ('user', 'program')

    def __str__(self):
        return f"{self.user.username} saved {self.program.title}"
    
    class Meta:
        db_table = "user_saved_programs"
        verbose_name = 'F_User_Saved_Program'
        verbose_name_plural = 'F_User_Saved_Program'
    

class UserFollow(models.Model):
    """
    A model to store which users are following other users.
    """
    id = models.AutoField(primary_key=True)
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    followed = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'followed')
    
    class Meta:
        db_table = "user_followers"
        verbose_name = 'F_User Followers'
        verbose_name_plural = 'F_User Followers'