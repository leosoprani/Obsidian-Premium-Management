/**
 * skeleton.js - Módulo de Skeleton Loaders
 * Injeta placeholders animados nos containers enquanto os dados carregam,
 * eliminando a piscada de tela vazia na troca de views.
 */

export const skeleton = {

    /**
     * Cria um skeleton card genérico de reserva/hóspede.
     * @returns {string} HTML do skeleton card
     */
    reservationCard() {
        return `
        <div class="card p-5 space-y-4">
            <div class="flex items-center gap-3">
                <div class="skeleton skeleton-circle w-10 h-10 flex-shrink-0"></div>
                <div class="flex-1 space-y-2">
                    <div class="skeleton skeleton-text-lg w-3/4"></div>
                    <div class="skeleton skeleton-text w-1/2"></div>
                </div>
                <div class="skeleton w-20 h-6 rounded-full"></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="skeleton skeleton-text w-full"></div>
                <div class="skeleton skeleton-text w-full"></div>
            </div>
            <div class="skeleton skeleton-text w-2/3"></div>
            <div class="flex justify-between pt-2 border-t border-outline-variant/10">
                <div class="skeleton w-24 h-8 rounded-lg"></div>
                <div class="skeleton w-16 h-8 rounded-lg"></div>
            </div>
        </div>`;
    },

    /**
     * Renderiza N skeleton cards de reserva em um container.
     * @param {string} containerId - ID do elemento alvo
     * @param {number} count - Quantidade de skeletons
     */
    showReservationCards(containerId, count = 6) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = Array(count).fill(this.reservationCard()).join('');
    },

    /**
     * Skeleton para linhas de tabela (logs, financeiro, hóspedes).
     * @param {number} cols - Número de colunas
     * @returns {string} HTML da linha
     */
    tableRow(cols = 5) {
        const cells = Array(cols).fill(0).map(() =>
            `<td class="px-4 py-3"><div class="skeleton skeleton-text"></div></td>`
        ).join('');
        return `<tr>${cells}</tr>`;
    },

    /**
     * Renderiza skeleton em uma tabela.
     * @param {string} containerId - ID do container da tabela
     * @param {number} rows - Linhas de skeleton
     * @param {number} cols - Colunas de skeleton
     */
    showTable(containerId, rows = 8, cols = 5) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = `
        <table class="w-full">
            <tbody>
                ${Array(rows).fill(this.tableRow(cols)).join('')}
            </tbody>
        </table>`;
    },

    /**
     * Skeleton específico para o Dashboard (Bento Grid).
     */
    showDashboard() {
        const financialSummary = document.getElementById('dashboard-financial-summary');
        if (financialSummary) {
            financialSummary.innerHTML = Array(3).fill(0).map(() => `
            <div class="space-y-2">
                <div class="skeleton skeleton-text w-20"></div>
                <div class="skeleton skeleton-text-xl w-28"></div>
            </div>`).join('');
        }

        const upcomingEvents = document.getElementById('upcoming-events-container');
        if (upcomingEvents) {
            upcomingEvents.innerHTML = Array(4).fill(0).map(() => `
            <div class="card p-4 flex gap-3 items-center">
                <div class="skeleton w-10 h-10 rounded-xl flex-shrink-0"></div>
                <div class="flex-1 space-y-2">
                    <div class="skeleton skeleton-text-lg w-3/4"></div>
                    <div class="skeleton skeleton-text w-1/2"></div>
                </div>
            </div>`).join('');
        }
    },

    /**
     * Skeleton para cards de propriedades.
     * @param {string} containerId
     * @param {number} count
     */
    showPropertyCards(containerId, count = 10) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            ${Array(count).fill(0).map(() => `
            <div class="card p-4 space-y-3">
                <div class="skeleton skeleton-circle w-12 h-12 mx-auto"></div>
                <div class="skeleton skeleton-text-lg w-16 mx-auto"></div>
                <div class="skeleton skeleton-text w-full"></div>
                <div class="skeleton skeleton-text w-3/4 mx-auto"></div>
            </div>`).join('')}
        </div>`;
    },

    /**
     * Skeleton para lista de hóspedes/funcionários (tabela moderna).
     * @param {string} containerId
     * @param {number} rows
     */
    showGuestList(containerId, rows = 8) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = `
        <div class="divide-y divide-outline-variant/10">
            ${Array(rows).fill(0).map(() => `
            <div class="p-4 flex items-center gap-4">
                <div class="skeleton skeleton-circle w-10 h-10 flex-shrink-0"></div>
                <div class="flex-1 space-y-2">
                    <div class="skeleton skeleton-text-lg w-48"></div>
                    <div class="skeleton skeleton-text w-32"></div>
                </div>
                <div class="skeleton skeleton-text w-24 hidden md:block"></div>
                <div class="skeleton w-8 h-8 rounded-lg"></div>
            </div>`).join('')}
        </div>`;
    },

    /**
     * Remove qualquer skeleton de um container (substituído pelo conteúdo real).
     * Não é necessário chamar explicitamente — as funções de render do ui.js
     * sobrescrevem o innerHTML automaticamente.
     * @param {string} containerId
     */
    clear(containerId) {
        const el = document.getElementById(containerId);
        if (el) el.innerHTML = '';
    }
};
