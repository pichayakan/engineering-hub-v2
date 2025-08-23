# notifications/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Notification
from .serializers import NotificationSerializer
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 100 # Show a large number of notifications per page
    page_size_query_param = 'page_size'
    max_page_size = 1000

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_read'] # ✅ ADD

    def get_queryset(self):
        # Users can only see their own notifications
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['post']) # Changed to detail=True
    def mark_as_read(self, request, pk=None):
        try:
            notification = self.get_object()
            if notification.recipient == request.user:
                notification.is_read = True
                notification.save()
                return Response(status=status.HTTP_204_NO_CONTENT)
            else:
                return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
            
    @action(detail=False, methods=['post'], url_path='mark-all-as-read')
    def mark_all_as_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)