// ============================================================
// Скачивание результатов в PDF
// ============================================================

async function downloadPDF(testName) {
    const { jsPDF } = window.jspdf;
    const original = document.getElementById('result-content');

    if (!original) {
        alert('Не найден блок с результатами.');
        return;
    }

    const TEST_TITLES = {
        'threshold': 'Hearing threshold',
        'synopsia': 'Synopsia (color hearing)',
        'pitch': 'Pitch discrimination',
        'chronoesthesia': 'Chronoesthesia'
    };
    const TEST_DESCRIPTIONS = {
        'threshold': 'Determines which sound frequencies you can hear and which you cannot.',
        'synopsia': 'Shows which colors you associate with different sounds.',
        'pitch': 'Measures the ability to distinguish between two similar tones.',
        'chronoesthesia': 'Measures how accurately you estimate time intervals by ear.'
    };

    const testTitle = TEST_TITLES[testName] || testName;
    const testDesc = TEST_DESCRIPTIONS[testName] || '';

    // Клонируем результат в скрытый контейнер со светлыми цветами
    const clone = original.cloneNode(true);
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '700px';
    wrapper.style.background = '#ffffff';
    wrapper.style.padding = '20px';
    wrapper.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    wrapper.style.setProperty('--text', '#1f2937');
    wrapper.style.setProperty('--text-muted', '#6b7280');
    wrapper.style.setProperty('--border', '#e5e7eb');
    wrapper.style.setProperty('--primary', '#4a6cf7');
    wrapper.style.setProperty('--primary-light', '#eef2ff');
    wrapper.style.setProperty('--card-bg', '#ffffff');
    wrapper.style.setProperty('--radius', '14px');
    wrapper.style.setProperty('--radius-sm', '8px');

    const forceColors = (node) => {
        if (node.nodeType === 1) {
            node.style.color = '#1f2937';
            node.style.borderColor = '#e5e7eb';
            if (node.tagName === 'TH') node.style.color = '#1f2937';
            if (node.tagName === 'TD') node.style.color = '#1f2937';
            Array.from(node.children).forEach(forceColors);
        }
    };

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);
    forceColors(wrapper);

    try {
        const canvas = await html2canvas(wrapper, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true
        });

        // Читаем пиксели один раз для анализа
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const stride = canvas.width * 4;

        // Возвращает true, если в строке нет тёмных пикселей (нет текста/иконок)
        // Рамки и светлый фон игнорируются — они не мешают, если текст не разрезан
        function isRowSafe(y) {
            const offset = y * stride;
            for (let x = 0; x < stride; x += 4) {
                const r = data[offset + x];
                const g = data[offset + x + 1];
                const b = data[offset + x + 2];
                // Тёмный пиксель — текст или иконка
                if (r < 200 && g < 200 && b < 200) {
                    return false;
                }
            }
            return true;
        }

        // Ищем безопасную строку для разреза, поднимаясь вверх от targetY
        function findSafeSplitY(targetY, minY) {
            for (let offset = 0; offset < 500; offset++) {
                const y = targetY - offset;
                if (y < minY) return targetY;
                if (isRowSafe(y)) return y;
            }
            return targetY;
        }

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - margin * 2;

        // Шапка — только на первой странице
        pdf.setFillColor(74, 108, 247);
        pdf.rect(0, 0, pageWidth, 26, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Ushki — Test result', margin, 16);

        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(15);
        pdf.setFont('helvetica', 'bold');
        pdf.text(testTitle, margin, 38);

        if (testDesc) {
            pdf.setTextColor(107, 114, 128);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(testDesc, margin, 44);
        }

        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(10);
        const dateStr = new Date().toLocaleString('ru-RU').replace(',', '');
        pdf.text(dateStr, margin, 50);

        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.3);
        pdf.line(margin, 54, pageWidth - margin, 54);

        // Нарезка изображения
        const imgWidth = contentWidth;
        let sourceY = 0;
        let firstPage = true;

        while (sourceY < canvas.height) {
            const yTopMm = firstPage ? 60 : margin;
            const availableHeightMm = pageHeight - yTopMm - 20;
            const availableHeightPx = Math.round((availableHeightMm / imgWidth) * canvas.width);

            let targetY = sourceY + availableHeightPx;
            let actualEndY;

            if (targetY >= canvas.height) {
                actualEndY = canvas.height;
            } else {
                actualEndY = findSafeSplitY(targetY, sourceY + 50);
            }

            const sliceHeightPx = actualEndY - sourceY;
            const sliceHeightMm = (sliceHeightPx / canvas.width) * imgWidth;

            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeightPx;
            const sliceCtx = sliceCanvas.getContext('2d');
            sliceCtx.drawImage(
                canvas,
                0, sourceY,
                canvas.width, sliceHeightPx,
                0, 0,
                canvas.width, sliceHeightPx
            );

            pdf.addImage(
                sliceCanvas.toDataURL('image/png'),
                'PNG',
                margin, yTopMm, imgWidth, sliceHeightMm
            );

            sourceY = actualEndY;

            if (sourceY < canvas.height) {
                pdf.addPage();
                firstPage = false;
            }
        }

        // Подвал — на каждой странице
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setTextColor(150, 150, 150);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Ushki — hearing tests', margin, pageHeight - 10);
            pdf.text(`${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }

        const fileName = `result_${testName}_${new Date().toISOString().slice(0, 10)}.pdf`;
        pdf.save(fileName);
    } catch (e) {
        alert('Ошибка при создании PDF: ' + e.message);
    } finally {
        document.body.removeChild(wrapper);
    }
}