from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth import get_user_model

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    POST /api/v1/accounts/register/

    Body:
    {
      "username": "josh",
      "email": "josh@example.com",
      "password": "secret",
      "password_confirm": "secret",
      "display_name": "Josh"
    }
    """
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class CurrentUserView(APIView):
    """
    GET /api/v1/accounts/me/
    PATCH /api/v1/accounts/me/
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data)
