# core/api/urls.py
from django.urls import path
from .views import SessionListView, SessionDetailView, SessionsByProgramView

urlpatterns = [
    path('sessions/', SessionListView.as_view(), name='session-list'),
    path('sessions/<int:pk>/', SessionDetailView.as_view(), name='session-detail'),
    path('programs/<int:program_id>/sessions/', SessionsByProgramView.as_view(), name='program-sessions'),
]
