from django.contrib import admin
from .models import TestResult


@admin.register(TestResult)
class TestResultAdmin(admin.ModelAdmin):
    list_display = ('test_type', 'user_name', 'user_age', 'created_at', 'ip_hash')
    list_filter = ('test_type', 'created_at')
    search_fields = ('user_name', 'user_comment')
    readonly_fields = ('created_at', 'ip_hash')
    date_hierarchy = 'created_at'