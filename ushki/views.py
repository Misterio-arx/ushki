from django.shortcuts import render
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import TestResult


def home(request):
    return render(request, 'ushki/home.html')


def threshold_test(request):
    return render(request, 'ushki/threshold_test.html')


def association_test(request):
    return render(request, 'ushki/association_test.html')


def pitch_test(request):
    return render(request, 'ushki/pitch_test.html')

def chronoesthesia_test(request):
    return render(request, 'ushki/chronoesthesia_test.html')

def privacy_policy(request):
    return render(request, 'ushki/privacy.html')


@csrf_exempt
def save_result(request):
    """Принимает POST от фронтенда и сохраняет результат теста."""
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'error': 'Только POST'}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'ok': False, 'error': 'Некорректный JSON'}, status=400)

    test_type = data.get('test_type', '').strip()
    valid_types = [t[0] for t in TestResult.TEST_TYPE_CHOICES]
    if test_type not in valid_types:
        return JsonResponse({'ok': False, 'error': 'Неизвестный тип теста'}, status=400)

    result_data = data.get('result_data')
    if not isinstance(result_data, dict):
        return JsonResponse({'ok': False, 'error': 'result_data должен быть объектом'}, status=400)

    import hashlib

    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        ip = x_forwarded.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')

    ip_hash = hashlib.sha256(ip.encode('utf-8')).hexdigest()[:16] if ip else ''

    try:
        record = TestResult.objects.create(
            test_type=test_type,
            result_data=result_data,
            user_name=data.get('user_name', '')[:100],
            user_age=data.get('user_age') or None,
            user_comment=data.get('user_comment', ''),
            ip_hash=ip_hash,
        )
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)

    return JsonResponse({'ok': True, 'id': record.id})