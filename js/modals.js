import { apartments } from './config.js';
import { formatCPF, formatPhone } from './utils.js';
import * as api from './api.js';

// --- Funções de Modais Customizados (Alert/Confirm) ---

export function showCustomModal({ title, message, buttons }) {
    const container = document.getElementById('custom-modal-container');
    const modalTitle = document.getElementById('custom-modal-title');
    const modalMessage = document.getElementById('custom-modal-message');
    const modalButtons = document.getElementById('custom-modal-buttons');

    modalTitle.textContent = title;
    modalMessage.innerHTML = message; // Use innerHTML to allow for bold tags etc.
    modalButtons.innerHTML = '';

    buttons.forEach(btn => {
        const buttonEl = document.createElement('button');
        buttonEl.className = `btn ${btn.class}`;
        if (btn.style) {
            buttonEl.setAttribute('style', btn.style);
        }
        buttonEl.textContent = btn.text;
        buttonEl.onclick = () => {
            container.classList.add('hidden');
            if (btn.onClick) btn.onClick();
        };
        modalButtons.appendChild(buttonEl);
    });
    container.classList.remove('hidden');
}

export function showAlert(message) {
    showCustomModal({
        title: 'Aviso',
        message,
        buttons: [{ text: 'OK', class: 'btn-primary' }]
    });
}

export function showConfirm(message, onConfirm) {
    showCustomModal({
        title: 'Confirmação',
        message,
        buttons: [
            { text: 'Cancelar', class: 'btn-secondary' },
            { text: 'Confirmar', class: 'btn-primary', style: 'background-color: var(--brand-red); border-color: var(--brand-red);', onClick: onConfirm }
        ]
    });
}

/**
 * Exibe um modal com um campo de input para o usuário.
 * @param {object} options - Opções para o prompt.
 * @param {string} options.title - O título do modal.
 * @param {string} options.message - A mensagem a ser exibida.
 * @param {string} options.placeholder - O placeholder para o campo de input.
 * @param {string} [options.inputType='textarea'] - O tipo de input ('textarea' ou 'number').
 * @param {function(string): void} options.onConfirm - Callback a ser executado com o valor do input.
 */
export function showPrompt({ title, message, placeholder, inputType = 'textarea', onConfirm }) {
    const inputHtml = inputType === 'number'
        ? `<input id="prompt-input" type="number" step="0.01" min="0" class="w-full mt-4 px-3 py-2 border rounded-md bg-surface-container-high" placeholder="${placeholder}">`
        : `<textarea id="prompt-input" class="w-full mt-4 px-3 py-2 border rounded-md bg-surface-container-high" rows="2" placeholder="${placeholder}"></textarea>`;

    const messageWithInput = `
        ${message}
        ${inputHtml}
    `;
    showCustomModal({
        title,
        message: messageWithInput,
        buttons: [
            { text: 'Cancelar', class: 'btn-secondary' },
            {
                text: 'Confirmar', class: 'btn-primary', onClick: () => {
                    const value = document.getElementById('prompt-input').value;
                    if (onConfirm) onConfirm(value);
                }
            }
        ]
    });
}
// --- Funções de Validação e População de Formulários ---

function validateField(field) {
    field.classList.remove('is-valid', 'is-invalid');
    if (!field.hasAttribute('required') && field.value.trim() === '') {
        return;
    }
    let isValid = true;
    if (field.hasAttribute('required') && field.value.trim() === '') {
        isValid = false;
    }
    if (isValid && field.type === 'email' && field.value.trim() !== '') {
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
    }
    field.classList.add(isValid ? 'is-valid' : 'is-invalid');
}

export function populateApartmentSelect(properties, selectedValue = null) {
    const select = document.getElementById('apartment-select');
    if (!properties) return;
    select.innerHTML = '<option value="" disabled selected>Selecione...</option>' + properties.map(prop => `<option value="${prop.name}">${prop.name}</option>`).join('');
    if (selectedValue) select.value = selectedValue;
}

export function populateGuestSelect(guests, selectedValue = null) {
    const select = document.getElementById('guest-select');

    if (guests.length === 0) {
        select.innerHTML = `<option value="" disabled>Cadastre um hóspede primeiro</option>`;
        select.value = '';
        return;
    }
    select.innerHTML = '<option value="" disabled selected>Selecione...</option>' + guests.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    if (selectedValue) select.value = selectedValue;
}

// --- Modal de Reserva ---

export function openReservationModal(id = null, reservations, guests) {
    const modal = document.getElementById('reservation-modal');
    const modalContent = modal.querySelector('.card');
    const form = document.getElementById('reservation-form');
    const modalTitle = document.getElementById('modal-title');
    const reservationIdInput = document.getElementById('reservation-id');
    const deleteBtn = document.getElementById('delete-reservation-btn');
    const cancelReservationBtn = document.getElementById('cancel-reservation-btn');
    const approveReservationBtn = document.getElementById('approve-reservation-btn');

    const isOwner = window.app.state.userRole === 'owner';
    const isAdmin = window.app.state.userRole === 'admin';
    const ownerApartment = isOwner ? window.app.state.properties[0]?.name : null;

    form.reset();
    reservationIdInput.value = '';
    deleteBtn.classList.add('hidden');
    cancelReservationBtn.classList.add('hidden');
    if (approveReservationBtn) approveReservationBtn.classList.add('hidden');

    // Re-habilita todos os campos antes de abrir
    form.querySelectorAll('input, select, textarea').forEach(field => {
        field.disabled = false;
        field.classList.remove('is-valid', 'is-invalid');
    });
    document.getElementById('add-new-guest-from-reservation-btn').disabled = false;

    populateApartmentSelect(window.app.state.properties);
    populateGuestSelect(guests);

    document.getElementById('adults-count').value = 1;
    document.getElementById('children-count').value = 0;
    document.getElementById('pet-included').checked = false;
    updateAdditionalGuestsUI();

    // Simplifica o modal para o proprietário
    const apartmentSelect = document.getElementById('apartment-select');
    const statusSelect = document.getElementById('status-select');
    const priceInput = document.getElementById('reservation-price');
    const paymentStatusSelect = document.getElementById('payment-status-select');

    // Esconde campos de admin por padrão, e re-exibe se não for proprietário
    statusSelect.parentElement.style.display = isOwner ? 'none' : 'block';
    priceInput.parentElement.parentElement.style.display = isOwner ? 'none' : 'grid';
    paymentStatusSelect.parentElement.style.display = isOwner ? 'none' : 'block';

    if (isOwner) {
        statusSelect.value = 'pending-approval';
        if (ownerApartment) {
            apartmentSelect.value = ownerApartment;
            apartmentSelect.disabled = true;
        }
    } else {
        apartmentSelect.disabled = false;
    }

    if (id) {
        const reservation = reservations.find(r => r.id === id);
        if (reservation) {
            const canOwnerEdit = isOwner && reservation.status === 'pending-approval';
            modalTitle.textContent = 'Editar Reserva';
            reservationIdInput.value = reservation.id;
            document.getElementById('guest-select').value = reservation.guestId;
            document.getElementById('apartment-select').value = reservation.apartment;
            document.getElementById('checkin-date').value = reservation.checkin;
            document.getElementById('checkout-date').value = reservation.checkout;
            document.getElementById('checkin-time').value = reservation.checkinTime || '';
            document.getElementById('checkout-time').value = reservation.checkoutTime || '';
            document.getElementById('status-select').value = reservation.status;
            document.getElementById('adults-count').value = reservation.adults || 1;
            document.getElementById('children-count').value = reservation.children || 0;
            document.getElementById('pet-included').checked = reservation.pet || false;
            document.getElementById('vehicle-model').value = reservation.vehicleModel || '';
            document.getElementById('vehicle-type').value = reservation.vehicleType || '';
            document.getElementById('vehicle-plate').value = reservation.vehiclePlate || '';
            document.getElementById('vehicle-color').value = reservation.vehicleColor || '';
            document.getElementById('reservation-price').value = reservation.price || '';
            document.getElementById('reservation-notes').value = reservation.notes || '';
            document.getElementById('payment-status-select').value = reservation.paymentStatus || 'pending';
            document.getElementById('platform-select').value = reservation.platform || 'direct';
            deleteBtn.classList.remove('hidden');
            cancelReservationBtn.classList.remove('hidden');
            deleteBtn.onclick = () => window.app.handlers.deleteReservationHandler(reservation.id);
            cancelReservationBtn.onclick = () => window.app.handlers.cancelReservationHandler(reservation.id);

            if (isAdmin && reservation.status === 'pending-approval' && approveReservationBtn) {
                approveReservationBtn.classList.remove('hidden');
                approveReservationBtn.onclick = () => window.app.handlers.approveReservationHandler(reservation.id);
            }

            // Se for proprietário e a reserva NÃO estiver pendente de aprovação, torna o form read-only
            if (isOwner && !canOwnerEdit) {
                form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
                document.getElementById('add-new-guest-from-reservation-btn').disabled = true;
                // Esconde os botões de salvar/cancelar, mantendo apenas o de fechar
                document.getElementById('cancel-btn').style.display = 'none';
                document.querySelector('#reservation-form button[type="submit"]').style.display = 'none';
            }

            updateAdditionalGuestsUI(reservation);
        }
    } else {
        modalTitle.textContent = 'Nova Reserva';
        document.getElementById('platform-select').value = 'direct';
    }

    // Restaura visibilidade padrão dos botões de controle
    document.getElementById('cancel-btn').style.display = 'inline-flex';
    document.querySelector('#reservation-form button[type="submit"]').style.display = 'inline-flex';

    if (document.getElementById('checkin-date').value) validateField(document.getElementById('checkin-date'));
    if (document.getElementById('checkout-date').value) validateField(document.getElementById('checkout-date'));

    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

export function closeReservationModal() {
    const modal = document.getElementById('reservation-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    // Re-habilita todos os campos ao fechar
    modal.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = false);
    setTimeout(() => modal.classList.add('hidden'), 200);
}

function updateAdditionalGuestsUI(reservation = null) {
    const adultsCountInput = document.getElementById('adults-count');
    const childrenCountInput = document.getElementById('children-count');
    const additionalGuestsSection = document.getElementById('additional-guests-section');
    const additionalGuestsList = document.getElementById('additional-guests-list');

    const adults = parseInt(adultsCountInput.value, 10) || 0;
    const children = parseInt(childrenCountInput.value, 10) || 0;
    const totalGuests = adults + children;

    additionalGuestsList.innerHTML = '';

    if (totalGuests > 1) {
        additionalGuestsSection.classList.remove('hidden');
        for (let i = 2; i <= totalGuests; i++) {
            const guestName = reservation?.additionalGuests?.[i - 2] || '';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 additional-guest-name';
            input.placeholder = `Nome do Hóspede ${i}`;
            input.value = guestName;
            additionalGuestsList.appendChild(input);
        }
    } else {
        additionalGuestsSection.classList.add('hidden');
    }
}

// --- Modal de Hóspede ---

// --- Estado local dos documentos do hóspede ---
let guestDocumentsState = [];
const MAX_DOCUMENTS = 2;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Retorna o estado atual dos documentos para uso externo (saveGuestHandler).
 */
export function getGuestDocumentsState() {
    return guestDocumentsState;
}

export function openGuestModal(id = null, onSaveCallback = null) {
    const modal = document.getElementById('guest-modal');
    const modalContent = modal.querySelector('.card');
    const form = document.getElementById('guest-form');
    const modalTitle = document.getElementById('guest-modal-title');
    const guestIdInput = document.getElementById('guest-id');
    const photoPreview = document.getElementById('guest-photo-preview');
    const photoUploadBtn = document.getElementById('guest-photo-upload-btn');
    const guests = window.app.state.guests;

    window.app.state.onGuestSaveCallback = onSaveCallback || null;

    form.reset();
    guestIdInput.value = '';
    document.getElementById('guest-suggestions-list').classList.add('hidden');
    document.getElementById('existing-guest-info').classList.add('hidden');
    form.querySelectorAll('input, select, textarea').forEach(field => field.classList.remove('is-valid', 'is-invalid'));

    // Reset documentos
    guestDocumentsState = [];
    renderDocumentPreviews();

    photoPreview.src = 'https://placehold.co/128'; // Reset to placeholder
    if (id) {
        const guest = guests.find(g => g.id === id);
        if (guest) {
            modalTitle.textContent = 'Editar Hóspede';
            guestIdInput.value = guest.id;
            document.getElementById('guest-name').value = guest.name;
            document.getElementById('guest-phone').value = guest.phone || '';
            document.getElementById('guest-email').value = guest.email || '';
            document.getElementById('guest-doc').value = guest.doc || '';
            document.getElementById('guest-notes').value = guest.notes || '';
            if (guest.photoUrl) {
                photoPreview.src = guest.photoUrl;
            }
            // Carrega documentos existentes
            if (guest.documents && guest.documents.length > 0) {
                // Ao carregar a lista inicial de convidados, podemos não ter recebido os 'dados' (base64)
                guestDocumentsState = [...guest.documents];
                renderDocumentPreviews();

                // Se algum documento não tiver o campo data, precisamos buscar do servidor
                const needsDetails = guestDocumentsState.some(doc => !doc.data);
                if (needsDetails) {
                    api.getGuestDocuments(id).then(fullDocsResult => {
                        if (fullDocsResult && fullDocsResult.documents) {
                            guestDocumentsState = fullDocsResult.documents;
                            renderDocumentPreviews();
                        }
                    }).catch(err => console.error("Erro ao carregar os detalhes do documento: ", err));
                }
            }
        }
    } else {
        modalTitle.textContent = 'Novo Hóspede';
    }

    // Garante que o upload de foto esteja sempre funcional
    setupPhotoUpload();
    // Garante que o upload de documentos esteja funcional
    setupDocumentUpload();

    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

let photoUploadInitialized = false;

function setupPhotoUpload() {
    if (photoUploadInitialized) return;
    photoUploadInitialized = true;

    const photoUploadInput = document.getElementById('guest-photo-upload');
    const photoUploadBtn = document.getElementById('guest-photo-upload-btn');
    const photoPreview = document.getElementById('guest-photo-preview');

    photoUploadBtn.addEventListener('click', () => photoUploadInput.click());
    photoUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => { photoPreview.src = e.target.result; };
            reader.readAsDataURL(file);
        }
    });

    // Garante que as máscaras de formatação estejam funcionais sem duplicar eventos
    document.getElementById('guest-doc').addEventListener('input', (e) => e.target.value = formatCPF(e.target.value));
    document.getElementById('guest-phone').addEventListener('input', (e) => e.target.value = formatPhone(e.target.value));
}

export function closeGuestModal() {
    const modal = document.getElementById('guest-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    guestDocumentsState = []; // Limpa o estado de documentos
    setTimeout(() => modal.classList.add('hidden'), 200);
}

// --- Upload de Documentos ---

let docUploadInitialized = false;

function setupDocumentUpload() {
    if (docUploadInitialized) return;
    docUploadInitialized = true;

    const dropzone = document.getElementById('guest-doc-dropzone');
    const fileInput = document.getElementById('guest-doc-upload');

    // Click na dropzone abre o seletor de arquivos
    dropzone.addEventListener('click', () => {
        if (guestDocumentsState.length >= MAX_DOCUMENTS) {
            showAlert(`Limite de ${MAX_DOCUMENTS} documentos atingido.`);
            return;
        }
        fileInput.click();
    });

    // Drag & Drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        handleDocumentFiles(e.dataTransfer.files);
    });

    // Seleção via input
    fileInput.addEventListener('change', (e) => {
        handleDocumentFiles(e.target.files);
        fileInput.value = ''; // Reset para permitir re-seleção do mesmo arquivo
    });
}

function handleDocumentFiles(files) {
    const remainingSlots = MAX_DOCUMENTS - guestDocumentsState.length;
    if (remainingSlots <= 0) {
        showAlert(`Limite de ${MAX_DOCUMENTS} documentos atingido.`);
        return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    let processed = 0;

    filesToProcess.forEach(file => {
        // Validar tipo
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        if (!isImage && !isPDF) {
            showAlert(`Arquivo "${file.name}" não suportado. Use JPG, PNG ou PDF.`);
            return;
        }

        // Validar tamanho
        if (file.size > MAX_FILE_SIZE_BYTES) {
            showAlert(`Arquivo "${file.name}" excede ${MAX_FILE_SIZE_MB}MB.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            guestDocumentsState.push({
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result // Base64 data URL
            });
            processed++;
            renderDocumentPreviews();
        };
        reader.readAsDataURL(file);
    });
}

function renderDocumentPreviews() {
    const container = document.getElementById('guest-doc-previews');
    const dropzone = document.getElementById('guest-doc-dropzone');
    if (!container) return;

    container.innerHTML = '';

    // Esconde a dropzone se atingiu o limite
    if (guestDocumentsState.length >= MAX_DOCUMENTS) {
        dropzone.style.display = 'none';
    } else {
        dropzone.style.display = 'block';
    }

    guestDocumentsState.forEach((doc, index) => {
        const isImage = doc.type.startsWith('image/');
        const sizeKB = doc.size ? (doc.size / 1024).toFixed(0) + ' KB' : '';

        const thumbnailHtml = isImage
            ? `<img src="${doc.data}" alt="${doc.name}" class="preview-thumbnail cursor-pointer" onclick="window.app.modals.viewDocument(${index})">`
            : `<div class="preview-pdf cursor-pointer" onclick="window.app.modals.viewDocument(${index})"><i data-lucide="file-text" class="w-10 h-10"></i></div>`;

        const item = document.createElement('div');
        item.className = 'doc-preview-item';
        item.innerHTML = `
            ${thumbnailHtml}
            <div class="preview-info">
                <p class="preview-name" title="${doc.name}">${doc.name}</p>
                ${sizeKB ? `<p class="preview-size">${sizeKB}</p>` : ''}
            </div>
            <button type="button" class="doc-preview-remove" onclick="window.app.modals.removeDocument(${index})" title="Remover">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        `;
        container.appendChild(item);
    });

    // Re-renderiza ícones Lucide nos novos elementos
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Remove um documento pelo índice.
 */
export function removeDocument(index) {
    guestDocumentsState.splice(index, 1);
    renderDocumentPreviews();
}

/**
 * Abre o visualizador de arquivos para um documento.
 */
export function viewDocument(index) {
    const doc = guestDocumentsState[index];
    if (!doc) return;

    const modal = document.getElementById('file-viewer-modal');
    const title = document.getElementById('file-viewer-title');
    const content = document.getElementById('file-viewer-content');
    const downloadBtn = document.getElementById('file-viewer-download-btn');
    const closeBtn = document.getElementById('file-viewer-close-btn');

    title.textContent = doc.name;
    downloadBtn.href = doc.data;
    downloadBtn.download = doc.name;

    const isImage = doc.type.startsWith('image/');
    if (isImage) {
        content.innerHTML = `<img src="${doc.data}" alt="${doc.name}" class="max-w-full max-h-[70vh] rounded-lg">`;
    } else {
        content.innerHTML = `<iframe src="${doc.data}" class="w-full h-[70vh] rounded-lg" frameborder="0"></iframe>`;
    }

    modal.classList.remove('hidden');
    const modalContent = modal.querySelector('.card');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

export function searchExistingGuests(guests) {
    const guestNameInput = document.getElementById('guest-name');
    const guestDocInput = document.getElementById('guest-doc');
    const guestIdInput = document.getElementById('guest-id');
    const guestSuggestionsList = document.getElementById('guest-suggestions-list');
    const existingGuestInfo = document.getElementById('existing-guest-info');
    const guestModalTitle = document.getElementById('guest-modal-title');

    const nameTerm = guestNameInput.value.toLowerCase().trim();
    const docTerm = guestDocInput.value.replace(/[^\d]/g, '').trim();

    if (guestIdInput.value) {
        const loadedGuest = guests.find(g => g.id === guestIdInput.value);
        if (loadedGuest && (loadedGuest.name !== guestNameInput.value || (guestDocInput.value && loadedGuest.doc !== guestDocInput.value))) {
            guestIdInput.value = '';
            guestModalTitle.textContent = 'Novo Hóspede';
            existingGuestInfo.classList.add('hidden');
        }
    }

    if (nameTerm.length < 3 && docTerm.length < 3) {
        guestSuggestionsList.innerHTML = '';
        guestSuggestionsList.classList.add('hidden');
        return;
    }

    const matches = guests.filter(g => {
        const nameMatch = nameTerm.length >= 3 && g.name.toLowerCase().includes(nameTerm);
        const docMatch = docTerm.length >= 3 && g.doc && g.doc.replace(/[^\d]/g, '').includes(docTerm);
        return nameMatch || docMatch;
    }).slice(0, 5);

    if (matches.length > 0) {
        guestSuggestionsList.innerHTML = matches.map(g => `
            <div class="p-3 border-b border-outline-variant/20 dark:border-outline-variant/20 last:border-b-0 hover:bg-surface-variant dark:hover:bg-gray-700 cursor-pointer" data-guest-id="${g.id}">
                <p class="font-semibold text-sm">${g.name}</p>
                <p class="text-xs text-outline">${g.doc || 'Sem documento'}</p>
            </div>
        `).join('');
        guestSuggestionsList.classList.remove('hidden');
    } else {
        guestSuggestionsList.innerHTML = '';
        guestSuggestionsList.classList.add('hidden');
    }
}

export function selectExistingGuest(guestId, guests) {
    const guest = guests.find(g => g.id === guestId);
    if (guest) {
        document.getElementById('guest-modal-title').textContent = 'Editar Hóspede';
        document.getElementById('guest-id').value = guest.id;
        document.getElementById('guest-name').value = guest.name;
        document.getElementById('guest-phone').value = guest.phone || '';
        document.getElementById('guest-email').value = guest.email || '';
        document.getElementById('guest-doc').value = guest.doc || '';
        document.getElementById('guest-notes').value = guest.notes || '';
        document.getElementById('guest-suggestions-list').classList.add('hidden');
        document.getElementById('existing-guest-info').classList.remove('hidden');
    }
}

// --- Modal de Funcionário ---

export function openEmployeeModal(id = null, employees) {
    const modal = document.getElementById('employee-modal');
    const modalContent = modal.querySelector('.card');
    const form = document.getElementById('employee-form');
    const modalTitle = document.getElementById('employee-modal-title');
    const employeeIdInput = document.getElementById('employee-id');

    form.reset();
    employeeIdInput.value = '';
    if (id) {
        const employee = employees.find(e => e.id === id);
        if (employee) {
            modalTitle.textContent = 'Editar Funcionário';
            employeeIdInput.value = employee.id;
            document.getElementById('employee-name').value = employee.name;
            document.getElementById('employee-role').value = employee.role || '';
            document.getElementById('employee-phone').value = employee.phone || '';
            document.getElementById('employee-doc').value = employee.doc || '';
        }
    } else {
        modalTitle.textContent = 'Novo Funcionário';
    }
    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

export function closeEmployeeModal() {
    const modal = document.getElementById('employee-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

// --- Modal de Despesa ---

export function openExpenseModal(id = null, expenses) {
    const modal = document.getElementById('expense-modal');
    const modalContent = modal.querySelector('.card');
    const form = document.getElementById('expense-form');
    const modalTitle = document.getElementById('expense-modal-title');
    const expenseIdInput = document.getElementById('expense-id');
    const deleteExpenseBtn = document.getElementById('delete-expense-btn');

    form.reset();
    expenseIdInput.value = '';
    deleteExpenseBtn.classList.add('hidden');
    if (id) {
        const expense = expenses.find(e => e.id == id); // Use == for potential type mismatch
        if (expense) {
            modalTitle.textContent = 'Editar Despesa';
            expenseIdInput.value = expense.id;
            document.getElementById('expense-description').value = expense.description;
            document.getElementById('expense-amount').value = expense.amount;
            document.getElementById('expense-date').value = expense.date;
            document.getElementById('expense-category').value = expense.category;
            deleteExpenseBtn.classList.remove('hidden');
        }
    } else {
        modalTitle.textContent = 'Nova Despesa';
        document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    }
    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

export function closeExpenseModal() {
    const modal = document.getElementById('expense-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

// --- Modal de Usuário ---

export function openUserModal(userId = null, defaultRole = 'staff') {
    const modal = document.getElementById('user-modal');
    const modalContent = modal.querySelector('.card');
    const form = document.getElementById('user-form');
    const modalTitle = document.getElementById('user-modal-title');
    const userIdInput = document.getElementById('user-id');
    const passwordInput = document.getElementById('user-password');
    const usernameInput = document.getElementById('user-username');
    const roleSelect = document.getElementById('user-role-select');
    const apartmentField = document.getElementById('user-apartment-field');
    const apartmentInput = document.getElementById('user-apartments-input');
    const ownerOptions = document.getElementById('user-owner-options');
    const phoneInput = document.getElementById('user-phone');
    const sendInstructions = document.getElementById('user-send-instructions');

    const toggleApartmentField = () => {
        const isOwner = roleSelect.value === 'owner';
        apartmentField.classList.toggle('hidden', !isOwner);
        ownerOptions.classList.toggle('hidden', !isOwner);
        apartmentInput.required = isOwner;
    };

    // Remove event listeners antigos para evitar duplicação (caso a função seja chamada múltiplas vezes)
    roleSelect.removeEventListener('change', toggleApartmentField);
    roleSelect.addEventListener('change', toggleApartmentField);

    form.reset();
    userIdInput.value = '';

    if (userId) {
        const user = window.app.state.users.find(u => u._id === userId);
        if (user) {
            modalTitle.textContent = 'Editar Usuário';
            userIdInput.value = user._id;
            usernameInput.value = user.username;
            usernameInput.disabled = true; // Não permite editar o nome de usuário
            roleSelect.value = user.role;
            passwordInput.placeholder = 'Deixe em branco para não alterar';
            passwordInput.removeAttribute('required');

            if (user.apartments && Array.isArray(user.apartments)) {
                apartmentInput.value = user.apartments.join(', ');
            } else if (user.apartment) {
                apartmentInput.value = user.apartment;
            } else {
                apartmentInput.value = '';
            }

            if (phoneInput) {
                phoneInput.value = user.phone || '';
            }
        }
    } else {
        modalTitle.textContent = 'Novo Usuário';
        usernameInput.disabled = false;
        passwordInput.placeholder = 'Senha';
        passwordInput.setAttribute('required', 'required');
        roleSelect.value = defaultRole;
        apartmentInput.value = '';
        phoneInput.value = '';
        sendInstructions.checked = false;
    }

    toggleApartmentField();

    // Garante que o campo de apartamento seja exibido corretamente ao abrir com base na função padrão ou salva
    toggleApartmentField();

    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

export function closeUserModal() {
    const modal = document.getElementById('user-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

// --- Modal de Tarefas (Limpeza, Manutenção, etc.) ---

export function openTaskModal(type) {
    const modal = document.getElementById('task-modal');
    const modalContent = modal.querySelector('.card');
    const form = document.getElementById('task-form');
    const modalTitle = document.getElementById('task-modal-title');
    const taskIdInput = document.getElementById('task-id');
    const taskTypeInput = document.getElementById('task-type');
    const taskApartmentSelect = document.getElementById('task-apartment-select');
    const maintenanceFields = document.getElementById('maintenance-fields');
    const blockingFields = document.getElementById('blocking-fields');
    const cleaningFields = document.getElementById('cleaning-fields');

    form.reset();
    taskIdInput.value = '';
    taskTypeInput.value = type;

    taskApartmentSelect.innerHTML = window.app.state.properties.map(prop => `<option value="${prop.name}">${prop.name}</option>`).join('');

    maintenanceFields.classList.add('hidden');
    blockingFields.classList.add('hidden');
    cleaningFields.classList.add('hidden');

    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('task-start-date').value = todayStr;
    document.getElementById('task-end-date').value = todayStr;

    switch (type) {
        case 'cleaning':
            modalTitle.textContent = 'Agendar Limpeza';
            cleaningFields.classList.remove('hidden');
            break;
        case 'maintenance':
            modalTitle.textContent = 'Agendar Manutenção';
            maintenanceFields.classList.remove('hidden');
            break;
        case 'blocked':
            modalTitle.textContent = 'Bloquear Apartamento';
            blockingFields.classList.remove('hidden');
            break;
    }

    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

export function openTaskModalForEdit(id, reservations) {
    const task = reservations.find(r => r.id === id);
    if (!task || task.guestId !== 'TASK') return;

    const modal = document.getElementById('task-modal');
    const modalContent = modal.querySelector('.card');
    const form = document.getElementById('task-form');
    const modalTitle = document.getElementById('task-modal-title');
    const taskIdInput = document.getElementById('task-id');
    const taskTypeInput = document.getElementById('task-type');
    const taskApartmentSelect = document.getElementById('task-apartment-select');
    const maintenanceFields = document.getElementById('maintenance-fields');
    const blockingFields = document.getElementById('blocking-fields');
    const cleaningFields = document.getElementById('cleaning-fields');

    form.reset();
    taskIdInput.value = task.id;
    taskTypeInput.value = task.status;

    taskApartmentSelect.innerHTML = window.app.state.properties.map(prop => `<option value="${prop.name}">${prop.name}</option>`).join('');
    taskApartmentSelect.value = task.apartment;

    document.getElementById('task-start-date').value = task.checkin;
    document.getElementById('task-end-date').value = task.checkout;
    document.getElementById('task-start-time').value = task.checkinTime || '';
    document.getElementById('task-end-time').value = task.checkoutTime || '';

    maintenanceFields.classList.add('hidden');
    blockingFields.classList.add('hidden');
    cleaningFields.classList.add('hidden');

    switch (task.status) {
        case 'cleaning':
            modalTitle.textContent = 'Editar Limpeza';
            cleaningFields.classList.remove('hidden');
            // Extrai o nome do prestador das notas, se existir
            if (task.notes && task.notes.startsWith('Prestador: ')) {
                document.getElementById('task-provider').value = task.notes.replace('Prestador: ', '');
            }
            break;
        case 'maintenance':
            modalTitle.textContent = 'Editar Manutenção';
            maintenanceFields.classList.remove('hidden');
            break;
        case 'blocked':
            modalTitle.textContent = 'Editar Bloqueio';
            blockingFields.classList.remove('hidden');
            break;
    }

    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

export function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

// --- Modal de Edição de Propriedade ---

export function openPropertyEditModal(id) {
    const modal = document.getElementById('property-edit-modal');
    const modalContent = modal.querySelector('.card');
    const form = document.getElementById('property-edit-form');
    const property = window.app.state.properties.find(p => p._id === id);

    if (!property) {
        showAlert('Propriedade não encontrada.');
        return;
    }

    form.reset();
    document.getElementById('property-edit-id').value = property._id;
    document.getElementById('property-edit-name').value = property.name;
    document.getElementById('property-edit-capacity').value = property.capacity || '';

    // Preenche as amenidades
    const amenities = property.amenities || {};
    const toggleContainer = document.getElementById('amenities-toggle-container');
    toggleContainer.querySelectorAll('.amenity-toggle').forEach(button => {
        const amenity = button.dataset.amenity;
        button.classList.toggle('active', !!amenities[amenity]);
    });

    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

export function closePropertyEditModal() {
    const modal = document.getElementById('property-edit-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

// --- Modal de Lista de Chats (Admin) ---

export function openChatListModal() {
    const modal = document.getElementById('chat-list-modal');
    const modalContent = modal.querySelector('.card');
    const title = modal.querySelector('h3');
    if (title) title.textContent = 'Conversas';
    
    window.app.ui.renderChatList(window.app.state.users);
    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

export function closeChatListModal() {
    const modal = document.getElementById('chat-list-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => modal.classList.add('hidden'), 200);
}


// --- Outros Modais (Detalhes, Configurações) ---

export function closeApartmentDetailsModal() {
    const modal = document.getElementById('apartment-details-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

export function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const modalContent = modal.querySelector('.card');
    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

export function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

// --- Modal de Alterar Senha ---

export function openChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    const modalContent = modal.querySelector('.card');
    const form = document.getElementById('change-password-form');
    form.reset();
    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

export function closeChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => modal.classList.add('hidden'), 200);
}


// --- Anexar funções ao objeto global para acesso via onclick ---

export function attachModalFunctionsToWindow() {
    if (!window.app) window.app = {};
    window.app.modals = {
        openReservationModal,
        openGuestModal,
        openEmployeeModal,
        openExpenseModal,
        openUserModal,
        openTaskModal,
        openTaskModalForEdit,
        openPropertyEditModal,
        openChatListModal,
        closeChatListModal,
        openChangePasswordModal,
        closeChangePasswordModal,
        removeDocument,
        viewDocument,
    };
}

export function setupFormValidation() {
    document.querySelectorAll('form').forEach(formElement => {
        formElement.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea')) {
                validateField(e.target);
            }
        });
        formElement.addEventListener('change', (e) => {
            if (e.target.matches('select')) {
                validateField(e.target);
            }
        });
    });

    // Máscaras de formatação
    document.getElementById('guest-doc').addEventListener('input', (e) => e.target.value = formatCPF(e.target.value));
    document.getElementById('guest-phone').addEventListener('input', (e) => e.target.value = formatPhone(e.target.value));
    document.getElementById('employee-doc').addEventListener('input', (e) => e.target.value = formatCPF(e.target.value));
    document.getElementById('employee-phone').addEventListener('input', (e) => e.target.value = formatPhone(e.target.value));

    // UI de hóspedes adicionais
    document.getElementById('adults-count').addEventListener('input', () => updateAdditionalGuestsUI());
    document.getElementById('children-count').addEventListener('input', () => updateAdditionalGuestsUI());
    setupPhotoUpload();
}