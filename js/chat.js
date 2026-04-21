import * as api from './api.js';
import * as modals from './modals.js';

/**
 * Módulo de Chat
 * Gerencia a abertura, fechamento e renderização de mensagens e arquivos.
 */

// Armazena o arquivo selecionado temporariamente
let selectedFile = null;
let mediaRecorder;
let audioChunks = [];
let recordingTimer;
let recordingStartTime;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

/**
 * Abre o modal de chat com um parceiro específico.
 * @param {string} partnerUsername - O nome de usuário do parceiro de conversa.
 */
export async function openChatModal(partnerUsername) {
    const modal = document.getElementById('chat-modal');
    const modalContent = modal.querySelector('.card');
    const title = document.getElementById('chat-modal-title');
    const partnerInput = document.getElementById('chat-partner-username');
    const fileNameDisplay = document.getElementById('chat-file-name');
    const messageInput = document.getElementById('chat-message-input');
    const clearChatBtn = document.getElementById('clear-current-chat-btn');

    title.textContent = `Conversa com ${partnerUsername}`;
    partnerInput.value = partnerUsername;

    const aptContext = document.getElementById('admin-chat-apartment-context');
    const aptSelect = document.getElementById('chat-apartment-select');

    // Se for admin, verifica se o parceiro tem múltiplos apartamentos
    if (window.app.state.userRole === 'admin' && partnerUsername !== 'admin') {
        const userObj = window.app.state.users.find(u => u.username === partnerUsername);
        if (userObj && userObj.apartments && userObj.apartments.length > 1) {
            aptContext.classList.remove('hidden');
            aptSelect.innerHTML = userObj.apartments.map(apt => `<option value="${apt}">Apto ${apt}</option>`).join('');
            
            // Ao mudar o apartamento no dropdown, recarregar mensagens?
            // Por enquanto, apenas garante que o valor selecionado seja usado no envio.
            aptSelect.onchange = async () => {
                const messages = await api.getMessages(partnerUsername);
                renderChatMessages(messages);
            };
        } else if (userObj && (userObj.apartment || (userObj.apartments && userObj.apartments.length === 1))) {
            // Se tiver apenas um, podemos esconder o seletor ou fixar o valor
            aptContext.classList.add('hidden');
            aptSelect.innerHTML = `<option value="${userObj.apartment || userObj.apartments[0]}">${userObj.apartment || userObj.apartments[0]}</option>`;
        } else {
            aptContext.classList.add('hidden');
            aptSelect.innerHTML = '';
        }
    } else {
        aptContext.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);

    // Limpa o arquivo selecionado e o nome do arquivo ao abrir
    selectedFile = null;
    fileNameDisplay.textContent = '';
    messageInput.required = true;

    // Garante que o botão de enviar esteja no estado correto ao abrir
    toggleChatActionButton();

    // Mostra o botão de limpar chat apenas para o proprietário (que só pode falar com o admin)
    if (window.app.state.userRole === 'owner' && partnerUsername === 'admin') {
        clearChatBtn.classList.remove('hidden');
        clearChatBtn.onclick = () => clearChatHistory(partnerUsername);
    } else {
        clearChatBtn.classList.add('hidden');
    }

    try {
        const messages = await api.getMessages(partnerUsername);
        renderChatMessages(messages);
        await api.markMessagesAsRead(partnerUsername);
        // Atualiza o estado de não lido e a UI
        window.app.ui.updateUnreadState(partnerUsername, 0);
    } catch (error) {
        modals.showAlert('Não foi possível carregar as mensagens.');
    }
}

/**
 * Fecha o modal de chat.
 */
export function closeChatModal() {
    const modal = document.getElementById('chat-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

/**
 * Adiciona uma nova mensagem à interface do chat.
 * @param {object} message - O objeto da mensagem.
 */
export function addMessageToChat(message) {
    const container = document.getElementById('chat-messages-container');
    const currentUser = window.app.state.currentUser.username;
    const userRole = window.app.state.userRole;

    // Verifica se a mensagem pertence ao contexto atual de apartamento
    let selectedApt = null;
    if (userRole === 'owner') {
        selectedApt = window.app.state.selectedApartment;
    } else if (userRole === 'admin') {
        const aptSelect = document.getElementById('chat-apartment-select');
        selectedApt = aptSelect ? aptSelect.value : null;
    }

    if (selectedApt && message.apartment && message.apartment !== selectedApt) {
        // Se a mensagem for de outro apartamento, não adicionamos à bolha atual
        return;
    }

    const isSent = message.from === currentUser;

    let fileHtml = '';
    if (message.file) {
        // Se for uma imagem, mostra uma miniatura clicável
        const fileDataString = JSON.stringify(message.file).replace(/"/g, '&quot;');
        if (message.file.type.startsWith('image/')) {
            fileHtml = `<div class="mt-2 cursor-pointer" onclick='window.app.chat.openFileViewer(${fileDataString})'>
                            <img src="${message.file.data}" alt="${message.file.name}" class="rounded-lg max-w-xs max-h-48 object-cover">
                        </div>`;
        } else if (message.file.type.startsWith('audio/')) {
            const audioId = `audio_${message.timestamp || Date.now()}`;
            fileHtml = `
                <div class="audio-player mt-2 flex items-center gap-3 w-full max-w-xs">
                    <button id="play-btn-${audioId}" class="btn btn-secondary p-0 h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center" onclick="window.app.chat.toggleAudioPlayback('${audioId}')">
                        <i data-lucide="play" class="w-5 h-5"></i>
                    </button>
                    <div class="audio-waveform flex-grow h-8 flex items-center gap-0.5">${generateWaveformBars()}</div>
                    <audio id="${audioId}" src="${message.file.data}" preload="metadata" onended="window.app.chat.onAudioEnded('${audioId}')"></audio>
                </div>`;
        } else {
            // Para outros arquivos, mostra um link para download
            fileHtml = `<div class="mt-2 flex items-center gap-2 p-2 rounded-lg bg-black/10 hover:bg-black/20 cursor-pointer" 
                             onclick='window.app.chat.openFileViewer(${fileDataString})'>
                            <i data-lucide="file-text" class="w-5 h-5 flex-shrink-0"></i>
                            <span class="truncate font-medium">${message.file.name}</span>
                        </div>`;
        }
    }

    const messageEl = document.createElement('div');
    messageEl.className = `flex ${isSent ? 'justify-end' : 'justify-start'}`;
    const aptBadge = message.apartment ? `<span class="chat-bubble-apt">Apto ${message.apartment}</span>` : '';
    
    messageEl.innerHTML = `
        <div class="chat-bubble ${isSent ? 'chat-bubble-sent' : 'chat-bubble-received'}">
            ${aptBadge}
            ${message.message ? `<p>${message.message}</p>` : ''}
            ${fileHtml}
            <p class="chat-timestamp ${isSent ? 'text-right' : 'text-left'}">
                ${new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
        </div>
    `;
    container.appendChild(messageEl);
    window.lucide.createIcons();
    // Rola para a última mensagem
    container.scrollTop = container.scrollHeight;
}

/**
 * Renderiza as mensagens no modal de chat.
 * @param {Array} messages - Array de objetos de mensagem.
 */
export function renderChatMessages(messages) {
    const container = document.getElementById('chat-messages-container');
    const currentUser = window.app.state.currentUser.username;
    const userRole = window.app.state.userRole;

    // Determina qual apartamento filtrar
    let selectedApt = null;
    if (userRole === 'owner') {
        selectedApt = window.app.state.selectedApartment;
    } else if (userRole === 'admin') {
        const aptSelect = document.getElementById('chat-apartment-select');
        selectedApt = aptSelect ? aptSelect.value : null;
    }

    // Filtra as mensagens pelo apartamento (se houver um selecionado)
    let filteredMessages = messages;
    if (selectedApt) {
        filteredMessages = messages.filter(msg => !msg.apartment || msg.apartment === selectedApt);
    }

    if (!filteredMessages || filteredMessages.length === 0) {
        container.innerHTML = `<p class="text-center text-outline">Inicie a conversa.</p>`;
        return;
    }

    container.innerHTML = filteredMessages.map(msg => {
        const isSent = msg.from === currentUser;
        let fileHtml = '';
        if (msg.file) {
            const fileDataString = JSON.stringify(msg.file).replace(/"/g, '&quot;');
            if (msg.file.type.startsWith('image/')) {
                fileHtml = `<div class="mt-2 cursor-pointer" onclick='window.app.chat.openFileViewer(${fileDataString})'>
                                <img src="${msg.file.data}" alt="${msg.file.name}" class="rounded-lg max-w-xs max-h-48 object-cover">
                            </div>`;
            } else if (msg.file.type.startsWith('audio/')) {
                const audioId = `audio_${msg.timestamp || Date.now()}`;
                fileHtml = `
                    <div class="audio-player mt-2 flex items-center gap-3 w-full max-w-xs">
                        <button id="play-btn-${audioId}" class="btn btn-secondary p-0 h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center" onclick="window.app.chat.toggleAudioPlayback('${audioId}')">
                            <i data-lucide="play" class="w-5 h-5"></i>
                        </button>
                        <div class="audio-waveform flex-grow h-8 flex items-center gap-0.5">${generateWaveformBars()}</div>
                        <audio id="${audioId}" src="${msg.file.data}" preload="metadata" onended="window.app.chat.onAudioEnded('${audioId}')"></audio>
                    </div>`;
            } else {
                fileHtml = `<div class="mt-2 flex items-center gap-2 p-2 rounded-lg bg-black/10 hover:bg-black/20 cursor-pointer" 
                                 onclick='window.app.chat.openFileViewer(${fileDataString})'>
                                <i data-lucide="file-text" class="w-5 h-5 flex-shrink-0"></i>
                                <span class="truncate font-medium">${msg.file.name}</span>
                            </div>`;
            }
        }

        const aptBadge = msg.apartment ? `<span class="chat-bubble-apt">Apto ${msg.apartment}</span>` : '';
        
        return `
            <div class="flex ${isSent ? 'justify-end' : 'justify-start'}">
                <div class="chat-bubble ${isSent ? 'chat-bubble-sent' : 'chat-bubble-received'}">
                    ${aptBadge}
                    ${msg.message ? `<p>${msg.message}</p>` : ''}
                    ${fileHtml}
                    <p class="chat-timestamp ${isSent ? 'text-right' : 'text-left'}">
                        ${new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>
        `;
    }).join('');

    window.lucide.createIcons();
    // Rola para a última mensagem
    container.scrollTop = container.scrollHeight;
}

/**
 * Manipulador para o envio de mensagens do chat.
 * @param {Event} e - O evento de submissão do formulário.
 */
export async function sendMessageHandler(e) {
    e.preventDefault();
    const form = e.target;
    const to = form.elements['chat-partner-username'].value;
    const messageInput = form.elements['chat-message-input'];
    const message = messageInput.value;
    const fileNameDisplay = document.getElementById('chat-file-name');

    if (!to || (!message.trim() && !selectedFile)) return false;

    try {
        let apartment = null;
        if (window.app.state.userRole === 'owner') {
            apartment = window.app.state.selectedApartment;
        } else if (window.app.state.userRole === 'admin') {
            apartment = document.getElementById('chat-apartment-select').value || null;
        }

        const sentMessage = await api.sendMessage(to, message.trim(), selectedFile, apartment);
        addMessageToChat(sentMessage.data);
        messageInput.value = ''; // Limpa o campo de input
        messageInput.required = true;
        selectedFile = null; // Limpa o arquivo selecionado
        fileNameDisplay.textContent = ''; // Limpa o nome do arquivo
        messageInput.focus();
    } catch (error) {
        modals.showAlert('Não foi possível enviar a mensagem.');
    }
    return true;
}

/**
 * Lida com o clique no botão de gravação, alternando entre iniciar e parar.
 */
export function handleRecordButtonClick() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        stopRecording();
    } else {
        startRecording();
    }
}


/**
 * Inicia a gravação de áudio.
 */
async function startRecording() {
    // Verifica a permissão do microfone antes de tentar gravar
    try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        if (permissionStatus.state === 'denied') {
            modals.showAlert('A permissão para usar o microfone foi negada. Por favor, habilite-a nas configurações do seu navegador para enviar áudios.');
            return;
        }
    } catch (err) {
        // Se a API de permissões não for suportada, o getUserMedia vai pedir permissão de qualquer forma.
        console.warn('API de Permissões não suportada, prosseguindo com a solicitação padrão.');
    }

    // Se já estiver gravando, não faz nada
    if (mediaRecorder && mediaRecorder.state === "recording") return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.addEventListener("dataavailable", event => {
            audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fileData = {
                    name: `audio_${Date.now()}.webm`,
                    type: audioBlob.type,
                    size: audioBlob.size,
                    data: e.target.result
                };
                // Envia o áudio
                const to = document.getElementById('chat-partner-username').value;
                try {
                    let apartment = null;
                    if (window.app.state.userRole === 'owner') {
                        apartment = window.app.state.selectedApartment;
                    } else if (window.app.state.userRole === 'admin') {
                        apartment = document.getElementById('chat-apartment-select').value || null;
                    }
                    const sentMessage = await api.sendMessage(to, '', fileData, apartment);
                    addMessageToChat(sentMessage.data);
                } catch (error) {
                    modals.showAlert('Não foi possível enviar o áudio.');
                }
            };
            reader.readAsDataURL(audioBlob);
            stream.getTracks().forEach(track => track.stop()); // Para o acesso ao microfone
        });

        mediaRecorder.start();
        showRecordingIndicator(true);
    } catch (err) {
        console.error("Erro ao acessar o microfone:", err);
        modals.showAlert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
}

/**
 * Para a gravação de áudio.
 */
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
    showRecordingIndicator(false);
}

/**
 * Mostra ou esconde o indicador de gravação.
 * @param {boolean} show - Se deve mostrar o indicador.
 */
function showRecordingIndicator(show) {
    const indicator = document.getElementById('chat-recording-indicator');
    const timerEl = document.getElementById('chat-recording-timer');
    const recordBtn = document.getElementById('chat-record-btn');

    if (show) {
        indicator.classList.remove('hidden');
        indicator.classList.add('flex');
        recordBtn.classList.add('!bg-red-500', 'text-white'); // Botão fica vermelho
        recordingStartTime = Date.now();
        recordingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const seconds = String(elapsed % 60).padStart(2, '0');
            timerEl.textContent = `${minutes}:${seconds}`;
        }, 1000);
    } else {
        indicator.classList.add('hidden');
        indicator.classList.remove('flex');
        recordBtn.classList.remove('!bg-red-500', 'text-white'); // Botão volta ao normal
        clearInterval(recordingTimer);
        timerEl.textContent = '00:00';
    }
}

/**
 * Alterna o botão de ação do chat entre 'enviar' e 'gravar'.
 */
export function toggleChatActionButton() {
    const messageInput = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const hasText = messageInput.value.trim().length > 0;

    // Habilita ou desabilita o botão de enviar com base no texto
    sendBtn.disabled = !hasText;
    sendBtn.classList.toggle('opacity-50', !hasText);
    sendBtn.classList.toggle('cursor-not-allowed', !hasText);
}

export async function handleFileSelection(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const fileData = {
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result // Base64 string
            };

            // Envia o arquivo automaticamente
            const to = document.getElementById('chat-partner-username').value;
            const fileNameDisplay = document.getElementById('chat-file-name');

            if (!to) {
                modals.showAlert('Não foi possível identificar o destinatário do arquivo.');
                return;
            }

            try {
                fileNameDisplay.textContent = `Enviando: ${file.name}...`;
                let apartment = null;
                if (window.app.state.userRole === 'owner') {
                    apartment = window.app.state.selectedApartment;
                } else if (window.app.state.userRole === 'admin') {
                    apartment = document.getElementById('chat-apartment-select').value || null;
                }
                const sentMessage = await api.sendMessage(to, '', fileData, apartment);
                addMessageToChat(sentMessage.data);
                fileNameDisplay.textContent = ''; // Limpa o nome do arquivo após o envio
            } catch (error) {
                modals.showAlert('Não foi possível enviar o arquivo.');
                fileNameDisplay.textContent = `Falha ao enviar: ${file.name}`;
            }
        };
        reader.readAsDataURL(file);
        event.target.value = ''; // Reseta o input para permitir selecionar o mesmo arquivo novamente
    }
}

/**
 * Pede confirmação e limpa o histórico de chat com um usuário.
 * @param {string} partnerUsername - O nome de usuário do parceiro de conversa.
 */
export function clearChatHistory(partnerUsername) {
    modals.showConfirm(`Tem certeza que deseja apagar TODO o histórico de conversa com "${partnerUsername}"? Esta ação é irreversível.`, async () => {
        try {
            await api.clearChatHistory(partnerUsername);
            // Limpa a tela do chat e atualiza os indicadores
            renderChatMessages([]);
            window.app.ui.updateUnreadState(partnerUsername, 0);
            // Se o modal de lista de chat estiver aberto (para admin), atualiza-o
            if (!document.getElementById('chat-list-modal').classList.contains('hidden')) {
                window.app.ui.renderChatList(window.app.state.users);
            }
            modals.showAlert('Histórico de conversa apagado com sucesso.');
        } catch (error) {
            modals.showAlert(`Não foi possível apagar o histórico: ${error.message}`);
        }
    });
}

/**
 * Abre o modal de visualização de arquivo.
 * @param {object} file - O objeto do arquivo com nome, tipo, tamanho e dados (base64).
 */
export function openFileViewer(file) {
    const modal = document.getElementById('file-viewer-modal');
    const modalContent = modal.querySelector('.card');
    const title = document.getElementById('file-viewer-title');
    const content = document.getElementById('file-viewer-content');
    const downloadBtn = document.getElementById('file-viewer-download-btn');
    const fullscreenBtn = document.getElementById('file-viewer-fullscreen-btn');

    title.textContent = file.name;
    downloadBtn.href = file.data;
    downloadBtn.download = file.name;

    if (file.type.startsWith('image/')) {
        content.innerHTML = `<img id="file-viewer-image" src="${file.data}" alt="${file.name}" class="max-w-full max-h-full object-contain">`;
        fullscreenBtn.classList.remove('hidden');
        fullscreenBtn.onclick = () => {
            const imgElement = document.getElementById('file-viewer-image');
            if (imgElement.requestFullscreen) {
                imgElement.requestFullscreen();
            } else if (imgElement.webkitRequestFullscreen) { /* Safari */
                imgElement.webkitRequestFullscreen();
            }
        };
    } else {
        content.innerHTML = `<div class="text-center">
                                <i data-lucide="file" class="w-24 h-24 text-gray-300 mx-auto"></i>
                                <p class="mt-4 text-lg font-medium">${file.name}</p>
                                <p class="text-sm text-outline">${(file.size / 1024).toFixed(2)} KB</p>
                            </div>`;
        fullscreenBtn.classList.add('hidden');
        window.lucide.createIcons();
    }

    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('opacity-0', '-translate-y-4'), 10);
}

/**
 * Fecha o modal de visualização de arquivo.
 */
export function closeFileViewer() {
    const modal = document.getElementById('file-viewer-modal');
    const modalContent = modal.querySelector('.card');
    modalContent.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => {
        modal.classList.add('hidden');
        // Limpa o conteúdo para liberar memória, especialmente de imagens grandes
        document.getElementById('file-viewer-content').innerHTML = '';
    }, 200);
}

/**
 * Gera as barras para a visualização de onda estática.
 */
function generateWaveformBars() {
    let barsHtml = '';
    const heights = [4, 8, 12, 16, 20, 24, 20, 16, 12, 8, 4, 6, 10, 14, 18, 22, 18, 14, 10, 6];
    for (let i = 0; i < 30; i++) {
        const height = heights[i % heights.length];
        barsHtml += `<div class="w-1 bg-gray-300 dark:bg-gray-600 rounded-full" style="height: ${height}px"></div>`;
    }
    return barsHtml;
}

/**
 * Alterna a reprodução de um áudio.
 * @param {string} audioId - O ID do elemento de áudio.
 */
export function toggleAudioPlayback(audioId) {
    const audio = document.getElementById(audioId);
    const playBtn = document.getElementById(`play-btn-${audioId}`);
    const waveform = playBtn.nextElementSibling;

    if (audio.paused) {
        audio.play();
        playBtn.innerHTML = '<i data-lucide="pause" class="w-5 h-5"></i>';
        waveform.classList.add('playing');
    } else {
        audio.pause();
        playBtn.innerHTML = '<i data-lucide="play" class="w-5 h-5"></i>';
        waveform.classList.remove('playing');
    }
    window.lucide.createIcons();
}

/**
 * Chamado quando um áudio termina de tocar.
 * @param {string} audioId - O ID do elemento de áudio.
 */
export function onAudioEnded(audioId) {
    // Reverte o botão do áudio que acabou de tocar
    const audio = document.getElementById(audioId);
    const playBtn = document.getElementById(`play-btn-${audioId}`);
    const waveform = playBtn.nextElementSibling;
    if (playBtn) playBtn.innerHTML = '<i data-lucide="play" class="w-5 h-5"></i>';
    if (waveform) waveform.classList.remove('playing');
    window.lucide.createIcons();

    // Procura pelo próximo áudio e o reproduz
    const currentMessage = audio.closest('.flex.justify-end, .flex.justify-start');
    let nextMessage = currentMessage.nextElementSibling;
    while (nextMessage) {
        const nextAudio = nextMessage.querySelector('audio');
        if (nextAudio) {
            toggleAudioPlayback(nextAudio.id); // Inicia a reprodução do próximo
            return; // Para a busca
        }
        nextMessage = nextMessage.nextElementSibling;
    }
}

/**
 * Anexa as funções de chat ao objeto global da aplicação.
 */
export function attachChatFunctionsToWindow() {
    if (!window.app) window.app = {};
    if (!window.app.chat) window.app.chat = {};

    window.app.chat.openChatModal = openChatModal;
    window.app.chat.closeChatModal = closeChatModal;
    window.app.chat.addMessageToChat = addMessageToChat;
    window.app.chat.renderChatMessages = renderChatMessages;
    window.app.chat.sendMessageHandler = sendMessageHandler;
    window.app.chat.handleFileSelection = handleFileSelection;
    window.app.chat.clearChatHistory = clearChatHistory;
    window.app.chat.startRecording = startRecording;
    window.app.chat.stopRecording = stopRecording;
    window.app.chat.handleRecordButtonClick = handleRecordButtonClick;
    window.app.chat.toggleChatActionButton = toggleChatActionButton;
    window.app.chat.openFileViewer = openFileViewer;
    window.app.chat.closeFileViewer = closeFileViewer;
    window.app.chat.toggleAudioPlayback = toggleAudioPlayback;
    window.app.chat.onAudioEnded = onAudioEnded;
}