import { apartments, statusConfig, paymentStatusConfig, holidays } from './config.js';

/**
 * Aplica o tema (claro/escuro/liquid-glass) na aplicação.
 * @param {string} theme - 'light' ou 'dark'.
 */
export function applyTheme(theme) {
    document.documentElement.classList.remove('dark', 'liquid-glass');
    const adminBtn = document.getElementById('theme-toggle-btn');
    const ownerBtnLink = document.getElementById('owner-theme-toggle-btn');
    const ownerThemeText = document.getElementById('owner-theme-toggle-text');

    let themeName = 'Claro';

    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        if (adminBtn) adminBtn.innerHTML = '<i data-lucide="moon"></i>';
        if (ownerBtnLink) ownerBtnLink.querySelector('i').outerHTML = '<i data-lucide="moon" class="w-4 h-4"></i>';
        themeName = 'Escuro';
    } else if (theme === 'liquid-glass') {
        document.documentElement.classList.add('liquid-glass');
        if (adminBtn) adminBtn.innerHTML = '<i data-lucide="gem"></i>';
        if (ownerBtnLink) ownerBtnLink.querySelector('i').outerHTML = '<i data-lucide="gem" class="w-4 h-4"></i>';
        themeName = 'Vidro';
    } else {
        // Tema 'light' é o padrão
        if (adminBtn) adminBtn.innerHTML = '<i data-lucide="sun"></i>';
        if (ownerBtnLink) ownerBtnLink.querySelector('i').outerHTML = '<i data-lucide="sun" class="w-4 h-4"></i>';
        themeName = 'Claro';
    }

    if (ownerThemeText) {
        ownerThemeText.textContent = `Tema: ${themeName}`;
    }
    window.lucide.createIcons();
}

/**
 * Inicia e atualiza o relógio no cabeçalho.
 */
export function startClock() {
    const dateTimeEl = document.getElementById('current-datetime');
    if (!dateTimeEl) return;

    function updateClock() {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'long',
        });
        const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const capitalizedDate = formattedDate.replace(/\b\w/g, l => l.toUpperCase()).replace('.', '');
        dateTimeEl.textContent = `${capitalizedDate} - ${formattedTime}`;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

/**
 * Alterna a visibilidade da barra lateral em dispositivos móveis.
 */
export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('-translate-x-full');
    sidebarOverlay.classList.toggle('hidden');
    setTimeout(() => lucide.createIcons(), 50);
}

/**
 * Aplica permissões na UI com base na função do usuário.
 * @param {string} role - A função do usuário (ex: 'admin').
 */
export function applyRolePermissions(role) {
    const isAdmin = role === 'admin';

    // Elementos que são apenas para administradores
    const adminOnlyElements = [
        document.getElementById('view-tab-financial'),
        document.getElementById('settings-btn'),
        document.getElementById('add-expense-btn'),
        document.getElementById('add-expense-link-sidebar'),
        document.getElementById('view-tab-users'),
        document.getElementById('view-tab-logs'),
        document.getElementById('view-tab-properties')
    ];

    adminOnlyElements.forEach(el => el?.classList.toggle('hidden', !isAdmin));

    // Esconde a barra lateral inteira para proprietários
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('hidden', role === 'owner');

    // Esconde o app principal para proprietários (já deve estar escondido, mas garante)
    const appContainer = document.getElementById('app');
    if (appContainer && role === 'owner') appContainer.classList.add('hidden');

    // Atualiza o contador de aprovações pendentes
    updateApprovalsBadge();
}

/**
 * Atualiza o contador de aprovações pendentes na aba do menu.
 */
export function updateApprovalsBadge() {
    const badge = document.getElementById('approvals-count-badge');
    const mobileBadge = document.getElementById('approvals-count-badge-mobile'); // For mobile-responsive view if exists

    const pendingApprovals = window.app.state.reservations.filter(r => r.status === 'pending-approval');
    const count = pendingApprovals.length;

    [badge, mobileBadge].forEach(el => {
        if (el) {
            el.textContent = count;
            el.classList.toggle('hidden', count === 0);
        }
    });
}

/**
 * Exibe uma notificação toast na tela.
 * @param {string} message - A mensagem principal da notificação.
 * @param {string} user - O usuário que realizou a ação.
 * @param {string} type - O tipo de notificação ('info', 'success', 'error').
 */
export function showToast(message, user, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-enter card p-4 flex items-start gap-3 shadow-lg';

    const iconMap = {
        info: 'info',
        success: 'check-circle',
        error: 'alert-circle'
    };

    toast.innerHTML = `
        <div>
            <i data-lucide="${iconMap[type]}" class="w-5 h-5 text-blue-500"></i>
        </div>
        <div class="flex-1">
            <p class="font-semibold">${message}</p>
            <p class="text-sm text-outline">Realizado por: ${user}</p>
        </div>
    `;

    container.appendChild(toast);
    window.lucide.createIcons();

    // Animação de entrada
    setTimeout(() => toast.classList.replace('toast-enter', 'toast-enter-to'), 10);

    // Animação de saída e remoção
    setTimeout(() => {
        toast.classList.replace('toast-enter-to', 'toast-leave-to');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 5000); // A notificação some após 5 segundos
}

/**
 * Verifica se uma reserva está ativa em uma data específica.
 * @param {object} reservation - O objeto da reserva.
 * @param {Date} date - A data a ser verificada.
 * @returns {boolean}
 */
function isReservationActiveOnDate(reservation, date) {
    const checkin = new Date(reservation.checkin + 'T00:00:00');
    const checkout = new Date(reservation.checkout + 'T00:00:00');

    if (reservation.guestId === 'TASK') {
        return date >= checkin && date <= checkout;
    } else {
        return date >= checkin && date < checkout;
    }
}

/**
 * Renderiza a lista de hóspedes.
 * @param {Array} guests - Array de objetos de hóspedes.
 */
export function renderGuestsList(guests) {
    const container = document.getElementById('guests-list-container');
    if (guests.length === 0) {
        container.innerHTML = `<p class="text-outline p-4 text-center">Nenhum hóspede encontrado.</p>`;
        return;
    }

    const tableHtml = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left min-w-[960px]">
                <thead class="bg-surface-container-high">
                    <tr>
                        <th class="px-4 py-2 font-semibold">Nome</th>
                        <th class="px-4 py-2 font-semibold">Documento</th>
                        <th class="px-4 py-2 font-semibold">Telefone</th>
                        <th class="px-4 py-2 font-semibold">E-mail</th>
                        <th class="px-4 py-2 font-semibold">Data Cadastro</th>
                        <th class="px-4 py-2 font-semibold">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${guests.sort((a, b) => a.name.localeCompare(b.name)).map(guest => {
        const registrationDate = guest.createdAt
            ? new Date(guest.createdAt).toLocaleDateString('pt-BR')
            : (guest.id.length > 5 && !isNaN(parseInt(guest.id)) ? new Date(parseInt(guest.id)).toLocaleDateString('pt-BR') : '-');
        return `
                            <tr class="border-b">
                                <td class="px-4 py-2 whitespace-nowrap">
                                    <div class="flex items-center gap-2">
                                        ${guest.name}
                                        ${guest.documents && guest.documents.length > 0 ? `<i data-lucide="paperclip" class="w-4 h-4 text-blue-500" title="${guest.documents.length} documento(s) anexado(s)"></i>` : ''}
                                    </div>
                                </td>
                                <td class="px-4 py-2 text-on-surface-variant whitespace-nowrap">${guest.doc || '-'}</td>
                                <td class="px-4 py-2 text-on-surface-variant whitespace-nowrap">${guest.phone || '-'}</td>
                                <td class="px-4 py-2 text-on-surface-variant">${guest.email || '-'}</td>
                                <td class="px-4 py-2 text-on-surface-variant whitespace-nowrap">${registrationDate}</td>
                                <td class="px-4 py-2">
                                    <div class="flex gap-2">
                                        <button class="btn btn-ghost p-2 h-9 w-9" onclick="window.app.modals.openGuestModal('${guest.id}')"><i data-lucide="edit"></i></button>
                                        <button class="btn btn-ghost p-2 h-9 w-9 text-red-500" onclick="window.app.handlers.deleteGuestHandler('${guest.id}')"><i data-lucide="trash-2"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = tableHtml;
    window.lucide.createIcons();
}

/**
 * Renderiza a lista de funcionários.
 * @param {Array} employees - Array de objetos de funcionários.
 */
export function renderEmployeesList(employees) {
    const container = document.getElementById('employees-list-container');
    if (employees.length === 0) {
        container.innerHTML = `<p class="text-outline p-4 text-center">Nenhum funcionário encontrado.</p>`;
        return;
    }

    const tableHtml = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-surface-container-high">
                    <tr>
                        <th class="p-4 font-semibold">Nome</th>
                        <th class="p-4 font-semibold">Cargo</th>
                        <th class="p-4 font-semibold">Telefone</th>
                        <th class="p-4 font-semibold">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${employees.sort((a, b) => a.name.localeCompare(b.name)).map(emp => `
                        <tr class="border-b">
                            <td class="p-4">${emp.name}</td>
                            <td class="p-4 text-on-surface-variant">${emp.role || '-'}</td>
                            <td class="p-4 text-on-surface-variant">${emp.phone || '-'}</td>
                            <td class="p-4">
                                <div class="flex gap-2">
                                    <button class="btn btn-ghost p-2 h-9 w-9" onclick="window.app.modals.openEmployeeModal('${emp.id}')"><i data-lucide="edit"></i></button>
                                    <button class="btn btn-ghost p-2 h-9 w-9 text-red-500" onclick="window.app.handlers.deleteEmployeeHandler('${emp.id}')"><i data-lucide="trash-2"></i></button>
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    container.innerHTML = tableHtml;
    window.lucide.createIcons();
}

/**
 * Renderiza a lista de usuários do sistema.
 * @param {Array} users - Array de objetos de usuários.
 */
export function renderUsersList(users) {
    const systemUsersContainer = document.getElementById('system-users-list-container');
    const ownerUsersContainer = document.getElementById('owner-users-list-container');

    const systemUsers = users.filter(u => u.role === 'admin' || u.role === 'staff');
    const ownerUsers = users.filter(u => u.role === 'owner');

    const createTable = (userList) => {
        if (userList.length === 0) {
            return `<p class="text-outline p-4 text-center">Nenhum usuário encontrado nesta categoria.</p>`;
        }
        return `
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-surface-container-high">
                        <tr>
                            <th class="p-4 font-semibold">Nome de Usuário</th>
                            <th class="p-4 font-semibold">Função</th>
                            <th class="p-4 font-semibold">Apartamento Vinculado</th>
                            <th class="p-4 font-semibold">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${userList.sort((a, b) => a.username.localeCompare(b.username)).map(user => `
                            <tr class="border-b">
                                <td class="p-4">${user.username}</td>
                                <td class="p-4 text-on-surface-variant">${user.role || 'N/A'}</td>
                                <td class="p-4 text-on-surface-variant">
                                    ${user.role === 'owner' ? (user.apartments && user.apartments.length > 0 ? user.apartments.join(', ') : (user.apartment || 'Nenhum')) : '-'}
                                </td>
                                <td class="p-4">
                                    <div class="flex gap-2">
                                        ${user.username !== 'admin' ? `
                                        <button class="btn btn-ghost p-2 h-9 w-9" onclick="window.app.modals.openUserModal('${user._id}')"><i data-lucide="edit"></i></button>
                                        <button class="btn btn-ghost p-2 h-9 w-9 text-red-500" onclick="window.app.handlers.deleteUserHandler('${user._id}')"><i data-lucide="trash-2"></i></button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    };

    systemUsersContainer.innerHTML = createTable(systemUsers);
    ownerUsersContainer.innerHTML = createTable(ownerUsers);

    window.lucide.createIcons();
}

/**
 * Renderiza a lista de logs de atividade.
 * @param {object} logData - Objeto contendo os logs e informações de paginação.
 */
export function renderActivityLogs(logData) {
    const container = document.getElementById('logs-container');
    const paginationContainer = document.getElementById('logs-pagination-container');
    const { logs, totalCount, page, totalPages } = logData;

    if (!logs || totalCount === 0) {
        container.innerHTML = `<p class="text-outline p-4 text-center">Nenhum log de atividade encontrado.</p>`;
        paginationContainer.innerHTML = '';
        return;
    }

    const tableHtml = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-surface-container-high">
                    <tr>
                        <th class="p-4 font-semibold">Data</th>
                        <th class="p-4 font-semibold">Usuário</th>
                        <th class="p-4 font-semibold">Ação</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'medium'
        });
        return `
                            <tr class="border-b">
                                <td class="p-4 whitespace-nowrap text-on-surface-variant">${timestamp}</td>
                                <td class="p-4 font-medium">${log.username}</td>
                                <td class="p-4 text-on-surface-variant">${log.action}</td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>`;
    container.innerHTML = tableHtml;

    // Renderiza a paginação
    const prevDisabled = page <= 1 ? 'disabled' : '';
    const nextDisabled = page >= totalPages ? 'disabled' : '';
    paginationContainer.innerHTML = `
        <button class="btn btn-secondary" onclick="window.app.handlers.changeLogPageHandler(${page - 1})" ${prevDisabled}>
            <i data-lucide="chevron-left"></i> Anterior
        </button>
        <span class="text-sm font-semibold text-on-surface-variant">
            Página ${page} de ${totalPages}
        </span>
        <button class="btn btn-secondary" onclick="window.app.handlers.changeLogPageHandler(${page + 1})" ${nextDisabled}>
            Próxima <i data-lucide="chevron-right"></i>
        </button>
    `;
    window.lucide.createIcons();
}

/**
 * Renderiza os cards de reservas ativas.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Array} guests - Array de todos os hóspedes.
 */
export function renderActiveReservations(reservations, guests) {
    const reservationsContainer = document.getElementById('active-reservations-container');
    const tasksContainer = document.getElementById('active-tasks-container');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allActive = reservations.filter(res => isReservationActiveOnDate(res, today) && res.status !== 'finished');

    const activeGuestReservations = allActive.filter(res => res.guestId !== 'TASK');
    const activeTasks = allActive.filter(res => res.guestId === 'TASK');

    reservationsContainer.innerHTML = '';
    tasksContainer.innerHTML = '';

    if (activeGuestReservations.length === 0) {
        reservationsContainer.innerHTML = `<p class="text-outline col-span-full text-center">Nenhuma reserva de hóspede ativa no momento.</p>`;
    }
    if (activeTasks.length === 0) {
        tasksContainer.innerHTML = `<p class="text-outline col-span-full text-center">Nenhuma tarefa ativa no momento.</p>`;
    }

    allActive.forEach(res => {
        let cardHtml = '';
        if (res.guestId === 'TASK') {
            // Lógica para renderizar card de tarefa
            const status = statusConfig[res.status];
            const checkinStr = `${new Date(res.checkin + 'T00:00:00').toLocaleDateString('pt-BR')} ${res.checkinTime || ''}`.trim();
            const checkoutStr = `${new Date(res.checkout + 'T00:00:00').toLocaleDateString('pt-BR')} ${res.checkoutTime || ''}`.trim();
            cardHtml = `
                <div class="card p-4 flex flex-col justify-between hover:shadow-lg transition-shadow">
                    <div>
                        <div class="flex justify-between items-start">
                            <span class="text-xs font-bold py-1 px-2 rounded-full ${status.color} ${status.textColor}">${status.text}</span>
                            <span class="font-bold text-xl text-on-surface">Apto ${res.apartment}</span>
                        </div>
                        <p class="text-sm text-outline mt-3">${res.notes || 'Sem detalhes.'}</p>
                    </div>
                    <div class="mt-4 text-sm text-on-surface-variant border-t pt-2">
                        <div class="space-y-2">
                            <div class="flex justify-between items-center p-2 rounded-md" style="background-color: var(--secondary-bg);"><span class="font-semibold">Início:</span><span class="font-bold text-base" style="color: var(--brand-blue);">${checkinStr}</span></div>
                            <div class="flex justify-between items-center p-2 rounded-md" style="background-color: var(--secondary-bg);"><span class="font-semibold">Fim:</span><span class="font-bold text-base" style="color: var(--brand-red);">${checkoutStr}</span></div>
                        </div>
                        <button class="btn btn-primary w-full mt-3" onclick="window.app.handlers.finishTaskHandler('${res.id}')"><i data-lucide="check-circle"></i> Finalizar</button>
                    </div>
                </div>`;
            tasksContainer.innerHTML += cardHtml;
        } else {
            // Lógica para renderizar card de reserva de hóspede
            const guest = guests.find(g => g.id === res.guestId);
            if (!guest) return;

            const status = statusConfig[res.status];
            const paymentStatus = paymentStatusConfig[res.paymentStatus || 'pending'];
            const price = parseFloat(res.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const checkout = new Date(res.checkout + 'T00:00:00');
            const remainingNights = Math.ceil((checkout - today) / (1000 * 60 * 60 * 24));
            const remainingDays = remainingNights > 0 ? remainingNights : 0;
            const additionalGuestsHtml = res.additionalGuests && res.additionalGuests.length > 0 ? `<p class="text-sm text-outline mt-1 truncate" title="${res.additionalGuests.join(', ')}">+ ${res.additionalGuests.join(', ')}</p>` : '';
            const vehicleHtml = res.vehiclePlate ? `<span class="flex items-center gap-1"><i data-lucide="car" class="w-4 h-4"></i> ${res.vehiclePlate}</span>` : '';
            const guestPhotoHtml = guest.photoUrl ?
                `<div class="relative w-16 h-16 mr-4 flex-shrink-0"><img src="${guest.photoUrl}" alt="${guest.name}" class="w-full h-full rounded-full object-cover transition-transform duration-200 ease-in-out hover:scale-150 hover:z-10"></div>`
                : `<div class="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-4"><i data-lucide="user" class="w-8 h-8 text-gray-400"></i></div>`;

            const platformIcons = {
                airbnb: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current"><title>Airbnb</title><path d="M12 3.25a9.75 9.75 0 018.642 14.508c.848-1.006.92-2.442.168-3.552-1.12-1.656-2.82-2.856-4.896-3.456-1.08-.312-2.22-.432-3.36-.432-1.14 0-2.28.12-3.36.432-2.076.6-3.776 1.8-4.896 3.456-.752 1.11-.68 2.546.168 3.552A9.75 9.75 0 0112 3.25zm0 1.5a8.25 8.25 0 00-7.323 12.252c.24-.288.42-.6.552-.936.324-.804.9-1.524 1.656-2.112 1.2-.936 2.664-1.524 4.224-1.764a10.46 10.46 0 011.788-.096c1.56.24 3.024.828 4.224 1.764.756.588 1.332 1.308 1.656 2.112.132.336.312.648.552.936A8.25 8.25 0 0012 4.75zM12 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0-4.5a3 3 0 100 6 3 3 0 000-6z"/></svg>',
                booking: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current"><title>Booking.com</title><path d="M16.416 0H7.584C3.408 0 0 3.408 0 7.584v8.832C0 20.592 3.408 24 7.584 24h8.832C20.592 24 24 20.592 24 16.416V7.584C24 3.408 20.592 0 16.416 0zM9.444 18.48a1.44 1.44 0 01-1.44-1.44V7.2a1.44 1.44 0 012.88 0v9.84a1.44 1.44 0 01-1.44 1.44zm5.1-1.8a4.68 4.68 0 01-3.924-2.064v1.824a1.44 1.44 0 01-2.88 0V7.2a1.44 1.44 0 012.88 0v4.68c0 .9.72 1.62 1.62 1.62s1.62-.72 1.62-1.62V7.2a1.44 1.44 0 112.88 0v4.68c.012 2.592-2.088 4.704-4.68 4.8z"/></svg>',
                direct: '<i data-lucide="phone" class="w-4 h-4"></i>',
                owner: '<i data-lucide="home" class="w-4 h-4"></i>',
                other: '<i data-lucide="globe" class="w-4 h-4"></i>'
            };
            const platformHtml = `<span class="flex items-center gap-1 text-xs font-semibold py-1 px-2 rounded-full" style="background-color: var(--secondary-bg); color: var(--text-color-secondary);">${platformIcons[res.platform || 'other']}</span>`;

            cardHtml = `
                <div class="card p-4 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer" onclick="window.app.modals.openReservationModal('${res.id}')">
                    <div>
                        <div class="flex justify-between items-start">
                            <div class="flex gap-2 flex-wrap">
                                <span class="text-xs font-bold py-1 px-2 rounded-full ${status.color} ${status.textColor}">${status.text}</span>
                                <span class="text-xs font-bold py-1 px-2 rounded-full ${paymentStatus.color} ${paymentStatus.textColor}">${paymentStatus.text}</span>
                                ${platformHtml}
                            </div>
                            <span class="text-lg font-bold py-1 px-3 rounded-full" style="background-color: var(--secondary-bg); color: var(--text-color);">Apto ${res.apartment}</span>
                        </div>
                        <div class="flex items-center mt-3">
                            ${guestPhotoHtml}
                            <div>
                                <h3 class="text-lg font-semibold">${guest.name}</h3>
                            </div>
                        </div>
                        ${additionalGuestsHtml}
                        <div class="flex items-center gap-4 text-on-surface-variant mt-2">
                            <span class="flex items-center gap-1"><i data-lucide="user" class="w-4 h-4"></i> ${res.adults}</span>
                            <span class="flex items-center gap-1"><i data-lucide="baby" class="w-4 h-4"></i> ${res.children}</span>
                            ${res.pet ? '<span class="flex items-center gap-1"><i data-lucide="dog" class="w-4 h-4"></i> Sim</span>' : ''}
                            ${vehicleHtml}
                        </div>
                    </div>
                    <div class="mt-4 text-sm text-on-surface-variant">
                        <div class="flex justify-between items-center border-t pt-2">
                            <span>Valor:</span>
                            <span class="font-medium text-green-600">${price}</span>
                        </div>
                        <div class="flex justify-between items-center mt-1">
                            <span>Noites restantes:</span>
                            <span class="font-medium">${remainingDays}</span>
                        </div>
                        <div class="flex justify-between items-center mt-2 p-2 rounded-md" style="background-color: var(--secondary-bg);"><span class="font-semibold">Saída:</span><span class="font-bold text-base" style="color: var(--brand-red);">${new Date(res.checkout + 'T00:00:00').toLocaleDateString('pt-BR')} ${res.checkoutTime || ''}</span></div>
                    </div>
                </div>
            `;
            reservationsContainer.innerHTML += cardHtml;
        }
    });

    // Lógica para controle das abas
    const tabReservations = document.getElementById('active-tab-reservations');
    const tabTasks = document.getElementById('active-tab-tasks');
    const reservationsTabContent = document.getElementById('active-reservations-tab-content');
    const tasksTabContent = document.getElementById('active-tasks-tab-content');

    const switchActiveTab = (activeTab) => {
        if (activeTab === 'tasks') {
            tabReservations.classList.remove('active');
            tabTasks.classList.add('active');
            reservationsTabContent.classList.add('hidden');
            tasksTabContent.classList.remove('hidden');
        } else {
            tabTasks.classList.remove('active');
            tabReservations.classList.add('active');
            tasksTabContent.classList.add('hidden');
            reservationsTabContent.classList.remove('hidden');
        }
    };

    tabReservations.onclick = () => switchActiveTab('reservations');
    tabTasks.onclick = () => switchActiveTab('tasks');

    window.lucide.createIcons();
}

/**
 * Renderiza a lista de propriedades (apartamentos).
 * @param {Array} properties - Array de objetos de propriedades.
 */
export function renderPropertiesList(properties) {
    const container = document.getElementById('properties-list-container');
    if (!properties || properties.length === 0) {
        container.innerHTML = `<p class="text-outline text-center">Nenhuma propriedade cadastrada.</p>`;
        return;
    }

    const cardsHtml = properties.map(prop => `
        <div class="card p-4 flex flex-col justify-between text-center relative group">
            <div class="flex-grow">
                <i data-lucide="building-2" class="w-10 h-10 text-gray-300 dark:text-on-surface-variant mb-2 mx-auto"></i>
                <span class="font-bold text-2xl text-on-surface dark:text-gray-300">${prop.name}</span>
                <span class="block text-sm text-outline">Capacidade: ${prop.capacity || '?'} pessoas</span>
            </div>
            <div class="property-card-info flex justify-center items-center gap-4 border-t border-dashed pt-3 mt-3">
                <span class="amenity-icon" title="Wi-Fi" data-active="${!!prop.amenities?.wifi}"><i data-lucide="wifi" class="w-5 h-5"></i></span>
                <span class="amenity-icon" title="TV" data-active="${!!prop.amenities?.tv}"><i data-lucide="tv" class="w-5 h-5"></i></span>
                <span class="amenity-icon" title="Cooktop" data-active="${!!prop.amenities?.cooktop}"><i data-lucide="heater" class="w-4 h-4"></i></span>
                <span class="amenity-icon" title="Alarme de Incêndio" data-active="${!!prop.amenities?.fireAlarm}"><i data-lucide="siren" class="w-4 h-4"></i></span>
            </div>
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button class="btn btn-ghost p-2 h-8 w-8" onclick="window.app.modals.openPropertyEditModal('${prop._id}')" title="Editar">
                    <i data-lucide="edit" class="w-4 h-4"></i>
                </button>
                <button class="btn btn-ghost p-2 h-8 w-8 text-red-500" onclick="window.app.handlers.deletePropertyHandler('${prop._id}')" title="Excluir">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">${cardsHtml}</div>`;
    window.lucide.createIcons();
}

/**
 * Renderiza os cards de reservas pendentes.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Array} guests - Array de todos os hóspedes.
 */
export function renderPendingReservations(reservations, guests) {
    const container = document.getElementById('pending-reservations-container');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending = reservations.filter(res => {
        const checkin = new Date(res.checkin + 'T00:00:00');
        return checkin > today && res.guestId !== 'TASK';
    }).sort((a, b) => new Date(a.checkin) - new Date(b.checkin));

    container.innerHTML = '';
    if (pending.length === 0) {
        container.innerHTML = `<p class="text-outline col-span-full text-center">Nenhuma reserva pendente.</p>`;
        return;
    }

    pending.forEach(res => {
        const guest = guests.find(g => g.id === res.guestId);
        if (!guest) return;
        const status = statusConfig[res.status];
        const paymentStatus = paymentStatusConfig[res.paymentStatus || 'pending'];
        const price = parseFloat(res.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const checkin = new Date(res.checkin + 'T00:00:00');
        const daysUntilCheckin = Math.ceil((checkin - today) / (1000 * 60 * 60 * 24));
        const additionalGuestsHtml = res.additionalGuests && res.additionalGuests.length > 0 ? `<p class="text-sm text-outline mt-1 truncate" title="${res.additionalGuests.join(', ')}">+ ${res.additionalGuests.length} hóspede(s)</p>` : '';
        const vehicleHtml = res.vehiclePlate ? `<span class="flex items-center gap-1"><i data-lucide="car" class="w-4 h-4"></i> ${res.vehiclePlate}</span>` : '';
        const guestPhotoHtml = guest.photoUrl ?
            `<div class="relative w-16 h-16 mr-4 flex-shrink-0"><img src="${guest.photoUrl}" alt="${guest.name}" class="w-full h-full rounded-full object-cover transition-transform duration-200 ease-in-out hover:scale-150 hover:z-10"></div>`
            : `<div class="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-4"><i data-lucide="user" class="w-8 h-8 text-gray-400"></i></div>`;

        const platformIcons = {
            airbnb: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current"><title>Airbnb</title><path d="M12 3.25a9.75 9.75 0 018.642 14.508c.848-1.006.92-2.442.168-3.552-1.12-1.656-2.82-2.856-4.896-3.456-1.08-.312-2.22-.432-3.36-.432-1.14 0-2.28.12-3.36.432-2.076.6-3.776 1.8-4.896 3.456-.752 1.11-.68 2.546.168 3.552A9.75 9.75 0 0112 3.25zm0 1.5a8.25 8.25 0 00-7.323 12.252c.24-.288.42-.6.552-.936.324-.804.9-1.524 1.656-2.112 1.2-.936 2.664-1.524 4.224-1.764a10.46 10.46 0 011.788-.096c1.56.24 3.024.828 4.224 1.764.756.588 1.332 1.308 1.656 2.112.132.336.312.648.552.936A8.25 8.25 0 0012 4.75zM12 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0-4.5a3 3 0 100 6 3 3 0 000-6z"/></svg>',
            booking: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current"><title>Booking.com</title><path d="M16.416 0H7.584C3.408 0 0 3.408 0 7.584v8.832C0 20.592 3.408 24 24 16.416V7.584C24 3.408 20.592 0 16.416 0zM9.444 18.48a1.44 1.44 0 01-1.44-1.44V7.2a1.44 1.44 0 012.88 0v9.84a1.44 1.44 0 01-1.44 1.44zm5.1-1.8a4.68 4.68 0 01-3.924-2.064v1.824a1.44 1.44 0 01-2.88 0V7.2a1.44 1.44 0 012.88 0v4.68c0 .9.72 1.62 1.62 1.62s1.62-.72 1.62-1.62V7.2a1.44 1.44 0 112.88 0v4.68c.012 2.592-2.088 4.704-4.68 4.8z"/></svg>',
            direct: '<i data-lucide="phone" class="w-4 h-4"></i>',
            owner: '<i data-lucide="home" class="w-4 h-4"></i>',
            other: '<i data-lucide="globe" class="w-4 h-4"></i>'
        };
        const platformHtml = `<span class="flex items-center gap-1 text-xs font-semibold py-1 px-2 rounded-full" style="background-color: var(--secondary-bg); color: var(--text-color-secondary);">${platformIcons[res.platform || 'other']}</span>`;

        const cardHtml = `
            <div class="card p-4 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer" onclick="window.app.modals.openReservationModal('${res.id}')">
                <div>
                    <div class="flex justify-between items-start">
                        <div class="flex gap-2 flex-wrap">
                            <span class="text-xs font-bold py-1 px-2 rounded-full ${status.color} ${status.textColor}">${status.text}</span>
                            <span class="text-xs font-bold py-1 px-2 rounded-full ${paymentStatus.color} ${paymentStatus.textColor}">${paymentStatus.text}</span>
                            ${platformHtml}
                        </div>
                        <span class="text-lg font-bold py-1 px-3 rounded-full" style="background-color: var(--secondary-bg); color: var(--text-color);">Apto ${res.apartment}</span>
                    </div>
                    <div class="flex items-center mt-3">
                        ${guestPhotoHtml}
                        <div>
                            <h3 class="text-lg font-semibold">${guest.name}</h3>
                        </div>
                    </div>
                    ${additionalGuestsHtml}
                    <div class="flex items-center gap-4 text-on-surface-variant mt-2">
                        <span class="flex items-center gap-1"><i data-lucide="user" class="w-4 h-4"></i> ${res.adults}</span>
                        <span class="flex items-center gap-1"><i data-lucide="baby" class="w-4 h-4"></i> ${res.children}</span>
                        ${res.pet ? '<span class="flex items-center gap-1"><i data-lucide="dog" class="w-4 h-4"></i> Sim</span>' : ''}
                        ${vehicleHtml}
                    </div>
                </div>
                <div class="mt-4 text-sm text-on-surface-variant">
                    <div class="flex justify-between items-center border-t pt-2">
                        <span>Valor:</span>
                        <span class="font-medium text-green-600">${price}</span>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                        <span>Entrada em:</span>
                        <span class="font-medium">${daysUntilCheckin} dia(s)</span>
                    </div>
                    <div class="flex justify-between items-center mt-2 p-2 rounded-md" style="background-color: var(--secondary-bg);"><span class="font-semibold">Entrada:</span><span class="font-bold text-base" style="color: var(--brand-green);">${checkin.toLocaleDateString('pt-BR')} ${res.checkinTime || ''}</span></div>
                </div>
            </div>
        `;
        container.innerHTML += cardHtml;
    });
    window.lucide.createIcons();
}

/**
 * Renderiza a tabela de reservas finalizadas.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Array} guests - Array de todos os hóspedes.
 */
export function renderFinishedReservations(reservations, guests) {
    const container = document.getElementById('finished-reservations-container');
    if (!Array.isArray(reservations)) {
        container.innerHTML = `<p class="text-outline p-4 text-center">Dados de reservas inválidos.</p>`;
        return;
    }

    const finishedOrCanceled = reservations
        .filter(res => res.status === 'finished' || res.status === 'canceled')
        .sort((a, b) => {
            const dateA = a.checkout || '';
            const dateB = b.checkout || '';
            return dateB.localeCompare(dateA);
        });

    if (finishedOrCanceled.length === 0) {
        container.innerHTML = `<p class="text-outline p-4 text-center">Nenhuma reserva finalizada ou cancelada encontrada.</p>`;
        return;
    }

    const tableHtml = `
        <div class="overflow-x-auto p-4">
            <table class="w-full text-lg text-left">
                <thead class="bg-surface-container-high">
                    <tr>
                        <th class="p-4 font-semibold">Hóspede</th>
                        <th class="p-4 font-semibold">Documento</th>
                        <th class="p-4 font-semibold">Apto</th>
                        <th class="p-4 font-semibold">Check-in</th>
                        <th class="p-4 font-semibold">Check-out</th>
                        <th class="p-4 font-semibold">Status</th>
                        <th class="p-4 font-semibold">Veículo</th>
                    </tr>
                </thead>
                <tbody>
                    ${finishedOrCanceled.map(res => {
        const guest = guests && Array.isArray(guests) ? guests.find(g => g.id === res.guestId) : null;
        const guestName = guest ? guest.name : (res.guestName || 'Hóspede desconhecido');
        const guestDoc = guest ? (guest.doc || '-') : '-';
        
        const status = statusConfig[res.status] || { text: 'Finalizada', color: 'bg-slate-500/20', textColor: 'text-slate-300' };
        
        const checkinDate = res.checkin ? new Date(res.checkin + 'T00:00:00') : null;
        const checkoutDate = res.checkout ? new Date(res.checkout + 'T00:00:00') : null;
        
        const checkin = checkinDate ? `${checkinDate.toLocaleDateString('pt-BR')} ${res.checkinTime || ''}`.trim() : '-';
        const checkout = checkoutDate ? `${checkoutDate.toLocaleDateString('pt-BR')} ${res.checkoutTime || ''}`.trim() : '-';
        
        return `
                            <tr class="border-b cursor-pointer finished-row-hover" onclick="window.app.modals.openReservationModal('${res.id}')">
                                <td class="p-4">${guestName}</td>
                                <td class="p-4 text-on-surface-variant">${guestDoc}</td>
                                <td class="p-4 text-on-surface-variant">${res.apartment || '-'}</td>
                                <td class="p-4 text-on-surface-variant">${checkin}</td>
                                <td class="p-4 text-on-surface-variant">${checkout}</td>
                                <td class="p-4"><span class="text-sm font-bold py-1.5 px-3 rounded-full ${status.color} ${status.textColor}">${status.text}</span></td>
                                <td class="p-4 text-on-surface-variant">${res.vehiclePlate || '-'}</td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = tableHtml;
}

/**
 * Renderiza a tabela de hóspedes cadastrados recentemente.
 * @param {Array} guests - Array de todos os hóspedes.
 */
export function renderRecentGuests(guests) {
    const container = document.getElementById('recent-guests-container');
    const recentGuests = guests
        .filter(g => !isNaN(parseInt(g.id)))
        .sort((a, b) => parseInt(b.id) - parseInt(a.id))
        .slice(0, 20);

    if (recentGuests.length === 0) {
        container.innerHTML = `<p class="text-outline p-4 text-center">Nenhum hóspede recente encontrado.</p>`;
        return;
    }

    const tableHtml = `
        <div class="overflow-x-auto p-4">
            <table class="w-full text-sm text-left">
                <thead class="bg-surface-container-high">
                    <tr>
                        <th class="p-4 font-semibold">Nome</th>
                        <th class="p-4 font-semibold">Telefone</th>
                        <th class="p-4 font-semibold">Data de Cadastro</th>
                        <th class="p-4 font-semibold">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentGuests.map(guest => `
                        <tr class="border-b">
                            <td class="p-4">${guest.name}</td>
                            <td class="p-4 text-on-surface-variant">${guest.phone || '-'}</td>
                            <td class="p-4 text-on-surface-variant">${new Date(parseInt(guest.id)).toLocaleDateString('pt-BR')}</td>
                            <td class="p-4">
                                <div class="flex gap-2">
                                    <button class="btn btn-ghost p-2 h-9 w-9" onclick="window.app.modals.openGuestModal('${guest.id}')"><i data-lucide="edit"></i></button>
                                    <button class="btn btn-ghost p-2 h-9 w-9 text-red-500" onclick="window.app.handlers.deleteGuestHandler('${guest.id}')"><i data-lucide="trash-2"></i></button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = tableHtml;
    window.lucide.createIcons();
}

/**
 * Renderiza a visualização financeira.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Array} guests - Array de todos os hóspedes.
 * @param {Array} expenses - Array de todas as despesas.
 * @param {Date} currentDate - A data atual para filtrar o mês.
 */
export function renderFinancialView(reservations, guests, expenses, currentDate) {
    const summaryContainer = document.getElementById('financial-summary-container');
    const reservationsContainer = document.getElementById('financial-reservations-container');
    const expensesContainer = document.getElementById('financial-expenses-container');
    const financialTitle = document.getElementById('financial-title');

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });

    let monthlyPaid = 0;
    let monthlyReceivable = 0;

    const reservationsThisMonth = reservations.filter(res => {
        const checkin = new Date(res.checkin + 'T00:00:00');
        return checkin.getMonth() === currentMonth && checkin.getFullYear() === currentYear;
    });

    reservationsThisMonth.forEach(res => {
        const price = parseFloat(res.price) || 0;
        if (res.paymentStatus === 'paid') {
            monthlyPaid += price;
        } else if (res.paymentStatus === 'pending' || res.paymentStatus === 'partial') {
            monthlyReceivable += price;
        }
    });

    const expensesThisMonth = expenses.filter(exp => {
        const expenseDate = new Date(exp.date + 'T00:00:00');
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });

    const totalExpenses = expensesThisMonth.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const netProfit = monthlyPaid - totalExpenses;

    const statCard = (title, value, icon, color) => `
        <div class="card p-6 flex items-center gap-4">
            <div class="p-3 rounded-full ${color.bg}">
                <i data-lucide="${icon}" class="${color.text}"></i>
            </div>
            <div>
                <p class="text-sm text-outline">${title}</p>
                <p class="text-2xl font-bold">${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
        </div>
    `;

    const reservationsTableHtml = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-surface-container-high">
                    <tr>
                        <th class="p-4 font-semibold">Hóspede</th>
                        <th class="p-4 font-semibold">Apto</th>
                        <th class="p-4 font-semibold">Check-in</th>
                        <th class="p-4 font-semibold">Valor</th>
                        <th class="p-4 font-semibold">Status Pagamento</th>
                    </tr>
                </thead>
                <tbody>
                    ${reservationsThisMonth.sort((a, b) => new Date(a.checkin) - new Date(b.checkin)).map(res => {
        const guest = guests.find(g => g.id === res.guestId);
        if (!guest) return '';
        const paymentStatus = paymentStatusConfig[res.paymentStatus || 'pending'];
        const price = parseFloat(res.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const checkin = new Date(res.checkin + 'T00:00:00').toLocaleDateString('pt-BR');
        return `
                            <tr class="border-b hover:bg-surface-container-high cursor-pointer" onclick="window.app.modals.openReservationModal('${res.id}')">
                                <td class="p-4">${guest.name}</td>
                                <td class="p-4 text-on-surface-variant">${res.apartment}</td>
                                <td class="p-4 text-on-surface-variant">${checkin}</td>
                                <td class="p-4 font-medium">${price}</td>
                                <td class="p-4"><span class="text-xs font-bold py-1 px-2 rounded-full ${paymentStatus.color} ${paymentStatus.textColor}">${paymentStatus.text}</span></td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    const expensesTableHtml = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-surface-container-high">
                    <tr>
                        <th class="p-4 font-semibold">Data</th>
                        <th class="p-4 font-semibold">Descrição</th>
                        <th class="p-4 font-semibold">Categoria</th>
                        <th class="p-4 font-semibold">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${expensesThisMonth.length === 0 ? `<tr><td colspan="4" class="text-center p-4 text-outline">Nenhuma despesa registrada este mês.</td></tr>` : ''}
                    ${expensesThisMonth.sort((a, b) => new Date(a.date) - new Date(b.date)).map(exp => {
        const amount = parseFloat(exp.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const date = new Date(exp.date + 'T00:00:00').toLocaleDateString('pt-BR');
        return `
                            <tr class="border-b hover:bg-surface-container-high cursor-pointer" onclick="window.app.modals.openExpenseModal('${exp.id}')">
                                <td class="p-4 text-on-surface-variant">${date}</td>
                                <td class="p-4">${exp.description}</td>
                                <td class="p-4 text-on-surface-variant">${exp.category}</td>
                                <td class="p-4 font-medium text-red-600">${amount}</td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    financialTitle.textContent = `Resumo Financeiro de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
    summaryContainer.innerHTML = `
        ${statCard('Receita (Pago)', monthlyPaid, 'trending-up', { bg: 'bg-green-100', text: 'text-green-600' })}
        ${statCard('Total de Despesas', totalExpenses, 'trending-down', { bg: 'bg-red-100', text: 'text-red-600' })}
        ${statCard('Lucro Líquido', netProfit, 'dollar-sign', { bg: 'bg-blue-100', text: 'text-blue-600' })}
    `;
    reservationsContainer.innerHTML = reservationsTableHtml;
    expensesContainer.innerHTML = expensesTableHtml;
    window.lucide.createIcons();
}

/**
 * Renderiza os próximos eventos no dashboard.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Array} guests - Array de todos os hóspedes.
 */
export function renderUpcomingEvents(reservations, guests) {
    const container = document.getElementById('upcoming-events-container');
    if (!container) return;

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const toDateString = (date) => date.toISOString().split('T')[0];
    const todayStr = toDateString(today);
    const tomorrowStr = toDateString(tomorrow);

    const checkinsToday = reservations.filter(r => r.checkin === todayStr && r.status !== 'finished' && r.status !== 'canceled');
    const checkinsTomorrow = reservations.filter(r => r.checkin === tomorrowStr && r.status !== 'finished');
    const checkoutsToday = reservations.filter(r => r.checkout === todayStr && r.status !== 'finished');
    const checkoutsTomorrow = reservations.filter(r => r.checkout === tomorrowStr && r.status !== 'finished');

    const eventItem = (res, type) => {
        const time = type === 'checkin' ? res.checkinTime : res.checkoutTime;
        const icon = type === 'checkin' ? 'log-in' : 'log-out';
        let color, text, subtext, onClick;

        if (res.guestId === 'TASK') {
            const status = statusConfig[res.status];
            color = status.textColor;
            text = `Apto ${res.apartment} - ${status.text}`;
            subtext = 'Manutenção / Limpeza';
            onClick = `window.app.modals.openTaskModalForEdit('${res.id}')`;
        } else {
            const guest = guests.find(g => g.id === res.guestId);
            if (!guest) return '';
            color = type === 'checkin' ? 'text-green-500' : 'text-red-500';
            text = guest.name;
            subtext = `Apto ${res.apartment}`;
            onClick = `window.app.modals.openReservationModal('${res.id}')`;
        }

        return `
            <div class="glass-card rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-surface-container-highest transition-all duration-300" onclick="${onClick}">
                <div class="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0">
                    <i data-lucide="${icon}" class="w-5 h-5 ${color}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-on-surface truncate">${text}</h4>
                    <p class="text-xs text-on-surface-variant">${subtext}</p>
                </div>
                <div class="flex flex-col items-end gap-1 flex-shrink-0">
                    <span class="text-xs font-bold text-outline">${time || '--:--'}</span>
                </div>
            </div>
        `;
    };

    const createSection = (title, events, type) => {
        if (events.length === 0) return '';
        return `
            <div class="mb-4">
                <h4 class="text-xs font-bold text-primary uppercase tracking-widest pl-2 mb-3">${title}</h4>
                <div class="space-y-2">
                    ${events.map(res => eventItem(res, type)).join('')}
                </div>
            </div>
        `;
    };

    let html = `
        ${createSection('Check-ins Hoje', checkinsToday, 'checkin')}
        ${createSection('Check-outs Hoje', checkoutsToday, 'checkout')}
        ${createSection('Check-ins Amanhã', checkinsTomorrow, 'checkin')}
        ${createSection('Check-outs Amanhã', checkoutsTomorrow, 'checkout')}
    `;

    if (html.trim() === '') {
        html = '<div class="glass-card rounded-2xl p-8 text-center text-outline text-sm">Nenhum evento próximo.</div>';
    }

    container.innerHTML = html;
    window.lucide.createIcons();
}

/**
 * Renderiza o resumo financeiro no dashboard.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Date} currentDate - A data atual para filtrar o mês.
 */
export function renderDashboardFinancialSummary(reservations, currentDate) {
    const container = document.getElementById('dashboard-financial-summary');
    if (!container) return;

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    let monthlyPaid = 0;
    let monthlyReceivable = 0;
    let totalRevenue = 0;

    const reservationsThisMonth = reservations.filter(res => {
        const checkin = new Date(res.checkin + 'T00:00:00');
        return checkin.getMonth() === currentMonth && checkin.getFullYear() === currentYear;
    });

    reservationsThisMonth.forEach(res => {
        const price = parseFloat(res.price) || 0;
        totalRevenue += price;
        if (res.paymentStatus === 'paid') {
            monthlyPaid += price;
        } else {
            monthlyReceivable += price;
        }
    });

    const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const summaryItem = (label, value, colorClass = 'text-on-surface') => `
        <div>
            <p class="text-[10px] uppercase font-bold text-outline tracking-widest">${label}</p>
            <p class="text-2xl font-black ${colorClass}">${value}</p>
        </div>
    `;

    container.innerHTML = `
        ${summaryItem('Receita Bruta', formatCurrency(totalRevenue))}
        ${summaryItem('Líquido (Pagas)', formatCurrency(monthlyPaid), 'text-secondary')}
        ${summaryItem('À Receber', formatCurrency(monthlyReceivable), 'text-primary')}
    `;
}

/**
 * Obtém as cores do tema CSS atual.
 * @returns {object} - Objeto com as cores do tema.
 */
function getThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
        textColor: styles.getPropertyValue('--text-color').trim(),
        secondaryTextColor: styles.getPropertyValue('--text-color-secondary').trim(),
        borderColor: styles.getPropertyValue('--border-color').trim(),
        brandBlue: styles.getPropertyValue('--brand-blue').trim(),
        secondaryBg: styles.getPropertyValue('--secondary-bg').trim(),
        cardBg: styles.getPropertyValue('--card-bg').trim()
    };
}

let occupancyChart = null;
let apartmentOccupancyChart = null;
let monthlyTrendChart = null;

/**
 * Renderiza o gráfico de taxa de ocupação.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Array} properties - Array de todas as propriedades.
 */
export function renderOccupancyChart(reservations, properties) {
    const ctx = document.getElementById('occupancy-chart').getContext('2d');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const occupiedCount = reservations.filter(res => isReservationActiveOnDate(res, today)).length;
    const availableCount = properties ? properties.length - occupiedCount : 0;

    if (occupancyChart) occupancyChart.destroy();

    const themeColors = getThemeColors();
    occupancyChart = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ocupados', 'Disponíveis'],
            datasets: [{
                data: [occupiedCount, availableCount],
                backgroundColor: [themeColors.brandBlue, themeColors.secondaryBg],
                borderColor: themeColors.cardBg,
                borderWidth: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { color: themeColors.textColor } },
                tooltip: { bodyFont: { size: 14 }, titleFont: { size: 16 } }
            }
        },
    });
}

/**
 * Renderiza o gráfico de ocupação por apartamento.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Array} properties - Array de todas as propriedades.
 */
export function renderApartmentOccupancyChart(reservations, properties) {
    const ctx = document.getElementById('apartment-occupancy-chart').getContext('2d');
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const occupancyByApt = properties.reduce((acc, prop) => ({ ...acc, [prop.name]: 0 }), {});

    reservations.forEach(res => {
        const checkin = new Date(res.checkin + 'T00:00:00');
        const checkout = new Date(res.checkout + 'T00:00:00');
        const loopEndDate = new Date(checkout);
        if (res.guestId === 'TASK') loopEndDate.setDate(loopEndDate.getDate() + 1);

        for (let d = new Date(checkin); d < loopEndDate; d.setDate(d.getDate() + 1)) {
            if (d >= thirtyDaysAgo && d < today && occupancyByApt.hasOwnProperty(res.apartment)) {
                occupancyByApt[res.apartment]++;
            }
        }
    });

    const sortedApartments = Object.entries(occupancyByApt).sort(([, a], [, b]) => b - a);
    const labels = sortedApartments.map(([apt]) => apt);
    const data = sortedApartments.map(([, days]) => days);

    if (apartmentOccupancyChart) apartmentOccupancyChart.destroy();

    const themeColors = getThemeColors();
    apartmentOccupancyChart = new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Dias Ocupados', data: data,
                backgroundColor: themeColors.brandBlue, borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { grid: { color: themeColors.borderColor }, ticks: { color: themeColors.secondaryTextColor } },
                y: { grid: { display: false }, ticks: { color: themeColors.secondaryTextColor } }
            },
            plugins: { legend: { display: false } },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const chartElement = elements[0];
                    const apartmentNumber = labels[chartElement.index];
                    window.app.modals.showApartmentDetails(apartmentNumber, reservations, window.app.state.guests);
                }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            }
        }
    });
}

/**
 * Renderiza o gráfico de tendência mensal de ocupação.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Date} currentDate - A data atual para filtrar o mês.
 * @param {Array} properties - Array de todas as propriedades.
 */
export function renderMonthlyTrendChart(reservations, currentDate, properties) {
    const ctx = document.getElementById('monthly-trend-chart').getContext('2d');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const dailyCounts = Array(daysInMonth).fill(0);
    const weekendData = Array(daysInMonth).fill(0);

    for (let i = 0; i < daysInMonth; i++) {
        const date = new Date(year, month, i + 1);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            weekendData[i] = 100;
        }
    }

    reservations.forEach(res => {
        const checkin = new Date(res.checkin + 'T00:00:00');
        const checkout = new Date(res.checkout + 'T00:00:00');
        const loopEndDate = new Date(checkout);
        if (res.guestId === 'TASK') loopEndDate.setDate(loopEndDate.getDate() + 1);

        for (let d = new Date(checkin); d < loopEndDate; d.setDate(d.getDate() + 1)) {
            if (d.getFullYear() === year && d.getMonth() === month) {
                dailyCounts[d.getDate() - 1]++;
            }
        }
    });

    const occupancyRateData = dailyCounts.map(count =>
        properties.length > 0 ? (count / properties.length) * 100 : 0
    );

    if (monthlyTrendChart) monthlyTrendChart.destroy();


    const themeColors = getThemeColors();
    const isDark = document.documentElement.classList.contains('dark');
    const weekendBgColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    monthlyTrendChart = new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Fim de Semana',
                    data: weekendData,
                    backgroundColor: weekendBgColor,
                    borderColor: 'transparent',
                    barPercentage: 1.0,
                    categoryPercentage: 1.0,
                    order: 1,
                },
                {
                    type: 'line',
                    label: 'Taxa de Ocupação',
                    data: occupancyRateData,
                    borderColor: themeColors.brandBlue,
                    backgroundColor: themeColors.brandBlue.replace(')', ', 0.2)').replace('rgb', 'rgba'),
                    fill: true,
                    cubicInterpolationMode: 'monotone',
                    order: 0,
                    pointBackgroundColor: themeColors.brandBlue,
                    pointHoverRadius: 6,
                    pointHoverBorderWidth: 2,
                    pointHoverBorderColor: 'white',
                }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: {
                    beginAtZero: true, max: 100, grid: { color: themeColors.borderColor },
                    ticks: { color: themeColors.secondaryTextColor, stepSize: 20, callback: value => value + '%' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: themeColors.secondaryTextColor }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: themeColors.cardBg, titleColor: themeColors.textColor, bodyColor: themeColors.textColor,
                    borderColor: themeColors.borderColor, borderWidth: 1,
                    callbacks: {
                        filter: item => item.datasetIndex === 1,
                        title: context => `Dia ${context[0].label} de ${currentDate.toLocaleString('pt-BR', { month: 'short' })}.`,
                        label: context => {
                            const rate = context.parsed.y;
                            const rawCount = dailyCounts[context.dataIndex];
                            return `Ocupação: ${rate.toFixed(1)}% (${rawCount}/${properties.length} aptos)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Mostra o modal com detalhes de um apartamento.
 * @param {string} apartmentNumber - O número do apartamento.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Array} guests - Array de todos os hóspedes.
 */
export function showApartmentDetails(apartmentNumber, reservations, guests) {
    const modal = document.getElementById('apartment-details-modal');
    const title = document.getElementById('apartment-details-title');
    const reservationsContent = document.getElementById('apartment-details-reservations-content');
    const tasksContent = document.getElementById('apartment-details-tasks-content');
    const modalContent = modal.querySelector('.card');

    title.textContent = `Detalhes do Apto ${apartmentNumber}`;

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const apartmentReservations = reservations.filter(event => {
        if (event.apartment !== apartmentNumber) return false;
        if (event.guestId === 'TASK') return false; // Filtra apenas reservas
        const checkin = new Date(event.checkin + 'T00:00:00');
        const checkout = new Date(event.checkout + 'T00:00:00');
        return checkout > thirtyDaysAgo && checkin < today;
    }).sort((a, b) => new Date(b.checkin) - new Date(a.checkin));

    // Renderiza Histórico de Reservas
    if (apartmentReservations.length === 0) {
        reservationsContent.innerHTML = `<p class="text-outline text-center p-4">Nenhuma reserva encontrada para este apartamento nos últimos 30 dias.</p>`;
    } else {
        const tableHtml = `
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-surface-container-high">
                        <tr>
                            <th class="p-4 font-semibold">Evento</th>
                            <th class="p-4 font-semibold">Hóspede</th>
                            <th class="p-4 font-semibold">Início</th>
                            <th class="p-4 font-semibold">Fim</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${apartmentReservations.map(event => {
            const checkin = new Date(event.checkin + 'T00:00:00').toLocaleDateString('pt-BR');
            const checkout = new Date(event.checkout + 'T00:00:00').toLocaleDateString('pt-BR');
            const guest = guests.find(g => g.id === event.guestId);
            const details = guest ? guest.name : 'Hóspede não encontrado';

            return `
                                <tr class="border-b hover:bg-surface-container-high dark:hover:bg-gray-700/50 cursor-pointer" onclick="window.app.modals.openReservationModal('${event.id}')">
                                    <td class="p-4">Reserva</td>
                                    <td class="p-4">${details}</td>
                                    <td class="p-4 text-on-surface-variant">${checkin}</td>
                                    <td class="p-4 text-on-surface-variant">${checkout}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        reservationsContent.innerHTML = tableHtml;
    }

    // Renderiza Histórico de Tarefas
    const apartmentTasks = reservations.filter(event => {
        if (event.apartment !== apartmentNumber) return false;
        if (event.guestId !== 'TASK') return false; // Filtra apenas tarefas
        const checkin = new Date(event.checkin + 'T00:00:00');
        const checkout = new Date(event.checkout + 'T00:00:00');
        return checkout > thirtyDaysAgo && checkin < today;
    }).sort((a, b) => new Date(b.checkin) - new Date(a.checkin));

    if (apartmentTasks.length === 0) {
        tasksContent.innerHTML = `<p class="text-outline text-center p-4">Nenhuma tarefa encontrada para este apartamento nos últimos 30 dias.</p>`;
    } else {
        const tasksTableHtml = `
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-surface-container-high">
                        <tr>
                            <th class="p-4 font-semibold">Tipo</th>
                            <th class="p-4 font-semibold">Data</th>
                            <th class="p-4 font-semibold">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${apartmentTasks.map(task => {
            const date = new Date(task.checkin + 'T00:00:00').toLocaleDateString('pt-BR');
            const status = statusConfig[task.status];
            const eventType = `<span class="font-bold py-1 px-2 rounded-full text-xs ${status.color} ${status.textColor}">${status.text}</span>`;
            const details = task.notes || 'Sem detalhes';
            return `
                                <tr class="border-b hover:bg-surface-container-high dark:hover:bg-gray-700/50 cursor-pointer" onclick="window.app.modals.openTaskModalForEdit('${task.id}')">
                                    <td class="p-4">${eventType}</td>
                                    <td class="p-4 text-on-surface-variant">${date}</td>
                                    <td class="p-4">${details}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        tasksContent.innerHTML = tasksTableHtml;
    }

    // Lógica das abas
    const tabReservations = document.getElementById('tab-reservations');
    const tabTasks = document.getElementById('tab-tasks');

    const switchTab = (activeTab) => {
        if (activeTab === 'tasks') {
            tabReservations.classList.remove('active');
            tabTasks.classList.add('active');
            reservationsContent.classList.add('hidden');
            tasksContent.classList.remove('hidden');
        } else {
            tabTasks.classList.remove('active');
            tabReservations.classList.add('active');
            tasksContent.classList.add('hidden');
            reservationsContent.classList.remove('hidden');
        }
    };

    tabReservations.onclick = () => switchTab('reservations');
    tabTasks.onclick = () => switchTab('tasks');
    switchTab('reservations'); // Inicia na aba de reservas

    modal.classList.remove('hidden');
    setTimeout(() => { modalContent.classList.remove('opacity-0', '-translate-y-4'); }, 10);
    window.lucide.createIcons();
}

/**
 * Renderiza a visualização do calendário para dispositivos móveis.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Array} guests - Array de todos os hóspedes.
 */
function renderMobileCalendarView(reservations, guests) {
    const mobileContainer = document.getElementById('calendar-mobile-container');
    if (!mobileContainer) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeReservations = reservations.filter(res => isReservationActiveOnDate(res, today) && res.status !== 'finished').sort((a, b) => new Date(a.checkout) - new Date(b.checkout));
    const upcomingReservations = reservations.filter(res => new Date(res.checkin + 'T00:00:00') > today && res.status !== 'finished').sort((a, b) => new Date(a.checkin) - new Date(b.checkin));

    const createMobileCard = (res, type) => {
        if (res.guestId === 'TASK') {
            const status = statusConfig[res.status];
            const colorClass = status.borderColor.replace('border-', 'border-l-4 border-');
            return `
                <div class="card p-4 ${colorClass} cursor-pointer" onclick="window.app.handlers.finishTaskHandler('${res.id}')">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h4 class="font-bold text-base">${status.text} - Apto ${res.apartment}</h4>
                            <p class="text-sm text-outline">${res.notes || 'Sem detalhes.'}</p>
                        </div>
                    </div>
                    <div class="text-sm text-on-surface-variant mt-3 border-t pt-2">
                        <p><span class="font-semibold">Início:</span> ${new Date(res.checkin + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        <p><span class="font-semibold">Fim:</span> ${new Date(res.checkout + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
            `;
        }

        const guest = guests.find(g => g.id === res.guestId);
        if (!guest) return '';

        const checkin = new Date(res.checkin + 'T00:00:00').toLocaleDateString('pt-BR');
        const checkout = new Date(res.checkout + 'T00:00:00').toLocaleDateString('pt-BR');
        const colorClass = type === 'active' ? 'border-green-500' : 'border-orange-500';
        const icon = type === 'active' ? 'play-circle' : 'arrow-right-circle';
        const iconColor = type === 'active' ? 'text-green-500' : 'text-orange-500';

        return `
            <div class="card p-4 border-l-4 ${colorClass} cursor-pointer" onclick="window.app.modals.openReservationModal('${res.id}')">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-bold text-base">${guest.name}</h4>
                        <p class="text-sm text-outline">Apto ${res.apartment}</p>
                    </div>
                    <div class="flex items-center gap-2 ${iconColor}">
                        <i data-lucide="${icon}" class="w-5 h-5"></i>
                    </div>
                </div>
                <div class="text-sm text-on-surface-variant mt-3 border-t pt-2">
                    <p><span class="font-semibold">Check-in:</span> ${checkin} ${res.checkinTime || ''}</p>
                    <p><span class="font-semibold">Check-out:</span> ${checkout} ${res.checkoutTime || ''}</p>
                </div>
            </div>
        `;
    };

    let html = '';
    if (activeReservations.length > 0) {
        html += `<h3 class="text-lg font-semibold px-4 pt-2 text-green-600">Reservas Ativas</h3>`;
        html += `<div class="space-y-3 p-2">${activeReservations.map(res => createMobileCard(res, 'active')).join('')}</div>`;
    }
    if (upcomingReservations.length > 0) {
        html += `<h3 class="text-lg font-semibold px-4 pt-4 text-orange-500">Próximas Entradas</h3>`;
        html += `<div class="space-y-3 p-2">${upcomingReservations.map(res => createMobileCard(res, 'upcoming')).join('')}</div>`;
    }

    if (html.trim() === '') {
        html = `<div class="card m-2 p-8 text-center text-outline">Nenhuma reserva ativa ou futura para exibir.</div>`;
    }

    mobileContainer.innerHTML = html;
    window.lucide.createIcons();
}

/**
 * Renderiza o calendário principal (desktop).
 * @param {Date} currentDate - A data atual para exibir o mês.
 * @param {Date} selectedDate - A data selecionada pelo usuário.
 * @param {Date} firstReservationDate - A data da primeira reserva no sistema.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Array} guests - Array de todos os hóspedes.
 */
export function renderCalendar(currentDate, selectedDate, firstReservationDate, reservations, guests, properties) {
    renderMobileCalendarView(reservations, guests);

    const calendarContainer = document.getElementById('calendar-container');
    const currentMonthYearEl = document.getElementById('current-month-year');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    currentMonthYearEl.textContent = `${currentDate.toLocaleString('pt-BR', { month: 'long' })} ${year}`;

    if (firstReservationDate) {
        const firstDayOfMonth = new Date(year, month, 1);
        const firstDayOfFirstReservationMonth = new Date(firstReservationDate.getFullYear(), firstReservationDate.getMonth(), 1);
        if (firstDayOfMonth < firstDayOfFirstReservationMonth) {
            calendarContainer.innerHTML = `<div class="p-8 text-center text-outline">Não há dados de reserva antes de ${firstReservationDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.</div>`;
            return;
        }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    let headerHtml = '<thead><tr class="sticky-top">';
    headerHtml += '<th class="sticky-col-bootstrap">Apto</th>';
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.toLocaleString('pt-BR', { weekday: 'short' }).slice(0, 3).toUpperCase();
        const isToday = isCurrentMonth && today.getDate() === day;
        const dateStringForAttr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const holiday = holidays.find(h => h.month === month + 1 && h.day === day);
        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

        let dayClasses = '';
        let holidayTitle = '';

        if (holiday) {
            holidayTitle = holiday.name;
            if (holiday.type === 'national') {
                dayClasses = 'text-red-500 font-bold';
            }
        }

        headerHtml += `<th class="text-center calendar-header-cell ${isToday ? 'today-header' : ''}" title="${holidayTitle}" data-date-string="${dateStringForAttr}">
            <div class="${dayClasses}">${dayOfWeek}</div>
            <div class="${dayClasses}">${day}</div>
        </th>`;
    }
    headerHtml += '</tr></thead>';

    let bodyHtml = '<tbody>';
    properties.forEach(prop => {
        const apt = prop.name;
        bodyHtml += '<tr>';
        bodyHtml += `<th class="sticky-col-bootstrap">${apt}</th>`;
        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            bodyHtml += `<td class="calendar-day-cell-body" data-date="${dateString}" data-apartment="${apt}"></td>`;
        }
        bodyHtml += '</tr>';
    });
    bodyHtml += '</tbody>';

    const tableClasses = document.documentElement.classList.contains('dark') ? 'table table-dark table-bordered' : 'table table-bordered';
    calendarContainer.innerHTML = `<table class="${tableClasses} calendar-table">${headerHtml}${bodyHtml}</table>`;

    renderReservationBars(currentDate, reservations, guests);

    // Rola para a data de hoje ou para a data selecionada
    const scrollContainer = calendarContainer.closest('.table-responsive');
    if (scrollContainer) {
        const targetHeader = calendarContainer.querySelector('.today-header') || calendarContainer.querySelector('.selected-header');
        if (targetHeader) {
            const scrollContainerRect = scrollContainer.getBoundingClientRect();
            const targetHeaderRect = targetHeader.getBoundingClientRect();
            const scrollLeft = targetHeader.offsetLeft - scrollContainer.offsetLeft - (scrollContainerRect.width / 2) + (targetHeaderRect.width / 2);
            scrollContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }

    // Adiciona evento de clique nos cabeçalhos dos dias
    calendarContainer.querySelectorAll('.calendar-header-cell').forEach(header => {
        header.addEventListener('click', () => header.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }));
    });
}

/**
 * Desenha as barras de reserva no calendário.
 * @param {Date} currentDate - A data atual para filtrar o mês.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Array} guests - Array de todos os hóspedes.
 */
function renderReservationBars(currentDate, reservations, guests) {
    // Limpa as barras existentes
    document.querySelectorAll('.reservation-bar-wrapper').forEach(wrapper => wrapper.remove());
    document.querySelectorAll('.calendar-day-cell-body.is-checkout-day, .calendar-day-cell-body.is-checkin-day').forEach(cell => cell.classList.remove('is-checkout-day', 'is-checkin-day'));

    const container = document.getElementById('calendar-container');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const activeReservations = reservations.filter(res => res.status !== 'finished' && res.status !== 'canceled');

    // Agrupa as reservas por apartamento para facilitar o cálculo de sobreposição
    const reservationsByApt = activeReservations.reduce((acc, res) => {
        if (!acc[res.apartment]) {
            acc[res.apartment] = [];
        }
        acc[res.apartment].push(res);
        return acc;
    }, {});

    for (const apt in reservationsByApt) {
        const aptReservations = reservationsByApt[apt];
        const occupiedLevels = []; // Controla os níveis de sobreposição para cada dia

        aptReservations.forEach(res => {
            const checkin = new Date(res.checkin + 'T00:00:00');
            const checkout = new Date(res.checkout + 'T00:00:00');

            // Ignora reservas fora do mês atual
            if (checkout <= new Date(year, month, 1) || checkin >= new Date(year, month + 1, 1)) return;

            let barText = '';
            if (res.guestId === 'TASK') {
                const statusInfo = statusConfig[res.status];
                const iconMap = {
                    cleaning: 'spray-can',
                    maintenance: 'wrench',
                    blocked: 'lock'
                };
                const icon = iconMap[res.status] || 'alert-circle';
                barText = `<i data-lucide="${icon}" class="w-4 h-4 inline-block mr-1"></i> ${statusInfo.text}`;
            } else {
                const guestName = guests.find(g => g.id === res.guestId)?.name || 'Hóspede';
                barText = guestName.split(' ')[0]; // Pega apenas o primeiro nome
            }

            const startDay = (checkin.getMonth() === month && checkin.getFullYear() === year) ? checkin.getDate() : 1;
            // A barra termina no dia ANTERIOR ao checkout
            const endDayDate = new Date(checkout);
            endDayDate.setDate(endDayDate.getDate() - 1);
            const endDay = (endDayDate.getMonth() === month && endDayDate.getFullYear() === year) ? endDayDate.getDate() : new Date(year, month + 1, 0).getDate();
            let durationInDays = (endDay - startDay) + 1;
            if (res.guestId === 'TASK' && res.checkin === res.checkout) { // Tarefas de 1 dia
                durationInDays = 1;
            }

            const startCell = container.querySelector(`td[data-date='${year}-${String(month + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}'][data-apartment='${apt}']`);
            if (!startCell) return;

            const cellWidth = startCell.offsetWidth;
            const cellHeight = startCell.offsetHeight;

            const barWidth = cellWidth * durationInDays;
            const leftOffset = 0;

            // Aplica as classes para a divisão diagonal
            if (res.guestId !== 'TASK') {
                const checkinDateStr = res.checkin;
                const checkoutDateStr = res.checkout;
                const status = statusConfig[res.status];

                const checkinCell = container.querySelector(`td[data-date='${checkinDateStr}'][data-apartment='${apt}']`);
                if (checkinCell) {
                    checkinCell.classList.add('is-checkin-day');
                    checkinCell.style.setProperty('--checkin-color', status.color.replace('bg-', 'var(--brand-') + ')');
                }

                const checkoutCell = container.querySelector(`td[data-date='${checkoutDateStr}'][data-apartment='${apt}']`);
                if (checkoutCell) {
                    // Encontra a reserva que está saindo para usar a cor correta
                    const checkoutRes = activeReservations.find(r => r.checkout === checkoutDateStr && r.apartment === apt && r.guestId !== 'TASK');
                    if (checkoutRes) {
                        const checkoutStatus = statusConfig[checkoutRes.status];
                        checkoutCell.classList.add('is-checkout-day');
                        checkoutCell.style.setProperty('--checkout-color', checkoutStatus.color.replace('bg-', 'var(--brand-') + ')');
                    }
                }
            }

            // Encontra um nível vertical livre para a barra
            let level = 0;
            while (true) {
                let isLevelOccupied = false;
                for (let day = startDay; day < endDay; day++) {
                    if (occupiedLevels[day] && occupiedLevels[day][level]) {
                        // Exceção: Se a ocupação for de uma reserva que termina no dia em que a atual começa,
                        // ou começa no dia em que a atual termina, não consideramos como sobreposição de nível.
                        const occupyingResId = occupiedLevels[day][level];
                        const occupyingRes = activeReservations.find(r => r.id === occupyingResId);
                        if (occupyingRes && (occupyingRes.checkout === res.checkin || occupyingRes.checkin === res.checkout)) {
                            continue; // Permite que as barras dividam o mesmo nível
                        }
                        isLevelOccupied = true;
                        break;
                    }
                }
                if (!isLevelOccupied) break;
                level++;
            }

            // Marca os dias e o nível como ocupados
            for (let day = startDay; day < endDay; day++) {
                if (!occupiedLevels[day]) occupiedLevels[day] = {};
                // Se for um dia de troca, as barras são divididas verticalmente e não precisam de um novo nível.
                // Apenas marca o nível como ocupado.
                occupiedLevels[day][level] = res.id; // Armazena o ID da reserva para a verificação acima
            }

            // Lógica para adicionar ícone de limpeza no checkout
            if (res.guestId !== 'TASK') {
                const cleaningTaskOnCheckout = activeReservations.find(task =>
                    task.guestId === 'TASK' &&
                    task.status === 'cleaning' &&
                    task.apartment === res.apartment &&
                    task.checkin === res.checkout
                );

                if (cleaningTaskOnCheckout) {
                    const checkoutDateString = res.checkout;
                    const checkoutCell = container.querySelector(`td[data-date='${checkoutDateString}'][data-apartment='${apt}']`);
                    if (checkoutCell) {
                        const cleaningIcon = `<div class="absolute bottom-1 right-1 p-1.5 rounded-full bg-purple-500/80 text-white z-20 pointer-events-all" onclick="window.app.modals.openTaskModalForEdit('${cleaningTaskOnCheckout.id}')" title="Limpeza agendada"><i data-lucide="spray-can" class="w-4 h-4"></i></div>`;
                        // Adiciona a classe de destaque e o ícone
                        checkoutCell.classList.add('has-cleaning');
                        checkoutCell.innerHTML += cleaningIcon;
                    }
                }
            }

            // Adiciona uma verificação de segurança. Se o status for inválido, usa um padrão.
            const status = statusConfig[res.status] || {
                text: 'Inválido',
                color: 'bg-gray-500',
                textColor: 'text-white'
            };
            const wrapper = document.createElement('div');
            wrapper.className = 'reservation-bar-wrapper';
            wrapper.style.position = 'absolute';
            // Calcula a posição relativa ao contêiner do calendário
            const topPosition = startCell.offsetTop;
            const leftPosition = startCell.offsetLeft;
            wrapper.style.top = `${topPosition + (level * (cellHeight + 2)) + 2}px`; // Adiciona espaçamento vertical para sobreposições
            wrapper.style.left = `${leftPosition + leftOffset + 2}px`; // Adiciona offset para check-ins divididos
            wrapper.style.height = `${cellHeight - 4}px`;
            wrapper.style.width = `${barWidth - 4}px`;
            wrapper.style.zIndex = 10 + level;

            const bar = document.createElement('div');
            bar.className = `reservation-bar ${status.color} ${status.textColor}`;

            // Se for uma tarefa de limpeza, não renderiza a barra (pois já colocamos o ícone)
            if (res.guestId === 'TASK' && res.status === 'cleaning') {
                bar.style.display = 'none';
            }

            // Adiciona o "puxador" para redimensionar, apenas para reservas de hóspedes
            if (res.guestId !== 'TASK') {
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'resize-handle';
                resizeHandle.addEventListener('mousedown', (e) => initiateResize(e, res, wrapper));
                bar.appendChild(resizeHandle);
            }
            // Adiciona o texto sem sobrescrever o resize-handle
            bar.insertAdjacentHTML('afterbegin', `<span class="flex items-center justify-center w-full h-full">${barText}</span>`);
            bar.onclick = () => { // Lógica de clique restaurada
                if (res.guestId === 'TASK') {
                    window.app.modals.openTaskModalForEdit(res.id);
                } else {
                    window.app.modals.openReservationModal(res.id);
                }
            };

            wrapper.appendChild(bar);
            container.appendChild(wrapper);
        });
    }
}

/**
 * Lógica para redimensionar reservas arrastando a borda.
 */
let isResizing = false;
let resizeInfo = {};

function initiateResize(e, reservation, barWrapper) {
    e.stopPropagation();
    isResizing = true;

    const startCell = document.querySelector(`td[data-date='${reservation.checkin}'][data-apartment='${reservation.apartment}']`);

    resizeInfo = {
        reservation,
        barWrapper,
        originalWidth: barWrapper.offsetWidth,
        startX: e.pageX,
        cellWidth: startCell.offsetWidth,
        originalCheckout: reservation.checkout
    };

    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
}

function handleResizeMove(e) {
    if (!isResizing) return;

    const dx = e.pageX - resizeInfo.startX;
    const dayChange = Math.round(dx / resizeInfo.cellWidth);

    const newWidth = resizeInfo.originalWidth + (dayChange * resizeInfo.cellWidth);
    resizeInfo.barWrapper.style.width = `${newWidth}px`;

    // Feedback visual na célula de destino
    const originalCheckoutDate = new Date(resizeInfo.originalCheckout + 'T00:00:00');
    originalCheckoutDate.setDate(originalCheckoutDate.getDate() + dayChange);
    const newCheckoutDateStr = originalCheckoutDate.toISOString().split('T')[0];

    document.querySelectorAll('.resize-target-cell').forEach(c => c.classList.remove('resize-target-cell'));
    const targetCell = document.querySelector(`td[data-date='${newCheckoutDateStr}'][data-apartment='${resizeInfo.reservation.apartment}']`);
    if (targetCell) {
        targetCell.classList.add('resize-target-cell');
    }
}

async function handleResizeEnd(e) {
    if (!isResizing) return;

    const dx = e.pageX - resizeInfo.startX;
    const dayChange = Math.round(dx / resizeInfo.cellWidth);

    // Limpa listeners e estilos
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'default';
    document.querySelectorAll('.resize-target-cell').forEach(c => c.classList.remove('resize-target-cell'));
    isResizing = false;

    if (dayChange === 0) {
        // Nenhuma mudança, restaura a largura original
        resizeInfo.barWrapper.style.width = `${resizeInfo.originalWidth}px`;
        return;
    }

    const originalCheckoutDate = new Date(resizeInfo.originalCheckout + 'T00:00:00');
    const newCheckoutDate = new Date(originalCheckoutDate);
    newCheckoutDate.setDate(newCheckoutDate.getDate() + dayChange);
    const newCheckoutDateStr = newCheckoutDate.toISOString().split('T')[0];

    // Validação: a nova data de checkout não pode ser anterior ou igual ao check-in
    if (newCheckoutDateStr <= resizeInfo.reservation.checkin) {
        window.app.modals.showAlert('A data de checkout não pode ser anterior ou igual à data de check-in.');
        window.app.renderCurrentView(); // Re-renderiza para corrigir a barra
        return;
    }

    // Atualiza a reserva
    const updatedReservation = { ...resizeInfo.reservation, checkout: newCheckoutDateStr };

    try {
        await window.app.api.saveReservation(updatedReservation);
        const index = window.app.state.reservations.findIndex(r => r.id === updatedReservation.id);
        if (index > -1) {
            window.app.state.reservations[index] = updatedReservation;
        }
        window.app.modals.showToast('Reserva atualizada com sucesso!', 'Sistema', 'success');
    } catch (error) {
        window.app.modals.showAlert(`Não foi possível atualizar a reserva: ${error.message}`);
    } finally {
        window.app.renderCurrentView(); // Re-renderiza o calendário com os dados finais
    }
}

/**
 * Renderiza os resultados da busca global.
 * @param {object} results - Objeto com os resultados da busca.
 * @param {Array} allGuests - Array de todos os hóspedes para referência.
 */
export function renderGlobalSearchResults(results, allGuests) {
    const container = document.getElementById('search-results-view');
    const searchInput = document.getElementById('search-input');
    let html = '';

    const createSection = (title, items, renderFn) => {
        if (items.length === 0) return '';
        return `
            <div class="card overflow-hidden">
                <div class="p-4 sm:p-6 bg-surface-container-high bg-surface-container/50">
                    <h3 class="text-lg font-semibold">${title} (${items.length})</h3>
                </div>
                <div class="divide-y divide-gray-200 dark:divide-gray-700">
                    ${items.map(renderFn).join('')}
                </div>
            </div>
        `;
    };

    html += createSection('Hóspedes', results.guests, (guest) => `
        <div class="p-4 hover:bg-surface-container-high dark:hover:bg-gray-700/50 cursor-pointer" onclick="window.app.modals.openGuestModal('${guest.id}')">
            <p class="font-semibold">${guest.name}</p>
            <p class="text-sm text-outline">${guest.doc || 'Sem documento'} &bull; ${guest.phone || 'Sem telefone'}</p>
        </div>
    `);

    html += createSection('Reservas', results.reservations, (res) => {
        const guest = allGuests.find(g => g.id === res.guestId) || { name: 'Hóspede não encontrado' };
        if (res.guestId === 'TASK') return ''; // Não mostra tarefas aqui, elas aparecem na seção de tarefas
        const status = statusConfig[res.status] || { text: 'N/A' };
        const checkin = new Date(res.checkin + 'T00:00:00').toLocaleDateString('pt-BR');
        return `
            <div class="p-4 hover:bg-surface-container-high dark:hover:bg-gray-700/50 cursor-pointer" onclick="window.app.modals.openReservationModal('${res.id}')">
                <div class="flex justify-between items-start">
                    <p class="font-semibold">Apto ${res.apartment} - ${guest.name}</p>
                    <span class="text-xs font-bold py-1 px-2 rounded-full ${status.color} ${status.textColor}">${status.text}</span>
                </div>
                <p class="text-sm text-outline">Check-in: ${checkin}</p>
            </div>
        `;
    });

    html += createSection('Funcionários', results.employees, (emp) => `
        <div class="p-4 hover:bg-surface-container-high dark:hover:bg-gray-700/50 cursor-pointer" onclick="window.app.modals.openEmployeeModal('${emp.id}')">
            <p class="font-semibold">${emp.name}</p>
            <p class="text-sm text-outline">${emp.role || 'Sem cargo'}</p>
        </div>
    `);

    const tasks = results.reservations.filter(r => r.guestId === 'TASK');
    html += createSection('Manutenção / Limpeza / Bloqueios', tasks, (task) => {
        const status = statusConfig[task.status] || { text: 'N/A' };
        const start = new Date(task.checkin + 'T00:00:00').toLocaleDateString('pt-BR');
        return `
            <div class="p-4 hover:bg-surface-container-high dark:hover:bg-gray-700/50 cursor-pointer" onclick="window.app.modals.openTaskModalForEdit('${task.id}')">
                <div class="flex justify-between items-start">
                    <p class="font-semibold">Apto ${task.apartment} - ${status.text}</p>
                </div>
                <p class="text-sm text-outline">Início: ${start} &bull; ${task.notes || 'Sem detalhes'}</p>
            </div>
        `;
    });

    if (html.trim() === '') {
        const searchTerm = searchInput.value;
        html = `<div class="card p-8 text-center text-outline">Nenhum resultado encontrado para "<strong>${searchTerm}</strong>".</div>`;
    }

    container.innerHTML = html;
    lucide.createIcons();
}

/**
 * Cria o conteúdo dos menus dropdown do proprietário.
 */
function createOwnerDropdownMenus() {
    const dropdownContent = `
        <a href="#" id="owner-change-password-btn" class="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-surface-variant dark:hover:bg-gray-700/50"><i data-lucide="key-round" class="w-4 h-4"></i>Alterar Senha</a>
        <a href="#" id="owner-theme-toggle-btn" class="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-surface-variant dark:hover:bg-gray-700/50"><i data-lucide="image" class="w-4 h-4"></i><span id="owner-theme-toggle-text">Tema: Claro</span></a>
        <a href="#" id="owner-generate-pdf-btn" class="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-surface-variant dark:hover:bg-gray-700/50"><i data-lucide="file-text" class="w-4 h-4"></i>Gerar Relatório</a>
        <div class="my-1 h-px bg-gray-200 dark:bg-gray-700"></div>
        <a href="#" onclick="event.preventDefault(); localStorage.removeItem('authToken'); window.location.reload();" class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><i data-lucide="log-out" class="w-4 h-4"></i>Encerrar Sessão</a>
    `;
    const desktopDropdown = document.getElementById('owner-profile-dropdown');
    const mobileDropdown = document.getElementById('owner-profile-dropdown-mobile');
    if (desktopDropdown) desktopDropdown.innerHTML = dropdownContent;
    if (mobileDropdown) mobileDropdown.innerHTML = dropdownContent;

    // Aplica o tema atual ao texto do botão
    applyTheme(localStorage.getItem('theme') || 'light');
}

/**
 * Renderiza o portal simplificado para o proprietário.
 * @param {object} appState - O estado da aplicação.
 */
export function renderOwnerPortal(appState) {
    const { properties, currentUser, selectedApartment } = appState;

    if (!properties || properties.length === 0) {
        document.getElementById('owner-portal').innerHTML = '<div class="card p-8 text-center text-on-surface">Nenhum apartamento vinculado a este usuário.</div>';
        return;
    }

    // Inicializa o switcher de apartamentos
    renderOwnerApartmentSwitcher(appState);

    // Usa o apartamento selecionado ou o primeiro disponível
    const currentAptName = selectedApartment || properties[0].name;

    const ownerName = currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1);
    document.getElementById('owner-welcome-message').textContent = `BEM-VINDO, ${ownerName}`;

    // Se tiver apenas um, mostra o texto. Se tiver mais, o switcher (select) cuidará disso
    const aptNameEl = document.getElementById('owner-apartment-name');
    const aptSelectEl = document.getElementById('owner-apartment-select');

    if (properties.length > 1) {
        aptNameEl.classList.add('hidden');
        aptSelectEl.classList.remove('hidden');
        aptSelectEl.value = currentAptName;
    } else {
        aptNameEl.classList.remove('hidden');
        aptSelectEl.classList.add('hidden');
        aptNameEl.textContent = `Apartamento: ${currentAptName}`;
    }

    // Cria os menus dropdown agora que o portal está visível
    createOwnerDropdownMenus();

    // Renderiza os componentes do dashboard filtrados pelo apartamento atual
    renderOwnerDashboard(appState);
    const desktopSearch = document.getElementById('owner-reservation-search-desktop').value;
    const mobileSearch = document.getElementById('owner-reservation-search-mobile').value;
    renderOwnerReservationsList(appState, desktopSearch || mobileSearch);
    renderOwnerMonthlyOccupancyChart(appState);
    renderOwnerRevenueChart(appState);
}

/**
 * Renderiza o seletor de apartamentos para o proprietário.
 */
export function renderOwnerApartmentSwitcher(appState) {
    const { properties } = appState;
    const select = document.getElementById('owner-apartment-select');
    if (!select) return;

    if (properties.length <= 1) {
        select.classList.add('hidden');
        return;
    }

    // Evita recriar as opções se já estiverem lá e forem as mesmas
    const currentOptions = Array.from(select.options).map(opt => opt.value);
    const newOptions = properties.map(p => p.name);

    if (JSON.stringify(currentOptions) !== JSON.stringify(newOptions)) {
        select.innerHTML = properties.map(prop => `<option value="${prop.name}">${prop.name}</option>`).join('');
    }
}

/**
 * Renderiza o dashboard com estatísticas para o proprietário.
 * @param {object} appState - O estado da aplicação.
 */
function renderOwnerDashboard(appState) {
    const { properties, reservations, currentDate, selectedApartment } = appState;
    const container = document.getElementById('owner-dashboard-stats');
    if (!container) return;

    const currentAptName = selectedApartment || (properties[0] ? properties[0].name : null);
    if (!currentAptName) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month, daysInMonth);

    let occupiedDays = 0;
    let monthlyRevenue = 0;

    const confirmedReservations = reservations.filter(res =>
        res.apartment === currentAptName &&
        (res.status === 'confirmed' || res.status === 'checked-in')
    );

    confirmedReservations.forEach(res => {
        const checkin = new Date(res.checkin + 'T00:00:00');
        const checkout = new Date(res.checkout + 'T00:00:00');

        for (let d = new Date(checkin); d < checkout; d.setDate(d.getDate() + 1)) {
            if (d.getFullYear() === year && d.getMonth() === month) {
                occupiedDays++;
            }
        }

        if (checkin.getFullYear() === year && checkin.getMonth() === month) {
            monthlyRevenue += parseFloat(res.price || 0);
        }
    });

    const occupancyRate = ((occupiedDays / daysInMonth) * 100).toFixed(1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextReservation = confirmedReservations
        .filter(res => new Date(res.checkin + 'T00:00:00') >= today)
        .sort((a, b) => new Date(a.checkin) - new Date(b.checkin))[0];

    const nextReservationDate = nextReservation ? new Date(nextReservation.checkin + 'T00:00:00').toLocaleDateString('pt-BR') : 'Nenhuma';

    const statCard = (title, value, icon) => `
        <div class="card p-6">
            <div class="flex items-center gap-4">
                <div class="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50">
                    <i data-lucide="${icon}" class="w-6 h-6 text-blue-500"></i>
                </div>
                <div>
                    <p class="text-sm text-outline">${title}</p>
                    <p class="text-2xl font-bold">${value}</p>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = `
        ${statCard('Ocupação (Mês)', `${occupancyRate}%`, 'pie-chart')}
        ${statCard('Próxima Reserva', nextReservationDate, 'calendar-check')}
        ${statCard('Receita Estimada (Mês)', monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'dollar-sign')}
    `;
    window.lucide.createIcons();
}

let ownerMonthlyOccupancyChart = null;
/**
 * Renderiza o gráfico de ocupação diária para o proprietário.
 * @param {object} appState - O estado da aplicação.
 */
function renderOwnerMonthlyOccupancyChart(appState) {
    const { properties, reservations, currentDate, selectedApartment } = appState;
    const container = document.getElementById('owner-monthly-occupancy-chart-container');
    if (!container) return;

    container.innerHTML = `
        <h3 class="text-lg font-semibold mb-4 text-on-surface">Ocupação Diária (Mês Atual)</h3>
        <div class="relative h-64">
            <canvas id="owner-monthly-occupancy-chart"></canvas>
        </div>
    `;
    const ctx = document.getElementById('owner-monthly-occupancy-chart').getContext('2d');

    const currentAptName = selectedApartment || (properties[0] ? properties[0].name : null);
    if (!currentAptName) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const dailyOccupancy = Array(daysInMonth).fill(0);

    reservations.forEach(res => {
        if (res.apartment !== currentAptName || (res.status !== 'confirmed' && res.status !== 'checked-in')) return;

        const checkin = new Date(res.checkin + 'T00:00:00');
        const checkout = new Date(res.checkout + 'T00:00:00');

        for (let d = new Date(checkin); d < checkout; d.setDate(d.getDate() + 1)) {
            if (d.getFullYear() === year && d.getMonth() === month) {
                dailyOccupancy[d.getDate() - 1] = 1; // 1 para ocupado
            }
        }
    });

    if (ownerMonthlyOccupancyChart) ownerMonthlyOccupancyChart.destroy();

    const themeColors = getThemeColors();
    ownerMonthlyOccupancyChart = new window.Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ocupado',
                data: dailyOccupancy,
                borderColor: themeColors.brandBlue,
                backgroundColor: themeColors.brandBlue.replace(')', ', 0.2)').replace('rgb', 'rgba'),
                fill: true,
                stepped: true,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { display: false, max: 1.2 },
                x: { grid: { display: false }, ticks: { color: themeColors.secondaryTextColor } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

let ownerRevenueChart = null;
/**
 * Renderiza o gráfico de receita por mês para o proprietário.
 * @param {object} appState - O estado da aplicação.
 */
function renderOwnerRevenueChart(appState) {
    const { properties, reservations, selectedApartment } = appState;
    const container = document.getElementById('owner-revenue-chart-container');
    if (!container) return;

    container.innerHTML = `
        <h3 class="text-lg font-semibold mb-4 text-on-surface">Receita por Mês (Últimos 6 meses)</h3>
        <div class="relative h-64">
            <canvas id="owner-revenue-chart"></canvas>
        </div>
    `;
    const ctx = document.getElementById('owner-revenue-chart').getContext('2d');

    const currentAptName = selectedApartment || (properties[0] ? properties[0].name : null);
    if (!currentAptName) return;

    const labels = [];
    const data = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();

        const monthName = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        labels.push(monthName.charAt(0).toUpperCase() + monthName.slice(1));

        let monthlyRevenue = 0;
        reservations.forEach(res => {
            if (res.apartment !== currentAptName || (res.status !== 'confirmed' && res.status !== 'checked-in')) return;
            const checkin = new Date(res.checkin + 'T00:00:00');
            if (checkin.getFullYear() === year && checkin.getMonth() === month) {
                monthlyRevenue += parseFloat(res.price || 0);
            }
        });
        data.push(monthlyRevenue);
    }

    if (ownerRevenueChart) ownerRevenueChart.destroy();

    const themeColors = getThemeColors();
    ownerRevenueChart = new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Receita Estimada',
                data: data,
                backgroundColor: themeColors.brandBlue,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { grid: { color: themeColors.borderColor }, ticks: { color: themeColors.secondaryTextColor } },
                x: { grid: { display: false }, ticks: { color: themeColors.secondaryTextColor } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: (context) => `Receita: ${context.parsed.y.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` }
                }
            }
        }
    });
}

/**
 * Renderiza as listas de reservas futuras e passadas para o proprietário.
 * @param {object} appState - O estado da aplicação.
 */
export function renderOwnerReservationsList(appState, searchTerm = '') {
    const { reservations, guests, properties, selectedApartment } = appState;
    const container = document.getElementById('owner-reservations-list');
    if (!container) return;

    const currentAptName = selectedApartment || (properties[0] ? properties[0].name : null);
    if (!currentAptName) return;

    const normalizedSearchTerm = searchTerm.toLowerCase().trim();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtra pelo apartamento selecionado e ignora tarefas
    let ownerReservations = reservations.filter(r => r.apartment === currentAptName && r.guestId !== 'TASK');

    if (normalizedSearchTerm) {
        ownerReservations = ownerReservations.filter(r => {
            const guestName = r.guestName || '';
            return guestName.toLowerCase().includes(normalizedSearchTerm);
        });
    }
    const futureReservations = ownerReservations
        .filter(r => new Date(r.checkout + 'T00:00:00') >= today && r.status !== 'finished' && r.status !== 'canceled')
        .sort((a, b) => new Date(a.checkin) - new Date(b.checkin));

    const pastReservations = ownerReservations
        .filter(r => new Date(r.checkout + 'T00:00:00') < today || r.status === 'finished' || r.status === 'canceled')
        .sort((a, b) => new Date(b.checkin) - new Date(a.checkin));

    const createCardList = (title, reservationList) => {
        if (reservationList.length === 0) {
            return `
                <div class="card">
                    <div class="p-4 border-b"><h3 class="text-lg font-semibold">${title}</h3></div>
                    <p class="p-4 text-center text-outline">Nenhuma reserva encontrada.</p>
                </div>
            `;
        }

        const cardsHtml = reservationList.map(res => {
            const guestName = res.guestName || 'Hóspede';
            const status = statusConfig[res.status] || { text: 'N/A', color: 'bg-gray-200', textColor: 'text-on-surface' };
            const checkin = new Date(res.checkin + 'T00:00:00').toLocaleDateString('pt-BR');
            const checkout = new Date(res.checkout + 'T00:00:00').toLocaleDateString('pt-BR');
            const canCancel = res.status !== 'finished' && res.status !== 'canceled';

            return `
                <div class="card p-4 cursor-pointer hover:shadow-lg transition-shadow" onclick="window.app.modals.openReservationModal('${res.id}')">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-lg">${guestName}</h4>
                            <span class="text-xs font-bold py-1 px-2 rounded-full ${status.color} ${status.textColor}">${status.text}</span>
                        </div>
                        ${canCancel ? `<button class="btn btn-ghost p-2 h-8 w-8 text-red-500" onclick="event.stopPropagation(); window.app.handlers.cancelReservationHandler('${res.id}')" title="Cancelar Reserva"><i data-lucide="x-circle"></i></button>` : ''}
                    </div>
                    <div class="mt-4 flex justify-between items-center text-sm text-on-surface-variant border-t pt-3">
                        <div>
                            <p class="font-semibold">Check-in</p>
                            <p>${checkin}</p>
                        </div>
                        <i data-lucide="arrow-right" class="w-5 h-5 text-gray-400"></i>
                        <div class="text-right">
                            <p class="font-semibold">Check-out</p>
                            <p>${checkout}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <h3 class="text-xl font-semibold mb-3">${title}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${cardsHtml}</div>
        `;
    };

    try {
        container.innerHTML = `
            <div class="space-y-6">
                ${createCardList('Próximas Reservas', futureReservations)}
                ${createCardList('Histórico de Reservas', pastReservations)}
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error('Erro ao renderizar lista de reservas do proprietário:', error);
        container.innerHTML = '<div class="card p-8 text-center text-on-surface">Ocorreu um erro ao carregar suas reservas.</div>';
    }
}

/**
 * Renderiza o painel de notificações.
 * @param {Array} notifications - Array de notificações.
 */
export function renderNotifications(notifications) {
    const panel = document.getElementById('notifications-panel');
    const badge = document.getElementById('notifications-count-badge');

    if (!panel || !badge) return; // Não faz nada se os elementos não existirem (ex: no portal do owner)

    const unreadCount = notifications.filter(n => !n.read).length;
    badge.textContent = unreadCount;
    badge.classList.toggle('hidden', unreadCount === 0);

    if (notifications.length === 0) {
        panel.innerHTML = '<p class="p-4 text-center text-sm text-outline">Nenhuma notificação.</p>';
        return;
    }

    const notificationsHtml = notifications.map(n => `
        <div 
            class="p-3 border-b border-outline-variant/20 dark:border-outline-variant/20 last:border-b-0 hover:bg-surface-container-high dark:hover:bg-gray-700/50 cursor-pointer ${n.read ? 'opacity-60' : ''}"
            onclick="window.app.handlers.notificationClickHandler('${n.id}')"
        >
            <div class="flex items-start gap-3">
                <div class="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-full mt-1">
                    <i data-lucide="check-square" class="w-4 h-4 text-blue-500"></i>
                </div>
                <div>
                    <p class="text-sm font-semibold">${n.message}</p>
                    <p class="text-xs text-outline">por ${n.user} - ${new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>
        </div>
    `).join('');

    panel.innerHTML = `
        <div class="p-3 border-b bg-surface-container-high bg-surface-container/50">
            <h4 class="font-semibold text-sm">Notificações</h4>
        </div>
        <div class="max-h-96 overflow-y-auto">
            ${notificationsHtml}
        </div>
    `;
    window.lucide.createIcons();
}

/**
 * Renderiza os cards de reservas aguardando aprovação.
 * @param {Array} reservations - Array de todas as reservas.
 * @param {Array} guests - Array de todos os hóspedes.
 */
export function renderPendingApprovals(reservations, guests) {
    const container = document.getElementById('pending-approvals-container');
    if (!container) return;

    if (!Array.isArray(reservations)) {
        container.innerHTML = `<p class="text-outline col-span-full text-center">Erro ao carregar reservas.</p>`;
        return;
    }

    const pending = reservations.filter(res => res.status === 'pending-approval').sort((a, b) => {
        const dateA = new Date(a.checkin || 0);
        const dateB = new Date(b.checkin || 0);
        return dateB - dateA;
    });

    container.innerHTML = '';
    if (pending.length === 0) {
        container.innerHTML = `<p class="text-outline col-span-full text-center p-12">Nenhuma reserva aguardando aprovação.</p>`;
        return;
    }

    pending.forEach(res => {
        try {
            let guest = Array.isArray(guests) ? guests.find(g => g.id === res.guestId) : null;
            
            // Fallback para reservas criadas por proprietários sem perfil formal de hóspede
            if (!guest) {
                guest = {
                    name: res.guestName || 'Hóspede não identificado',
                    phone: 'Não informado'
                };
            }

            const checkinDateStr = res.checkin ? (res.checkin.includes('T') ? res.checkin : res.checkin + 'T12:00:00') : null;
            const checkoutDateStr = res.checkout ? (res.checkout.includes('T') ? res.checkout : res.checkout + 'T11:00:00') : null;
            
            const checkin = checkinDateStr ? new Date(checkinDateStr) : new Date();
            const checkout = checkoutDateStr ? new Date(checkoutDateStr) : new Date();
            const nights = Math.max(1, Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24)));

            const isModification = res.notes && res.notes.includes('Alteração solicitada');

            const cardHtml = `
                <div class="card p-5 flex flex-col justify-between border-l-4 ${isModification ? 'border-amber-500' : 'border-primary'} hover:shadow-xl transition-shadow">
                    <div>
                        <div class="flex justify-between items-start mb-4">
                            <span class="text-[10px] font-black uppercase tracking-widest py-1.5 px-3 rounded-lg ${isModification ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'} border border-current/20">
                                ${isModification ? 'Modificação' : 'Aprovação Pendente'}
                            </span>
                            <div class="bg-surface-container-high px-3 py-1.5 rounded-xl border border-outline-variant/20 shadow-sm">
                                <span class="text-xs font-bold text-outline uppercase tracking-tighter">Apto</span>
                                <span class="text-lg font-black text-on-surface ml-1">${res.apartment}</span>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <h3 class="text-xl font-bold text-on-surface">${guest.name}</h3>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="material-symbols-outlined text-sm text-outline">call</span>
                                <p class="text-xs text-outline font-medium">${guest.phone || 'Sem telefone'}</p>
                            </div>
                        </div>

                        <div class="bg-surface-container/30 rounded-2xl p-4 border border-outline-variant/10">
                            <div class="grid grid-cols-2 gap-4">
                                <div class="relative pl-3 border-l-2 border-secondary/30">
                                    <p class="text-[9px] text-outline uppercase font-black tracking-widest mb-0.5">Check-in</p>
                                    <p class="text-sm font-bold text-on-surface">${checkin.toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div class="relative pl-3 border-l-2 border-amber-500/30">
                                    <p class="text-[9px] text-outline uppercase font-black tracking-widest mb-0.5">Check-out</p>
                                    <p class="text-sm font-bold text-on-surface">${checkout.toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            
                            <div class="mt-4 flex items-center justify-between text-xs pt-3 border-t border-outline-variant/10">
                                <span class="text-outline font-medium">Permanência:</span>
                                <span class="font-bold text-on-surface">${nights} ${nights === 1 ? 'noite' : 'noites'}</span>
                            </div>

                            ${res.price ? `
                                <div class="mt-2 flex items-center justify-between text-xs">
                                    <span class="text-outline font-medium">Valor Estimado:</span>
                                    <span class="font-bold text-brand-green">R$ ${parseFloat(res.price).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                </div>
                            ` : ''}
                        </div>

                        ${res.notes ? `
                            <div class="mt-4 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 italic">
                                <p class="text-[9px] text-outline uppercase font-black tracking-widest mb-1 opacity-50">Observações:</p>
                                <p class="text-xs text-on-surface-variant leading-relaxed">"${res.notes}"</p>
                            </div>
                        ` : ''}
                    </div>

                    <div class="space-y-2 mt-6">
                        <div class="flex gap-2">
                            <button class="flex-1 py-3 bg-error/10 text-error hover:bg-error/20 transition-colors rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-error/20" onclick="window.app.handlers.rejectReservationHandler('${res.id}')">
                                <span class="material-symbols-outlined text-base">close</span> Recusar
                            </button>
                            <button class="flex-1 py-3 bg-brand-green text-white hover:opacity-90 transition-opacity rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-green/20" onclick="window.app.handlers.approveReservationHandler('${res.id}')">
                                <span class="material-symbols-outlined text-base">check</span> Aprovar
                            </button>
                        </div>
                        <button class="w-full py-2.5 text-xs font-bold text-outline hover:text-on-surface transition-colors rounded-xl border border-outline-variant/20 bg-surface-container-high/50" onclick="window.app.modals.openReservationModal('${res.id}')">
                            Visualizar Detalhes
                        </button>
                    </div>
                </div>
            `;
            container.innerHTML += cardHtml;
        } catch (e) {
            console.error('Erro ao renderizar card de aprovação:', e, res);
        }
    });
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Renderiza a lista de conversas para o administrador.
 * @param {Array} users - Array de todos os usuários.
 */
export function renderChatList(users, searchTerm = '') {
    const container = document.getElementById('chat-list-container');
    let ownerUsers = users.filter(u => u.role === 'owner');

    if (searchTerm) {
        const normalizedSearch = searchTerm.toLowerCase();
        ownerUsers = ownerUsers.filter(u => u.username.toLowerCase().includes(normalizedSearch));
    }

    if (ownerUsers.length === 0) {
        container.innerHTML = `<p class="p-4 text-center text-outline">Nenhum proprietário encontrado.</p>`;
        return;
    }

    container.innerHTML = ownerUsers.map(owner => {
        const unreadInfo = window.app.state.unreadMessages.find(u => u.from === owner.username);
        const hasUnread = unreadInfo && unreadInfo.count > 0;
        const initial = owner.username.charAt(0).toUpperCase();

        return `
            <div 
                class="flex items-center justify-between p-3 rounded-lg hover:bg-surface-variant dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                onclick="window.app.modals.closeChatListModal(); window.app.chat.openChatModal('${owner.username}')"
            >
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                        ${initial}
                    </div>
                    <div>
                        <p class="font-semibold">${owner.username}</p>
                        <p class="text-xs text-outline">Apto: ${owner.apartment || 'N/A'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${hasUnread ? `<div class="w-6 h-6 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">${unreadInfo.count}</div>` : ''}
                    <button class="btn btn-ghost p-2 h-8 w-8 text-red-500 opacity-50 hover:opacity-100" onclick="event.stopPropagation(); window.app.chat.clearChatHistory('${owner.username}')" title="Limpar histórico"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        `;
    }).join('');
    window.lucide.createIcons();
}

/**
 * Atualiza o estado de mensagens não lidas para um remetente específico.
 * @param {string} from - O nome de usuário do remetente.
 * @param {number} count - A nova contagem de mensagens não lidas.
 */
export function updateUnreadState(from, count) {
    const unreadMessages = window.app.state.unreadMessages;
    const existingIndex = unreadMessages.findIndex(u => u.from === from);

    if (existingIndex > -1) {
        unreadMessages[existingIndex].count = count;
    } else if (count > 0) {
        unreadMessages.push({ from, count });
    }

    // Remove entradas com contagem zero
    window.app.state.unreadMessages = unreadMessages.filter(u => u.count > 0);

    // Atualiza todos os indicadores visuais
    updateChatUnreadIndicator();
    // Atualiza a lista de chat do admin se o modal estiver aberto
    const chatListModal = document.getElementById('chat-list-modal');
    if (window.app.state.userRole === 'admin' && chatListModal && !chatListModal.classList.contains('hidden')) {
        renderChatList(window.app.state.users);
    }
}

/**
 * Atualiza o indicador visual de chat não lido no ícone principal.
 */
export function updateChatUnreadIndicator() {
    const hasAnyUnread = window.app.state.unreadMessages.length > 0;
    const adminBadge = document.getElementById('admin-chat-unread-badge');
    const ownerBadge = document.getElementById('owner-chat-unread-badge');
    const ownerMobileBadge = document.getElementById('owner-chat-unread-badge-mobile');

    if (adminBadge) adminBadge.classList.toggle('hidden', !hasAnyUnread);
    if (ownerBadge) ownerBadge.classList.toggle('hidden', !hasAnyUnread);
    if (ownerMobileBadge) ownerMobileBadge.classList.toggle('hidden', !hasAnyUnread);
}

/**
 * Lida com uma nova mensagem não lida recebida via WebSocket.
 * @param {object} message - O objeto da mensagem recebida.
 */
export function handleIncomingUnreadMessage(message) {
    const existing = window.app.state.unreadMessages.find(u => u.from === message.from);
    const newCount = (existing ? existing.count : 0) + 1;
    updateUnreadState(message.from, newCount);
    showToast(`Nova mensagem de ${message.from}`, message.from, 'info');
}