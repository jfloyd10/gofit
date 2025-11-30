from django.contrib import admin
from core.models import Exercise, Program, ProgramMedia, Session, SessionBlock, Activity, ActivityPrescription, Week


admin.site.register(Exercise)
admin.site.register(Program)
admin.site.register(ProgramMedia)
admin.site.register(Session)
admin.site.register(SessionBlock)
admin.site.register(Activity)
admin.site.register(ActivityPrescription)
admin.site.register(Week)