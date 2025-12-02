# core/api/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    # Exercise views
    ExerciseViewSet,
    OfficialExerciseListView,
    CustomExerciseListView,
    # Equipment views
    EquipmentViewSet,
    # Program views
    ProgramViewSet,
    # Week views
    WeekViewSet,
    # Session views
    SessionListView,
    SessionDetailView,
    SessionsByProgramView,
    # Stats & Utility views
    ProgramStatsView,
    PublicProgramsView,
    TemplateProgramsView,
    CopyPublicProgramView,
    # Additional utility views
    DashboardStatsView,
    ExerciseUsageView,
    BulkExerciseSearchView,

    # Discovery View
    DiscoveryFeedView,
    PublicProgramDetailView
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'exercises', ExerciseViewSet, basename='exercise')
router.register(r'equipment', EquipmentViewSet, basename='equipment')
router.register(r'programs', ProgramViewSet, basename='program')
router.register(r'weeks', WeekViewSet, basename='week')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Exercise endpoints (dedicated)
    path('exercises/official/', OfficialExerciseListView.as_view(), name='official-exercises'),
    path('exercises/custom/', CustomExerciseListView.as_view(), name='custom-exercises'),
    path('exercises/search/', BulkExerciseSearchView.as_view(), name='exercise-search'),
    path('exercises/<int:exercise_id>/usage/', ExerciseUsageView.as_view(), name='exercise-usage'),
    
    # Session endpoints (using generic views for compatibility)
    path('sessions/', SessionListView.as_view(), name='session-list'),
    path('sessions/<int:pk>/', SessionDetailView.as_view(), name='session-detail'),
    
    # Program-specific session endpoint
    path('programs/<int:program_id>/sessions/', SessionsByProgramView.as_view(), name='program-sessions'),
    
    # Stats & Utility endpoints
    path('stats/', ProgramStatsView.as_view(), name='program-stats'),
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('public-programs/', PublicProgramsView.as_view(), name='public-programs'),
    path('template-programs/', TemplateProgramsView.as_view(), name='template-programs'),
    path('public-programs/<int:program_id>/copy/', CopyPublicProgramView.as_view(), name='copy-public-program'),

    path('discovery/feed/', DiscoveryFeedView.as_view(), name='discovery-feed'),
    path('public-programs/<int:pk>/', PublicProgramDetailView.as_view(), name='public-program-detail'),
]

"""
API Endpoints Summary:

EXERCISES:
    GET     /api/v1/core/exercises/                     - List exercises (filtered)
    POST    /api/v1/core/exercises/                     - Create custom exercise
    GET     /api/v1/core/exercises/{id}/                - Get exercise detail
    PUT     /api/v1/core/exercises/{id}/                - Update custom exercise
    PATCH   /api/v1/core/exercises/{id}/                - Partial update custom exercise
    DELETE  /api/v1/core/exercises/{id}/                - Delete custom exercise
    POST    /api/v1/core/exercises/{id}/duplicate/      - Duplicate an exercise
    GET     /api/v1/core/exercises/categories/          - List unique categories
    GET     /api/v1/core/exercises/muscle-groups/       - List unique muscle groups
    GET     /api/v1/core/exercises/equipment/           - List unique equipment types
    GET     /api/v1/core/exercises/official/            - List official exercises only
    GET     /api/v1/core/exercises/custom/              - List user's custom exercises only
    GET     /api/v1/core/exercises/search/              - Advanced exercise search
    GET     /api/v1/core/exercises/{id}/usage/          - Get exercise usage stats

    Query Parameters for list:
        - is_official: true/false (filter by official or custom)
        - category: string (filter by category)
        - muscle_groups: string (filter by muscle group)
        - equipment_needed: string (filter by equipment)
        - search: string (search in name, description, category, muscle_groups)
        - ordering: name, category, muscle_groups, created_at
        - page: int (pagination)
        - page_size: int (items per page, max 200)

EQUIPMENT:
    GET     /api/v1/core/equipment/                     - List equipment
    GET     /api/v1/core/equipment/{id}/                - Get equipment detail
    GET     /api/v1/core/equipment/names/               - List equipment names only

PROGRAMS:
    GET     /api/v1/core/programs/                      - List user's programs
    POST    /api/v1/core/programs/                      - Create program (basic)
    GET     /api/v1/core/programs/{id}/                 - Get program with all nested data
    PUT     /api/v1/core/programs/{id}/                 - Update program (basic)
    PATCH   /api/v1/core/programs/{id}/                 - Partial update program
    DELETE  /api/v1/core/programs/{id}/                 - Delete program
    POST    /api/v1/core/programs/save-full/            - Bulk save with all nested data
    POST    /api/v1/core/programs/{id}/duplicate/       - Duplicate a program
    GET     /api/v1/core/programs/{id}/sessions/        - Get sessions organized by week

    Query Parameters for list:
        - is_public: true/false
        - is_template: true/false
        - focus: string
        - difficulty: string
        - page: int
        - page_size: int

WEEKS:
    GET     /api/v1/core/weeks/                         - List weeks
    POST    /api/v1/core/weeks/                         - Create week
    GET     /api/v1/core/weeks/{id}/                    - Get week detail
    PUT     /api/v1/core/weeks/{id}/                    - Update week
    DELETE  /api/v1/core/weeks/{id}/                    - Delete week

    Query Parameters:
        - program: int (filter by program ID)

SESSIONS:
    GET     /api/v1/core/sessions/                      - List sessions
    GET     /api/v1/core/sessions/{id}/                 - Get session with all nested data
    GET     /api/v1/core/programs/{id}/sessions/        - Get sessions by program (organized by week)

    Query Parameters for list:
        - week: int (filter by week ID)
        - program: int (filter by program ID)

UTILITY:
    GET     /api/v1/core/stats/                         - Get user's program statistics
    GET     /api/v1/core/dashboard/                     - Get comprehensive dashboard stats
    GET     /api/v1/core/public-programs/               - List public programs (discovery)
    GET     /api/v1/core/template-programs/             - List template programs (starter templates)
    POST    /api/v1/core/public-programs/{id}/copy/     - Copy a public program to user's programs

    Query Parameters for public-programs:
        - focus: string
        - difficulty: string
        - search: string
    
    Query Parameters for template-programs:
        - focus: string
        - difficulty: string
"""
