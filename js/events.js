import * as ui from './ui.js';
import * as modals from './modals.js';
import * as chat from './chat.js';
import * as api from './api.js';
import * as sync from './sync.js';

/**
 * Configura todos os event listeners da aplicação.
 * @param {object} app - O objeto principal da aplicação.
 */
export function setupEventListeners(app) {
    const { dom, state, handlers, modals: appModals } = app;

    // Navegação principal
    Object.keys(dom.tabs).forEach(key => {
        if (dom.tabs[key]) {
            dom.tabs[key].addEventListener('click', () => app.switchView(key));
        }
    });

    // Controles do calendário
    dom.prevMonthBtn.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() - 1);
        app.renderCurrentView();
        app.updateNavigationButtons();
    });
    dom.nextMonthBtn.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() + 1);
        app.renderCurrentView();
        app.updateNavigationButtons();
    });
    dom.todayBtn.addEventListener('click', () => {
        state.currentDate = new Date();
        state.selectedDate = new Date();
        app.renderCurrentView();
        app.updateNavigationButtons();
    });

    // Botões de ação principais
    dom.addReservationBtn.addEventListener('click', () => appModals.openReservationModal(null));
    dom.addGuestBtn.addEventListener('click', () => appModals.openGuestModal(null));
    dom.addExpenseBtn.addEventListener('click', () => appModals.openExpenseModal(null));
    dom.generatePdfBtn.addEventListener('click', () => handlers.generatePdfHandler());

    // Sidebar e tema
    dom.sidebarToggleBtn.addEventListener('click', ui.toggleSidebar);
    dom.sidebarOverlay.addEventListener('click', ui.toggleSidebar);
    dom.themeToggleBtn.addEventListener('click', () => {
        const themes = ['light', 'dark', 'liquid-glass'];
        const currentTheme = localStorage.getItem('theme') || 'light';
        const currentIndex = themes.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const newTheme = themes[nextIndex];

        localStorage.setItem('theme', newTheme);
        ui.applyTheme(newTheme);
        app.renderCurrentView(); // Redesenha a view para aplicar cores dos gráficos
    });

    // Listener para o botão de tema do portal do proprietário
    const ownerThemeToggleBtn = document.getElementById('owner-theme-toggle-btn');
    if (ownerThemeToggleBtn) {
        ownerThemeToggleBtn.addEventListener('click', () => {
            const themes = ['light', 'dark', 'liquid-glass'];
            const currentTheme = localStorage.getItem('theme') || 'light';
            const currentIndex = themes.indexOf(currentTheme);
            const nextIndex = (currentIndex + 1) % themes.length;
            const newTheme = themes[nextIndex];

            localStorage.setItem('theme', newTheme);
            ui.applyTheme(newTheme);
            if (state.userRole === 'owner') {
                ui.renderOwnerPortal(state);
            }
        });
    }

    // Listener para o botão de tema (ambos os portais)
    document.body.addEventListener('click', (e) => {
        const themeBtn = e.target.closest('#theme-toggle-btn') || e.target.closest('#owner-theme-toggle-btn');
        if (themeBtn) {
            e.preventDefault();
            const themes = ['light', 'dark', 'liquid-glass'];
            const currentTheme = localStorage.getItem('theme') || 'light';
            const currentIndex = themes.indexOf(currentTheme);
            const nextIndex = (currentIndex + 1) % themes.length;
            const newTheme = themes[nextIndex];

            localStorage.setItem('theme', newTheme);
            ui.applyTheme(newTheme);

            if (state.userRole === 'admin') {
                app.renderCurrentView(); // Redesenha a view para aplicar cores dos gráficos do admin
            } else if (state.userRole === 'owner') {
                // Re-renderiza os gráficos para aplicar as novas cores do tema
                ui.renderOwnerMonthlyOccupancyChart(state);
                ui.renderOwnerRevenueChart(state);
            }
        }
    });

    // --- Eventos do Portal do Proprietário (só são adicionados se o usuário for 'owner') ---
    if (state.userRole === 'owner') {
        // Menu de perfil do DESKTOP
        const ownerProfileBtn = document.getElementById('owner-profile-btn');
        const desktopDropdown = document.getElementById('owner-profile-dropdown');
        if (ownerProfileBtn && desktopDropdown) {
            ownerProfileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                desktopDropdown.classList.toggle('hidden');
            });
        }

        // Barra de navegação inferior (MOBILE)
        const ownerNavSearchBtn = document.getElementById('owner-nav-search-btn');
        const mobileSearchBar = document.getElementById('owner-mobile-search-bar');
        const mobileSearchInput = document.getElementById('owner-reservation-search-mobile');
        const closeMobileSearchBtn = document.getElementById('owner-close-mobile-search-btn');

        if (ownerNavSearchBtn) {
            ownerNavSearchBtn.addEventListener('click', () => {
                const isHidden = mobileSearchBar.classList.contains('hidden');
                if (isHidden) {
                    mobileSearchBar.classList.remove('hidden');
                    setTimeout(() => {
                        mobileSearchBar.classList.remove('opacity-0', 'translate-y-4');
                        mobileSearchInput.focus();
                    }, 10);
                } else {
                    mobileSearchBar.classList.add('opacity-0', 'translate-y-4');
                    setTimeout(() => mobileSearchBar.classList.add('hidden'), 200);
                }
            });
            closeMobileSearchBtn.addEventListener('click', () => {
                mobileSearchBar.classList.add('opacity-0', 'translate-y-4');
                setTimeout(() => mobileSearchBar.classList.add('hidden'), 200);
                mobileSearchInput.value = '';
                ui.renderOwnerReservationsList(window.app.state, ''); // Limpa a busca
            });

            document.getElementById('owner-nav-reservations-btn').addEventListener('click', () => {
                document.getElementById('owner-reservations-list').scrollIntoView({ behavior: 'smooth' });
            });
            document.getElementById('owner-nav-add-reservation-btn').addEventListener('click', () => {
                appModals.openReservationModal(null);
            });
            const ownerAddGuestBtn = document.getElementById('owner-add-guest-btn');
            if (ownerAddGuestBtn) {
                ownerAddGuestBtn.addEventListener('click', () => appModals.openGuestModal(null));
            }
            document.getElementById('owner-nav-chat-btn').addEventListener('click', () => {
                window.app.chat.openChatModal('admin');
            });

            // Menu de perfil do MOBILE
            const ownerNavProfileBtn = document.getElementById('owner-nav-profile-btn');
            const mobileDropdown = document.getElementById('owner-profile-dropdown-mobile');
            ownerNavProfileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                mobileDropdown.classList.toggle('hidden');
            });
        }

        // Listeners para ambas as barras de pesquisa
        if (mobileSearchInput) {
            mobileSearchInput.addEventListener('input', (e) => {
                ui.renderOwnerReservationsList(window.app.state, e.target.value);
            });
        }
        const desktopSearchInput = document.getElementById('owner-reservation-search-desktop');
        if (desktopSearchInput) {
            desktopSearchInput.addEventListener('input', (e) => {
                ui.renderOwnerReservationsList(window.app.state, e.target.value);
            });
        }

        // Seletor de Apartamento (Switcher)
        const ownerApartmentSelect = document.getElementById('owner-apartment-select');
        if (ownerApartmentSelect) {
            ownerApartmentSelect.addEventListener('change', (e) => {
                state.selectedApartment = e.target.value;
                ui.renderOwnerPortal(state);
            });
        }
    }

    // Menu de Manutenção
    dom.maintenanceAccordionBtn.addEventListener('click', () => {
        dom.maintenanceAccordionContent.classList.toggle('hidden');
        dom.maintenanceAccordionBtn.querySelector('[data-lucide="chevron-down"]').classList.toggle('rotate-180');
    });
    dom.addCleaningBtn.addEventListener('click', (e) => { e.preventDefault(); appModals.openTaskModal('cleaning'); });
    dom.addMaintenanceBtn.addEventListener('click', (e) => { e.preventDefault(); appModals.openTaskModal('maintenance'); });
    dom.addBlockingBtn.addEventListener('click', (e) => { e.preventDefault(); appModals.openTaskModal('blocked'); });
    dom.addEmployeeBtn.addEventListener('click', (e) => { e.preventDefault(); appModals.openEmployeeModal(null); });
    dom.addExpenseLinkSidebar.addEventListener('click', (e) => { e.preventDefault(); appModals.openExpenseModal(null); });
    document.getElementById('add-property-form').addEventListener('submit', handlers.savePropertyHandler);
    document.getElementById('add-user-btn').addEventListener('click', () => modals.openUserModal());
    const addOwnerBtn = document.getElementById('add-owner-btn');
    // Configurações e dados
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationsPanel = document.getElementById('notifications-panel');
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsPanel.classList.toggle('hidden');
            if (!notificationsPanel.classList.contains('hidden')) {
                // Marca todas como lidas ao abrir
                state.notifications.forEach(n => n.read = true);
                ui.renderNotifications(state.notifications);
            }
        });
        // Fecha o painel se clicar fora
        document.addEventListener('click', () => notificationsPanel.classList.add('hidden'));
        notificationsPanel.addEventListener('click', (e) => e.stopPropagation());
    }
    document.getElementById('log-filter-btn').addEventListener('click', handlers.filterLogsHandler);
    dom.settingsBtn.addEventListener('click', modals.openSettingsModal);
    dom.exportDataBtn.addEventListener('click', handlers.exportDataHandler);
    dom.importDataBtn.addEventListener('click', () => dom.importFileInput.click());
    dom.importFileInput.addEventListener('change', handlers.importDataHandler);
    dom.restoreAutoBackupBtn.addEventListener('click', handlers.restoreFromAutoBackupHandler);

    // Botões do rodapé da sidebar
    dom.saveProgressBtn.addEventListener('click', async () => {
        const btn = dom.saveProgressBtn;
        const originalHtml = btn.innerHTML;

        // Feedback visual imediato
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Sincronizando...';
        btn.disabled = true;

        try {
            // 1. Grava um auto-backup no Dexie com o estado atual
            await sync.saveAutoBackup(window.app.state);

            // 2. Força uma sincronização completa com a API
            const syncStatus = sync.getSyncStatus();
            let message = '✓ Backup local criado com sucesso!';

            if (syncStatus.pendingQueue > 0) {
                await sync.forceSync();
                message = `✓ ${syncStatus.pendingQueue} operação(es) sincronizada(s) com sucesso!`;
            }

            btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Backup salvo!';
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }, 2000);

            ui.showToast(message, 'Sistema', 'success');
        } catch (err) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            modals.showAlert('Erro ao sincronizar: ' + err.message);
        }
    });
    dom.exitAppBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        document.getElementById('app').classList.add('hidden');
        window.location.reload();
    });

    // Botão de sair do portal do proprietário
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('#owner-exit-btn')) {
            e.preventDefault();
            // Lógica direta de logout para evitar dependência de elementos ocultos
            localStorage.removeItem('authToken');
            if (document.getElementById('app')) document.getElementById('app').classList.add('hidden');
            if (document.getElementById('owner-portal')) document.getElementById('owner-portal').classList.add('hidden');
            window.location.reload();
        }
    });

    // Botões de Chat
    const ownerChatBtn = document.getElementById('owner-chat-btn');
    if (ownerChatBtn) {
        ownerChatBtn.addEventListener('click', () => window.app.chat.openChatModal('admin'));
    }
    const adminChatBtn = document.getElementById('admin-chat-btn');
    if (addOwnerBtn) {
        addOwnerBtn.addEventListener('click', () => modals.openUserModal(null, 'owner'));
    }

    if (adminChatBtn) {
        // Abre a lista de conversas para o admin
        adminChatBtn.addEventListener('click', () => modals.openChatListModal());
    }

    const adminNewChatBtn = document.getElementById('admin-new-chat-btn');
    if (adminNewChatBtn) {
        adminNewChatBtn.addEventListener('click', () => window.app.ui.showOwnerSelector());
    }

    const chatListSearch = document.getElementById('chat-list-search');
    if (chatListSearch) {
        chatListSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value;
            // Se o título for 'Nova Conversa', filtra de forma diferente ou chama showOwnerSelector com filtro
            const isNewChat = document.querySelector('#chat-list-modal h3').textContent === 'Nova Conversa';
            if (isNewChat) {
                // Implementação simples de busca na lista de seleção
                const items = document.querySelectorAll('#chat-list-container > div');
                items.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    item.classList.toggle('hidden', !text.includes(searchTerm.toLowerCase()));
                });
            } else {
                window.app.ui.renderChatList(window.app.state.users, searchTerm);
            }
        });
    }


    // Submissão de formulários
    dom.reservationForm.addEventListener('submit', handlers.saveReservationHandler);
    dom.guestForm.addEventListener('submit', handlers.saveGuestHandler);
    dom.chatForm.addEventListener('submit', handlers.sendMessageHandler);
    dom.employeeForm.addEventListener('submit', handlers.saveEmployeeHandler);
    dom.expenseForm.addEventListener('submit', handlers.saveExpenseHandler);
    dom.userForm.addEventListener('submit', handlers.saveUserHandler);
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handlers.changePasswordHandler);
    }
    dom.propertyEditForm.addEventListener('submit', handlers.updatePropertyHandler);
    dom.taskForm.addEventListener('submit', handlers.saveTaskHandler);

    // Delegação de eventos para botões que podem ser criados dinamicamente (como os do menu do proprietário)
    document.body.addEventListener('click', (e) => {
        // Botão de solicitar reserva do portal do proprietário
        if (e.target.closest('#owner-request-reservation-btn')) {
            appModals.openReservationModal(null);
        }
        // Botão de gerar PDF do portal do proprietário
        if (e.target.closest('#owner-generate-pdf-btn')) {
            e.preventDefault();
            handlers.generatePdfHandler();
        }
        // Botão de alterar senha do portal do proprietário
        if (e.target.closest('#owner-change-password-btn')) {
            e.preventDefault();
            appModals.openChangePasswordModal();
        }
        // Botão de limpar filtros de log
        if (e.target.closest('#log-clear-filter-btn')) {
            document.getElementById('log-filter-username').value = '';
            document.getElementById('log-filter-start-date').value = '';
            document.getElementById('log-filter-end-date').value = '';
            handlers.filterLogsHandler();
        }
    });

    // Busca
    dom.searchInput.addEventListener('input', async (e) => {
        const searchTerm = e.target.value.trim();
        if (searchTerm.length > 1) {
            if (state.currentView !== 'search_results') {
                state.lastViewBeforeSearch = state.currentView;
            }
            window.app.switchView('search_results');
            const results = await api.searchAllData(searchTerm);
            ui.renderGlobalSearchResults(results, state.guests);
        } else if (searchTerm.length === 0 && state.currentView === 'search_results') {
            window.app.switchView(state.lastViewBeforeSearch);
        }
    });

    // Listeners dos modais (fechar, etc.)
    document.getElementById('close-modal-btn').addEventListener('click', modals.closeReservationModal);
    document.getElementById('cancel-btn').addEventListener('click', modals.closeReservationModal);
    document.getElementById('reservation-modal').addEventListener('click', (e) => { if (e.target.id === 'reservation-modal') modals.closeReservationModal(); });

    document.getElementById('close-guest-modal-btn').addEventListener('click', modals.closeGuestModal);
    document.getElementById('cancel-guest-btn').addEventListener('click', modals.closeGuestModal);
    document.getElementById('guest-modal').addEventListener('click', (e) => { if (e.target.id === 'guest-modal') modals.closeGuestModal(); });
    document.getElementById('guest-name').addEventListener('input', () => modals.searchExistingGuests(state.guests));
    document.getElementById('guest-doc').addEventListener('input', () => modals.searchExistingGuests(state.guests));
    document.getElementById('guest-suggestions-list').addEventListener('click', (e) => {
        const suggestionEl = e.target.closest('[data-guest-id]');
        if (suggestionEl) modals.selectExistingGuest(suggestionEl.dataset.guestId, state.guests);
    });
    document.getElementById('add-new-guest-from-reservation-btn').addEventListener('click', () => {
        // Abre o modal de hóspede e define um callback para quando o hóspede for salvo
        appModals.openGuestModal(null, (newGuest) => {
            // Atualiza a lista de seleção de hóspedes e seleciona o novo
            modals.populateGuestSelect(window.app.state.guests, newGuest.id);
        });
    });

    document.getElementById('close-employee-modal-btn').addEventListener('click', modals.closeEmployeeModal);
    document.getElementById('cancel-employee-btn').addEventListener('click', modals.closeEmployeeModal);
    document.getElementById('employee-modal').addEventListener('click', (e) => { if (e.target.id === 'employee-modal') modals.closeEmployeeModal(); });

    document.getElementById('close-user-modal-btn').addEventListener('click', modals.closeUserModal);
    document.getElementById('user-modal').addEventListener('click', (e) => { if (e.target.id === 'user-modal') modals.closeUserModal(); });

    document.getElementById('close-expense-modal-btn').addEventListener('click', modals.closeExpenseModal);
    document.getElementById('cancel-expense-btn').addEventListener('click', modals.closeExpenseModal);
    document.getElementById('delete-expense-btn').addEventListener('click', handlers.deleteExpenseHandler);
    document.getElementById('expense-modal').addEventListener('click', (e) => { if (e.target.id === 'expense-modal') modals.closeExpenseModal(); });

    document.getElementById('close-task-modal-btn').addEventListener('click', modals.closeTaskModal);
    document.getElementById('cancel-task-btn').addEventListener('click', modals.closeTaskModal);
    document.getElementById('task-modal').addEventListener('click', (e) => { if (e.target.id === 'task-modal') modals.closeTaskModal(); });

    document.getElementById('close-apartment-details-modal-btn').addEventListener('click', modals.closeApartmentDetailsModal);
    document.getElementById('apartment-details-modal').addEventListener('click', (e) => { if (e.target.id === 'apartment-details-modal') modals.closeApartmentDetailsModal(); });

    document.getElementById('close-settings-modal-btn').addEventListener('click', modals.closeSettingsModal);
    document.getElementById('settings-modal').addEventListener('click', (e) => { if (e.target.id === 'settings-modal') modals.closeSettingsModal(); });

    document.getElementById('close-property-edit-modal-btn').addEventListener('click', modals.closePropertyEditModal);
    document.getElementById('cancel-property-edit-btn').addEventListener('click', modals.closePropertyEditModal);
    document.getElementById('property-edit-modal').addEventListener('click', (e) => { if (e.target.id === 'property-edit-modal') modals.closePropertyEditModal(); });

    document.getElementById('close-chat-modal-btn').addEventListener('click', chat.closeChatModal);
    document.getElementById('chat-modal').addEventListener('click', (e) => { if (e.target.id === 'chat-modal') chat.closeChatModal(); });
    
    document.getElementById('chat-attach-file-btn').addEventListener('click', () => document.getElementById('chat-file-input').click());
    document.getElementById('chat-file-input').addEventListener('change', chat.handleFileSelection);

    const chatRecordBtn = document.getElementById('chat-record-btn');
    const chatMessageInput = document.getElementById('chat-message-input');

    // Habilita/desabilita o botão de enviar conforme o usuário digita
    chatMessageInput.addEventListener('input', chat.toggleChatActionButton);

    // Adiciona listener de clique para o botão de gravação (iniciar/parar)
    chatRecordBtn.addEventListener('click', chat.handleRecordButtonClick);

    document.getElementById('close-chat-list-modal-btn').addEventListener('click', modals.closeChatListModal);
    document.getElementById('chat-list-modal').addEventListener('click', (e) => { if (e.target.id === 'chat-list-modal') modals.closeChatListModal(); });
    document.getElementById('chat-list-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        ui.renderChatList(state.users, searchTerm);
    });

    // Listeners do modal de visualização de arquivo
    document.getElementById('file-viewer-close-btn').addEventListener('click', chat.closeFileViewer);
    document.getElementById('file-viewer-modal').addEventListener('click', (e) => { if (e.target.id === 'file-viewer-modal') chat.closeFileViewer(); });

    document.getElementById('amenities-toggle-container').addEventListener('click', (e) => {
        const button = e.target.closest('.amenity-toggle');
        if (button) {
            button.classList.toggle('active');
        }
    });
    document.getElementById('close-change-password-modal-btn').addEventListener('click', modals.closeChangePasswordModal);
    document.getElementById('change-password-modal').addEventListener('click', (e) => { if (e.target.id === 'change-password-modal') modals.closeChangePasswordModal(); });

    // --- Navegação por Arraste no Calendário ---
    const calendarView = document.getElementById('calendar-view');
    const calendarScrollArea = calendarView.querySelector('.table-responsive');
    const calendarContainer = document.getElementById('calendar-container');

    if (calendarScrollArea) {
        let isDown = false;
        let startX;
        let scrollLeft;

        calendarScrollArea.addEventListener('mousedown', (e) => {
            // Ignora se clicar numa reserva, num botão ou redimensionador
            if (e.target.closest('.reservation-bar') || e.target.closest('.resize-handle') || e.target.closest('button')) return;
            
            isDown = true;
            calendarScrollArea.classList.add('active-scroll');
            startX = e.pageX - calendarScrollArea.offsetLeft;
            scrollLeft = calendarScrollArea.scrollLeft;
        });
        calendarScrollArea.addEventListener('mouseleave', () => { isDown = false; calendarScrollArea.classList.remove('active-scroll'); });
        calendarScrollArea.addEventListener('mouseup', () => { isDown = false; calendarScrollArea.classList.remove('active-scroll'); });
        calendarScrollArea.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - calendarScrollArea.offsetLeft;
            const walk = (x - startX) * 2;
            calendarScrollArea.scrollLeft = scrollLeft - walk;
        });

        // Drag-to-select para criar reserva
        let isDragging = false;
        let startCell = null;
        let endCell = null;

        calendarContainer.addEventListener('mousedown', (e) => {
            const cell = e.target.closest('.calendar-day-cell-body');
            if (cell && e.target === cell) {
                isDragging = true;
                startCell = cell;
                endCell = cell;
                document.querySelectorAll('.selection-in-progress').forEach(c => c.classList.remove('selection-in-progress'));
                cell.classList.add('selection-in-progress');
                e.preventDefault();
            }
        });

        calendarContainer.addEventListener('mousemove', (e) => {
            if (!isDragging || !startCell) return;
            const currentCell = e.target.closest('.calendar-day-cell-body');
            if (currentCell && currentCell.dataset.apartment === startCell.dataset.apartment) {
                endCell = currentCell;
                const allCellsInRow = Array.from(startCell.parentElement.children);
                const startIndex = allCellsInRow.indexOf(startCell);
                const endIndex = allCellsInRow.indexOf(endCell);
                document.querySelectorAll('.selection-in-progress').forEach(c => c.classList.remove('selection-in-progress'));
                for (let i = Math.min(startIndex, endIndex); i <= Math.max(startIndex, endIndex); i++) {
                    allCellsInRow[i].classList.add('selection-in-progress');
                }
            }
        });

        window.addEventListener('mouseup', () => {
            if (isDragging && startCell && endCell) {
                const apartment = startCell.dataset.apartment;
                const date1 = new Date(startCell.dataset.date + 'T00:00:00');
                const date2 = new Date(endCell.dataset.date + 'T00:00:00');
                const checkin = (date1 < date2 ? date1 : date2).toISOString().split('T')[0];
                const checkout = (date1 > date2 ? date1 : date2).toISOString().split('T')[0];
                appModals.openReservationModal();
                setTimeout(() => {
                    document.getElementById('apartment-select').value = apartment;
                    document.getElementById('checkin-date').value = checkin;
                    document.getElementById('checkout-date').value = checkout;
                }, 100);
            }
            isDragging = false;
            startCell = null;
            endCell = null;
            setTimeout(() => document.querySelectorAll('.selection-in-progress').forEach(c => c.classList.remove('selection-in-progress')), 100);
        });
    }

    // --- Lógica de Login ---
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const togglePasswordBtn = document.getElementById('toggle-login-password');
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');
    const rememberMeCheckbox = document.getElementById('remember-me');

    // Pre-preeche o usuário se salvo
    const savedUsername = localStorage.getItem('saved_username');
    if (savedUsername && usernameInput) {
        usernameInput.value = savedUsername;
        if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
    }

    // Alternar visibilidade da senha
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Troca o ícone (Lucide eye vs eye-off)
            const icon = togglePasswordBtn.querySelector('i');
            if (icon) {
                const iconName = type === 'password' ? 'eye' : 'eye-off';
                icon.setAttribute('data-lucide', iconName);
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Busca segura de valores (aceita ID ou Nome)
            const username = loginForm.elements.username?.value || document.getElementById('username')?.value;
            const password = loginForm.elements.password?.value || document.getElementById('password')?.value;
            const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

            if (!username || !password) {
                alert('Por favor, preencha usuário e senha.');
                return;
            }

            if (loginError) loginError.textContent = '';

            const data = await api.login(username, password);
            if (data.accessToken) {
                if (rememberMe) {
                    localStorage.setItem('saved_username', username);
                } else {
                    localStorage.removeItem('saved_username');
                }

                localStorage.setItem('authToken', data.accessToken);
                document.getElementById('login-screen').classList.add('hidden');
                
                // Força recarregamento para inicializar o app com o novo token
                window.location.reload();
            } else {
                if (loginError) loginError.textContent = 'Erro ao realizar login. Verifique as credenciais.';
            }
        } catch (error) {
            console.error('Erro no Login:', error);
            if (loginError) loginError.textContent = error.message || 'Falha na conexão com o servidor.';
            alert('Falha no login: ' + (error.message || 'Erro desconhecido'));
        }
    });

    // Fecha os menus dropdown do proprietário se clicar fora
    document.addEventListener('click', (e) => {
        const desktopDropdown = document.getElementById('owner-profile-dropdown');
        const mobileDropdown = document.getElementById('owner-profile-dropdown-mobile');
        const desktopBtn = document.getElementById('owner-profile-btn');
        const mobileContainer = document.getElementById('owner-profile-menu-mobile');
        if (desktopDropdown && desktopBtn && !desktopDropdown.contains(e.target) && !desktopBtn.contains(e.target)) desktopDropdown.classList.add('hidden');
        if (mobileDropdown && mobileContainer && !mobileContainer.contains(e.target)) mobileDropdown.classList.add('hidden');
    });
    // Navegação do calendário com as setas do teclado
    document.addEventListener('keydown', (e) => {
        if (state.currentView !== 'calendar' || !calendarScrollArea) return;
        const scrollAmount = 150;
        if (e.key === 'ArrowLeft') {
            calendarScrollArea.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            calendarScrollArea.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            e.preventDefault();
        }
    });

    // Delegação de evento para redimensionar reserva no calendário
    calendarContainer.addEventListener('mousedown', (e) => {
        const handle = e.target.closest('.resize-handle');
        if (handle) {
            const barWrapper = handle.closest('.reservation-bar-wrapper');
            const barElement = barWrapper.querySelector('.reservation-bar');
            // O ID da reserva está no onclick da barra
            const onclickAttr = barElement.getAttribute('onclick');
            const match = onclickAttr.match(/openReservationModal\('([^']+)'\)/);
            if (match) {
                const reservationId = match[1];
                const reservation = state.reservations.find(r => r.id === reservationId);
                if (reservation) ui.initiateResize(e, reservation, barWrapper);
            }
        }
    });
}
