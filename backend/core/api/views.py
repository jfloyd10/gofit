# core/api/views.py

from rest_framework import generics, permissions, status, viewsets, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.db.models import Prefetch, Q, Count
from django.db import transaction

from core.models import (
    Exercise,
    Equipment,
    Program,
    Week,
    Session,
    SessionBlock,
    Activity,
    ActivityPrescription,
)
from .serializers import (
    # Exercise serializers
    ExerciseSerializer,
    ExerciseListSerializer,
    ExerciseMinimalSerializer,
    ExerciseCreateSerializer,
    # Equipment serializers
    EquipmentSerializer,
    # Session serializers
    SessionDetailSerializer,
    SessionListSerializer,
    # Program serializers
    ProgramListSerializer,
    ProgramDetailSerializer,
    ProgramCreateUpdateSerializer,
    ProgramFullSaveSerializer,
    # Week serializers
    WeekMinimalSerializer,
    WeekDetailSerializer,
)


# =============================================================================
# PAGINATION CLASSES
# =============================================================================

class StandardResultsPagination(PageNumberPagination):
    """Standard pagination for list views."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ExercisePagination(PageNumberPagination):
    """Pagination for exercise list views."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


# =============================================================================
# EXERCISE VIEWS
# =============================================================================

class ExerciseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Exercise CRUD operations.
    
    Supports:
    - List with filtering (is_official, category, muscle_groups, equipment, search)
    - Create (custom exercises only)
    - Update (custom exercises only)
    - Delete (custom exercises only)
    - Special actions: categories, muscle-groups, equipment-list
    """
    serializer_class = ExerciseSerializer
    pagination_class = ExercisePagination
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'category', 'muscle_groups']
    ordering_fields = ['name', 'category', 'muscle_groups', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """
        Return exercises filtered by query parameters.
        - Official exercises are visible to everyone
        - Custom exercises are only visible to their owner
        """
        user = self.request.user
        queryset = Exercise.objects.all()
        
        # Filter by is_official
        is_official = self.request.query_params.get('is_official')
        if is_official is not None:
            is_official_bool = is_official.lower() in ['true', '1', 'yes']
            if is_official_bool:
                # Official exercises - visible to all
                queryset = queryset.filter(is_official=True)
            else:
                # Custom exercises - only user's own
                queryset = queryset.filter(is_official=False, user=user)
        else:
            # No filter - show official + user's custom
            queryset = queryset.filter(
                Q(is_official=True) | Q(user=user, is_official=False)
            )
        
        # Filter by category (supports comma-separated values)
        category = self.request.query_params.get('category')
        if category:
            categories = [c.strip() for c in category.split(',')]
            q_objects = Q()
            for cat in categories:
                q_objects |= Q(category__icontains=cat)
            queryset = queryset.filter(q_objects)
        
        # Filter by muscle groups (supports comma-separated values)
        muscle_groups = self.request.query_params.get('muscle_groups')
        if muscle_groups:
            muscles = [m.strip() for m in muscle_groups.split(',')]
            q_objects = Q()
            for muscle in muscles:
                q_objects |= Q(muscle_groups__icontains=muscle)
            queryset = queryset.filter(q_objects)
        
        # Filter by equipment
        equipment = self.request.query_params.get('equipment_needed')
        if equipment:
            equipment_list = [e.strip() for e in equipment.split(',')]
            q_objects = Q()
            for eq in equipment_list:
                q_objects |= Q(equipment_needed__icontains=eq)
            queryset = queryset.filter(q_objects)
        
        return queryset.distinct()
    
    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'list':
            return ExerciseListSerializer
        elif self.action == 'create':
            return ExerciseCreateSerializer
        return ExerciseSerializer
    
    def perform_create(self, serializer):
        """Ensure custom exercises are always marked as non-official."""
        serializer.save(user=self.request.user, is_official=False)
    
    def perform_update(self, serializer):
        """Only allow updating custom exercises owned by the user."""
        exercise = self.get_object()
        if exercise.is_official:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Cannot modify official exercises.")
        if exercise.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Cannot modify exercises owned by other users.")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Only allow deleting custom exercises owned by the user."""
        if instance.is_official:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Cannot delete official exercises.")
        if instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Cannot delete exercises owned by other users.")
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """
        Return a list of unique exercise categories.
        """
        user = request.user
        
        # Get categories from official exercises and user's custom exercises
        categories = Exercise.objects.filter(
            Q(is_official=True) | Q(user=user, is_official=False)
        ).exclude(
            category__isnull=True
        ).exclude(
            category=''
        ).values_list('category', flat=True).distinct().order_by('category')
        
        return Response(list(categories))
    
    @action(detail=False, methods=['get'], url_path='muscle-groups')
    def muscle_groups(self, request):
        """
        Return a list of unique muscle groups.
        """
        user = request.user
        
        # Get muscle groups from official exercises and user's custom exercises
        muscle_groups = Exercise.objects.filter(
            Q(is_official=True) | Q(user=user, is_official=False)
        ).exclude(
            muscle_groups__isnull=True
        ).exclude(
            muscle_groups=''
        ).values_list('muscle_groups', flat=True).distinct()
        
        # Parse comma-separated muscle groups and flatten
        all_muscles = set()
        for mg in muscle_groups:
            if mg:
                for m in mg.split(','):
                    m = m.strip()
                    if m:
                        all_muscles.add(m)
        
        return Response(sorted(list(all_muscles)))
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Create a copy of an exercise as a custom exercise.
        Only works for official exercises or user's own custom exercises.
        """
        try:
            exercise = self.get_object()
        except Exercise.DoesNotExist:
            return Response({'error': 'Exercise not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check permissions
        if not exercise.is_official and exercise.user != request.user:
            return Response(
                {'error': 'Cannot duplicate exercises owned by other users.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create the copy
        new_exercise = Exercise.objects.create(
            user=request.user,
            name=f"{exercise.name} (Copy)",
            description=exercise.description,
            category=exercise.category,
            muscle_groups=exercise.muscle_groups,
            equipment_needed=exercise.equipment_needed,
            video_url=exercise.video_url,
            default_sets=exercise.default_sets,
            default_reps=exercise.default_reps,
            default_rest=exercise.default_rest,
            is_official=False,  # Copies are always custom
        )
        
        serializer = ExerciseSerializer(new_exercise, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def equipment(self, request):
        """
        Return a list of unique equipment needed values.
        """
        user = request.user
        
        equipment_list = Exercise.objects.filter(
            Q(is_official=True) | Q(user=user, is_official=False)
        ).exclude(
            equipment_needed__isnull=True
        ).exclude(
            equipment_needed=''
        ).values_list('equipment_needed', flat=True).distinct()
        
        # Parse comma-separated equipment and flatten
        all_equipment = set()
        for eq in equipment_list:
            if eq:
                for e in eq.split(','):
                    e = e.strip()
                    if e:
                        all_equipment.add(e)
        
        return Response(sorted(list(all_equipment)))

    @action(detail=False, methods=['get'], url_path='equipment-list')
    def equipment_list(self, request):
        """
        Return a list of unique equipment types used in exercises.
        """
        user = request.user
        
        # Get equipment from official exercises and user's custom exercises
        equipment = Exercise.objects.filter(
            Q(is_official=True) | Q(user=user, is_official=False)
        ).exclude(
            equipment_needed__isnull=True
        ).exclude(
            equipment_needed=''
        ).values_list('equipment_needed', flat=True).distinct()
        
        # Parse comma-separated equipment and flatten
        all_equipment = set()
        for eq in equipment:
            if eq:
                for e in eq.split(','):
                    e = e.strip()
                    if e:
                        all_equipment.add(e)
        
        return Response(sorted(list(all_equipment)))


class OfficialExerciseListView(generics.ListAPIView):
    """
    Dedicated endpoint for listing official exercises with filtering.
    """
    serializer_class = ExerciseListSerializer
    pagination_class = ExercisePagination
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'category', 'muscle_groups']
    ordering_fields = ['name', 'category', 'muscle_groups', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        queryset = Exercise.objects.filter(is_official=True)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__icontains=category)
        
        # Filter by muscle groups
        muscle_groups = self.request.query_params.get('muscle_groups')
        if muscle_groups:
            queryset = queryset.filter(muscle_groups__icontains=muscle_groups)
        
        # Filter by equipment
        equipment = self.request.query_params.get('equipment_needed')
        if equipment:
            queryset = queryset.filter(equipment_needed__icontains=equipment)
        
        return queryset


class CustomExerciseListView(generics.ListAPIView):
    """
    Dedicated endpoint for listing user's custom exercises with filtering.
    """
    serializer_class = ExerciseListSerializer
    pagination_class = ExercisePagination
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'category', 'muscle_groups']
    ordering_fields = ['name', 'category', 'muscle_groups', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        queryset = Exercise.objects.filter(is_official=False, user=self.request.user)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__icontains=category)
        
        # Filter by muscle groups
        muscle_groups = self.request.query_params.get('muscle_groups')
        if muscle_groups:
            queryset = queryset.filter(muscle_groups__icontains=muscle_groups)
        
        # Filter by equipment
        equipment = self.request.query_params.get('equipment_needed')
        if equipment:
            queryset = queryset.filter(equipment_needed__icontains=equipment)
        
        return queryset


# =============================================================================
# EQUIPMENT VIEWS
# =============================================================================

class EquipmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Equipment (read-only).
    
    Endpoints:
    - GET /equipment/ - List all equipment with optional search
    - GET /equipment/{id}/ - Get equipment detail
    - GET /equipment/names/ - Get list of equipment names only (for dropdowns)
    """
    queryset = Equipment.objects.all().order_by('name')
    serializer_class = EquipmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    
    @action(detail=False, methods=['get'])
    def names(self, request):
        """
        Return a list of equipment names only (for dropdown filters).
        """
        names = Equipment.objects.values_list('name', flat=True).order_by('name')
        return Response(list(names))


# =============================================================================
# PROGRAM VIEWS
# =============================================================================

class ProgramViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Program CRUD operations.
    
    Supports:
    - List (user's own programs)
    - Create
    - Retrieve (full detail with nested weeks/sessions)
    - Update
    - Delete
    - save_full: Bulk save with all nested data
    - duplicate: Create a copy of a program
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsPagination
    
    def get_queryset(self):
        """Return programs owned by the current user."""
        user = self.request.user
        queryset = Program.objects.filter(user=user)
        
        # Optional filtering
        is_public = self.request.query_params.get('is_public')
        if is_public is not None:
            queryset = queryset.filter(is_public=is_public.lower() in ['true', '1'])
        
        is_template = self.request.query_params.get('is_template')
        if is_template is not None:
            queryset = queryset.filter(is_template=is_template.lower() in ['true', '1'])
        
        focus = self.request.query_params.get('focus')
        if focus:
            queryset = queryset.filter(focus=focus)
        
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        
        # Prefetch for performance
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related(
                Prefetch(
                    'weeks',
                    queryset=Week.objects.order_by('week_number').prefetch_related(
                        Prefetch(
                            'sessions',
                            queryset=Session.objects.order_by('day_ordering').prefetch_related(
                                Prefetch(
                                    'blocks',
                                    queryset=SessionBlock.objects.order_by('block_order').prefetch_related(
                                        Prefetch(
                                            'activities',
                                            queryset=Activity.objects.order_by('order_in_block').select_related(
                                                'exercise'
                                            ).prefetch_related(
                                                Prefetch(
                                                    'prescriptions',
                                                    queryset=ActivityPrescription.objects.order_by('set_number')
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        else:
            queryset = queryset.prefetch_related('weeks__sessions')
        
        return queryset.order_by('-updated_at')
    
    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'list':
            return ProgramListSerializer
        elif self.action == 'retrieve':
            return ProgramDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProgramCreateUpdateSerializer
        elif self.action == 'save_full':
            return ProgramFullSaveSerializer
        return ProgramDetailSerializer
    
    def perform_create(self, serializer):
        """Set the user when creating a program."""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'], url_path='save-full')
    def save_full(self, request):
        """
        Bulk save a program with all nested data (weeks, sessions, blocks, activities, prescriptions).
        
        If 'id' is provided in the payload, updates the existing program.
        Otherwise, creates a new program.
        """
        program_id = request.data.get('id')
        
        if program_id:
            # Update existing program
            try:
                program = Program.objects.get(id=program_id, user=request.user)
            except Program.DoesNotExist:
                return Response(
                    {'error': 'Program not found or you do not have permission to edit it.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = ProgramFullSaveSerializer(program, data=request.data, context={'request': request})
        else:
            # Create new program
            serializer = ProgramFullSaveSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            program = serializer.save()
            
            # Return the full program detail
            detail_serializer = ProgramDetailSerializer(program, context={'request': request})
            return Response(detail_serializer.data, status=status.HTTP_200_OK if program_id else status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Create a copy of the program with all nested data.
        """
        try:
            original = self.get_object()
        except Program.DoesNotExist:
            return Response({'error': 'Program not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        with transaction.atomic():
            # Create new program
            new_program = Program.objects.create(
                user=request.user,
                title=f"{original.title} (Copy)",
                description=original.description,
                focus=original.focus,
                difficulty=original.difficulty,
                image=original.image,
                video_url=original.video_url,
                price=original.price,
                is_public=False,  # Copies start as private
                is_template=original.is_template,
            )
            
            # Copy weeks
            for week in original.weeks.all():
                new_week = Week.objects.create(
                    program=new_program,
                    week_number=week.week_number,
                    week_name=week.week_name,
                    notes=week.notes,
                )
                
                # Copy sessions
                for session in week.sessions.all():
                    new_session = Session.objects.create(
                        week=new_week,
                        title=session.title,
                        description=session.description,
                        focus=session.focus,
                        day_of_week=session.day_of_week,
                        day_ordering=session.day_ordering,
                        preview_image=session.preview_image,
                    )
                    
                    # Copy blocks
                    for block in session.blocks.all():
                        new_block = SessionBlock.objects.create(
                            session=new_session,
                            block_order=block.block_order,
                            scheme_type=block.scheme_type,
                            block_name=block.block_name,
                            block_notes=block.block_notes,
                            duration_target=block.duration_target,
                            rounds_target=block.rounds_target,
                        )
                        
                        # Copy activities
                        for activity in block.activities.all():
                            new_activity = Activity.objects.create(
                                session_block=new_block,
                                exercise=activity.exercise,
                                order_in_block=activity.order_in_block,
                                manual_name=activity.manual_name,
                                manual_video_url=activity.manual_video_url,
                                manual_image=activity.manual_image,
                                notes=activity.notes,
                            )
                            
                            # Copy prescriptions
                            for prescription in activity.prescriptions.all():
                                ActivityPrescription.objects.create(
                                    activity=new_activity,
                                    set_number=prescription.set_number,
                                    set_tag=prescription.set_tag,
                                    primary_metric=prescription.primary_metric,
                                    prescription_notes=prescription.prescription_notes,
                                    reps=prescription.reps,
                                    rest_seconds=prescription.rest_seconds,
                                    tempo=prescription.tempo,
                                    weight=prescription.weight,
                                    is_per_side=prescription.is_per_side,
                                    intensity_value=prescription.intensity_value,
                                    intensity_type=prescription.intensity_type,
                                    duration_seconds=prescription.duration_seconds,
                                    distance=prescription.distance,
                                    calories=prescription.calories,
                                    extra_data=prescription.extra_data,
                                )
        
        # Return the new program
        serializer = ProgramDetailSerializer(new_program, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def sessions(self, request, pk=None):
        """
        Get all sessions for a program organized by week.
        """
        program = self.get_object()
        
        weeks = Week.objects.filter(program=program).prefetch_related(
            Prefetch(
                'sessions',
                queryset=Session.objects.order_by('day_ordering').prefetch_related('blocks__activities')
            )
        ).order_by('week_number')
        
        result = []
        for week in weeks:
            week_data = {
                'week_id': week.id,
                'week_number': week.week_number,
                'week_name': week.week_name,
                'notes': week.notes,
                'sessions': SessionListSerializer(week.sessions.all(), many=True).data
            }
            result.append(week_data)
        
        return Response(result)


# =============================================================================
# SESSION VIEWS (Existing + Enhanced)
# =============================================================================

class SessionListView(generics.ListAPIView):
    """
    List all sessions accessible to the user.
    For now, returns all sessions. Can be filtered by program/week later.
    """
    serializer_class = SessionListSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsPagination
    
    def get_queryset(self):
        queryset = Session.objects.all().prefetch_related('blocks__activities')
        
        # Optional filtering by week
        week_id = self.request.query_params.get('week')
        if week_id:
            queryset = queryset.filter(week_id=week_id)
        
        # Optional filtering by program
        program_id = self.request.query_params.get('program')
        if program_id:
            queryset = queryset.filter(week__program_id=program_id)
        
        # Filter by user's programs only
        user = self.request.user
        queryset = queryset.filter(
            Q(week__program__user=user) | Q(week__isnull=True)
        )
        
        return queryset.order_by('day_ordering')


class SessionDetailView(generics.RetrieveAPIView):
    """
    Retrieve a single session with all nested blocks, activities, and prescriptions.
    """
    serializer_class = SessionDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Optimize with prefetch_related to avoid N+1 queries
        return Session.objects.prefetch_related(
            Prefetch(
                'blocks',
                queryset=SessionBlock.objects.order_by('block_order').prefetch_related(
                    Prefetch(
                        'activities',
                        queryset=Activity.objects.order_by('order_in_block').select_related(
                            'exercise'
                        ).prefetch_related(
                            Prefetch(
                                'prescriptions',
                                queryset=ActivityPrescription.objects.order_by('set_number')
                            )
                        )
                    )
                )
            ),
            'week__program'
        )


class SessionsByProgramView(APIView):
    """
    Get all sessions for a given program, organized by week.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, program_id):
        # Verify user owns the program
        try:
            program = Program.objects.get(id=program_id, user=request.user)
        except Program.DoesNotExist:
            return Response(
                {'error': 'Program not found or you do not have permission to view it.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        weeks = Week.objects.filter(program_id=program_id).prefetch_related(
            Prefetch(
                'sessions',
                queryset=Session.objects.order_by('day_ordering').prefetch_related('blocks__activities')
            )
        ).order_by('week_number')
        
        result = []
        for week in weeks:
            week_data = {
                'week_id': week.id,
                'week_number': week.week_number,
                'week_name': week.week_name,
                'notes': week.notes,
                'sessions': SessionListSerializer(week.sessions.all(), many=True).data
            }
            result.append(week_data)
        
        return Response(result)


# =============================================================================
# WEEK VIEWS
# =============================================================================

class WeekViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Week CRUD operations within a program.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        program_id = self.kwargs.get('program_pk') or self.request.query_params.get('program')
        
        queryset = Week.objects.filter(program__user=user)
        
        if program_id:
            queryset = queryset.filter(program_id=program_id)
        
        return queryset.order_by('week_number')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WeekDetailSerializer
        return WeekMinimalSerializer
    
    def perform_create(self, serializer):
        program_id = self.request.data.get('program_id') or self.kwargs.get('program_pk')
        program = Program.objects.get(id=program_id, user=self.request.user)
        serializer.save(program=program)


# =============================================================================
# STATS & UTILITY VIEWS
# =============================================================================

class ProgramStatsView(APIView):
    """
    Get statistics for a user's programs.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        programs = Program.objects.filter(user=user)
        
        total_programs = programs.count()
        total_weeks = Week.objects.filter(program__user=user).count()
        total_sessions = Session.objects.filter(week__program__user=user).count()
        total_exercises = Activity.objects.filter(
            session_block__session__week__program__user=user
        ).count()
        
        # Programs by focus
        programs_by_focus = list(
            programs.values('focus').annotate(count=Count('id')).order_by('-count')
        )
        
        # Programs by difficulty
        programs_by_difficulty = list(
            programs.values('difficulty').annotate(count=Count('id')).order_by('difficulty')
        )
        
        return Response({
            'total_programs': total_programs,
            'total_weeks': total_weeks,
            'total_sessions': total_sessions,
            'total_exercises': total_exercises,
            'programs_by_focus': programs_by_focus,
            'programs_by_difficulty': programs_by_difficulty,
        })


class PublicProgramsView(generics.ListAPIView):
    """
    List public programs (for discovery/marketplace).
    """
    serializer_class = ProgramListSerializer
    #permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsPagination
    
    def get_queryset(self):
        queryset = Program.objects.filter(is_public=True).prefetch_related('weeks__sessions')
        
        # Filtering options
        focus = self.request.query_params.get('focus')
        if focus:
            queryset = queryset.filter(focus=focus)
        
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        
        # Exclude user's own programs from public listing
        user = self.request.user
        queryset = queryset.exclude(user=user)
        
        return queryset.order_by('-created_at')


class TemplateProgramsView(generics.ListAPIView):
    """
    List template programs (starter templates for new programs).
    """
    serializer_class = ProgramListSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsPagination
    
    def get_queryset(self):
        queryset = Program.objects.filter(is_template=True, is_public=True).prefetch_related('weeks__sessions')
        
        # Filtering options
        focus = self.request.query_params.get('focus')
        if focus:
            queryset = queryset.filter(focus=focus)
        
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        
        return queryset.order_by('title')


class CopyPublicProgramView(APIView):
    """
    Copy a public program to the user's own programs.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, program_id):
        try:
            original = Program.objects.get(id=program_id, is_public=True)
        except Program.DoesNotExist:
            return Response(
                {'error': 'Public program not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        with transaction.atomic():
            # Create new program
            new_program = Program.objects.create(
                user=request.user,
                title=f"{original.title} (Copy)",
                description=original.description,
                focus=original.focus,
                difficulty=original.difficulty,
                image=original.image,
                video_url=original.video_url,
                price=0,  # Reset price for copies
                is_public=False,  # Copies start as private
                is_template=False,  # Not a template
            )
            
            # Copy weeks
            for week in original.weeks.all().order_by('week_number'):
                new_week = Week.objects.create(
                    program=new_program,
                    week_number=week.week_number,
                    week_name=week.week_name,
                    notes=week.notes,
                )
                
                # Copy sessions
                for session in week.sessions.all().order_by('day_ordering'):
                    new_session = Session.objects.create(
                        week=new_week,
                        title=session.title,
                        description=session.description,
                        focus=session.focus,
                        day_of_week=session.day_of_week,
                        day_ordering=session.day_ordering,
                        preview_image=session.preview_image,
                    )
                    
                    # Copy blocks
                    for block in session.blocks.all().order_by('block_order'):
                        new_block = SessionBlock.objects.create(
                            session=new_session,
                            block_order=block.block_order,
                            scheme_type=block.scheme_type,
                            block_name=block.block_name,
                            block_notes=block.block_notes,
                            duration_target=block.duration_target,
                            rounds_target=block.rounds_target,
                        )
                        
                        # Copy activities
                        for activity in block.activities.all().order_by('order_in_block'):
                            new_activity = Activity.objects.create(
                                session_block=new_block,
                                exercise=activity.exercise,
                                order_in_block=activity.order_in_block,
                                manual_name=activity.manual_name,
                                manual_video_url=activity.manual_video_url,
                                manual_image=activity.manual_image,
                                notes=activity.notes,
                            )
                            
                            # Copy prescriptions
                            for prescription in activity.prescriptions.all().order_by('set_number'):
                                ActivityPrescription.objects.create(
                                    activity=new_activity,
                                    set_number=prescription.set_number,
                                    set_tag=prescription.set_tag,
                                    primary_metric=prescription.primary_metric,
                                    prescription_notes=prescription.prescription_notes,
                                    reps=prescription.reps,
                                    rest_seconds=prescription.rest_seconds,
                                    tempo=prescription.tempo,
                                    weight=prescription.weight,
                                    is_per_side=prescription.is_per_side,
                                    intensity_value=prescription.intensity_value,
                                    intensity_type=prescription.intensity_type,
                                    duration_seconds=prescription.duration_seconds,
                                    distance=prescription.distance,
                                    calories=prescription.calories,
                                    extra_data=prescription.extra_data,
                                )
        
        # Return the new program
        serializer = ProgramDetailSerializer(new_program, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# =============================================================================
# ADDITIONAL UTILITY VIEWS FOR PROGRAM BUILDER
# =============================================================================

class ProgramTemplatesView(generics.ListAPIView):
    """
    List public program templates that users can copy.
    """
    serializer_class = ProgramListSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsPagination
    
    def get_queryset(self):
        queryset = Program.objects.filter(
            is_public=True,
            is_template=True
        ).prefetch_related('weeks__sessions')
        
        # Filtering options
        focus = self.request.query_params.get('focus')
        if focus:
            queryset = queryset.filter(focus=focus)
        
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        
        return queryset.order_by('-created_at')


class DashboardStatsView(APIView):
    """
    Get comprehensive dashboard statistics for the current user.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Program stats
        programs = Program.objects.filter(user=user)
        total_programs = programs.count()
        public_programs = programs.filter(is_public=True).count()
        
        # Week/Session/Exercise counts
        total_weeks = Week.objects.filter(program__user=user).count()
        total_sessions = Session.objects.filter(week__program__user=user).count()
        total_exercises = Activity.objects.filter(
            session_block__session__week__program__user=user
        ).count()
        
        # Custom exercises
        custom_exercises = Exercise.objects.filter(user=user, is_official=False).count()
        
        # Recent programs
        recent_programs = programs.order_by('-updated_at')[:5]
        recent_programs_data = ProgramListSerializer(recent_programs, many=True).data
        
        # Programs by focus
        programs_by_focus = list(
            programs.values('focus').annotate(count=Count('id')).order_by('-count')
        )
        
        # Programs by difficulty
        programs_by_difficulty = list(
            programs.values('difficulty').annotate(count=Count('id')).order_by('difficulty')
        )
        
        return Response({
            'total_programs': total_programs,
            'public_programs': public_programs,
            'total_weeks': total_weeks,
            'total_sessions': total_sessions,
            'total_exercises': total_exercises,
            'custom_exercises': custom_exercises,
            'recent_programs': recent_programs_data,
            'programs_by_focus': programs_by_focus,
            'programs_by_difficulty': programs_by_difficulty,
        })


class CopyTemplateView(APIView):
    """
    Copy a public template program to the user's own programs.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, program_id):
        # Find the template program
        try:
            template = Program.objects.get(id=program_id, is_public=True)
        except Program.DoesNotExist:
            return Response(
                {'error': 'Template not found or is not public.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user already has a program with same title
        new_title = f"{template.title}"
        counter = 1
        while Program.objects.filter(user=request.user, title=new_title).exists():
            new_title = f"{template.title} ({counter})"
            counter += 1
        
        with transaction.atomic():
            # Create new program
            new_program = Program.objects.create(
                user=request.user,
                title=new_title,
                description=template.description,
                focus=template.focus,
                difficulty=template.difficulty,
                image=template.image,
                video_url=template.video_url,
                price=0,
                is_public=False,
                is_template=False,
            )
            
            # Copy all nested data (abbreviated - reuses duplicate logic)
            for week in template.weeks.all().order_by('week_number'):
                new_week = Week.objects.create(
                    program=new_program,
                    week_number=week.week_number,
                    week_name=week.week_name,
                    notes=week.notes,
                )
                
                for session in week.sessions.all().order_by('day_ordering'):
                    new_session = Session.objects.create(
                        week=new_week,
                        title=session.title,
                        description=session.description,
                        focus=session.focus,
                        day_of_week=session.day_of_week,
                        day_ordering=session.day_ordering,
                        preview_image=session.preview_image,
                    )
                    
                    for block in session.blocks.all().order_by('block_order'):
                        new_block = SessionBlock.objects.create(
                            session=new_session,
                            block_order=block.block_order,
                            scheme_type=block.scheme_type,
                            block_name=block.block_name,
                            block_notes=block.block_notes,
                            duration_target=block.duration_target,
                            rounds_target=block.rounds_target,
                        )
                        
                        for activity in block.activities.all().order_by('order_in_block'):
                            new_activity = Activity.objects.create(
                                session_block=new_block,
                                exercise=activity.exercise,
                                order_in_block=activity.order_in_block,
                                manual_name=activity.manual_name,
                                manual_video_url=activity.manual_video_url,
                                manual_image=activity.manual_image,
                                notes=activity.notes,
                            )
                            
                            for prescription in activity.prescriptions.all().order_by('set_number'):
                                ActivityPrescription.objects.create(
                                    activity=new_activity,
                                    set_number=prescription.set_number,
                                    set_tag=prescription.set_tag,
                                    primary_metric=prescription.primary_metric,
                                    prescription_notes=prescription.prescription_notes,
                                    reps=prescription.reps,
                                    rest_seconds=prescription.rest_seconds,
                                    tempo=prescription.tempo,
                                    weight=prescription.weight,
                                    is_per_side=prescription.is_per_side,
                                    intensity_value=prescription.intensity_value,
                                    intensity_type=prescription.intensity_type,
                                    duration_seconds=prescription.duration_seconds,
                                    distance=prescription.distance,
                                    calories=prescription.calories,
                                    extra_data=prescription.extra_data,
                                )
        
        serializer = ProgramDetailSerializer(new_program, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ExerciseUsageView(APIView):
    """
    Get usage statistics for an exercise (how many programs/sessions use it).
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, exercise_id):
        try:
            exercise = Exercise.objects.get(id=exercise_id)
        except Exercise.DoesNotExist:
            return Response({'error': 'Exercise not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check permission
        if not exercise.is_official and exercise.user != request.user:
            return Response(
                {'error': 'Cannot view usage for exercises owned by other users.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        
        # Count activities using this exercise in user's programs
        activity_count = Activity.objects.filter(
            exercise=exercise,
            session_block__session__week__program__user=user
        ).count()
        
        # Count unique sessions
        session_count = Session.objects.filter(
            blocks__activities__exercise=exercise,
            week__program__user=user
        ).distinct().count()
        
        # Count unique programs
        program_count = Program.objects.filter(
            weeks__sessions__blocks__activities__exercise=exercise,
            user=user
        ).distinct().count()
        
        return Response({
            'exercise_id': exercise_id,
            'exercise_name': exercise.name,
            'activity_count': activity_count,
            'session_count': session_count,
            'program_count': program_count,
        })


class BulkExerciseSearchView(APIView):
    """
    Search exercises with advanced filtering for the Exercise Library.
    Supports multiple filter values.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        queryset = Exercise.objects.all()
        
        # Filter by is_official
        is_official = request.query_params.get('is_official')
        if is_official is not None:
            is_official_bool = is_official.lower() in ['true', '1', 'yes']
            if is_official_bool:
                queryset = queryset.filter(is_official=True)
            else:
                queryset = queryset.filter(is_official=False, user=user)
        else:
            queryset = queryset.filter(
                Q(is_official=True) | Q(user=user, is_official=False)
            )
        
        # Text search
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(category__icontains=search) |
                Q(muscle_groups__icontains=search)
            )
        
        # Filter by multiple categories (comma-separated)
        categories = request.query_params.get('categories', '').strip()
        if categories:
            category_list = [c.strip() for c in categories.split(',') if c.strip()]
            if category_list:
                q = Q()
                for cat in category_list:
                    q |= Q(category__iexact=cat)
                queryset = queryset.filter(q)
        
        # Filter by single category
        category = request.query_params.get('category', '').strip()
        if category:
            queryset = queryset.filter(category__icontains=category)
        
        # Filter by multiple muscle groups (comma-separated, any match)
        muscle_groups = request.query_params.get('muscle_groups', '').strip()
        if muscle_groups:
            mg_list = [m.strip() for m in muscle_groups.split(',') if m.strip()]
            if mg_list:
                q = Q()
                for mg in mg_list:
                    q |= Q(muscle_groups__icontains=mg)
                queryset = queryset.filter(q)
        
        # Filter by equipment
        equipment = request.query_params.get('equipment', '').strip()
        if equipment:
            queryset = queryset.filter(equipment_needed__icontains=equipment)
        
        # Ordering
        ordering = request.query_params.get('ordering', 'name')
        valid_orderings = ['name', '-name', 'category', '-category', 'created_at', '-created_at']
        if ordering in valid_orderings:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('name')
        
        queryset = queryset.distinct()
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 50)), 200)
        
        start = (page - 1) * page_size
        end = start + page_size
        
        total_count = queryset.count()
        exercises = queryset[start:end]
        
        serializer = ExerciseListSerializer(exercises, many=True)
        
        return Response({
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'next': page + 1 if end < total_count else None,
            'previous': page - 1 if page > 1 else None,
            'results': serializer.data,
        })



# =============================================================================
# VIEWS FOR DISCOVERY 
# =============================================================================

class DiscoveryFeedView(APIView):
    """
    Returns aggregated lists for the Discovery Screen:
    - Trending (Random selection of public programs)
    - Featured (Templates or high-quality programs)
    - New (Most recently created public programs)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # 1. New / Recent Programs
        new_programs = Program.objects.filter(is_public=True).order_by('-created_at')[:5]
        
        # 2. Featured / Top (Using Templates as a proxy for "High Quality" or "Top")
        featured_programs = Program.objects.filter(is_public=True, is_template=True).order_by('?')[:5]
        
        # 3. Trending (Random selection for now, to simulate dynamic content)
        # In a real app, this would use views/likes/copies_count
        trending_programs = Program.objects.filter(is_public=True).order_by('?')[:5]

        return Response({
            'new': ProgramListSerializer(new_programs, many=True, context={'request': request}).data,
            'featured': ProgramListSerializer(featured_programs, many=True, context={'request': request}).data,
            'trending': ProgramListSerializer(trending_programs, many=True, context={'request': request}).data,
        })