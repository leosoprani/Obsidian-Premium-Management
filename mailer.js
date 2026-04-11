// mailer.js
const nodemailer = require('nodemailer');

// Criar um usuário de teste (Ethereal) se as variáveis não estiverem configuradas
let transporter;

async function initTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
        // Usa as credenciais reais configuradas no .env
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10),
            secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    } else {
        // Se não houver configuração, usa conta de teste do Ethereal
        console.log("Configurações de SMTP limitadas no .env. Inicializando Ethereal de teste...");
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, 
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        console.log("Serviço Ethereal pronto para disparos locais.");
    }
}

// Inicializa chamando a async function anonimamente
initTransporter().catch(console.error);

/**
 * Dispara e-mail informando o proprietário sobre mudança de status de uma reserva.
 * @param {string} toEmail E-mail (username) do proprietário.
 * @param {object} reservation Dados da reserva associada.
 * @param {string} status Novo status ("confirmed" ou "canceled").
 * @param {string} reason Opcional, o motivo caso recusada/cancelada.
 */
async function sendReservationStatusEmail(toEmail, reservation, status, reason = null) {
    if (!transporter) {
        console.error("Transporter ainda não foi inicializado.");
        return;
    }

    const { apartment, checkin, checkout } = reservation;
    const isApproved = status === 'confirmed';
    const statusText = isApproved ? 'Aprovada' : 'Recusada';
    const checkinDt = checkin ? new Date(checkin + 'T00:00:00').toLocaleDateString('pt-BR') : '';
    const checkoutDt = checkout ? new Date(checkout + 'T00:00:00').toLocaleDateString('pt-BR') : '';

    const color = isApproved ? '#10b981' : '#ef4444'; // verde ou vermelho
    const bgContainer = '#f3f4f6';
    const bgCard = '#ffffff';

    const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Sistema Proprietários'}" <${process.env.SMTP_FROM_EMAIL || 'no-reply@storeyluxor.com'}>`,
        to: toEmail,
        subject: `Reserva ${statusText} - Reserva Apto ${apartment}`,
        text: `Olá! A sua reserva aguardando aprovação para o apartamento ${apartment} (${checkinDt} até ${checkoutDt}) foi ${statusText.toLowerCase()}.${reason ? ' Motivo: ' + reason : ''}`,
        html: `
            <div style="font-family: Arial, sans-serif; background-color: ${bgContainer}; padding: 20px;">
                <div style="background-color: ${bgCard}; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 15px;">
                        <h2 style="color: #111827; margin: 0;">Atualização de Reserva</h2>
                    </div>
                    <p style="color: #374151; font-size: 16px;">Olá,</p>
                    <p style="color: #374151; font-size: 16px;">
                        A solicitação de reserva do seu apartamento <strong>${apartment}</strong> foi <span style="font-weight: bold; color: ${color};">${statusText.toLowerCase()}</span>.
                    </p>

                    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
                        <ul style="list-style: none; padding: 0; margin: 0; color: #4b5563;">
                            <li style="margin-bottom: 8px;"><strong>Data Entrada:</strong> ${checkinDt}</li>
                            <li><strong>Data Saída:</strong> ${checkoutDt}</li>
                        </ul>
                    </div>

                    ${!isApproved && reason ? `<p style="color: #991b1b; background-color: #fef2f2; padding: 10px; border-radius: 6px; border: 1px solid #fecaca;"><strong>Motivo:</strong> ${reason}</p>` : ''}

                    <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; font-size: 14px; color: #6b7280;">
                        Essa é uma mensagem automática. Por favor, não a responda.
                    </div>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`E-mail de status [${statusText}] enviado para: ${toEmail}. ID: ${info.messageId}`);
        // Se usando conta Ethereal, mostrar preview URL no console
        if (info.messageId && !process.env.SMTP_HOST) {
            console.log("Preview Ethereal do E-mail: %s", nodemailer.getTestMessageUrl(info));
        }
    } catch (error) {
        console.error("Erro ao tentar enviar e-mail de reserva:", error);
    }
}

module.exports = { sendReservationStatusEmail };
