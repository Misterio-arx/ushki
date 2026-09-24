// ============================================================
// Тест хроностезии — оценка длительности тона
// ============================================================

const TONE_FREQ = 1000;
const TONE_VOLUME = 0.15;
const MIN_DURATION = 10;        // минимальная длительность, сек
const MAX_DURATION = 30;        // максимальная, сек
const TOTAL_TRIALS = 8;         // количество звуков
const TRAINING_TRIALS = 2;      // ← тренировочных звуков (не считаются)

// Аудио для хроностезии — естественные звуки вместо тона
const WIND_FILE = '/static/ushki/audio/wind.mp3';
const SEA_FILE = '/static/ushki/audio/sea.mp3';

let chronoAudio = null;      // плеер для основного теста (ветер)
let compareAudio = null;     // плеер для режима сравнения


// Состояние
let audioCtx = null;
let currentOsc = null;
let currentTimers = [];
let trialIndex = 0;
let results = [];               // [{actual, user, error, errorPercent}]
let currentActualDuration = 0;
let currentStartTime = 0;
let testActive = false;
let trainingIndex = 0;      // ← счётчик тренировочных попыток

// ---------- Аудио ----------
function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function playTone(freq, durationSec, volume) {
    const ctx = getCtx();
    const startAt = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.3);
    gain.gain.setValueAtTime(volume, startAt + durationSec - 0.3);
    gain.gain.linearRampToValueAtTime(0, startAt + durationSec);

    osc.connect(gain).connect(ctx.destination);

    osc.start(startAt);
    osc.stop(startAt + durationSec);

    currentOsc = osc;
    return osc;
}

function stopTone() {
    currentTimers.forEach(t => clearTimeout(t));
    currentTimers = [];

    // Останавливаем mp3-плееры
    if (chronoAudio) {
        chronoAudio.pause();
        chronoAudio = null;
    }
    if (compareAudio) {
        compareAudio.pause();
        compareAudio = null;
    }

    // Останавливаем осциллятор (если где-то остался)
    if (currentOsc) {
        try { currentOsc.stop(); } catch (e) {}
        currentOsc = null;
    }
}

// ---------- Экран «О хроностезии» ----------
function showChronoInfo() {
    document.getElementById('step-intro').style.display = 'none';
    document.getElementById('step-chrono-info').style.display = 'block';
}

function closeChronoInfo() {
    document.getElementById('step-chrono-info').style.display = 'none';
    document.getElementById('step-intro').style.display = 'block';
}

function startTestFromInfo() {
    document.getElementById('step-chrono-info').style.display = 'none';
    startTest();
}

// ---------- Старт теста ----------
function startEstimateMode() {
    getCtx();
    trialIndex = 0;
    trainingIndex = 0;
    results = [];
    testActive = true;

    document.getElementById('step-intro').style.display = 'none';
    document.getElementById('step-test').style.display = 'block';

    nextTrial();
}

// ---------- Следующая попытка ----------
function nextTrial() {
    // Если тренировочных ещё не прошли — играем тренировочные
    if (trainingIndex < TRAINING_TRIALS) {
        trainingIndex++;
        currentActualDuration = Math.floor(Math.random() * (MAX_DURATION - MIN_DURATION + 1)) + MIN_DURATION;

        document.getElementById('test-progress').textContent =
            `🎓 Тренировка ${trainingIndex} из ${TRAINING_TRIALS} (не считается)`;
        const percent = (trialIndex / TOTAL_TRIALS) * 100;
        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = percent + '%';
        document.getElementById('stage').textContent = 'Нажмите «Прослушать звук»';
        document.getElementById('btn-play').disabled = false;
        document.getElementById('answer-area').style.display = 'none';
        document.getElementById('feedback').innerHTML = '';
        document.getElementById('user-answer').value = '';
        return;
    }

    // Основной тест
    if (trialIndex >= TOTAL_TRIALS) {
        finishTest();
        return;
    }

    trialIndex++;
    currentActualDuration = Math.floor(Math.random() * (MAX_DURATION - MIN_DURATION + 1)) + MIN_DURATION;

    document.getElementById('test-progress').textContent =
        `Звук ${trialIndex} из ${TOTAL_TRIALS}`;
    document.getElementById('stage').textContent = 'Нажмите «Прослушать звук»';
    document.getElementById('btn-play').disabled = false;
    document.getElementById('answer-area').style.display = 'none';
    document.getElementById('feedback').innerHTML = '';
    document.getElementById('user-answer').value = '';
}

// ---------- Проиграть текущий звук ----------
function playCurrentTone() {
    if (!testActive) return;

    document.getElementById('btn-play').disabled = true;
    document.getElementById('answer-area').style.display = 'none';
    document.getElementById('feedback').innerHTML = '';

    // Индикатор — без таймера
    document.getElementById('stage').textContent = '⏱ Слушайте звук...';

    // Создаём аудиоплеер
    chronoAudio = new Audio(WIND_FILE);
    chronoAudio.volume = 0.5;
    chronoAudio.loop = false;
    chronoAudio.currentTime = 0;

    chronoAudio.play().catch(e => {
        console.error('Ошибка воспроизведения:', e);
        alert('Не удалось воспроизвести звук. Проверьте файл wind.mp3.');
    });

    // По окончании
    const endTimer = setTimeout(() => {
        if (chronoAudio) {
            chronoAudio.pause();
            chronoAudio = null;
        }
        document.getElementById('stage').textContent = '✅ Звук закончился. Введите длительность:';
        document.getElementById('answer-area').style.display = 'block';
        document.getElementById('user-answer').focus();
    }, currentActualDuration * 1000 + 100);

    currentTimers.push(endTimer);
}

// ---------- Ответ пользователя ----------
function submitAnswer() {
    const input = document.getElementById('user-answer');
    const userAnswer = parseInt(input.value);

    if (isNaN(userAnswer) || userAnswer < 1 || userAnswer > 60) {
        alert('Введите целое число от 1 до 60.');
        return;
    }

    const error = userAnswer - currentActualDuration;
    const errorPercent = currentActualDuration > 0
        ? Math.round((Math.abs(error) / currentActualDuration) * 100)
        : 0;

    const feedback = document.getElementById('feedback');
    const sign = error >= 0 ? '+' : '';

    // Если это тренировочная — просто показываем результат и идём дальше
    if (trainingIndex <= TRAINING_TRIALS && trialIndex === 0) {
        feedback.innerHTML = `🎓 Тренировка. Реально было ${currentActualDuration} сек, вы ввели ${userAnswer} сек.`;
        feedback.style.color = '#6b7280';
        document.getElementById('answer-area').style.display = 'none';

        const t = setTimeout(nextTrial, 2500);
        currentTimers.push(t);
        return;
    }

    // Основная попытка — считаем
    results.push({
        actual: currentActualDuration,
        user: userAnswer,
        error: error,
        errorPercent: errorPercent
    });

    Storage.save('chrono_estimate', {
        trialIndex: trialIndex,
        trainingIndex: trainingIndex,
        results: results
    });

    if (errorPercent <= 15) {
        feedback.innerHTML = `✅ Отлично! Реально ${currentActualDuration} сек, вы ввели ${userAnswer} сек.`;
        feedback.style.color = '#16a34a';
    } else if (errorPercent <= 30) {
        feedback.innerHTML = `👍 Неплохо. Реально ${currentActualDuration} сек, вы ввели ${userAnswer} сек.`;
        feedback.style.color = '#ca8a04';
    } else {
        feedback.innerHTML = `❌ Реально было ${currentActualDuration} сек, вы ввели ${userAnswer} сек.`;
        feedback.style.color = '#dc2626';
    }

    document.getElementById('answer-area').style.display = 'none';

    const t = setTimeout(nextTrial, 2500);
    currentTimers.push(t);
}

// ---------- Пропустить ----------
function skipRemaining() {
    stopTone();
    testActive = false;
    finishTest(true);
}

// ---------- Результат ----------
function finishTest(skipped = false) {
    Storage.clear('chrono_estimate');
    testActive = false;
    document.getElementById('step-test').style.display = 'none';
    document.getElementById('step-result').style.display = 'block';

    if (results.length === 0) {
        document.getElementById('result-content').innerHTML =
            '<p>Не было ни одной завершённой попытки.</p>';
        return;
    }

    // Средняя абсолютная ошибка
    const totalAbsError = results.reduce((sum, r) => sum + Math.abs(r.error), 0);
    const avgAbsError = (totalAbsError / results.length).toFixed(1);

    // Средняя относительная ошибка
    const totalRelError = results.reduce((sum, r) => sum + r.errorPercent, 0);
    const avgRelError = Math.round(totalRelError / results.length);

    // Интерпретация
    let interpretation = '';
    if (avgRelError < 15) {
        interpretation = '🎵 Отличное чувство времени — уровень музыканта или спортсмена.';
    } else if (avgRelError < 30) {
        interpretation = '✅ Хороший результат. Вы достаточно точно оцениваете время на слух.';
    } else if (avgRelError < 50) {
        interpretation = '👍 Средний результат. Большинство людей показывают похожие цифры.';
    } else {
        interpretation = 'ℹ️ Точность зависит от внимания, усталости и концентрации. Попробуйте ещё раз.';
    }

    // HTML для страницы
    let htmlPage = '<table style="width:100%;border-collapse:collapse">';
    htmlPage += '<tr><th style="text-align:left">Попытка</th><th>Реально</th><th>Вы ввели</th><th>Ошибка</th></tr>';
    results.forEach((r, i) => {
        const sign = r.error >= 0 ? '+' : '';
        htmlPage += `<tr>
            <td>${i + 1}</td>
            <td>${r.actual} сек</td>
            <td>${r.user} сек</td>
            <td>${sign}${r.error} сек (${r.errorPercent}%)</td>
        </tr>`;
    });
    htmlPage += '</table>';

    if (skipped) {
        htmlPage += `<p style="font-size:13px;color:#b45309;margin-top:8px">
            ⚠️ Тест был прерван. Результат по ${results.length} попыткам.
        </p>`;
    }

    htmlPage += '<h4 style="margin-top:20px;margin-bottom:8px">📊 Итоги</h4>';
    htmlPage += `<p><b>Средняя ошибка: ${avgAbsError} сек</b></p>`;
    htmlPage += `<p><b>Средняя относительная ошибка: ${avgRelError}%</b></p>`;
    htmlPage += `<p style="margin-top:12px"><b>${interpretation}</b></p>`;

    htmlPage += `<p style="font-size:13px;color:#555;margin-top:12px">
        Чем меньше процент — тем точнее вы оцениваете время.
        Для справки: музыканты показывают 5–10%, обычные люди — 20–30%.</p>`;

    // HTML для письма
    let htmlEmail = '<table>';
    htmlEmail += '<tr><th>Попытка</th><th>Реально</th><th>Введено</th><th>Ошибка</th></tr>';
    results.forEach((r, i) => {
        const sign = r.error >= 0 ? '+' : '';
        htmlEmail += `<tr><td>${i + 1}</td><td>${r.actual} сек</td><td>${r.user} сек</td><td>${sign}${r.error} сек (${r.errorPercent}%)</td></tr>`;
    });
    htmlEmail += '</table>';
    htmlEmail += `<p>Средняя ошибка: ${avgAbsError} сек</p>`;
    htmlEmail += `<p>Средняя относительная ошибка: ${avgRelError}%</p>`;
    htmlEmail += `<p>${interpretation}</p>`;

    // Показываем и отправляем
    document.getElementById('result-content').innerHTML = htmlPage;
    setResultHTML(htmlEmail);
    saveResult(avgAbsError, avgRelError, skipped);
}

// ---------- Сохранение ----------
async function saveResult(avgAbsError, avgRelError, wasSkipped) {
    const payload = {
        test_type: 'chronoesthesia',
        result_data: {
            trials: results,
            total_trials: results.length,
            avg_abs_error: parseFloat(avgAbsError),
            avg_rel_error: avgRelError,
            was_skipped: wasSkipped
        },
        user_name: '',
        user_age: null,
        user_comment: ''
    };

    try {
        const response = await fetch('/api/save-result/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.ok) {
            console.log('Результат сохранён, ID:', data.id);
        } else {
            console.error('Ошибка сохранения:', data.error);
        }
    } catch (e) {
        alert('Ошибка сети: ' + e.message);
    }
}

// ============================================================
// РЕЖИМ 2: Сравнение длительностей (2I-2AFC)
// ============================================================

const COMPARE_TOTAL = 5;              // 5 вопроса
const COMPARE_BASE_DURATION = 7;      // эталон — 7 секунды
const COMPARE_START_DELTA = 1.5;      // стартовая разница — 1.5 сек
const COMPARE_FREQ = 1000;

let compareTrial = 0;
let compareDelta = COMPARE_START_DELTA;
let compareResults = [];
let compareHigherPosition = null;
let compareAnswered = false;
let compareLonger = 0;
let compareShorter = 0;
let playedFirst = false;    // был ли проигран первый звук
let playedSecond = false;   // был ли проигран второй звук

// ---------- Старт режима сравнения ----------
function startCompareMode() {
    getCtx();
    compareTrial = 0;
    compareDelta = COMPARE_START_DELTA;
    compareResults = [];

    document.getElementById('step-intro').style.display = 'none';
    document.getElementById('step-compare').style.display = 'block';

    nextCompareTrial();
}

// ---------- Следующая попытка ----------
function nextCompareTrial() {
    if (compareTrial >= COMPARE_TOTAL) {
        finishCompare();
        return;
    }

    compareTrial++;
    compareAnswered = false;
    playedFirst = false;
    playedSecond = false;

    compareHigherPosition = Math.random() < 0.5 ? 1 : 2;

    compareShorter = COMPARE_BASE_DURATION;
    compareLonger = COMPARE_BASE_DURATION + compareDelta;

    document.getElementById('compare-progress').textContent =
        `Вопрос ${compareTrial} из ${COMPARE_TOTAL}`;
    const percent = (compareTrial / COMPARE_TOTAL) * 100;
    const fill = document.getElementById('compare-progress-fill');
    if (fill) fill.style.width = percent + '%';
    document.getElementById('compare-stage').textContent =
        'Нажмите «Первый звук» и «Второй звук»';

    // Разблокируем кнопки прослушивания
    document.getElementById('btn-play-1').disabled = false;
    document.getElementById('btn-play-2').disabled = false;

    // Сброс кнопок ответа
    document.getElementById('btn-answer-1').disabled = false;
    document.getElementById('btn-answer-2').disabled = false;

    document.getElementById('compare-feedback').innerHTML = '';
}

// ---------- Проигрывание первого тона ----------
function playCompareFirst() {
    // Если уже играл — не даём повторно
    if (playedFirst) return;
    playedFirst = true;

    // Блокируем кнопку
    document.getElementById('btn-play-1').disabled = true;

    stopTone();

    if (compareAudio) {
        compareAudio.pause();
        compareAudio = null;
    }

    const duration = (compareHigherPosition === 1) ? compareLonger : compareShorter;

    // Первый звук — ветер
    compareAudio = new Audio(WIND_FILE);
    compareAudio.volume = 0.5;
    compareAudio.currentTime = 0;
    compareAudio.play().catch(e => console.error('Ошибка:', e));

    document.getElementById('compare-stage').textContent = '▶ Играет первый звук (ветер)…';

    const t = setTimeout(() => {
        if (compareAudio) {
            compareAudio.pause();
            compareAudio = null;
        }
        document.getElementById('compare-stage').textContent = 'Выберите ответ';
    }, duration * 1000);

    currentTimers.push(t);
}

// ---------- Проигрывание второго тона ----------
function playCompareSecond() {
    // Если уже играл — не даём повторно
    if (playedSecond) return;
    playedSecond = true;

    // Блокируем кнопку
    document.getElementById('btn-play-2').disabled = true;

    stopTone();

    if (compareAudio) {
        compareAudio.pause();
        compareAudio = null;
    }

    const duration = (compareHigherPosition === 2) ? compareLonger : compareShorter;

    // Второй звук — море
    compareAudio = new Audio(SEA_FILE);
    compareAudio.volume = 0.5;
    compareAudio.currentTime = 0;
    compareAudio.play().catch(e => console.error('Ошибка:', e));

    document.getElementById('compare-stage').textContent = '▶ Играет второй звук (море)…';

    const t = setTimeout(() => {
        if (compareAudio) {
            compareAudio.pause();
            compareAudio = null;
        }
        document.getElementById('compare-stage').textContent = 'Выберите ответ';
    }, duration * 1000);

    currentTimers.push(t);
}

// ---------- Ответ ----------
function answerCompare(choice) {
    if (compareAnswered) return;
    compareAnswered = true;

    stopTone();

    const correct = (choice === compareHigherPosition);
    document.getElementById('btn-answer-1').disabled = true;
    document.getElementById('btn-answer-2').disabled = true;
    compareResults.push({ correct: correct, delta: compareDelta });

    Storage.save('chrono_compare', {
        compareTrial: compareTrial,
        compareDelta: compareDelta,
        compareResults: compareResults
    });

    const feedback = document.getElementById('compare-feedback');
    const correctPosition = compareHigherPosition === 1 ? 'первый' : 'второй';

    if (correct) {
        feedback.innerHTML = `✅ Верно! ${correctPosition} тон был длиннее.`;
        feedback.style.color = '#16a34a';
    } else {
        const chosen = choice === 1 ? 'первый' : 'второй';
        feedback.innerHTML = `❌ Неверно. Вы выбрали ${chosen}, а длиннее был ${correctPosition}.`;
        feedback.style.color = '#dc2626';
    }

    setTimeout(() => {
        nextCompareTrial();
    }, 2000);
}

// ---------- Результат режима сравнения ----------
function finishCompare() {
    Storage.clear('chrono_compare');
    document.getElementById('step-compare').style.display = 'none';
    document.getElementById('step-result').style.display = 'block';

    const correctCount = compareResults.filter(r => r.correct).length;
    const total = compareResults.length;

    let htmlPage = '<h4 style="margin-top:0">🎯 Сравнение длительностей</h4>';
    htmlPage += '<table style="width:100%;border-collapse:collapse">';
    htmlPage += '<tr><th>Попытка</th><th>Разница</th><th>Ответ</th></tr>';
    compareResults.forEach((r, i) => {
        htmlPage += `<tr><td>${i + 1}</td><td>${r.delta.toFixed(1)} сек</td><td>${r.correct ? '✅' : '❌'}</td></tr>`;
    });
    htmlPage += '</table>';
    htmlPage += `<p><b>Правильных: ${correctCount} из ${total}</b></p>`;

    let htmlEmail = '<p>Сравнение длительностей</p>';
    htmlEmail += `<p>Правильных: ${correctCount} из ${total}</p>`;

    document.getElementById('result-content').innerHTML = htmlPage;
    setResultHTML(htmlEmail);
    saveResultCompare(correctCount, total);
}

// ---------- Сохранение режима сравнения ----------
async function saveResultCompare(correctCount, total) {
    const payload = {
        test_type: 'chronoesthesia',
        result_data: {
            mode: 'compare',
            total_trials: total,
            correct_count: correctCount,
            trials: compareResults
        },
        user_name: '',
        user_age: null,
        user_comment: ''
    };

    try {
        const response = await fetch('/api/save-result/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.ok) {
            console.log('Результат сохранён, ID:', data.id);
        } else {
            console.error('Ошибка сохранения:', data.error);
        }
    } catch (e) {
        alert('Ошибка сети: ' + e.message);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // Сначала проверяем оценку
    const savedEst = Storage.load('chrono_estimate');
    if (savedEst && savedEst.results && savedEst.results.length > 0) {
        Storage.askRestore('Хроностезия — оценка', `звук ${savedEst.trialIndex} из ${TOTAL_TRIALS}`).then(restore => {
            if (restore) {
                trialIndex = savedEst.trialIndex;
                trainingIndex = savedEst.trainingIndex || 0;
                results = savedEst.results;
                testActive = true;

                document.getElementById('step-intro').style.display = 'none';
                document.getElementById('step-test').style.display = 'block';
                nextTrial();
            } else {
                Storage.clear('chrono_estimate');
            }
        });
        return;  // если нашли оценку, сравнение не проверяем
    }

    // Потом сравнение
    const savedCmp = Storage.load('chrono_compare');
    if (savedCmp && savedCmp.compareResults && savedCmp.compareResults.length > 0) {
        Storage.askRestore('Хроностезия — сравнение', `вопрос ${savedCmp.compareTrial} из ${COMPARE_TOTAL}`).then(restore => {
            if (restore) {
                compareTrial = savedCmp.compareTrial;
                compareDelta = savedCmp.compareDelta;
                compareResults = savedCmp.compareResults;

                document.getElementById('step-intro').style.display = 'none';
                document.getElementById('step-compare').style.display = 'block';
                nextCompareTrial();
            } else {
                Storage.clear('chrono_compare');
            }
        });
    }
});