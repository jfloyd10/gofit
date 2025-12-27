from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/v1/accounts/", include("accounts.api.urls")),
    path("api/v1/core/", include("core.api.urls")),
    path("api/v1/activity/", include("activity.api.urls")),

    path("activity/", include("activity.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)