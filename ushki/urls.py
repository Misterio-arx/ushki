from django.urls import path
from . import views

app_name = 'ushki'

urlpatterns = [
    path('', views.home, name='home'),
    path('threshold/', views.threshold_test, name='threshold'),
    path('association/', views.association_test, name='association'),
    path('pitch/', views.pitch_test, name='pitch'),
    path('chronoesthesia/', views.chronoesthesia_test, name='chronoesthesia'),
    path('privacy/', views.privacy_policy, name='privacy'),
    path('api/save-result/', views.save_result, name='save_result'),
]