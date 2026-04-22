import * as api from './api.js';
import * as ui from './ui.js';
import * as modals from './modals.js';

export async function initControlIdDashboard() {
    try {
        const settings = await api.getControlIdSettings();
        updateControlIdUI(settings);
    } catch (error) {
        console.error('Erro ao carregar configurações do Control iD:', error);
    }
}

export function updateControlIdUI(settings) {
    const statusText = document.getElementById('controlid-status-text');
    const statusIndicator = document.getElementById('controlid-status-indicator');
    const ipDisplay = document.getElementById('controlid-display-ip');

    if (statusText) statusText.textContent = settings.status === 'connected' ? 'Conectado' : 'Desconectado';
    
    if (statusIndicator) {
        const isConnected = settings.status === 'connected';
        statusIndicator.className = `block w-3 h-3 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`;
        
        const pingEffect = statusIndicator.nextElementSibling;
        if (pingEffect) {
            pingEffect.className = `absolute inset-0 w-3 h-3 rounded-full ${isConnected ? 'bg-success' : 'bg-error'} animate-ping opacity-75`;
        }
    }
    
    if (ipDisplay) ipDisplay.textContent = settings.ip ? `${settings.ip}:${settings.port}` : 'Não configurado';
}

export async function handleTestConnection() {
    const btn = document.getElementById('controlid-test-btn');
    const originalHtml = btn.innerHTML;
    
    const settings = {
        ip: document.getElementById('controlid-ip').value,
        port: document.getElementById('controlid-port').value,
        protocol: document.getElementById('controlid-protocol').value,
        user: document.getElementById('controlid-user').value
    };

    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Testando...';
    btn.disabled = true;

    try {
        const result = await api.testControlIdConnection(settings);
        ui.showToast(result.message, 'Control iD', 'success');
    } catch (error) {
        ui.showToast('Erro na conexão: ' + error.message, 'Control iD', 'error');
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

export async function handleOpenDoor() {
    const btn = document.getElementById('controlid-open-door-btn');
    if (!btn) return;
    
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Abrindo...';
    btn.disabled = true;

    try {
        await api.openControlIdDoor();
        ui.showToast('Porta aberta com sucesso!', 'Control iD', 'success');
    } catch (error) {
        ui.showToast('Erro ao abrir porta: ' + error.message, 'Control iD', 'error');
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
    }
}

export async function handleSaveSettings(e) {
    e.preventDefault();
    
    const settings = {
        type: 'controlid',
        ip: document.getElementById('controlid-ip').value,
        port: document.getElementById('controlid-port').value,
        protocol: document.getElementById('controlid-protocol').value,
        user: document.getElementById('controlid-user').value,
        pass: document.getElementById('controlid-pass').value,
        autoSync: document.getElementById('controlid-auto-sync').checked,
        status: 'connected' // Simulando que conectou após salvar
    };

    try {
        await api.saveControlIdSettings(settings);
        ui.showToast('Configurações salvas com sucesso!', 'Control iD', 'success');
        updateControlIdUI(settings);
        closeControlIdModal();
    } catch (error) {
        ui.showToast('Erro ao salvar: ' + error.message, 'Control iD', 'error');
    }
}

export async function handleGenerateQRCode(reservationId) {
    try {
        ui.showToast('Gerando QR Code...', 'Control iD', 'info');
        const result = await api.generateControlIdQRCode(reservationId);
        ui.showToast('QR Code gerado: ' + result.qrCode, 'Control iD', 'success');
        
        // Atualiza a reserva no estado local se necessário
        if (window.app.state.reservations) {
            const res = window.app.state.reservations.find(r => r.id === reservationId);
            if (res) {
                res.controlid_qrcode = result.qrCode;
                res.controlid_synced = true;
            }
        }
        
        // Pergunta se o usuário quer fazer o download
        if (confirm("QR Code gerado com sucesso!\n\nDeseja fazer o download da imagem do QR Code agora?")) {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(result.qrCode)}`;
            
            fetch(qrUrl)
              .then(resp => resp.blob())
              .then(blob => {
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = `QRCode_Acesso_${reservationId}.png`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
              })
              .catch(() => window.open(qrUrl, '_blank')); // Fallback
        }
        
        // Se estiver no modal de reserva, pode querer atualizar a UI lá
        return result.qrCode;
    } catch (error) {
        ui.showToast('Erro ao gerar QR Code: ' + error.message, 'Control iD', 'error');
        throw error;
    }
}

export async function handleRegisterFace(reservationId) {
    const confirmUpload = confirm("Você deseja registrar a foto do hóspede (Reconhecimento Facial) no iDFace agora?");
    if (!confirmUpload) return;
    
    // Simula tempo de envio/upload de foto e processamento
    ui.showToast('Processando foto e enviando ao dispositivo...', 'Control iD', 'info');
    
    setTimeout(() => {
        ui.showToast('Reconhecimento Facial ativado com sucesso!', 'Control iD', 'success');
        
        // Simulação: Notifica o administrador se foi um Owner ou Recepcionista fazendo isso
        setTimeout(() => {
            ui.showToast('O administrador foi notificado sobre o novo acesso via Face.', 'Sistema Integrado', 'info');
        }, 1500);
        
        if (window.app.state.reservations) {
            const res = window.app.state.reservations.find(r => r.id === reservationId);
            if (res) {
                res.controlid_face_registered = true;
            }
        }
    }, 2000);
}

export function openControlIdModal() {
    const modal = document.getElementById('controlid-modal');
    const card = modal.querySelector('.card');
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        card.classList.remove('opacity-0', '-translate-y-4');
    }, 10);

    // Carregar dados atuais
    api.getControlIdSettings().then(settings => {
        document.getElementById('controlid-ip').value = settings.ip || '';
        document.getElementById('controlid-port').value = settings.port || '4445';
        document.getElementById('controlid-protocol').value = settings.protocol || 'https';
        document.getElementById('controlid-user').value = settings.user || 'admin';
        document.getElementById('controlid-pass').value = settings.pass || '';
        document.getElementById('controlid-auto-sync').checked = !!settings.autoSync;
    });
}

export function closeControlIdModal() {
    const modal = document.getElementById('controlid-modal');
    const card = modal.querySelector('.card');
    
    card.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}
