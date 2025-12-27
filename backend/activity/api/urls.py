from django.urls import path, include
from rest_framework.routers import DefaultRouter

from activity.api.views import (
    # ViewSets
    WorkoutLogViewSet,
    ActivityLogViewSet,
    SetLogViewSet,
    LapLogViewSet,
    PersonalRecordViewSet,
    ProgramSubscriptionViewSet,
    
    # API Views
    FitFileImportView,
    FitFileImportDetailView,
    
    # Analytics Views
    TrainingLoadView,
    ExerciseProgressView,
    WorkoutStreakView,
    VolumeTrendView,
    SportDistributionView,
)

app_name = 'activity'

# Create router for ViewSets
router = DefaultRouter(trailing_slash=True)
router.register(r'workouts', WorkoutLogViewSet, basename='workout')
router.register(r'activities', ActivityLogViewSet, basename='activity-log')
router.register(r'sets', SetLogViewSet, basename='set')
router.register(r'laps', LapLogViewSet, basename='lap')
router.register(r'personal-records', PersonalRecordViewSet, basename='personal-record')
router.register(r'subscriptions', ProgramSubscriptionViewSet, basename='subscription')

# URL patterns - use router.urls directly without format_suffix_patterns
urlpatterns = router.urls + [
    # FIT File Import
    path('fit-import/', FitFileImportView.as_view(), name='fit-import'),
    path('fit-import/<int:pk>/', FitFileImportDetailView.as_view(), name='fit-import-detail'),
    
    # Analytics
    path('analytics/training-load/', TrainingLoadView.as_view(), name='training-load'),
    path('analytics/exercise-progress/<int:exercise_id>/', ExerciseProgressView.as_view(), name='exercise-progress'),
    path('analytics/streak/', WorkoutStreakView.as_view(), name='workout-streak'),
    path('analytics/volume-trend/', VolumeTrendView.as_view(), name='volume-trend'),
    path('analytics/sport-distribution/', SportDistributionView.as_view(), name='sport-distribution'),
]