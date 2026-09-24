// ============================================================
// Скачивание результатов в PDF
// ============================================================

async function downloadPDF(testName) {
    const { jsPDF } = window.jspdf;
    const element = document.getElementById('result-content');

    if (!element) {
        alert('Не найден блок с результатами.');
        return;
    }

    // Названия тестов (латиница, т.к. jsPDF не поддерживает кириллицу)
    const testTitles = {
        'threshold': 'Hearing threshold',
        'synopsia': 'Synopsia (color hearing)',
        'pitch': 'Pitch discrimination'
    };
    const testTitle = testTitles[testName] || testName;

    // Временно подсвечиваем блок результатов на белом фоне
    const originalBg = element.style.background;
    element.style.background = '#ffffff';

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - margin * 2;

        // ---------- Шапка: синяя полоса ----------
        pdf.setFillColor(74, 108, 247);          // #4a6cf7
        pdf.rect(0, 0, pageWidth, 24, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Test result', margin, 15);

        // ---------- Название теста и дата ----------
        pdf.setTextColor(31, 41, 55);            // #1f2937
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text(testTitle, margin, 36);

        pdf.setTextColor(107, 114, 128);         // #6b7280
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const dateStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
        pdf.text(dateStr, margin, 42);

        // Тонкая линия под шапкой
        pdf.setDrawColor(229, 231, 235);         // #e5e7eb
        pdf.setLineWidth(0.3);
        pdf.line(margin, 46, pageWidth - margin, 46);

        // ---------- Картинка с результатами ----------
        let y = 52;
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pageContentHeight = pageHeight - y - 20;  // 20 мм на подвал

        if (imgHeight <= pageContentHeight) {
            pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
        } else {
            // Разбиваем на несколько страниц
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

        // ---------- Подвал на каждой странице ----------
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setTextColor(150, 150, 150);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Hearing test', margin, pageHeight - 10);
            pdf.text(`${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }

        // ---------- Сохраняем ----------
        const fileName = `result_${testName}_${new Date().toISOString().slice(0, 10)}.pdf`;
        pdf.save(fileName);
    } catch (e) {
        alert('Ошибка при создании PDF: ' + e.message);
    } finally {
        element.style.background = originalBg;
    }
}