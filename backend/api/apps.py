from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Import signals ที่นี่เพื่อให้ Django รู้จัก
        import api.signals