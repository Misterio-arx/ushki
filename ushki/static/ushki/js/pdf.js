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

    // Названия и описания тестов (латиницей — jsPDF не дружит с кириллицей)
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

    // Клонируем результаты в скрытый контейнер со СВЕТЛЫМИ переменными
    const clone = original.cloneNode(true);
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '700px';
    wrapper.style.background = '#ffffff';
    wrapper.style.padding = '20px';
    wrapper.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    // Применяем светлую тему через CSS-переменные
    wrapper.style.setProperty('--text', '#1f2937');
    wrapper.style.setProperty('--text-muted', '#6b7280');
    wrapper.style.setProperty('--border', '#e5e7eb');
    wrapper.style.setProperty('--primary', '#4a6cf7');
    wrapper.style.setProperty('--primary-light', '#eef2ff');
    wrapper.style.setProperty('--card-bg', '#ffffff');
    wrapper.style.setProperty('--shadow', '0 4px 16px rgba(31,41,55,0.08)');
    wrapper.style.setProperty('--radius', '14px');
    wrapper.style.setProperty('--radius-sm', '8px');

    // Принудительно задаём цвета для всех дочерних элементов
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

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - margin * 2;

        // Шапка — синяя полоса
        pdf.setFillColor(74, 108, 247);
        pdf.rect(0, 0, pageWidth, 26, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Ushki — Test result', margin, 16);

        // Название теста
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(15);
        pdf.setFont('helvetica', 'bold');
        pdf.text(testTitle, margin, 38);

        // Описание теста
        if (testDesc) {
            pdf.setTextColor(107, 114, 128);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(testDesc, margin, 44);
        }

        // Дата
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(10);
        const dateStr = new Date().toLocaleString('ru-RU').replace(',', '');
        pdf.text(dateStr, margin, 50);

        // Линия под шапкой
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.3);
        pdf.line(margin, 54, pageWidth - margin, 54);

        // Картинка с результатами
        let y = 60;
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pageContentHeight = pageHeight - y - 20;

        if (imgHeight <= pageContentHeight) {
            pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
        } else {
            let remainingHeight = imgHeight;
            let sourceY = 0;
            while (remainingHeight > 0) {
                const sliceHeight = Math.min(pageContentHeight, remainingHeight);
                const sliceSourceHeight = (sliceHeight / imgHeight) * canvas.height;

                const tmpCanvas = document.createElement('canvas');
                tmpCanvas.width = canvas.width;
                tmpCanvas.height = sliceSourceHeight;
                const tmpCtx = tmpCanvas.getContext('2d');
                tmpCtx.drawImage(
                    canvas,
                    0, sourceY,
                    canvas.width, sliceSourceHeight,
                    0, 0,
                    canvas.width, sliceSourceHeight
                );
                pdf.addImage(
                    tmpCanvas.toDataURL('image/png'),
                    'PNG',
                    margin, y, imgWidth, sliceHeight
                );
                remainingHeight -= sliceHeight;
                sourceY += sliceSourceHeight;
                if (remainingHeight > 0) {
                    pdf.addPage();
                    y = margin;
                }
            }
        }

        // Подвал
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