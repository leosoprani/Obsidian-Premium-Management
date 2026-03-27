/**
 * Módulo para geração de relatórios em PDF.
 */

/**
 * Coleta e processa os dados necessários para o relatório do mês especificado.
 * @param {Date} currentDate - A data para determinar o mês e o ano do relatório.
 * @param {Array} reservations - Todas as reservas.
 * @param {Array} guests - Todos os hóspedes.
 * @param {Array} expenses - Todas as despesas.
 * @param {Array} properties - Todas as propriedades.
 * @returns {object|null} - Um objeto com os dados processados ou null se não houver dados.
 */
function getMonthlyReportData(currentDate, reservations, guests, expenses, properties) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
    const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0); // Último dia do mês

    const monthlyReservations = reservations.filter(res => {
        const checkin = new Date(res.checkin + 'T00:00:00');
        const checkout = new Date(res.checkout + 'T00:00:00');
        return checkin <= monthEnd && checkout >= monthStart && res.guestId !== 'TASK';
    });

    if (monthlyReservations.length === 0) {
        return null;
    }

    const expensesThisMonth = expenses.filter(exp => {
        const expenseDate = new Date(exp.date + 'T00:00:00');
        return expenseDate.getMonth() === month && expenseDate.getFullYear() === year;
    });

    const monthlyCleanings = reservations.filter(res => {
        if (res.guestId !== 'TASK' || res.status !== 'cleaning') return false;
        const checkin = new Date(res.checkin + 'T00:00:00');
        return checkin >= monthStart && checkin <= monthEnd;
    });

    // Cálculos Gerais
    let totalDaysAllApartments = 0;
    let totalRevenueAllApartments = 0;
    monthlyReservations.forEach(res => {
        const checkin = new Date(res.checkin + 'T00:00:00');
        const checkout = new Date(res.checkout + 'T00:00:00');
        const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
        totalDaysAllApartments += nights;
        totalRevenueAllApartments += parseFloat(res.price || 0);
    });

    const totalExpenses = expensesThisMonth.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const netBalance = totalRevenueAllApartments - totalExpenses;
    const daysInSelectedMonth = monthEnd.getDate();
    const totalPossibleDays = properties.length * daysInSelectedMonth;
    const overallOccupancyRate = totalPossibleDays > 0 ? ((totalDaysAllApartments / totalPossibleDays) * 100).toFixed(1) : '0.0';

    return {
        year, month, monthName: capitalizedMonthName, daysInSelectedMonth,
        monthlyReservations, monthlyCleanings, guests,
        summary: {
            totalDays: totalDaysAllApartments,
            totalRevenue: totalRevenueAllApartments,
            totalExpenses,
            netBalance,
            occupancyRate: overallOccupancyRate
        }
    };
}

/**
 * Adiciona as páginas de relatório por apartamento.
 * @param {jsPDF} doc - A instância do documento jsPDF.
 * @param {object} reportData - Os dados do relatório.
 */
function addApartmentPages(doc, reportData) {
    const { monthlyReservations, guests, year, month, monthName, daysInSelectedMonth } = reportData;

    const reservationsByApartment = monthlyReservations.reduce((acc, res) => {
        if (!acc[res.apartment]) acc[res.apartment] = [];
        acc[res.apartment].push(res);
        return acc;
    }, {});

    const sortedApartments = Object.keys(reservationsByApartment).sort();

    sortedApartments.forEach((apartment, index) => {
        if (index > 0) doc.addPage();

        doc.setFontSize(18);
        doc.text(`Relatório de Reservas - Apto: ${apartment}`, 14, 22);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Período: ${monthName} de ${year}`, 14, 28);

        const tableColumn = ["Hóspede", "Telefone", "Check-in", "Check-out", "Diárias"];
        const tableRows = [];
        let totalApartmentDays = 0;
        let totalApartmentRevenue = 0;

        reservationsByApartment[apartment].sort((a, b) => new Date(a.checkin) - new Date(b.checkin)).forEach(res => {
            const guest = guests.find(g => g.id === res.guestId);
            if (!guest) return;

            const checkin = new Date(res.checkin + 'T00:00:00');
            const checkout = new Date(res.checkout + 'T00:00:00');
            const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
            totalApartmentDays += nights;
            totalApartmentRevenue += parseFloat(res.price || 0);

            tableRows.push([
                guest.name, guest.phone || '-',
                `${checkin.toLocaleDateString('pt-BR')} ${res.checkinTime || ''}`,
                `${checkout.toLocaleDateString('pt-BR')} ${res.checkoutTime || ''}`,
                nights
            ]);
        });

        doc.autoTable({ head: [tableColumn], body: tableRows, startY: 35, theme: 'striped', headStyles: { fillColor: [0, 122, 255] } });

        const occupancyRate = ((totalApartmentDays / daysInSelectedMonth) * 100).toFixed(1);
        let finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text('Estatísticas do Apartamento', 14, finalY);
        doc.setFontSize(10);
        doc.text(`Total de Diárias no Mês: ${totalApartmentDays}`, 14, finalY + 7);
        doc.text(`Taxa de Ocupação: ${occupancyRate}%`, 14, finalY + 14);
        doc.text(`Receita Estimada: ${totalApartmentRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 21);
    });
}

/**
 * Adiciona a página de resumo geral do mês.
 * @param {jsPDF} doc - A instância do documento jsPDF.
 * @param {object} reportData - Os dados do relatório.
 */
function addSummaryPage(doc, reportData) {
    const { summary, year, monthName } = reportData;
    doc.addPage();
    doc.setFontSize(18);
    doc.text('Resumo Geral do Mês', 14, 22);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`${monthName} de ${year}`, 14, 28);

    const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const summaryData = [
        ['Taxa de Ocupação Geral', `${summary.occupancyRate}%`],
        ['Total de Diárias (Todos Aptos)', `${summary.totalDays}`],
        ['', ''],
        ['Receita Bruta Estimada', formatCurrency(summary.totalRevenue)],
        ['Total de Despesas do Mês', formatCurrency(summary.totalExpenses)],
        ['Balanço (Receita - Despesa)', formatCurrency(summary.netBalance)],
    ];

    doc.autoTable({ startY: 35, head: [['Métrica', 'Valor']], body: summaryData, theme: 'grid', headStyles: { fillColor: [75, 75, 75] }, styles: { fontSize: 11 }, columnStyles: { 0: { fontStyle: 'bold' } } });
}

/**
 * Adiciona a página de relatório de limpezas.
 * @param {jsPDF} doc - A instância do documento jsPDF.
 * @param {object} reportData - Os dados do relatório.
 */
function addCleaningsPage(doc, reportData) {
    const { monthlyCleanings, year, monthName } = reportData;
    if (monthlyCleanings.length === 0) return;

    doc.addPage();
    doc.setFontSize(18);
    doc.text('Relatório de Limpezas', 14, 22);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Período: ${monthName} de ${year}`, 14, 28);

    const cleaningTableRows = monthlyCleanings.sort((a, b) => new Date(a.checkin) - new Date(b.checkin)).map(task => {
        const provider = task.notes ? task.notes.replace('Prestador: ', '') : 'Não informado';
        return [task.apartment, new Date(task.checkin + 'T00:00:00').toLocaleDateString('pt-BR'), provider];
    });

    doc.autoTable({ head: [["Apartamento", "Data", "Prestador"]], body: cleaningTableRows, startY: 35, theme: 'striped', headStyles: { fillColor: [175, 82, 222] } });
}

/**
 * Função principal que gera e salva o PDF.
 * @param {object} appState - O estado atual da aplicação.
 */
export function generatePdf(appState) {
    const { currentDate, reservations, guests, expenses, properties } = appState;
    const reportData = getMonthlyReportData(currentDate, reservations, guests, expenses, properties);

    if (!reportData) {
        window.app.modals.showAlert(`Não há reservas para o mês de ${currentDate.toLocaleString('pt-BR', { month: 'long' })}.`);
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    addApartmentPages(doc, reportData);
    addSummaryPage(doc, reportData);
    addCleaningsPage(doc, reportData);

    doc.save(`relatorio_apartamentos_${reportData.monthName}_${reportData.year}.pdf`);
}