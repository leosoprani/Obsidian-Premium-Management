const API_BASE_URL = '/api';

function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}
/**
 * Função genérica para tratar respostas da API.
 * @param {Response} response - O objeto de resposta do fetch.
 * @returns {Promise<any>} - Os dados JSON da resposta.
 * @throws {Error} - Lança um erro se a resposta não for OK.
 */
async function handleResponse(response) {
    if (response.status === 401 || response.status === 403) {
        // Token inválido ou expirado, força o logout
        localStorage.removeItem('authToken');
        window.location.reload();
    }
    if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `Erro na API: ${response.statusText}`;
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } else {
            const errorText = await response.text();
            errorMessage = `Erro inesperado do servidor: ${errorText.substring(0, 200)}...`;
        }
        throw new Error(errorMessage);
    }
    return response.json();
}

/**
 * Busca todos os dados iniciais da aplicação.
 * @returns {Promise<[Array, Array, Array, Array, Array]>}
 */

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

export async function fetchInitialData() {
    const userRole = parseJwt(localStorage.getItem('authToken'))?.role;

    const fetchPromises = [
        fetch(`${API_BASE_URL}/guests`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/reservations`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/employees`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/properties`, { headers: getAuthHeaders() })
    ];

    // Adiciona a busca de despesas apenas se o usuário for admin
    if (userRole === 'admin') {
        fetchPromises.push(fetch(`${API_BASE_URL}/expenses`, { headers: getAuthHeaders() }));
    }

    const responses = await Promise.all(fetchPromises);
    
    const guests = await handleResponse(responses[0]);
    const allReservations = await handleResponse(responses[1]);
    const employees = await handleResponse(responses[2]);
    const properties = await handleResponse(responses[3]);

    // Se o usuário for admin, processa a resposta das despesas, senão, retorna um array vazio.
    const expenses = userRole === 'admin' && responses[4] ? await handleResponse(responses[4]) : [];

    return [guests, allReservations, employees, expenses, properties];
}

/**
 * Salva ou atualiza uma reserva.
 * @param {object} reservationData - Os dados da reserva.
 * @returns {Promise<object>} - A reserva salva.
 */
export async function saveReservation(reservationData) {
    const response = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(reservationData),
    });
    return handleResponse(response);
}

/**
 * Deleta uma reserva.
 * @param {string} reservationId - O ID da reserva.
 * @returns {Promise<object>} - A resposta da API.
 */
export async function deleteReservation(reservationId) {
    const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

/**
 * Salva ou atualiza um hóspede.
 * @param {object} guestData - Os dados do hóspede.
 * @returns {Promise<object>} - O hóspede salvo.
 */
export async function saveGuest(guestData) {
    const response = await fetch(`${API_BASE_URL}/guests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(guestData),
    });
    return handleResponse(response);
}

/**
 * Deleta um hóspede e suas reservas.
 * @param {string} guestId - O ID do hóspede.
 * @returns {Promise<object>} - A resposta da API.
 */
export async function deleteGuest(guestId) {
    const response = await fetch(`${API_BASE_URL}/guests/${guestId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

/**
 * Busca os documentos de um hóspede específico.
 * @param {string} guestId - O ID do hóspede.
 * @returns {Promise<object>} - Os documentos do hóspede.
 */
export async function getGuestDocuments(guestId) {
    const response = await fetch(`${API_BASE_URL}/guests/${guestId}/documents`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

/**
 * Salva ou atualiza um funcionário.
 * @param {object} employeeData - Os dados do funcionário.
 * @returns {Promise<object>} - O funcionário salvo.
 */
export async function saveEmployee(employeeData) {
    const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(employeeData),
    });
    return handleResponse(response);
}

/**
 * Deleta um funcionário.
 * @param {string} employeeId - O ID do funcionário.
 * @returns {Promise<object>} - A resposta da API.
 */
export async function deleteEmployee(employeeId) {
    const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

/**
 * Salva ou atualiza uma tarefa.
 * @param {object} taskData - Os dados da tarefa.
 * @returns {Promise<object>} - A tarefa salva.
 */
export async function saveTask(taskData) {
    const response = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(taskData),
    });
    return handleResponse(response);
}

/**
 * Salva ou atualiza uma despesa.
 * @param {object} expenseData - Os dados da despesa.
 * @returns {Promise<object>} - A despesa salva.
 */
export async function saveExpense(expenseData) {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(expenseData),
    });
    return handleResponse(response);
}

/**
 * Deleta uma despesa.
 * @param {string} expenseId - O ID da despesa.
 * @returns {Promise<object>} - A resposta da API.
 */
export async function deleteExpense(expenseId) {
    const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

/**
 * Envia dados de backup para o servidor para importação.
 * @param {object} backupData - O objeto de dados do backup.
 * @returns {Promise<object>} - A resposta da API.
 */
export async function importBackup(backupData) {
    const response = await fetch(`${API_BASE_URL}/import`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(backupData),
    });
    return handleResponse(response);
}

/**
 * Realiza uma busca global no servidor.
 * @param {string} term - O termo de busca.
 * @returns {Promise<object>} - Os resultados da busca.
 */
export async function searchAllData(term) {
    if (term.length < 2) {
        return { guests: [], reservations: [], employees: [] };
    }
    const response = await fetch(`${API_BASE_URL}/search?term=${encodeURIComponent(term)}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

/**
 * Tenta fazer login na API.
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<object>}
 */
export async function login(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    return handleResponse(response);
}

/**
 * Altera a senha do usuário logado.
 * @param {string} currentPassword 
 * @param {string} newPassword 
 * @returns {Promise<object>}
 */
export async function changePassword(currentPassword, newPassword) {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
    });
    return handleResponse(response);
}


/**
 * Busca todos os usuários.
 * @returns {Promise<Array>}
 */
export async function getUsers() {
    const response = await fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() });
    return handleResponse(response);
}

/**
 * Salva (cria) um novo usuário.
 * @param {object} userData - Os dados do usuário.
 * @returns {Promise<object>}
 */
export async function saveUser(userData) {
    const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
    });
    return handleResponse(response);
}

/**
 * Atualiza um usuário existente.
 * @param {string} userId - O ID do usuário.
 * @param {object} userData - Os dados a serem atualizados (role, password).
 * @returns {Promise<object>}
 */
export async function updateUser(userId, userData) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
    });
    return handleResponse(response);
}

/**
 * Deleta um usuário.
 * @param {string} userId - O ID do usuário.
 * @returns {Promise<object>}
 */
export async function deleteUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE', headers: getAuthHeaders() });
    return handleResponse(response);
}

/**
 * Busca os logs de atividade do sistema.
 * @param {object} filters - Objeto com os filtros (username, startDate, endDate).
 * @returns {Promise<Array>}
 */
export async function getActivityLogs(filters = {}) {
    const params = new URLSearchParams({
        page: filters.page || 1,
        limit: filters.limit || 20,
    });
    if (filters.username) params.append('username', filters.username);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await fetch(`${API_BASE_URL}/logs?${params.toString()}`, { headers: getAuthHeaders() });
    return handleResponse(response);
}

/**
 * Busca todas as propriedades (apartamentos).
 * @returns {Promise<Array>}
 */
export async function getProperties() {
    const response = await fetch(`${API_BASE_URL}/properties`, { headers: getAuthHeaders() });
    return handleResponse(response);
}

/**
 * Salva (cria) uma nova propriedade.
 * @param {object} propertyData - { name: '101' }.
 * @returns {Promise<object>}
 */
export async function saveProperty(propertyData) {
    const response = await fetch(`${API_BASE_URL}/properties`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(propertyData),
    });
    return handleResponse(response);
}

/**
 * Deleta uma propriedade.
 * @param {string} propertyId - O ID da propriedade.
 * @returns {Promise<object>}
 */
export async function deleteProperty(propertyId) {
    const response = await fetch(`${API_BASE_URL}/properties/${propertyId}`, { method: 'DELETE', headers: getAuthHeaders() });
    return handleResponse(response);
}

/**
 * Atualiza uma propriedade existente.
 * @param {string} propertyId - O ID da propriedade.
 * @param {object} propertyData - Os dados a serem atualizados.
 * @returns {Promise<object>}
 */
export async function updateProperty(propertyId, propertyData) {
    const response = await fetch(`${API_BASE_URL}/properties/${propertyId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(propertyData),
    });
    return handleResponse(response);
}

/**
 * Envia uma mensagem para outro usuário.
 * @param {string} to - O nome de usuário do destinatário.
 * @param {string} message - O conteúdo da mensagem.
 * @param {object} file - O objeto de arquivo opcional.
 * @param {string} apartment - O número do apartamento opcional (contexto).
 * @returns {Promise<object>}
 */
export async function sendMessage(to, message, file = null, apartment = null) {
    const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ to, message, file, apartment }),
    });
    return handleResponse(response);
}

/**
 * Busca o histórico de mensagens com um usuário específico.
 * @param {string} partnerUsername - O nome de usuário do parceiro de conversa.
 * @returns {Promise<Array>}
 */
export async function getMessages(partnerUsername) {
    const response = await fetch(`${API_BASE_URL}/messages/${partnerUsername}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

/**
 * Marca as mensagens de um parceiro como lidas.
 * @param {string} partnerUsername - O nome de usuário do parceiro.
 * @returns {Promise<object>}
 */
export async function markMessagesAsRead(partnerUsername) {
    const response = await fetch(`${API_BASE_URL}/messages/read`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ partner: partnerUsername }),
    });
    return handleResponse(response);
}

/**
 * Busca um resumo de mensagens não lidas.
 * @returns {Promise<Array>} - Um array de objetos { from: string, count: number }.
 */
export async function getUnreadSummary() {
    const response = await fetch(`${API_BASE_URL}/messages/unread-summary`, { headers: getAuthHeaders() });
    return handleResponse(response);
}

/**
 * Apaga todo o histórico de chat com um parceiro específico.
 * @param {string} partnerUsername - O nome de usuário do parceiro.
 * @returns {Promise<object>}
 */
export async function clearChatHistory(partnerUsername) {
    const response = await fetch(`${API_BASE_URL}/messages/history/${partnerUsername}`, {
        method: 'DELETE', headers: getAuthHeaders()
    });
    return handleResponse(response);
}