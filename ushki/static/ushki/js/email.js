// ============================================================
// Отправка результатов на почту через EmailJS
// ============================================================

// ВСТАВЬТЕ СЮДА ВАШИ КЛЮЧИ ИЗ ЛИЧНОГО КАБИНЕТА EMAILJS
const EMAILJS_PUBLIC_KEY = "TDqur3WsmkZhpbMJv";
const EMAILJS_SERVICE_ID = "service_yaqr25b";
const EMAILJS_TEMPLATE_ID = "template_sv0o96k";

// Инициализация EmailJS при загрузке страницы
if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

let currentResultHTML = '';

// Эта функция вызывается из тестов, чтобы передать им HTML с результатами
function setResultHTML(html) {
    currentResultHTML = html;
}

// Открывает форму для ввода данных
function openSendForm() {
    // 1. Согласие на обработку персональных данных
    const consent = confirm(
        'Для отправки результата нужно согласие на обработку персональных данных ' +
        '(имя, возраст, результаты теста).\n\n' +
        'Подробнее: /privacy/\n\n' +
        'Согласны?'
    );
    if (!consent) {
        alert('Отправка отменена. Согласие не получено.');
        return;
    }

    // 2. Имя
    const name = prompt("Ваше имя (необязательно):") || "Аноним";
    if (name === null) return;

    // 3. Возраст
    const age = prompt("Ваш возраст (необязательно):") || "—";
    if (age === null) return;

    // 4. Отправка с флагом согласия
    sendResultToEmail(name, age, true);
}

// Непосредственно отправка
async function sendResultToEmail(name, age, consentGiven = false) {
    if (!currentResultHTML) {
        alert('Нет результатов для отправки.');
        return;
    }

    // Очищаем HTML от тегов, оставляем только текст
    const plainText = currentResultHTML
        .replace(/>\s+</g, '><')
        .replace(/<\/th>/g, ' — ')
        .replace(/<\/td>/g, ' — ')
        .replace(/<\/tr>/g, '\n')
        .replace(/<\/p>/g, '\n')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            user_name: name,
            user_age: age,
            result_text: plainText,
            date: new Date().toLocaleString('ru-RU'),
            consent: consentGiven ? 'Да' : 'Нет'
        });
        alert('Результат отправлен! Спасибо.');
    } catch (err) {
        alert('Ошибка отправки: ' + JSON.stringify(err));
    }
}