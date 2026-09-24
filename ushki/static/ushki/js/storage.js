// ============================================================
// Общий модуль для сохранения прогресса тестов
// ============================================================

const Storage = {
    PREFIX: 'ushki_',
    TTL_HOURS: 24,   // хранить 24 часа

    save(testKey, data) {
        try {
            const payload = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(this.PREFIX + testKey, JSON.stringify(payload));
        } catch (e) {
            console.warn('Не удалось сохранить:', e);
        }
    },

    load(testKey) {
        try {
            const raw = localStorage.getItem(this.PREFIX + testKey);
            if (!raw) return null;

            const payload = JSON.parse(raw);

            // Проверяем TTL — не старше 24 часов
            const ageHours = (Date.now() - payload.timestamp) / (1000 * 60 * 60);
            if (ageHours > this.TTL_HOURS) {
                this.clear(testKey);
                return null;
            }

            return payload.data;
        } catch (e) {
            console.warn('Не удалось загрузить:', e);
            return null;
        }
    },

    clear(testKey) {
        try {
            localStorage.removeItem(this.PREFIX + testKey);
        } catch (e) {}
    },

    // Показать диалог восстановления. Возвращает Promise с true/false.
    askRestore(testName, progressText) {
        return new Promise((resolve) => {
            const result = confirm(
                `У вас есть незаконченный тест «${testName}».\n\n` +
                `Прогресс: ${progressText}\n\n` +
                `Продолжить с этого места?\n\n` +
                `OK — продолжить. Отмена — начать заново.`
            );
            resolve(result);
        });
    }
};