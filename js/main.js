import { statusConfig, apartments } from './config.js';
import * as api from './api.js';
import * as ui from './ui.js';
import * as modals from './modals.js';
import { generatePdf } from './pdfGenerator.js';
import * as chat from './chat.js';
import { setupEventListeners } from './events.js';
import { skeleton } from './skeleton.js';
import * as sync from './sync.js';

export const db = new window.Dexie('FlatManagerDB');
db.version(5).stores({
    guests: 'id, name',
    reservations: 'id, guestId, apartment, checkin, price, paymentStatus',
    auto_backups: '++id, timestamp',
    employees: 'id, name, role',
    expenses: '++id, date, category'
});
// Expõe o banco para o módulo de sync (sem import circular)
window._syncDb = db;

// Cria o objeto global 'app' imediatamente para que outros módulos possam acessá-lo.
window.app = {
    state: {
        currentDate: new Date(), // A data que o calendário está visualizando
        selectedDate: new Date(), // A data específica clicada pelo usuário
        reservations: [],
        guests: [],
        employees: [],
        properties: [],
        expenses: [],
        users: [],
        logs: [],
        notifications: [],
        // --- Controle de UI ---
        currentUser: null,
        lastViewBeforeSearch: 'dashboard',
        currentView: 'dashboard',
        firstReservationDate: null,
        logsCurrentPage: 1,
        unreadMessages: [], // { from: 'username', count: number }
        logs: [],
        users: [],
        nextRefreshTimeout: null,
        userRole: null,
    },
    dom: {}, // Será preenchido no DOMContentLoaded
    modals: {},
    ui: {},
    handlers: {},
    // Funções que precisam ser acessíveis por outros módulos
    switchView: null,
    renderCurrentView: null,
    updateNavigationButtons: null,
    main: null,
};

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA PRINCIPAL E MANIPULADORES DE EVENTOS ---

    /**
     * Troca a visualização principal da aplicação.
     * @param {string} viewName - O nome da visualização a ser exibida.
     */
    window.app.switchView = function(viewName) {
        // Limpa o campo de busca apenas se estivermos saindo da visualização de busca
        if (window.app.state.currentView === 'search_results' && viewName !== 'search_results') {
            window.app.dom.searchInput.value = '';
        }

        window.app.state.currentView = viewName;

        Object.keys(window.app.dom.views).forEach(key => {
            window.app.dom.views[key].classList.toggle('hidden', key !== viewName);
            if (window.app.dom.tabs[key]) {
                window.app.dom.tabs[key].classList.toggle('active', key === viewName);
            }
        });

        window.app.dom.calendarControls.style.display = viewName === 'calendar' ? 'flex' : 'none';

        // Atualiza o placeholder da busca
        const placeholders = {
            calendar: 'Buscar hóspede no calendário...',
            default: 'Buscar em tudo...',
        };
        window.app.dom.searchInput.placeholder = placeholders[viewName] || placeholders.default;

        // --- SKELETON LOADERS: Exibe placeholders antes de renderizar ---
        const containerMap = {
            cards:        () => skeleton.showReservationCards('active-reservations-container', 6),
            pending:      () => skeleton.showReservationCards('pending-reservations-container', 6),
            approvals:    () => skeleton.showReservationCards('pending-approvals-container', 6),
            finished:     () => skeleton.showTable('finished-reservations-container', 8, 6),
            guests:       () => skeleton.showGuestList('guests-list-container', 8),
            recent_guests:() => skeleton.showGuestList('recent-guests-container', 6),
            employees:    () => skeleton.showGuestList('employees-list-container', 6),
            properties:   () => skeleton.showPropertyCards('properties-list-container', 10),
            logs:         () => skeleton.showTable('logs-container', 8, 5),
            users:        () => skeleton.showTable('system-users-list-container', 6, 4),
            dashboard:    () => skeleton.showDashboard(),
        };
        if (containerMap[viewName]) {
            containerMap[viewName]();
        }

        // Renderiza o conteúdo real da view (substitui os skeletons automaticamente)
        window.app.renderCurrentView();
    };


    /**
     * Renderiza o conteúdo da visualização atual com base no estado da aplicação.
     */
    window.app.renderCurrentView = function() {
        const { currentView, reservations, guests, employees, expenses, properties, currentDate, selectedDate, firstReservationDate } = window.app.state;
        switch (currentView) {
            case 'dashboard':
                ui.renderUpcomingEvents(reservations, guests);
                ui.renderDashboardFinancialSummary(reservations, currentDate);
                ui.renderOccupancyChart(reservations, properties);
                ui.renderApartmentOccupancyChart(reservations, properties);
                ui.renderMonthlyTrendChart(reservations, currentDate, properties);
                break;
            case 'calendar':
                ui.renderCalendar(currentDate, selectedDate, firstReservationDate, reservations, guests, properties);
                break;
            case 'cards':
                ui.renderActiveReservations(reservations, guests);
                break;
            case 'pending':
                ui.renderPendingReservations(reservations, guests);
                break;
            case 'approvals':
                ui.renderPendingApprovals(reservations, guests);
                break;
            case 'guests':
                ui.renderGuestsList(guests);
                break;
            case 'finished':
                ui.renderFinishedReservations(reservations, guests);
                break;
            case 'recent_guests':
                ui.renderRecentGuests(guests);
                break;
            case 'employees':
                ui.renderEmployeesList(employees);
                break;
            case 'properties':
                ui.renderPropertiesList(properties);
                break;
            case 'users':
                // A lista de usuários é carregada uma vez e mantida no estado
                ui.renderUsersList(window.app.state.users);
                break;
            case 'logs':
                ui.renderActivityLogs({
                    logs: window.app.state.logs,
                    totalCount: window.app.state.logsTotalCount,
                    page: window.app.state.logsCurrentPage,
                    totalPages: window.app.state.logsTotalPages,
                });
                break;
            case 'financial':
                ui.renderFinancialView(reservations, guests, expenses, currentDate);
                break;
        }
    };

    /**
     * Atualiza a data da primeira reserva para controle de navegação no calendário.
     */
    function updateFirstReservationDate() {
        if (window.app.state.reservations.length > 0) {
            const firstReservation = window.app.state.reservations.reduce((earliest, current) => {
                return new Date(current.checkin) < new Date(earliest.checkin) ? current : earliest;
            });
            window.app.state.firstReservationDate = new Date(firstReservation.checkin + 'T00:00:00');
        } else {
            window.app.state.firstReservationDate = null;
        }
    }

    /**
     * Atualiza o estado dos botões de navegação do calendário.
     */
    window.app.updateNavigationButtons = function() {
        if (!window.app.state.firstReservationDate) {
            window.app.dom.prevMonthBtn.disabled = false;
            return;
        }
        const currentMonthStart = new Date(window.app.state.currentDate.getFullYear(), window.app.state.currentDate.getMonth(), 1);
        const firstReservationMonthStart = new Date(window.app.state.firstReservationDate.getFullYear(), window.app.state.firstReservationDate.getMonth(), 1);
        window.app.dom.prevMonthBtn.disabled = currentMonthStart <= firstReservationMonthStart;
    };

    /**
     * Agenda a próxima atualização automática com base no próximo evento de check-in/check-out.
     */
    function scheduleNextAutoRefresh() {
        if (window.app.state.nextRefreshTimeout) {
            clearTimeout(window.app.state.nextRefreshTimeout);
            window.app.state.nextRefreshTimeout = null;
        }

        const now = new Date();
        let nextEventTime = null;

        window.app.state.reservations.forEach(res => {
            if (res.status === 'finished' || res.status === 'canceled') return;

            if (res.checkinTime) {
                const checkinDateTime = new Date(`${res.checkin}T${res.checkinTime}`);
                if (checkinDateTime > now && (!nextEventTime || checkinDateTime < nextEventTime)) {
                    nextEventTime = checkinDateTime;
                }
            }
            if (res.checkoutTime) {
                const checkoutDateTime = new Date(`${res.checkout}T${res.checkoutTime}`);
                if (checkoutDateTime > now && (!nextEventTime || checkoutDateTime < nextEventTime)) {
                    nextEventTime = checkoutDateTime;
                }
            }
        });

        if (nextEventTime) {
            const timeUntilNextEvent = nextEventTime.getTime() - now.getTime();
            console.log(`Próxima atualização automática agendada para: ${nextEventTime.toLocaleString()} (em ${Math.round(timeUntilNextEvent / 1000 / 60)} minutos)`);
            window.app.state.nextRefreshTimeout = setTimeout(() => initialize(true), timeUntilNextEvent + 1000);
        }
    }

    /**
     * Atualiza automaticamente o status das reservas.
     * @returns {Promise<boolean>} - Retorna true se algum status foi atualizado.
     */
    async function updateReservationStatuses() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const reservationsToUpdate = window.app.state.reservations.map(res => {
            const checkinDate = new Date(res.checkin + 'T00:00:00');
            const checkoutDate = new Date(res.checkout + 'T00:00:00');
            const daysUntilCheckin = Math.ceil((checkinDate - today) / (1000 * 60 * 60 * 24));
            let newStatus = res.status;

            if (res.status === 'pending' && daysUntilCheckin >= 0 && daysUntilCheckin <= 7) {
                newStatus = 'confirmed';
            } else if (res.status === 'confirmed' && checkinDate <= today && checkoutDate >= today) {
                newStatus = 'checked-in';
            } else if ((res.status === 'checked-in' || res.status === 'confirmed') && checkoutDate < today) {
                newStatus = 'finished';
            }

            if (newStatus !== res.status) {
                return { ...res, status: newStatus };
            }
            return null;
        }).filter(Boolean);

        if (reservationsToUpdate.length > 0) {
            try {
                console.log(`Atualizando status de ${reservationsToUpdate.length} reserva(s) no servidor.`);
                await Promise.all(reservationsToUpdate.map(res => api.saveReservation(res)));
                // Atualiza o estado local em vez de recarregar tudo
                reservationsToUpdate.forEach(updatedRes => {
                    const index = window.app.state.reservations.findIndex(r => r.id === updatedRes.id);
                    if (index > -1) {
                        window.app.state.reservations[index].status = updatedRes.status;
                    }
                });
                return true;
            } catch (error) {
                console.error("Falha ao atualizar status das reservas no servidor:", error);
                return false;
            }
        }
        return false;
    }

    // --- Manipuladores de Ações (Handlers) ---

    window.app.handlers.saveReservationHandler = async (e) => {
        e.preventDefault();
        const form = e.target;
        const checkin = new Date(form.elements['checkin-date'].value);
        const checkout = new Date(form.elements['checkout-date'].value);

        if (checkout <= checkin) {
            modals.showAlert('A data de check-out deve ser posterior à data de check-in.');
            return;
        }
        if (!form.elements['guest-select'].value) {
            modals.showAlert('Por favor, selecione um hóspede.');
            return;
        }

        const additionalGuestNames = Array.from(document.querySelectorAll('.additional-guest-name')).map(input => input.value).filter(name => name.trim() !== '');

        const reservationData = {
            id: form.elements['reservation-id'].value || Date.now().toString(),
            guestId: form.elements['guest-select'].value,
            apartment: form.elements['apartment-select'].value,
            checkin: form.elements['checkin-date'].value,
            checkout: form.elements['checkout-date'].value,
            checkinTime: form.elements['checkin-time'].value,
            checkoutTime: form.elements['checkout-time'].value,
            status: form.elements['status-select'].value,
            adults: parseInt(form.elements['adults-count'].value, 10),
            children: parseInt(form.elements['children-count'].value, 10),
            pet: form.elements['pet-included'].checked,
            additionalGuests: additionalGuestNames,
            vehicleModel: form.elements['vehicle-model'].value,
            vehicleType: form.elements['vehicle-type'].value,
            vehiclePlate: form.elements['vehicle-plate'].value,
            price: parseFloat(form.elements['reservation-price'].value) || 0,
            paymentStatus: form.elements['payment-status-select'].value,
            vehicleColor: form.elements['vehicle-color'].value,
            notes: form.elements['reservation-notes'].value,
            platform: form.elements['platform-select'].value
        };

        try {
            const savedReservation = await api.saveReservation(reservationData);
            const existingIndex = window.app.state.reservations.findIndex(r => r.id === savedReservation.data.id);
            if (existingIndex > -1) {
                window.app.state.reservations[existingIndex] = savedReservation.data;
            } else {
                window.app.state.reservations.push(savedReservation.data);
            }
            updateFirstReservationDate();
            window.app.updateNavigationButtons();
            modals.closeReservationModal();
            window.app.renderCurrentView(); // Força a re-renderização da view atual com os novos dados
        } catch (error) {
            console.error('Erro ao salvar reserva:', error);
            modals.showAlert(`Não foi possível salvar a reserva: ${error.message}`);
        }
    };

    window.app.handlers.deleteReservationHandler = (id) => {
        modals.showConfirm('Tem certeza que deseja excluir esta reserva? Esta ação não pode ser desfeita.', async () => {
            try {
                await api.deleteReservation(id);
                window.app.state.reservations = window.app.state.reservations.filter(r => r.id !== id);
                modals.closeReservationModal();
                window.app.renderCurrentView();
                updateFirstReservationDate();
                window.app.updateNavigationButtons();
                modals.showAlert('Reserva excluída com sucesso.');
            } catch (error) {
                console.error('Erro ao excluir reserva:', error);
                modals.showAlert(`Não foi possível excluir a reserva: ${error.message}`);
            }
        });
    };

    window.app.handlers.cancelReservationHandler = (id) => {
        const reservation = window.app.state.reservations.find(r => r.id === id);
        if (!reservation) return;

        modals.showConfirm('Tem certeza que deseja cancelar esta reserva? Ela será movida para o histórico.', async () => {
            const updatedReservation = { ...reservation, status: 'canceled' };
            try {
                await api.saveReservation(updatedReservation);
                const index = window.app.state.reservations.findIndex(r => r.id === id);
                if (index > -1) {
                    window.app.state.reservations[index] = updatedReservation;
                }
                modals.closeReservationModal();
                window.app.renderCurrentView();
                modals.showAlert('Reserva cancelada com sucesso.');
            } catch (error) {
                modals.showAlert(`Não foi possível cancelar a reserva: ${error.message}`);
            }
        });
    };

    window.app.handlers.approveReservationHandler = async (id) => {
        const reservation = window.app.state.reservations.find(r => r.id === id);
        if (!reservation) return;

        modals.showPrompt({
            title: 'Aprovar e Definir Preço',
            message: 'Por favor, defina o valor total para esta reserva.',
            placeholder: 'Ex: 450.50',
            inputType: 'number',
            async onConfirm(price) {
                if (!price || parseFloat(price) < 0) {
                    modals.showAlert('Por favor, insira um valor válido para a reserva.');
                    return;
                }

                const updatedReservation = { ...reservation, status: 'confirmed', price: parseFloat(price) };
                try {
                    await api.saveReservation(updatedReservation);
                    const index = window.app.state.reservations.findIndex(r => r.id === id);
                    if (index > -1) window.app.state.reservations[index] = updatedReservation;
                    
                    window.app.renderCurrentView();
                    ui.updateApprovalsBadge();
                    modals.showAlert('Reserva aprovada e confirmada com sucesso!');
                } catch (error) {
                    modals.showAlert(`Não foi possível aprovar a reserva: ${error.message}`);
                }
            }
        });
    };

    window.app.handlers.rejectReservationHandler = (id) => {
        const reservation = window.app.state.reservations.find(r => r.id === id);
        if (!reservation) return;

        modals.showPrompt({
            title: 'Recusar Reserva',
            message: 'Por favor, informe o motivo da recusa. O proprietário será notificado.',
            placeholder: 'Ex: Data indisponível, conflito de agenda...',
            async onConfirm(reason) {
                const updatedReservation = { ...reservation, status: 'canceled', notes: `Recusado: ${reason || 'Motivo não informado.'}` };
                try {
                    await api.saveReservation(updatedReservation);
                    const index = window.app.state.reservations.findIndex(r => r.id === id);
                    if (index > -1) window.app.state.reservations[index] = updatedReservation;
                    
                    window.app.renderCurrentView(); // Atualiza a view de aprovações
                    ui.updateApprovalsBadge();
                    modals.showAlert('A solicitação de reserva foi recusada.');
                } catch (error) {
                    modals.showAlert(`Não foi possível recusar a reserva: ${error.message}`);
                }
            }
        });
    };

    window.app.handlers.notificationClickHandler = (notificationId) => {
        const notification = window.app.state.notifications.find(n => n.id === notificationId);
        if (notification && notification.targetView) {
            window.app.switchView(notification.targetView);
        }
        // Fecha o painel de notificações
        document.getElementById('notifications-panel').classList.add('hidden');
    };

    window.app.handlers.saveGuestHandler = async (e) => {
        e.preventDefault();
        const form = e.target;
        const guestData = {
            id: form.elements['guest-id'].value || null,
            name: form.elements['guest-name'].value,
            phone: form.elements['guest-phone'].value,
            email: form.elements['guest-email'].value,
            doc: form.elements['guest-doc'].value,
            notes: form.elements['guest-notes'].value,
            photoUrl: document.getElementById('guest-photo-preview').src.startsWith('data:image') ? document.getElementById('guest-photo-preview').src : null
        };

        try {
            const savedGuest = await api.saveGuest(guestData);
            const existingIndex = window.app.state.guests.findIndex(g => g.id === savedGuest.data.id);
            if (existingIndex > -1) {
                window.app.state.guests[existingIndex] = savedGuest.data;
            } else {
                window.app.state.guests.push(savedGuest.data);
            }
            modals.closeGuestModal();

            // Sincroniza o dropdown de hóspedes no modal de reserva se estiver aberto
            modals.populateGuestSelect(window.app.state.guests, savedGuest.data.id);

            // Se houver um callback (definido ao abrir o modal de hóspede a partir de outro modal), execute-o.
            if (typeof window.app.state.onGuestSaveCallback === 'function') {
                window.app.state.onGuestSaveCallback(savedGuest.data);
                window.app.state.onGuestSaveCallback = null; // Limpa o callback
            }
            // Força a re-renderização da view atual para refletir as mudanças do hóspede em todos os lugares.
            window.app.renderCurrentView();
        } catch (error) {
            console.error('Erro ao salvar hóspede:', error);
            modals.showAlert(`Não foi possível salvar o hóspede: ${error.message}`);
        }
    };

    window.app.handlers.deleteGuestHandler = (id) => {
        modals.showConfirm('Tem certeza que deseja excluir este hóspede? Todas as suas reservas também serão removidas.', async () => {
            try {
                await api.deleteGuest(id);
                window.app.state.guests = window.app.state.guests.filter(g => g.id !== id);
                window.app.state.reservations = window.app.state.reservations.filter(r => r.guestId !== id);
                initialize(true);
                modals.showAlert('Hóspede excluído com sucesso.');
            } catch (error) {
                modals.showAlert(`Não foi possível excluir o hóspede: ${error.message}`);
            }
        });
    };

    window.app.handlers.saveEmployeeHandler = async (e) => {
        e.preventDefault();
        const form = e.target;
        const employeeData = {
            id: form.elements['employee-id'].value || Date.now().toString(),
            name: form.elements['employee-name'].value,
            role: form.elements['employee-role'].value,
            phone: form.elements['employee-phone'].value,
            doc: form.elements['employee-doc'].value,
        };

        try {
            const savedEmployee = await api.saveEmployee(employeeData);
            const existingIndex = window.app.state.employees.findIndex(emp => emp.id === savedEmployee.data.id);
            if (existingIndex > -1) {
                window.app.state.employees[existingIndex] = savedEmployee.data;
            } else {
                window.app.state.employees.push(savedEmployee.data);
            }
            modals.closeEmployeeModal();
            window.app.renderCurrentView();
        } catch (error) {
            console.error('Erro ao salvar funcionário:', error);
            modals.showAlert(`Não foi possível salvar o funcionário: ${error.message}`);
        }
    };

    window.app.handlers.deleteEmployeeHandler = (id) => {
        modals.showConfirm('Tem certeza que deseja excluir este funcionário?', async () => {
            try {
                await api.deleteEmployee(id);
                window.app.state.employees = window.app.state.employees.filter(emp => emp.id !== id);
                window.app.renderCurrentView();
                modals.showAlert('Funcionário excluído com sucesso.');
            } catch (error) {
                modals.showAlert(`Não foi possível excluir o funcionário: ${error.message}`);
            }
        });
    };

    window.app.handlers.saveUserHandler = async (e) => {
        e.preventDefault();
        const form = e.target;
        const userId = form.elements['user-id'].value;
        const userData = {
            username: form.elements['user-username'].value,
            password: form.elements['user-password'].value,
            role: form.elements['user-role-select'].value,
            apartment: form.elements['user-apartment-select'].value
        };

        if (userId) {
            // Edição
            const updateData = { role: userData.role, apartment: userData.apartment };
            if (userData.password) {
                updateData.password = userData.password;
            }
            try {
                await api.updateUser(userId, updateData);
                const userIndex = window.app.state.users.findIndex(u => u._id === userId);
                if (userIndex > -1) {
                    window.app.state.users[userIndex].apartment = userData.apartment;
                    window.app.state.users[userIndex].role = userData.role;
                }
                modals.closeUserModal();
                window.app.renderCurrentView();
                modals.showAlert('Usuário atualizado com sucesso!');
            } catch (error) {
                modals.showAlert(`Não foi possível atualizar o usuário: ${error.message}`);
            }
        } else {
            // Criação
            try {
                const savedUser = await api.saveUser(userData);
                window.app.state.users.push(savedUser.data);
                modals.closeUserModal();
                window.app.renderCurrentView();
                modals.showAlert('Usuário criado com sucesso!');
            } catch (error) {
                modals.showAlert(`Não foi possível criar o usuário: ${error.message}`);
            }
        }
    };

    window.app.handlers.deleteUserHandler = (id) => {
        const user = window.app.state.users.find(u => u._id === id);
        if (!user || user.username === 'admin') {
            modals.showAlert('O usuário admin não pode ser excluído.');
            return;
        }

        modals.showConfirm(`Tem certeza que deseja excluir o usuário "${user.username}"?`, async () => {
            try {
                await api.deleteUser(id);
                window.app.state.users = window.app.state.users.filter(u => u._id !== id);
                window.app.renderCurrentView();
                modals.showAlert('Usuário excluído com sucesso.');
            } catch (error) {
                modals.showAlert(`Não foi possível excluir o usuário: ${error.message}`);
            }
        });
    };

    window.app.handlers.savePropertyHandler = async (e) => {
        e.preventDefault();
        const form = e.target;
        let name = form.elements['property-name'].value;

        if (!name) {
            modals.showAlert('O nome da propriedade é obrigatório.');
            return;
        }

        try {
            const response = await api.saveProperty({ name });
            const newProperty = response.data;
            
            // Adiciona ao estado local
            window.app.state.properties.push(newProperty);
            window.app.state.properties.sort((a, b) => a.name.localeCompare(b.name));

            modals.showAlert('Propriedade adicionada com sucesso!');
            form.reset();

            // Atualiza a visualização se estiver na tela de propriedades
            if (window.app.state.currentView === 'properties') {
                window.app.renderCurrentView();
            }

            // IMPORTANTE: Atualiza o dropdown de apartamentos em modais que possam estar abertos ou para futuros usos
            modals.populateApartmentSelect(window.app.state.properties);

        } catch (error) {
            console.error('Erro ao salvar propriedade:', error);
            modals.showAlert(`Não foi possível adicionar a propriedade: ${error.message}`);
        }
    };

    window.app.handlers.changePasswordHandler = async (e) => {
        e.preventDefault();
        const form = e.target;
        const currentPassword = form.elements['current-password'].value;
        const newPassword = form.elements['new-password'].value;
        const confirmPassword = form.elements['confirm-password'].value;

        if (newPassword !== confirmPassword) {
            modals.showAlert('A nova senha e a confirmação não correspondem.');
            return;
        }
        if (newPassword.length < 4) {
            modals.showAlert('A nova senha deve ter pelo menos 4 caracteres.');
            return;
        }

        try {
            await api.changePassword(currentPassword, newPassword);
            modals.closeChangePasswordModal();
            modals.showAlert('Senha alterada com sucesso!');
        } catch (error) {
            modals.showAlert(`Não foi possível alterar a senha: ${error.message}`);
        }
    };

    window.app.handlers.filterLogsHandler = async () => {
        window.app.state.logsCurrentPage = 1; // Reseta para a primeira página ao filtrar
        const filters = {
            username: document.getElementById('log-filter-username').value,
            startDate: document.getElementById('log-filter-start-date').value,
            endDate: document.getElementById('log-filter-end-date').value,
            page: window.app.state.logsCurrentPage
        };
        try {
            const logData = await api.getActivityLogs(filters);
            window.app.state.logs = logData.logs;
            window.app.state.logsTotalCount = logData.totalCount;
            window.app.state.logsTotalPages = logData.totalPages;
            window.app.renderCurrentView();
        } catch (error) {
            console.error('Erro ao filtrar logs:', error);
            modals.showAlert('Não foi possível carregar os logs filtrados.');
        }
    };

    window.app.handlers.changeLogPageHandler = async (newPage) => {
        if (newPage < 1 || newPage > window.app.state.logsTotalPages) return;
        
        window.app.state.logsCurrentPage = newPage;
        const filters = {
            username: document.getElementById('log-filter-username').value,
            startDate: document.getElementById('log-filter-start-date').value,
            endDate: document.getElementById('log-filter-end-date').value,
            page: newPage
        };
        const logData = await api.getActivityLogs(filters);
        window.app.state.logs = logData.logs;
        window.app.renderCurrentView();
    };

    window.app.handlers.savePropertyHandler = async (e) => {
        e.preventDefault();
        const form = e.target;
        const name = form.elements['new-property-name'].value.trim();
        if (!name) return;

        try {
            const savedProperty = await api.saveProperty({ name });
            window.app.state.properties.push(savedProperty.data);
            window.app.state.properties.sort((a, b) => a.name.localeCompare(b.name));
            form.reset();
            window.app.renderCurrentView();
        } catch (error) {
            modals.showAlert(`Não foi possível adicionar a propriedade: ${error.message}`);
        }
    };

    window.app.handlers.deletePropertyHandler = (id) => {
        modals.showConfirm('Tem certeza que deseja excluir esta propriedade?', async () => {
            try {
                await api.deleteProperty(id);
                window.app.state.properties = window.app.state.properties.filter(p => p._id !== id);
                window.app.renderCurrentView();
            } catch (error) {
                modals.showAlert(`Não foi possível excluir a propriedade: ${error.message}`);
            }
        });
    };

    window.app.handlers.updatePropertyHandler = async (e) => {
        e.preventDefault();
        const form = e.target;
        const id = form.elements['property-edit-id'].value;
        const propertyData = {
            name: form.elements['property-edit-name'].value,
            capacity: parseInt(form.elements['property-edit-capacity'].value, 10) || null,
            amenities: Array.from(form.querySelectorAll('#amenities-toggle-container .amenity-toggle'))
                 .reduce((acc, button) => {
                     acc[button.dataset.amenity] = button.classList.contains('active');
                     return acc;
                 }, {})
        };

        const updatedProperty = await api.updateProperty(id, propertyData);
        const index = window.app.state.properties.findIndex(p => p._id === id);
        if (index > -1) window.app.state.properties[index] = updatedProperty.data;
        modals.closePropertyEditModal();
        window.app.renderCurrentView();
    };

    window.app.handlers.saveTaskHandler = async (e) => {
        e.preventDefault();
        const form = e.target;
        const startDate = new Date(form.elements['task-start-date'].value);
        const endDate = new Date(form.elements['task-end-date'].value);

        if (endDate < startDate) {
            modals.showAlert('A data de fim deve ser igual ou posterior à data de início.');
            return;
        }

        const type = form.elements['task-type'].value;
        let notes = '';
        if (type === 'maintenance') {
            const serviceType = document.getElementById('task-service-type').value;
            const company = document.getElementById('task-company').value;
            notes = `Serviço: ${serviceType || 'Não especificado'} | Empresa: ${company || 'Não especificada'}`;
    } else if (type === 'cleaning') {
        const provider = document.getElementById('task-provider').value;
        if (provider) notes = `Prestador: ${provider}`;
    }
    else if (type === 'blocked') {
            notes = document.getElementById('task-reason').value || 'Motivo não especificado';
        }

        const taskData = {
            id: form.elements['task-id'].value || `task_${Date.now()}`,
            guestId: 'TASK',
            apartment: form.elements['task-apartment-select'].value,
            checkin: form.elements['task-start-date'].value,
            checkout: form.elements['task-end-date'].value,
            checkinTime: form.elements['task-start-time'].value,
            checkoutTime: form.elements['task-end-time'].value,
            status: type,
            notes: notes,
            adults: 0, children: 0, pet: false, price: 0, paymentStatus: 'n/a'
        };

        try {
            const savedTask = await api.saveTask(taskData);
            const existingIndex = window.app.state.reservations.findIndex(r => r.id === savedTask.data.id);
            if (existingIndex > -1) {
                window.app.state.reservations[existingIndex] = savedTask.data;
            } else {
                window.app.state.reservations.push(savedTask.data);
            }
            modals.closeTaskModal();
            window.app.switchView(window.app.state.currentView);
        } catch (error) {
            console.error('Erro ao salvar tarefa:', error);
            modals.showAlert(`Não foi possível salvar a tarefa: ${error.message}`);
        }
    };

    window.app.handlers.finishTaskHandler = (id) => {
        const task = window.app.state.reservations.find(r => r.id === id);
        if (!task) return;

        modals.showConfirm(`Deseja finalizar a tarefa de "${statusConfig[task.status].text}" para o Apto ${task.apartment}?`, async () => {
            const updatedTask = { ...task, status: 'finished' };
            try {
                await api.saveTask(updatedTask);
                const index = window.app.state.reservations.findIndex(r => r.id === id);
                if (index > -1) {
                    window.app.state.reservations[index] = updatedTask;
                }
                window.app.switchView(window.app.state.currentView);
                modals.showAlert('Tarefa finalizada com sucesso.');
            } catch (error) {
                console.error('Erro ao finalizar tarefa:', error);
                modals.showAlert(`Não foi possível finalizar a tarefa: ${error.message}`);
            }
        });
    };

    window.app.handlers.saveExpenseHandler = async (e) => {
        e.preventDefault();
        const form = e.target;
        const expenseData = {
            id: form.elements['expense-id'].value || null,
            description: form.elements['expense-description'].value,
            category: form.elements['expense-category'].value,
            amount: parseFloat(form.elements['expense-amount'].value),
            date: form.elements['expense-date'].value
        };

        try {
            const savedExpense = await api.saveExpense(expenseData);
            const existingIndex = window.app.state.expenses.findIndex(exp => exp.id === savedExpense.data.id);
            if (existingIndex > -1) {
                window.app.state.expenses[existingIndex] = savedExpense.data;
            } else {
                window.app.state.expenses.push(savedExpense.data);
            }
            modals.closeExpenseModal();
            if (window.app.state.currentView === 'financial') window.app.renderCurrentView();
        } catch (error) {
            console.error('Erro ao salvar despesa:', error);
            modals.showAlert(`Não foi possível salvar a despesa: ${error.message}`);
        }
    };

    window.app.handlers.deleteExpenseHandler = () => {
        const id = document.getElementById('expense-id').value;
        if (!id) return;

        modals.showConfirm('Tem certeza que deseja excluir esta despesa?', async () => {
            try {
                await api.deleteExpense(id);
                window.app.state.expenses = window.app.state.expenses.filter(exp => exp.id !== id);
                modals.closeExpenseModal();
                window.app.renderCurrentView();
                modals.showAlert('Despesa excluída com sucesso.');
            } catch (error) {
                modals.showAlert(`Não foi possível excluir a despesa: ${error.message}`);
            }
        });
    };

    window.app.handlers.importDataHandler = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.guests && data.reservations) {
                    modals.showConfirm('Isso irá substituir TODOS os dados no servidor pelo conteúdo deste backup. Esta ação não pode ser desfeita. Deseja continuar?', async () => {
                        try {
                            await api.importBackup(data);
                            await initialize();
                            modals.showAlert('Backup restaurado com sucesso!');
                        } catch (apiError) {
                            console.error('Erro ao enviar backup para a API:', apiError);
                            modals.showAlert(`Erro ao restaurar: ${apiError.message}`);
                        }
                    });
                } else {
                    modals.showAlert('Arquivo inválido. Verifique o formato do arquivo.');
                }
            } catch (error) {
                modals.showAlert('Erro ao ler o arquivo. Verifique se ele está no formato JSON correto.');
            } finally {
                window.app.dom.importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    };

    window.app.handlers.exportDataHandler = () => {
        const dataToSave = {
            guests: window.app.state.guests,
            reservations: window.app.state.reservations,
            employees: window.app.state.employees,
            expenses: window.app.state.expenses
        };
        const dataStr = JSON.stringify(dataToSave, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dados_hospedagem.json';
        link.click();
        URL.revokeObjectURL(url);
        modals.showAlert('Arquivo de backup gerado. Verifique sua pasta de Downloads.');
    };

    window.app.handlers.restoreFromAutoBackupHandler = async () => {
        try {
            const latestBackup = await db.auto_backups.orderBy('timestamp').last();
            if (!latestBackup) {
                modals.showAlert('Nenhum backup automático encontrado.');
                return;
            }

            const backupDate = latestBackup.timestamp.toLocaleString('pt-BR');
            const message = `Deseja restaurar o último backup de ${backupDate}? Isso substituirá todos os dados atuais.`;

            modals.showConfirm(message, async () => {
                try {
                    await api.importBackup(latestBackup.data);
                    await initialize();
                    modals.showAlert('Dados restaurados com sucesso a partir do backup!');
                } catch (apiError) {
                    console.error('Erro ao restaurar backup automático via API:', apiError);
                    modals.showAlert(`Erro ao restaurar: ${apiError.message}`);
                }
            });
        } catch (error) {
            console.error('Falha ao restaurar backup automático:', error);
            modals.showAlert('Ocorreu um erro ao tentar restaurar o backup.');
        }
    };

    window.app.handlers.generatePdfHandler = () => {
        generatePdf(window.app.state);
        modals.showAlert('Arquivo de relatório gerado. Verifique sua pasta de Downloads.');
    };

    // --- INICIALIZAÇÃO E EVENT LISTENERS ---

    /**
     * Função principal de inicialização e recarregamento de dados.
     * @param {boolean} isSilentUpdate - Se true, não mostra alertas de erro de conexão.
     */
    async function initialize(isSilentUpdate = false, userRole = null) {
        try {
            // Usa Cache-First: carrega do Dexie imediatamente, busca API em background
            const [guests, reservations, employees, expenses, properties] = await sync.loadDataCacheFirst(
                // Callback 1: dados do cache carregados instantaneamente
                (cachedData) => {
                    if (!isSilentUpdate) {
                        window.app.state.guests = cachedData.guests;
                        window.app.state.reservations = cachedData.reservations;
                        window.app.state.employees = cachedData.employees;
                        window.app.state.expenses = cachedData.expenses;
                        // Renderiza imediatamente com dados do cache (elimina tela branca)
                        window.app.switchView(window.app.state.currentView);
                    }
                },
                // Callback 2: dados frescos da API recebidos
                null,
                // forceRefresh: apenas em atualizações explícitas
                isSilentUpdate
            );

            window.app.state.guests = guests;
            window.app.state.reservations = reservations;
            window.app.state.employees = employees;
            window.app.state.expenses = expenses;
            window.app.state.properties = properties;
        } catch (error) {
            if (!isSilentUpdate) {
                console.error("Erro ao carregar dados da API:", error);
                const syncStatus = sync.getSyncStatus();
                if (!syncStatus.isOnline) {
                    modals.showAlert("Modo offline ativo. Exibindo dados do cache local.");
                } else {
                    modals.showAlert("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
                }
            }
            return;
        }

        updateFirstReservationDate();

        const statusesWereUpdated = await updateReservationStatuses();
        if (statusesWereUpdated) {
            modals.showAlert('O status de algumas reservas foi atualizado automaticamente.');
        }

        window.app.switchView(window.app.state.currentView);
        window.app.updateNavigationButtons();
        scheduleNextAutoRefresh();

        // Inicia ciclo de auto-backup no Dexie após inicialização bem-sucedida
        if (!isSilentUpdate) {
            sync.startAutoBackupCycle(() => window.app.state);
        }
    }

    /**
     * Detecta o sistema operacional e retorna um tema padrão apropriado.
     * @returns {string} - O nome do tema ('liquid-glass', 'dark', ou 'light').
     */
    function getOSDefaultTheme() {
        try {
            const userAgent = window.navigator.userAgent.toLowerCase();
            const platform = window.navigator.platform.toLowerCase();

            // Para dispositivos Apple, o tema 'liquid-glass' é mais adequado.
            if (/mac|iphone|ipad|ipod/.test(platform) || /mac|iphone|ipad|ipod/.test(userAgent)) {
                return 'liquid-glass';
            }

            // Para outros sistemas (Android, Windows, etc.), respeita a preferência do SO.
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        } catch (e) { /* Em caso de erro, apenas retorna o padrão */ }
        return 'light'; // Padrão para todos os outros casos.
    }

    /**
     * Decodifica um token JWT para extrair o payload.
     * @param {string} token - O token JWT.
     * @returns {object|null} - O payload do token ou null se for inválido.
     */
    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    // --- Ponto de Entrada da Aplicação ---

    window.app.main = function() {
        // 1. Preenche o objeto dom com as referências aos elementos HTML
        window.app.dom = {
            searchInput: document.getElementById('search-input'),
            addReservationBtn: document.getElementById('add-reservation-btn'),
            generatePdfBtn: document.getElementById('generate-pdf-btn'),
            importDataBtn: document.getElementById('import-data-btn'),
            exportDataBtn: document.getElementById('export-data-btn'),
            restoreAutoBackupBtn: document.getElementById('restore-auto-backup-btn'),
            addEmployeeBtn: document.getElementById('add-employee-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            sidebarToggleBtn: document.getElementById('sidebar-toggle-btn'),
            saveProgressBtn: document.getElementById('save-progress-btn'),
            exitAppBtn: document.getElementById('exit-app-btn'),
            sidebar: document.getElementById('sidebar'),
            sidebarOverlay: document.getElementById('sidebar-overlay'),
            mainTabs: document.getElementById('main-tabs'),
            importFileInput: document.getElementById('import-file-input'),
            themeToggleBtn: document.getElementById('theme-toggle-btn'),
            maintenanceAccordionBtn: document.getElementById('maintenance-accordion-btn'),
            maintenanceAccordionContent: document.getElementById('maintenance-accordion-content'),
            addCleaningBtn: document.getElementById('add-cleaning-btn'),
            addMaintenanceBtn: document.getElementById('add-maintenance-btn'),
            notificationsBtn: document.getElementById('notifications-btn'),
            addBlockingBtn: document.getElementById('add-blocking-btn'),
            chatForm: document.getElementById('chat-form'),
            addExpenseLinkSidebar: document.getElementById('add-expense-link-sidebar'),
            addGuestBtn: document.getElementById('add-guest-btn'),
            views: {
                dashboard: document.getElementById('dashboard-view'),
                calendar: document.getElementById('calendar-view'),
                cards: document.getElementById('cards-view'),
                approvals: document.getElementById('approvals-view'),
                pending: document.getElementById('pending-view'),
                guests: document.getElementById('guests-view'), 
                finished: document.getElementById('finished-view'),
                recent_guests: document.getElementById('recent-guests-view'),
                employees: document.getElementById('employees-view'),
                financial: document.getElementById('financial-view'),
                properties: document.getElementById('properties-view'),
                logs: document.getElementById('logs-view'),
                users: document.getElementById('users-view'),
                search_results: document.getElementById('search-results-view'),
            },
            tabs: {
                dashboard: document.getElementById('view-tab-dashboard'),
                calendar: document.getElementById('view-tab-calendar'),
                cards: document.getElementById('view-tab-cards'),
                approvals: document.getElementById('view-tab-approvals'),
                pending: document.getElementById('view-tab-pending'),
                guests: document.getElementById('view-tab-guests'),
                finished: document.getElementById('view-tab-finished'),
                recent_guests: document.getElementById('view-tab-recent-guests'),
                employees: document.getElementById('view-tab-employees'),
                financial: document.getElementById('view-tab-financial'),
                properties: document.getElementById('view-tab-properties'),
                logs: document.getElementById('view-tab-logs'),
                users: document.getElementById('view-tab-users'),
            },
            calendarControls: document.getElementById('calendar-controls'),
            addExpenseBtn: document.getElementById('add-expense-btn'),
            prevMonthBtn: document.getElementById('prev-month-btn'),
            nextMonthBtn: document.getElementById('next-month-btn'),
            todayBtn: document.getElementById('today-btn'),
            reservationForm: document.getElementById('reservation-form'),
            guestForm: document.getElementById('guest-form'),
            employeeForm: document.getElementById('employee-form'),
            expenseForm: document.getElementById('expense-form'),
            userForm: document.getElementById('user-form'),
            addPropertyForm: document.getElementById('add-property-form'),
            logFilterUsername: document.getElementById('log-filter-username'),
            propertyEditForm: document.getElementById('property-edit-form'),
            logFilterStartDate: document.getElementById('log-filter-start-date'),
            logFilterEndDate: document.getElementById('log-filter-end-date'),
            logFilterBtn: document.getElementById('log-filter-btn'),
            taskForm: document.getElementById('task-form'),
        };

        // 2. Anexa as funções de modal ao objeto global `window.app.modals`
        modals.attachModalFunctionsToWindow();
        chat.attachChatFunctionsToWindow();
        window.app.ui = ui; // Anexa o módulo de UI

        // 3. Sobrescreve as funções para passar o estado
        window.app.modals.openReservationModal = (id) => modals.openReservationModal(id, window.app.state.reservations, window.app.state.guests);
        window.app.modals.openGuestModal = (id) => modals.openGuestModal(id, window.app.state.guests);
        window.app.modals.openEmployeeModal = (id) => modals.openEmployeeModal(id, window.app.state.employees);
        window.app.modals.openExpenseModal = (id) => modals.openExpenseModal(id, window.app.state.expenses);
        window.app.modals.openTaskModalForEdit = (id) => modals.openTaskModalForEdit(id, window.app.state.reservations);
        window.app.modals.openPropertyEditModal = (id) => modals.openPropertyEditModal(id);
        window.app.modals.openTaskModal = (type) => modals.openTaskModal(type);
        window.app.modals.showApartmentDetails = (apartmentNumber) => ui.showApartmentDetails(apartmentNumber, window.app.state.reservations, window.app.state.guests);

        // 2. Anexa os manipuladores de eventos
        window.app.handlers.finishTaskHandler = window.app.handlers.finishTaskHandler;
        window.app.handlers.deleteGuestHandler = window.app.handlers.deleteGuestHandler;
        window.app.handlers.deleteReservationHandler = window.app.handlers.deleteReservationHandler;
        window.app.handlers.cancelReservationHandler = window.app.handlers.cancelReservationHandler;
        window.app.handlers.filterLogsHandler = window.app.handlers.filterLogsHandler;
        window.app.handlers.savePropertyHandler = window.app.handlers.savePropertyHandler;
        window.app.handlers.deletePropertyHandler = window.app.handlers.deletePropertyHandler;
        window.app.handlers.changeLogPageHandler = window.app.handlers.changeLogPageHandler;
        window.app.handlers.deleteUserHandler = window.app.handlers.deleteUserHandler;
        window.app.handlers.approveReservationHandler = window.app.handlers.approveReservationHandler;
        window.app.handlers.rejectReservationHandler = window.app.handlers.rejectReservationHandler;
        window.app.handlers.notificationClickHandler = window.app.handlers.notificationClickHandler;
        window.app.handlers.sendMessageHandler = chat.sendMessageHandler;
        window.app.handlers.changePasswordHandler = window.app.handlers.changePasswordHandler;
        window.app.handlers.deleteEmployeeHandler = window.app.handlers.deleteEmployeeHandler;

        // 3. Verifica a autenticação antes de carregar a UI
        const token = localStorage.getItem('authToken');
        if (!token) {
            document.getElementById('login-screen').classList.remove('hidden'); // Configura o listener do formulário de login
            document.getElementById('app').classList.add('hidden');
            document.getElementById('owner-portal').classList.add('hidden');
            setupEventListeners(window.app);
        } else {
            // Decodifica o token para obter a função do usuário
            const decodedToken = parseJwt(token);
            if (decodedToken) {
                window.app.state.userRole = decodedToken.role;
                window.app.state.currentUser = decodedToken;
            }

            // Redireciona para o portal correto
            const isAdminOrStaff = window.app.state.userRole === 'admin' || window.app.state.userRole === 'staff';
            document.getElementById('app').classList.toggle('hidden', !isAdminOrStaff);
            document.getElementById('owner-portal').classList.toggle('hidden', isAdminOrStaff);
            document.getElementById('login-screen').classList.add('hidden');

            // Aplica o tema salvo ou detecta o melhor tema padrão para o SO.
            const theme = localStorage.getItem('theme') || getOSDefaultTheme();
            ui.applyTheme(theme);
            ui.startClock();
            
            // 4. Configura os event listeners e validações APÓS a primeira inicialização
            initialize(false, window.app.state.userRole).then(async () => {
                setupEventListeners(window.app);
                if (window.app.state.userRole === 'admin') {
                    // Busca dados que são apenas para admin
                    window.app.state.users = await api.getUsers();
                    const logData = await api.getActivityLogs();
                    window.app.state.logs = logData.logs;
                    window.app.state.logsTotalCount = logData.totalCount;
                    window.app.state.logsTotalPages = logData.totalPages;

                    // Busca o resumo de mensagens não lidas para o admin
                    const unreadSummary = await api.getUnreadSummary();
                    unreadSummary.forEach(summary => {
                        ui.updateUnreadState(summary.from, summary.count);
                    });
                }
                if (isAdminOrStaff) {
                    ui.applyRolePermissions(window.app.state.userRole);
                    modals.setupFormValidation();
                } else {
                    // Renderiza o portal do proprietário
                    ui.renderOwnerPortal(window.app.state);
                    // Busca o resumo de mensagens não lidas para o proprietário
                    const unreadSummary = await api.getUnreadSummary();
                     unreadSummary.forEach(summary => {
                        ui.updateUnreadState(summary.from, summary.count);
                    });
                }
                console.log('Aplicação inicializada e eventos configurados com sucesso.');

                // Conecta ao WebSocket no domínio atual
                const socket = io();
                socket.on('data_updated', (updateData) => {
                    const currentUser = parseJwt(localStorage.getItem('authToken'))?.username;

                    // Só mostra a notificação e atualiza se a ação foi de OUTRO usuário
                    if (currentUser && updateData.user !== currentUser) {
                        console.log(`Atualização recebida do servidor: ${updateData.action} por ${updateData.user}`);

                        // Se for uma nova solicitação de aprovação, mostra uma notificação específica
                        // e atualiza apenas o necessário.
                        if (updateData.sub_action === 'new_approval_request') {
                            const newNotification = {
                                id: `notif_${Date.now()}`,
                                message: 'Nova solicitação de reserva para aprovação!',
                                user: updateData.user,
                                timestamp: new Date(),
                                read: false,
                                targetView: 'approvals' // Para onde o clique deve levar
                            };
                            window.app.state.notifications.unshift(newNotification); // Adiciona no início
                            ui.renderNotifications(window.app.state.notifications);
                            ui.showToast('Nova solicitação de reserva para aprovação!', updateData.user, 'info');
                            // Busca apenas as reservas para atualizar o estado e o contador
                            api.fetchInitialData().then(([guests, reservations]) => {
                                window.app.state.reservations = reservations;
                                window.app.state.guests = guests; // Atualiza hóspedes caso um novo tenha sido criado
                                ui.updateApprovalsBadge();
                                // Se o admin estiver na tela de aprovações, atualiza a lista
                                if (window.app.state.currentView === 'approvals') {
                                    window.app.renderCurrentView();
                                }
                            });
                        } else {
                            // Para outras ações, mantém o comportamento padrão de recarregar tudo
                            const actionMessages = {
                                save_reservation: 'Reserva salva/atualizada',
                                default: 'Dados atualizados'
                            };
                            const message = actionMessages[updateData.action] || actionMessages.default;
                            ui.showToast(message, updateData.user);
                            initialize(true, window.app.state.userRole);
                        }
                    }
                });

                // Listener para novas mensagens
                socket.on('new_message', (message) => {
                    const currentUser = window.app.state.currentUser.username;
                    const chatPartner = document.getElementById('chat-partner-username').value;
                    const isChatOpen = !document.getElementById('chat-modal').classList.contains('hidden');

                    if (message.to === currentUser && isChatOpen && message.from === chatPartner) {
                        chat.addMessageToChat(message);
                    } else if (message.to === currentUser && !isChatOpen) {
                        ui.handleIncomingUnreadMessage(message);
                    }
                });

                // Listener para notificações específicas do usuário (ex: proprietário)
                socket.on('user_notification', (notificationData) => {
                    const currentUser = parseJwt(localStorage.getItem('authToken'))?.username;
                    if (currentUser && notificationData.targetUser === currentUser) {
                        let message = `Sua reserva para o Apto ${notificationData.apartment} foi APROVADA!`;
                        if (notificationData.status === 'canceled') {
                            message = `Sua reserva para o Apto ${notificationData.apartment} foi RECUSADA.`;
                            // Adiciona o motivo se ele existir
                            if (notificationData.reason) message += ` Motivo: "${notificationData.reason.replace('Recusado: ', '')}"`;
                        }
                        ui.showToast(message, 'Sistema', 'success');
                        initialize(true, window.app.state.userRole); // Recarrega os dados para atualizar o calendário do proprietário
                    }
                });
            });
        }
    }

    window.app.main();
});