/**
 * Formata um número de CPF.
 * @param {string} cpf - O CPF a ser formatado.
 * @returns {string} - O CPF formatado.
 */
export function formatCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return cpf.substring(0, 14);
}

/**
 * Formata um número de telefone.
 * @param {string} phone - O telefone a ser formatado.
 * @returns {string} - O telefone formatado.
 */
export function formatPhone(phone) {
    phone = phone.replace(/\D/g, '');
    if (phone.length > 2) {
        phone = `(${phone.substring(0, 2)}) ${phone.substring(2)}`;
    }
    if (phone.length > 9) {
        phone = `${phone.substring(0, 10)}-${phone.substring(10, 14)}`;
    }
    return phone.substring(0, 15);
}