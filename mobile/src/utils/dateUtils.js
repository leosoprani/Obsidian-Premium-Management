/**
 * Formata uma data no padrão brasileiro (DD/MM/AAAA)
 * @param {string|Date} date - Data em formato ISO ou objeto Date
 * @returns {string}
 */
export const formatDateBR = (date) => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date.includes('T') ? date : `${date}T12:00:00`) : date;
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString('pt-BR');
  } catch (e) {
    return date;
  }
};

/**
 * Formata um horário no padrão brasileiro (HH:MM)
 * @param {string} time - Horário (ex: "14:00")
 * @returns {string}
 */
export const formatTimeBR = (time) => {
  if (!time) return '';
  return time.substring(0, 5);
};

/**
 * Formata data e hora juntas
 * @param {string|Date} date 
 * @param {string} time 
 * @returns {string}
 */
export const formatDateTimeBR = (date, time) => {
  const d = formatDateBR(date);
  const t = formatTimeBR(time);
  return t ? `${d} às ${t}` : d;
};
