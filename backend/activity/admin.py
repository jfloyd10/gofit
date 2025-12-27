from django.contrib import admin
from activity.models import WorkoutLog, LapLog, ActivityLog, SetLog, RecordDataPoint, DeviceInfo, PersonalRecord, ProgramSubscription, FitFileImport


admin.site.register(WorkoutLog)
admin.site.register(LapLog)
admin.site.register(ActivityLog)
admin.site.register(SetLog)
admin.site.register(RecordDataPoint)
admin.site.register(DeviceInfo)
admin.site.register(PersonalRecord)
admin.site.register(ProgramSubscription)
admin.site.register(FitFileImport)