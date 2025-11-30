from django.contrib import admin
from accounts.models import UserProfile, UserFollow, UserSavedProgram

admin.site.register(UserProfile)
admin.site.register(UserFollow)
admin.site.register(UserSavedProgram)