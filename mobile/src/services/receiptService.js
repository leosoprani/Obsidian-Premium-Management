import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../styles/theme';

/**
 * Gera um PDF de recibo para uma tarefa ou reserva concluída e abre o menu de compartilhamento.
 * @param {Object} data - Objeto contendo os dados do recibo (apartment, description, date, provider, amount, etc)
 */
export async function generateReceiptPDF(data) {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid ${theme.colors.primary}; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
            .title { font-size: 28px; font-weight: bold; color: ${theme.colors.primary}; margin: 0; }
            .subtitle { font-size: 14px; color: #666; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px; }
            
            .receipt-box { border: 1px solid #ddd; border-radius: 15px; padding: 30px; background-color: #f9f9f9; }
            .row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px dashed #eee; padding-bottom: 10px; }
            .label { font-weight: bold; color: #555; }
            .value { color: #000; font-weight: 500; }
            
            .amount-section { margin-top: 30px; text-align: right; }
            .amount-label { font-size: 16px; color: #666; }
            .amount-value { font-size: 24px; font-weight: bold; color: ${theme.colors.secondary}; }
            
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
            .signature { margin-top: 40px; border-top: 1px solid #ccc; width: 250px; margin-left: auto; margin-right: auto; padding-top: 10px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="title">Recibo de Serviço</h1>
            <p class="subtitle">Storey Luxor - Gestão de Hospedagem</p>
        </div>
        
        <div class="receipt-box">
            <div class="row">
                <span class="label">Apartamento:</span>
                <span class="value">Apto ${data.apartment}</span>
            </div>
            <div class="row">
                <span class="label">Serviço:</span>
                <span class="value">${data.description}</span>
            </div>
            <div class="row">
                <span class="label">Data de Conclusão:</span>
                <span class="value">${new Date(data.date || Date.now()).toLocaleDateString('pt-BR')}</span>
            </div>
            ${data.provider ? `
            <div class="row">
                <span class="label">Prestador/Responsável:</span>
                <span class="value">${data.provider}</span>
            </div>
            ` : ''}
            
            <div class="amount-section">
                <span class="amount-label">Valor Total:</span><br/>
                <span class="amount-value">R$ ${Number(data.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
        </div>
        
        <div class="signature">
            Assinatura do Responsável
        </div>
        
        <div class="footer">
            Gerado digitalmente via Storey Luxor Mobile em ${new Date().toLocaleString('pt-BR')}
        </div>
    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } else {
      Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo.');
    }
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
}
