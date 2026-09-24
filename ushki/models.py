from django.db import models


class TestResult(models.Model):
    TEST_TYPE_CHOICES = [
        ('threshold', 'Порог слышимости'),
        ('association', 'Ассоциации цветов'),
        ('pitch_normal', 'Высота тона (обычный)'),
        ('pitch_pro', 'Высота тона (профессиональный)'),
        ('chronoesthesia', 'Хроностезия (оценка времени)'),
    ]

    test_type = models.CharField(
        max_length=20,
        choices=TEST_TYPE_CHOICES,
        verbose_name='Тип теста',
    )
    result_data = models.JSONField(
        verbose_name='Результаты',
        help_text='JSON со всеми данными теста',
    )
    user_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Имя',
    )
    user_age = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Возраст',
    )
    user_comment = models.TextField(
        blank=True,
        verbose_name='Комментарий',
    )
    ip_hash = models.CharField(
        max_length=32,
        blank=True,
        verbose_name='Хеш IP-адреса',
        help_text='SHA-256, первые 16 символов. Восстановить IP невозможно.',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата прохождения',
    )

    class Meta:
        verbose_name = 'Результат теста'
        verbose_name_plural = 'Результаты тестов'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_test_type_display()} — {self.created_at:%d.%m.%Y %H:%M}'