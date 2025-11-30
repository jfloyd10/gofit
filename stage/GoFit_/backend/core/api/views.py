# core/api/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Prefetch

from core.models import Session, SessionBlock, Activity, ActivityPrescription
from .serializers import SessionDetailSerializer, SessionListSerializer


class SessionListView(generics.ListAPIView):
    """
    List all sessions accessible to the user.
    For now, returns all sessions. Can be filtered by program/week later.
    """
    serializer_class = SessionListSerializer
    #permission_classes = [permissions.IsAuthenticated]
    
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
        
        return queryset.order_by('day_ordering')


class SessionDetailView(generics.RetrieveAPIView):
    """
    Retrieve a single session with all nested blocks, activities, and prescriptions.
    """
    serializer_class = SessionDetailSerializer
    #permission_classes = [permissions.IsAuthenticated]
    
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
    #permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, program_id):
        from core.models import Week
        
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
