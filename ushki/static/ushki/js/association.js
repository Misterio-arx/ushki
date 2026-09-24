// ============================================================
// Тест синопсии (цветной слух)
// ============================================================

// 8 нот
const NOTES = [
    { file: 'note_c.mp3',  label: 'До (C)' },
    { file: 'note_d.mp3',  label: 'Ре (D)' },
    { file: 'note_e.mp3',  label: 'Ми (E)' },
    { file: 'note_f.mp3',  label: 'Фа (F)' },
    { file: 'note_g.mp3',  label: 'Соль (G)' },
    { file: 'note_a.mp3',  label: 'Ля (A)' },
    { file: 'note_b.mp3',  label: 'Си (B)' },
    { file: 'note_c2.mp3', label: 'До 2-й октавы (C2)' },
];

// Палитра цветов
const COLORS = [
    { name: 'Красный',     hex: '#e53935' },
    { name: 'Оранжевый',   hex: '#fb8c00' },
    { name: 'Жёлтый',      hex: '#fdd835' },
    { name: 'Зелёный',     hex: '#43a047' },
    { name: 'Голубой',     hex: '#29b6f6' },
    { name: 'Синий',       hex: '#1e88e5' },
    { name: 'Фиолетовый',  hex: '#8e24aa' },
    { name: 'Пурпурный',   hex: '#d81b60' },
];

// Состояние
let currentIndex = 0;
let answers = [];       // [{ note_label, color_name, color_hex }]
let audioPlayer = null;

// ---------- Экран «О синопсии» ----------
function showSynopsiaInfo() {
    document.getElementById('step-intro').style.display = 'none';
    document.getElementById('step-synopsia-info').style.display = 'block';
}

function closeSynopsiaInfo() {
    document.getElementById('step-synopsia-info').style.display = 'none';
    document.getElementById('step-intro').style.display = 'block';
}

function startTestFromInfo() {
    document.getElementById('step-synopsia-info').style.display = 'none';
    startTest();
}

// ---------- Старт ----------
function startTest() {
    document.getElementById('step-intro').style.display = 'none';
    document.getElementById('step-test').style.display = 'block';
    renderPalette();
    nextNote();
}

// ---------- Отрисовка палитры ----------
function renderPalette() {
    const container = document.getElementById('color-palette');
    container.innerHTML = '';
    COLORS.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.className = 'color-swatch';
        btn.style.background = c.hex;
        btn.title = c.name;
        btn.onclick = () => chooseColor(c);
        container.appendChild(btn);
    });
}

// ---------- Следующая нота ----------
function nextNote() {
    if (currentIndex >= NOTES.length) {
        finishTest();
        return;
    }

    const note = NOTES[currentIndex];
    document.getElementById('note-name').textContent = note.label;
    document.getElementById('test-progress').textContent =
        `Нота ${currentIndex + 1} из ${NOTES.length}`;
    const percent = ((currentIndex + 1) / NOTES.length) * 100;
    document.getElementById('progress-fill').style.width = percent + '%';

    // Создаём плеер для этой ноты
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer = null;
    }
    audioPlayer = new Audio('/static/ushki/audio/' + note.file);
    audioPlayer.loop = false;

    // Автоматически проигрываем
    audioPlayer.play().catch(e => {
        console.log('Автовоспроизведение заблокировано, нажмите кнопку', e);
    });
}

// ---------- Прослушать вручную ----------
function playCurrentNote() {
    if (!audioPlayer) return;
    audioPlayer.currentTime = 0;
    audioPlayer.play();
}

// ---------- Выбор цвета ----------
function chooseColor(color) {
    const note = NOTES[currentIndex];
    answers.push({
        note_label: note.label,
        note_file: note.file,
        color_name: color.name,
        color_hex: color.hex
    });

    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer = null;
    }

    currentIndex++;

    Storage.save('association', {
        currentIndex: currentIndex,
        answers: answers
    });
    nextNote();
}

// ---------- Пропустить ----------
function skipRemaining() {
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer = null;
    }
    const stoppedAt = currentIndex < NOTES.length ? NOTES[currentIndex].label : null;
    finishTest(stoppedAt);
}

// ---------- Результат ----------
function finishTest(stoppedAt = null) {
    Storage.clear('association');
    document.getElementById('step-test').style.display = 'none';
    document.getElementById('step-result').style.display = 'block';

    // ---------- HTML для страницы (красивый, с квадратиками) ----------
    let htmlPage = '<table style="width:100%;border-collapse:collapse">';
    htmlPage += '<tr><th style="text-align:left">Нота</th><th>Цвет</th></tr>';
    answers.forEach(a => {
        htmlPage += `<tr>
            <td>${a.note_label}</td>
            <td>
                <span style="display:inline-block;width:20px;height:20px;
                    background:${a.color_hex};border-radius:4px;vertical-align:middle;
                    margin-right:8px;"></span>
                ${a.color_name}
            </td>
        </tr>`;
    });
    htmlPage += '</table>';

    if (stoppedAt !== null) {
        htmlPage += `<p style="font-size:13px;color:#b45309;margin-top:8px">
            ⚠️ Тест был прерван на ноте «${stoppedAt}».</p>`;
    }

    htmlPage += `<p style="font-size:13px;color:#555;margin-top:16px">
        Если у вас настоящая синопсия — цвета для одних и тех же нот
        будут стабильны при повторных прохождениях.</p>`;

    // ---------- HTML для письма (простой) ----------
    let htmlEmail = '<table>';
    htmlEmail += '<tr><th>Нота</th><th>Цвет</th></tr>';
    answers.forEach(a => {
        htmlEmail += `<tr><td>${a.note_label}</td><td>${a.color_name}</td></tr>`;
    });
    htmlEmail += '</table>';

    if (stoppedAt !== null) {
        htmlEmail += `<p>Тест был прерван на ноте «${stoppedAt}».</p>`;
    }

    // ---------- Показываем и отправляем ----------
    document.getElementById('result-content').innerHTML = htmlPage;
    setResultHTML(htmlEmail);
    saveResult();
}

// ---------- Сохранение ----------
async function saveResult() {
    const totalNotes = NOTES.length;
    const completedNotes = answers.length;
    const wasSkipped = completedNotes < totalNotes;

    const payload = {
        test_type: 'association',
        result_data: {
            answers: answers,
            total_notes: totalNotes,
            completed_notes: completedNotes,
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

window.addEventListener('DOMContentLoaded', () => {
    const saved = Storage.load('association');
    if (!saved || !saved.answers || saved.answers.length === 0) return;

    const progressText = `нота ${saved.currentIndex} из ${NOTES.length}`;

    Storage.askRestore('Синопсия', progressText).then(restore => {
        if (restore) {
            currentIndex = saved.currentIndex;
            answers = saved.answers;
            document.getElementById('step-intro').style.display = 'none';
            document.getElementById('step-test').style.display = 'block';
            renderPalette();
            nextNote();
        } else {
            Storage.clear('association');
        }
    });
});