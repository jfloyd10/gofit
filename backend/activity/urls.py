from django.urls import path
from activity.template_views import (
    FitFileUploadView, 
    FitFileUploadAjaxView, 
    WorkoutAdminView,
    WorkoutDetailView,
)

app_name = 'activity'

urlpatterns = [
    # FIT File Upload Template View
    path('upload/', FitFileUploadView.as_view(), name='fit-upload'),
    
    # AJAX endpoint for drag-and-drop uploads
    path('upload/ajax/', FitFileUploadAjaxView.as_view(), name='fit-upload-ajax'),
    
    # Workout Admin - fast deletion utility
    path('admin/', WorkoutAdminView.as_view(), name='workout-admin'),
    
    # Workout Detail View
    path('workout/<int:workout_id>/', WorkoutDetailView.as_view(), name='workout-detail'),
]