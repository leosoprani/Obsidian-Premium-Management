export const apartments = ["001", "002", "003", "004", "101", "102", "103", "104", "105", "106", "107", "201", "202", "203", "204", "205", "206", "207", "301", "302", "303", "304", "305", "306", "307"];

export const statusConfig = {
    'pending':          { text: 'Pendente',    color: 'bg-yellow-500/20', textColor: 'text-yellow-300',   borderColor: 'border-yellow-500/40' },
    'pending-approval': { text: 'Ag. Aprovação', color: 'bg-orange-500/20', textColor: 'text-orange-300', borderColor: 'border-orange-500/40' },
    'confirmed':        { text: 'Confirmada',  color: 'bg-green-500/20',  textColor: 'text-green-300',    borderColor: 'border-green-500/40' },
    'checked-in':       { text: 'Check-in',   color: 'bg-blue-500/20',   textColor: 'text-blue-300',     borderColor: 'border-blue-500/40' },
    'finished':         { text: 'Finalizada',  color: 'bg-slate-500/20',  textColor: 'text-slate-300',    borderColor: 'border-slate-500/40' },
    'maintenance':      { text: 'Manutenção',  color: 'bg-orange-500/20', textColor: 'text-orange-300',   borderColor: 'border-orange-500/40' },
    'cleaning':         { text: 'Limpeza',     color: 'bg-purple-500/20', textColor: 'text-purple-300',   borderColor: 'border-purple-500/40' },
    'blocked':          { text: 'Bloqueado',   color: 'bg-red-500/20',    textColor: 'text-red-300',      borderColor: 'border-red-500/40' },
    'canceled':         { text: 'Cancelada',   color: 'bg-red-500/20',    textColor: 'text-red-300',      borderColor: 'border-red-500/40' },
};

export const paymentStatusConfig = {
    'pending': { text: 'Pendente', color: 'bg-yellow-500/20', textColor: 'text-yellow-300' },
    'partial':  { text: 'Parcial',  color: 'bg-blue-500/20',   textColor: 'text-blue-300' },
    'paid':     { text: 'Pago',     color: 'bg-green-500/20',  textColor: 'text-green-300' },
    'n/a':      { text: '—',        color: 'bg-slate-500/10',  textColor: 'text-slate-400' },
};


export const holidays = [
    // Feriados Nacionais
    { month: 1, day: 1, name: 'Confraternização Universal', type: 'national' },
    { month: 4, day: 21, name: 'Tiradentes', type: 'national' },
    { month: 5, day: 1, name: 'Dia do Trabalho', type: 'national' },
    { month: 9, day: 7, name: 'Independência do Brasil', type: 'national' },
    { month: 10, day: 12, name: 'Nossa Senhora Aparecida', type: 'national' },
    { month: 11, day: 2, name: 'Finados', type: 'national' },
    { month: 11, day: 15, name: 'Proclamação da República', type: 'national' },
    { month: 12, day: 25, name: 'Natal', type: 'national' },
    // Feriados Municipais/Estaduais (João Pessoa/Paraíba)
    { month: 6, day: 24, name: 'São João', type: 'municipal' },
    { month: 8, day: 5, name: 'Aniversário de João Pessoa', type: 'municipal' },
    { month: 12, day: 8, name: 'Nossa Senhora da Conceição', type: 'municipal' },
];