// ============================================================
// Тест порога слышимости
// ============================================================

// Настройки — можно менять
// Генератор списка частот с адаптивным шагом
function generateFreqs() {
    const list = [];

    // 18–30 Гц: каждый герц — точная настройка нижнего порога
    for (let f = 18; f <= 30; f += 1) list.push(f);

    // 40–100 Гц: шаг 20 Гц
    for (let f = 40; f <= 100; f += 20) list.push(f);

    // 125–8000 Гц: 4 крупные точки
    [125, 500, 2000, 8000].forEach(f => list.push(f));

    // 9000–16000 Гц: 6 точек
    [9000, 11000, 13000, 15000, 15500, 16000].forEach(f => list.push(f));

    // 16250–18500 Гц: шаг 250 Гц + до 18500
    for (let f = 16250; f <= 18500; f += 250) list.push(f);

    return list;
}

const FREQS = generateFreqs();
const TONE_DURATION = 3;      // секунд
const TONE_VOLUME = 0.15;     // 0..1
const CALIB_FREQ = 1000;
const CALIB_DURATION = 3;

// ---------- Экран «О пороге слышимости» ----------
function showThresholdInfo() {
    document.getElementById('step-intro').style.display = 'none';
    document.getElementById('step-threshold-info').style.display = 'block';
}

function closeThresholdInfo() {
    document.getElementById('step-threshold-info').style.display = 'none';
    document.getElementById('step-intro').style.display = 'block';
}

function startCalibrationFromInfo() {
    document.getElementById('step-threshold-info').style.display = 'none';
    startCalibration();
}

// Состояние теста
let audioCtx = null;
let currentOsc = null;
let currentTimers = [];
let threshIndex = 0;
let threshResults = [];   // [{freq, heard}]
let threshAnswered = false;

// ---------- Аудио ----------
function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playTone(freq, duration, volume) {
    const ctx = getCtx();
    const startAt = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    // Плавная атака/затухание, чтобы не было щелчков
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.1);
    gain.gain.setValueAtTime(volume, startAt + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0, startAt + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration);

    currentOsc = osc;
    return osc;
}

function stopTone() {
    currentTimers.forEach(t => clearTimeout(t));
    currentTimers = [];
    if (currentOsc) {
        try { currentOsc.stop(); } catch (e) {}
        currentOsc = null;
    }
}

// ---------- Экран 1 → 2 ----------
function startCalibration() {
    getCtx();
    document.getElementById('step-intro').style.display = 'none';
    document.getElementById('step-calibration').style.display = 'block';
}

// ---------- Калибровка ----------
function playCalibrationTone() {
    stopTone();
    playTone(CALIB_FREQ, CALIB_DURATION, TONE_VOLUME);
    document.getElementById('btn-hear-cal').disabled = false;
}

function confirmCalibration() {
    stopTone();
    document.getElementById('step-calibration').style.display = 'none';
    document.getElementById('step-test').style.display = 'block';
    nextStep();
}

// ---------- Тест ----------
function nextStep() {
    if (threshIndex >= FREQS.length) {
        finishTest();
        return;
    }
    const freq = FREQS[threshIndex];
    document.getElementById('test-freq').textContent = freq;
    document.getElementById('test-progress').textContent =
        `Шаг ${threshIndex + 1} из ${FREQS.length}`;
    const percent = ((threshIndex + 1) / FREQS.length) * 100;
    document.getElementById('progress-fill').style.width = percent + '%';

    threshAnswered = false;
    setTestButtons(false);

    stopTone();
    playTone(freq, TONE_DURATION, TONE_VOLUME);

    // Разблокируем кнопки через полсекунды, чтобы пользователь успел услышать
    const t = setTimeout(() => setTestButtons(true), 500);
    currentTimers.push(t);
    // Сохраняем прогресс
    Storage.save('threshold', {
        threshIndex: threshIndex,
        threshResults: threshResults,
        stage: 'test'
    });
}

function setTestButtons(enabled) {
    document.getElementById('btn-hear').disabled = !enabled;
    document.getElementById('btn-not').disabled = !enabled;
}

function answer(heard) {
    if (threshAnswered) return;
    threshAnswered = true;
    setTestButtons(false);
    stopTone();

    threshResults.push({ freq: FREQS[threshIndex], heard });
    threshIndex++;
    Storage.save('threshold', {
        threshIndex: threshIndex,
        threshResults: threshResults,
        stage: 'test'
    });

    setTimeout(nextStep, 400);
}

function finishTest(stoppedAt = null) {
    // Тест завершён — очищаем прогресс
    Storage.clear('threshold');
    document.getElementById('step-test').style.display = 'none';
    document.getElementById('step-result').style.display = 'block';

    const heardFreqs = threshResults.filter(r => r.heard).map(r => r.freq);
    const maxHeard = heardFreqs.length ? Math.max(...heardFreqs) : null;
    const minHeard = heardFreqs.length ? Math.min(...heardFreqs) : null;
    const totalCount = threshResults.length;
    const heardCount = heardFreqs.length;
    const heardPercent = totalCount ? Math.round((heardCount / totalCount) * 100) : 0;

    // ---------- Статистика по диапазонам ----------
    function countInRange(min, max) {
        const inRange = threshResults.filter(r => r.freq >= min && r.freq <= max);
        const heard = inRange.filter(r => r.heard).length;
        return { heard, total: inRange.length };
    }

    const low    = countInRange(18, 100);      // низкие
    const mid    = countInRange(125, 2000);    // средние
    const high   = countInRange(4000, 8000);   // высокие
    const veryHi = countInRange(9000, 18500);  // очень высокие

    // ---------- HTML для страницы ----------
    let htmlPage = '';

    // 1. Таблица частот
    htmlPage += '<table style="width:100%;border-collapse:collapse">';
    htmlPage += '<tr><th style="text-align:left">Частота</th><th>Услышано</th></tr>';
    threshResults.forEach(r => {
        htmlPage += `<tr><td>${r.freq} Гц</td><td>${r.heard ? '✅' : '❌'}</td></tr>`;
    });
    htmlPage += '</table>';

    if (stoppedAt !== null) {
        htmlPage += `<p style="font-size:13px;color:#b45309;margin-top:8px">
            ⚠️ Тест был прерван на частоте ${stoppedAt} Гц.
        </p>`;
    }

    // 2. Общая статистика
    htmlPage += '<h4 style="margin-top:20px;margin-bottom:8px">📊 Общая статистика</h4>';
    htmlPage += `<p>Вы услышали <b>${heardCount} из ${totalCount}</b> частот (<b>${heardPercent}%</b>).</p>`;

    if (minHeard !== null) {
        htmlPage += `<p><b>Нижний порог: ${minHeard} Гц</b><br>
            <span style="font-size:13px;color:#555">
            Норма для взрослого человека — от 20 до 60 Гц.</span></p>`;
    } else {
        htmlPage += '<p><b>Нижний порог: не определён</b></p>';
    }

    if (maxHeard !== null) {
        htmlPage += `<p><b>Верхний порог: ${maxHeard} Гц</b></p>`;
    } else {
        htmlPage += '<p><b>Верхний порог: не определён</b></p>';
    }

    // 3. Разбивка по диапазонам
    htmlPage += '<h4 style="margin-top:20px;margin-bottom:8px">📶 По диапазонам</h4>';
    htmlPage += '<table style="width:100%;border-collapse:collapse">';
    htmlPage += '<tr><th style="text-align:left">Диапазон</th><th>Что это</th><th>Услышано</th></tr>';
    htmlPage += `<tr><td><b>Низкие</b><br>18–100 Гц</td><td>Бас, гул, удары</td><td>${low.heard} / ${low.total}</td></tr>`;
    htmlPage += `<tr><td><b>Средние</b><br>125–2000 Гц</td><td>Речь, музыка</td><td>${mid.heard} / ${mid.total}</td></tr>`;
    htmlPage += `<tr><td><b>Высокие</b><br>4000–8000 Гц</td><td>Свист, шипение</td><td>${high.heard} / ${high.total}</td></tr>`;
    htmlPage += `<tr><td><b>Очень высокие</b><br>9000–18500 Гц</td><td>Ультразвук</td><td>${veryHi.heard} / ${veryHi.total}</td></tr>`;
    htmlPage += '</table>';

    // 4. Таблица норм по возрасту
    htmlPage += '<h4 style="margin-top:20px;margin-bottom:8px">📖 Норма верхнего порога по возрастам</h4>';
    htmlPage += '<p style="font-size:13px;color:#555">Сравните свой верхний порог с типичными значениями:</p>';
    htmlPage += '<table style="width:100%;border-collapse:collapse">';
    htmlPage += '<tr><th style="text-align:left">Возраст</th><th>Норма верхнего порога</th></tr>';
    htmlPage += '<tr><td>До 20 лет</td><td>до 18 000–20 000 Гц</td></tr>';
    htmlPage += '<tr><td>20–30 лет</td><td>до 16 000–18 000 Гц</td></tr>';
    htmlPage += '<tr><td>30–40 лет</td><td>до 14 000–16 000 Гц</td></tr>';
    htmlPage += '<tr><td>40–50 лет</td><td>до 12 000–14 000 Гц</td></tr>';
    htmlPage += '<tr><td>50–60 лет</td><td>до 10 000–12 000 Гц</td></tr>';
    htmlPage += '<tr><td>60+ лет</td><td>до 8 000–10 000 Гц</td></tr>';
    htmlPage += '</table>';

    // 5. Что влияет на результат
    htmlPage += '<h4 style="margin-top:20px;margin-bottom:8px">💡 Что может влиять на результат</h4>';
    htmlPage += '<ul style="font-size:14px;color:#555;line-height:1.7">';
    htmlPage += '<li>🎧 <b>Наушники</b> — вкладыши часто не воспроизводят ниже 80 Гц и выше 16 кГц.</li>';
    htmlPage += '<li>🔊 <b>Громкость</b> — если слушали тихо, высокие частоты могли быть не слышны.</li>';
    htmlPage += '<li>😴 <b>Усталость</b> — после долгого дня слух притупляется.</li>';
    htmlPage += '<li>🎵 <b>Музыкальный опыт</b> — музыканты часто слышат больше.</li>';
    htmlPage += '<li>🏥 <b>Здоровье</b> — простуда, отит, серные пробки временно снижают слух.</li>';
    htmlPage += '</ul>';

    // ---------- HTML для письма ----------
    let htmlEmail = '<table>';
    htmlEmail += '<tr><th>Частота</th><th>Услышано</th></tr>';
    threshResults.forEach(r => {
        htmlEmail += `<tr><td>${r.freq} Гц</td><td>${r.heard ? 'да' : 'нет'}</td></tr>`;
    });
    htmlEmail += '</table>';
    htmlEmail += `<p>Услышано: ${heardCount} из ${totalCount} (${heardPercent}%)</p>`;
    htmlEmail += `<p>Нижний порог: ${minHeard !== null ? minHeard + ' Гц' : 'не определён'}</p>`;
    htmlEmail += `<p>Верхний порог: ${maxHeard !== null ? maxHeard + ' Гц' : 'не определён'}</p>`;
    htmlEmail += '<p>По диапазонам:</p>';
    htmlEmail += `<p>Низкие (18–100 Гц): ${low.heard} / ${low.total}</p>`;
    htmlEmail += `<p>Средние (125–2000 Гц): ${mid.heard} / ${mid.total}</p>`;
    htmlEmail += `<p>Высокие (4000–8000 Гц): ${high.heard} / ${high.total}</p>`;
    htmlEmail += `<p>Очень высокие (9000–18500 Гц): ${veryHi.heard} / ${veryHi.total}</p>`;

    // ---------- Показываем и отправляем ----------
    document.getElementById('result-content').innerHTML = htmlPage;
    setResultHTML(htmlEmail);
    saveResult();
}

// ---------- Отправка на сервер ----------
async function saveResult() {
    const heardFreqs = threshResults.filter(r => r.heard).map(r => r.freq);
    const maxHeard = heardFreqs.length ? Math.max(...heardFreqs) : null;
    const minHeard = heardFreqs.length ? Math.min(...heardFreqs) : null;

    const totalFreqs = FREQS.length;
    const completedFreqs = threshResults.length;
    const wasSkipped = completedFreqs < totalFreqs;

    const payload = {
        test_type: 'threshold',
        result_data: {
            freqs: threshResults.map(r => r.freq),
            heard: threshResults.map(r => r.heard),
            min_heard: minHeard,
            max_heard: maxHeard,
            total_freqs: totalFreqs,
            completed_freqs: completedFreqs,
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
    stopTone();
    const stoppedAt = FREQS[threshIndex] || null;
    finishTest(stoppedAt);
}

// ---------- Восстановление прогресса при загрузке ----------
window.addEventListener('DOMContentLoaded', () => {
    const saved = Storage.load('threshold');
    if (!saved || !saved.threshResults || saved.threshResults.length === 0) {
        return;   // нечего восстанавливать
    }

    const progressText = `шаг ${saved.threshIndex} из ${FREQS.length}`;

    Storage.askRestore('Порог слышимости', progressText).then(restore => {
        if (restore) {
            threshIndex = saved.threshIndex;
            threshResults = saved.threshResults;
            // Переходим сразу к тесту (минуя калибровку)
            document.getElementById('step-intro').style.display = 'none';
            document.getElementById('step-calibration').style.display = 'none';
            document.getElementById('step-test').style.display = 'block';
            nextStep();
        } else {
            Storage.clear('threshold');
        }
    });
});