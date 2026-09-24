// ============================================================
// Тест различения высоты тона (2I-2AFC)
// ============================================================

const BASE_FREQ = 1000;
const TONE_DURATION = 0.5;
const TONE_VOLUME = 0.15;

const MAX_TRIALS = 35;
const MIN_REVERSALS = 10;

const START_DELTA_NORMAL = 100;
const START_DELTA_MUSICIAN = 30;

const DELTA_DOWN = 0.8;
const DELTA_UP = 1.2;
const DELTA_MIN = 1;
const DELTA_MAX = 300;

// Состояние
let audioCtx = null;
let currentOsc = null;
let currentTimers = [];

let mode = 'normal';
let delta = 50;              // стартовая разница, Гц
let correctStreak = 0;
let reversals = [];
let lastDir = null;
let higherPosition = null;   // 1 или 2
let trialCount = 0;
let answered = false;
let playing = false;
let results = [];            // [{delta, correct}]

// ---------- Аудио ----------
function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function playTone(freq, duration, volume, delay) {
    const ctx = getCtx();
    const startAt = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Форма волны зависит от режима:
    // triangle — обычный (мягче, легче)
    // sine — профессиональный (чище, строже)
    osc.type = (mode === 'musician') ? 'sine' : 'triangle';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.1);
    gain.gain.setValueAtTime(volume, startAt + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0, startAt + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration);

    return osc;
}

function stopAll() {
    currentTimers.forEach(t => clearTimeout(t));
    currentTimers = [];
    if (currentOsc) {
        try { currentOsc.stop(); } catch (e) {}
        currentOsc = null;
    }
}

// ---------- Экран метода ----------
let pendingMode = 'normal';

function showMethod(selectedMode) {
    pendingMode = selectedMode;
    document.getElementById('step-intro').style.display = 'none';
    document.getElementById('step-method').style.display = 'block';
}

function closeMethod() {
    document.getElementById('step-method').style.display = 'none';
    document.getElementById('step-intro').style.display = 'block';
}

function startTrainingFromMethod() {
    document.getElementById('step-method').style.display = 'none';
    startTraining(pendingMode);
}

// ---------- Тренировка ----------
let trainingMode = 'normal';
const TRAINING_LOW = 1000;   // низкий тон
const TRAINING_HIGH = 1300;  // высокий тон (разница 300 Гц)

function startTraining(selectedMode) {
    getCtx();
    trainingMode = selectedMode;

    document.getElementById('step-intro').style.display = 'none';
    document.getElementById('step-training').style.display = 'block';
    document.getElementById('training-info').textContent =
        'Нажмите кнопки, чтобы услышать разницу.';
}

function playLowTone() {
    stopAll();
    currentOsc = playTone(TRAINING_LOW, 0.7, TONE_VOLUME, 0);
    document.getElementById('training-info').innerHTML = '▶ Это <b>низкий</b> тон.';
}

function playHighTone() {
    stopAll();
    currentOsc = playTone(TRAINING_HIGH, 0.7, TONE_VOLUME, 0);
    document.getElementById('training-info').innerHTML = '▶ Это <b>высокий</b> тон.';
}

function finishTraining() {
    stopAll();
    document.getElementById('step-training').style.display = 'none';
    document.getElementById('step-test').style.display = 'block';

    mode = trainingMode;
    delta = (mode === 'musician') ? START_DELTA_MUSICIAN : START_DELTA_NORMAL;
    correctStreak = 0;
    reversals = [];
    lastDir = null;
    trialCount = 0;
    results = [];

    nextTrial();
}

// ---------- Попытка ----------
function nextTrial() {
    if (trialCount >= MAX_TRIALS || reversals.length >= MIN_REVERSALS) {
        finishTest();
        return;
    }

    trialCount++;
    answered = false;

    document.getElementById('feedback').innerHTML = '';

    // Случайно: выше будет первый или второй
    higherPosition = Math.random() < 0.5 ? 1 : 2;

    document.getElementById('test-progress').textContent =
        `Попытка ${trialCount} из ${MAX_TRIALS} · переломов: ${reversals.length}/${MIN_REVERSALS} · разница: ${delta.toFixed(1)} Гц`;
    const percent = (trialCount / MAX_TRIALS) * 100;
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('stage').textContent =
        'Нажмите «Первый тон» и «Второй тон», чтобы услышать оба';
    document.getElementById('btn-a').disabled = false;
    document.getElementById('btn-b').disabled = false;

    Storage.save('pitch_' + mode, {
        trialCount: trialCount,
        delta: delta,
        correctStreak: correctStreak,
        reversals: reversals,
        lastDir: lastDir,
        results: results,
        stage: 'test'
    });
}

// ---------- Проигрывание первого тона ----------
function playFirst() {
    stopAll();
    const lower = BASE_FREQ;
    const higher = BASE_FREQ + delta;
    const first = (higherPosition === 1) ? higher : lower;
    currentOsc = playTone(first, TONE_DURATION, TONE_VOLUME, 0);
    document.getElementById('stage').textContent = '▶ Играет первый тон…';
}

// ---------- Проигрывание второго тона ----------
function playSecond() {
    stopAll();
    const lower = BASE_FREQ;
    const higher = BASE_FREQ + delta;
    const second = (higherPosition === 2) ? higher : lower;
    currentOsc = playTone(second, TONE_DURATION, TONE_VOLUME, 0);
    document.getElementById('stage').textContent = '▶ Играет второй тон…';
}

// ---------- Ответ ----------
function answer(choice) {
    if (answered) return;
    answered = true;

    stopAll();
    document.getElementById('btn-a').disabled = true;
    document.getElementById('btn-b').disabled = true;

    const correct = (choice === higherPosition);
    results.push({ delta: delta, correct: correct });

    // ---------- Обратная связь ----------
    const feedback = document.getElementById('feedback');
    const correctPosition = higherPosition === 1 ? 'первый' : 'второй';

    if (correct) {
        feedback.innerHTML = `✅ Верно! Выше был ${correctPosition} тон.`;
        feedback.style.color = '#16a34a';
    } else {
        const chosenPosition = choice === 1 ? 'первый' : 'второй';
        feedback.innerHTML = `❌ Неверно. Вы выбрали ${chosenPosition}, а выше был ${correctPosition}.`;
        feedback.style.color = '#dc2626';
    }

    // ---------- Логика delta ----------
    if (correct) {
        correctStreak++;
        if (correctStreak >= 2) {
            const prev = delta;
            delta = Math.max(DELTA_MIN, delta * DELTA_DOWN);
            correctStreak = 0;
            if (lastDir === 'up') reversals.push(prev);
            lastDir = 'down';
        }
    } else {
        const prev = delta;
        delta = Math.min(DELTA_MAX, delta * DELTA_UP);
        correctStreak = 0;
        if (lastDir === 'down') reversals.push(prev);
        lastDir = 'up';
    }

    // Задержка 2.5 секунды — чтобы пользователь успел прочитать
    setTimeout(() => {
        feedback.innerHTML = '';
        nextTrial();
    }, 2500);
}

// ---------- Пропустить ----------
function finishTest(skipped = false) {
    Storage.clear('pitch_' + mode);
    document.getElementById('step-test').style.display = 'none';
    document.getElementById('step-result').style.display = 'block';

    const last = reversals.slice(-6);
    const threshold = last.length
        ? (last.reduce((a, b) => a + b, 0) / last.length).toFixed(1)
        : null;

       let interpretation = '';
       if (threshold !== null) {
            const t = parseFloat(threshold);
            if (t < 5) {
                interpretation = '🎵 Отличный результат — уровень профессионального музыканта.';
            } else if (t < 15) {
                interpretation = '✅ Хороший слух. Вы различаете небольшую разницу между тонами лучше среднего.';
            } else if (t < 30) {
                interpretation = '👍 Средний результат. Большинство людей показывают похожие цифры.';
            } else if (t < 60) {
                interpretation = '🙂 Результат в пределах нормы. Точность зависит от наушников, усталости и концентрации.';
            } else {
                interpretation = 'ℹ️ Результат зависит от наушников и вашего состояния. Попробуйте ещё раз в тихой обстановке.';
            }
        }

    // ---------- HTML для страницы ----------
    let htmlPage = '<table style="width:100%;border-collapse:collapse">';
    htmlPage += '<tr><th style="text-align:left">Показатель</th><th>Значение</th></tr>';
    htmlPage += `<tr><td>Режим</td><td>${mode === 'musician' ? 'Профессиональный' : 'Обычный'}</td></tr>`;
    htmlPage += `<tr><td>Всего попыток</td><td>${results.length}</td></tr>`;
    htmlPage += `<tr><td>Средний порог различения</td><td>${threshold !== null ? '~' + threshold + ' Гц' : 'не определён'}</td></tr>`;
    htmlPage += '</table>';

    if (skipped) {
        htmlPage += `<p style="font-size:13px;color:#b45309;margin-top:8px">
            ⚠️ Тест был прерван.</p>`;
    }

    if (interpretation) {
        htmlPage += `<p style="margin-top:12px"><b>${interpretation}</b></p>`;
    }

    htmlPage += `<p style="font-size:13px;color:#555;margin-top:12px">
        Чем меньше число — тем тоньше слух.</p>`;

    // ---------- HTML для письма ----------
    let htmlEmail = '<table>';
    htmlEmail += '<tr><th>Показатель</th><th>Значение</th></tr>';
    htmlEmail += `<tr><td>Режим</td><td>${mode === 'musician' ? 'Профессиональный' : 'Обычный'}</td></tr>`;
    htmlEmail += `<tr><td>Всего попыток</td><td>${results.length}</td></tr>`;
    htmlEmail += `<tr><td>Средний порог различения</td><td>${threshold !== null ? '~' + threshold + ' Гц' : 'не определён'}</td></tr>`;
    htmlEmail += '</table>';

    if (skipped) {
        htmlEmail += '<p>Тест был прерван.</p>';
    }

    if (interpretation) {
        htmlEmail += `<p>${interpretation}</p>`;
    }

    // ---------- Показываем и отправляем ----------
    document.getElementById('result-content').innerHTML = htmlPage;
    setResultHTML(htmlEmail);
    saveResult();
}

// ---------- Сохранение ----------
async function saveResult() {
    const last = reversals.slice(-6);
    const threshold = last.length
        ? last.reduce((a, b) => a + b, 0) / last.length
        : null;

    const wasSkipped = results.length < MAX_TRIALS && reversals.length < MIN_REVERSALS;

    const payload = {
        test_type: mode === 'musician' ? 'pitch_pro' : 'pitch_normal',
        result_data: {
            mode: mode,
            threshold_hz: threshold,
            reversals: reversals,
            trials: results,
            total_trials: results.length,
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

function skipRemaining() {
    stopAll();
    finishTest(true);
}

window.addEventListener('DOMContentLoaded', () => {
    // Проверяем оба режима — но восстанавливаем только один
    const savedNormal = Storage.load('pitch_normal');
    const savedMusician = Storage.load('pitch_musician');

    const hasNormal = savedNormal && savedNormal.results && savedNormal.results.length > 0;
    const hasMusician = savedMusician && savedMusician.results && savedMusician.results.length > 0;

    // Если есть оба — выбираем тот, где прогресс больше
    let m = null;
    let saved = null;

    if (hasNormal && hasMusician) {
        // Выбираем тот, где больше попыток
        if (savedNormal.trialCount >= savedMusician.trialCount) {
            m = 'normal';
            saved = savedNormal;
        } else {
            m = 'musician';
            saved = savedMusician;
        }
    } else if (hasNormal) {
        m = 'normal';
        saved = savedNormal;
    } else if (hasMusician) {
        m = 'musician';
        saved = savedMusician;
    }

    if (!m || !saved) return;   // нечего восстанавливать

    const modeName = m === 'musician' ? 'профессиональный' : 'обычный';
    const progressText = `попытка ${saved.trialCount} из ${MAX_TRIALS}`;

    Storage.askRestore('Высота тона (' + modeName + ')', progressText).then(restore => {
        if (restore) {
            mode = m;
            trialCount = saved.trialCount;
            delta = saved.delta;
            correctStreak = saved.correctStreak || 0;
            reversals = saved.reversals || [];
            lastDir = saved.lastDir || null;
            results = saved.results || [];

            document.getElementById('step-intro').style.display = 'none';
            document.getElementById('step-method').style.display = 'none';
            document.getElementById('step-training').style.display = 'none';
            document.getElementById('step-test').style.display = 'block';
            document.getElementById('step-result').style.display = 'none';

            nextTrial();
        } else {
            Storage.clear('pitch_' + m);
        }
    });
});