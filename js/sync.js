/**
 * sync.js - Módulo de Sincronização Dexie.js ↔ MongoDB
 *
 * Estratégia: Cache-First com Sync em Background
 * ─────────────────────────────────────────────────
 * 1. Na inicialização, carrega dados do IndexedDB (Dexie) instantaneamente.
 * 2. Em paralelo, busca dados frescos da API (MongoDB).
 * 3. Se a API responder, mescla e atualiza o cache local.
 * 4. Se a API falhar, o app continua funcionando com os dados do cache.
 * 5. Operações de escrita offline são enfileiradas e sincronizadas quando a conexão retornar.
 * 6. Auto-backup é gravado no Dexie a cada 30 minutos.
 */

import * as api from './api.js';

// ─── Referência ao banco Dexie (importado de main.js via window) ───────────────
function getDb() {
    return window._syncDb;
}

// ─── TTL do cache: dados com menos de 5 min são considerados frescos ──────────
const CACHE_TTL_MS = 5 * 60 * 1000;
const AUTO_BACKUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

let _autoBackupTimer = null;
let _isOnline = navigator.onLine;
let _syncQueue = []; // Fila de operações pendentes offline

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLE DE CONECTIVIDADE
// ═══════════════════════════════════════════════════════════════════════════════

window.addEventListener('online', () => {
    _isOnline = true;
    console.log('[Sync] Conexão restaurada. Processando fila offline...');
    _processSyncQueue();
    // Notifica o usuário
    if (window.app?.ui?.showToast) {
        window.app.ui.showToast('Conexão restaurada! Sincronizando dados...', 'Sistema', 'success');
    }
});

window.addEventListener('offline', () => {
    _isOnline = false;
    console.warn('[Sync] Sem conexão. Operações serão enfileiradas.');
    if (window.app?.ui?.showToast) {
        window.app.ui.showToast('Sem conexão. Trabalhando em modo offline.', 'Sistema', 'info');
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE LOCAL (DEXIE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Salva um snapshot dos dados no cache local do Dexie.
 * @param {object} data - { guests, reservations, employees, expenses, properties }
 */
async function saveToCache(data) {
    const db = getDb();
    if (!db) return;

    try {
        // Bulk-put: atualiza ou insere cada registro individualamente para evitar conflitos
        if (Array.isArray(data.guests) && data.guests.length > 0) {
            await db.guests.bulkPut(data.guests);
        }
        if (Array.isArray(data.reservations) && data.reservations.length > 0) {
            await db.reservations.bulkPut(data.reservations);
        }
        if (Array.isArray(data.employees) && data.employees.length > 0) {
            await db.employees.bulkPut(data.employees);
        }
        if (Array.isArray(data.expenses) && data.expenses.length > 0) {
            // Expenses usa ++id autoincrementado, precisamos de upsert manual
            for (const expense of data.expenses) {
                if (expense.id) {
                    await db.expenses.put(expense);
                }
            }
        }

        // Salva metadata do cache com timestamp
        localStorage.setItem('cache_last_updated', Date.now().toString());
        console.log('[Sync] Cache local atualizado com sucesso.');
    } catch (err) {
        console.error('[Sync] Erro ao salvar no cache local:', err);
    }
}

/**
 * Lê todos os dados do cache local do Dexie.
 * @returns {Promise<object|null>} - Os dados do cache ou null se vazio.
 */
async function readFromCache() {
    const db = getDb();
    if (!db) return null;

    try {
        const [guests, reservations, employees, expenses] = await Promise.all([
            db.guests.toArray(),
            db.reservations.toArray(),
            db.employees.toArray(),
            db.expenses.toArray(),
        ]);

        const hasData = guests.length > 0 || reservations.length > 0;
        if (!hasData) return null;

        return { guests, reservations, employees, expenses, properties: [] };
    } catch (err) {
        console.error('[Sync] Erro ao ler do cache local:', err);
        return null;
    }
}

/**
 * Verifica se o cache ainda está dentro do TTL (frescos).
 * @returns {boolean}
 */
function isCacheFresh() {
    const lastUpdated = parseInt(localStorage.getItem('cache_last_updated') || '0', 10);
    return (Date.now() - lastUpdated) < CACHE_TTL_MS;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAÇÃO: CACHE-FIRST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Carrega dados usando estratégia Cache-First:
 * 1. Retorna dados do cache imediatamente se disponíveis.
 * 2. Busca dados frescos da API em background e atualiza o cache.
 *
 * @param {Function} onCacheData - Callback chamado com dados do cache (imediato).
 * @param {Function} onFreshData - Callback chamado com dados frescos da API.
 * @param {boolean} forceRefresh - Ignora o TTL e força busca na API.
 * @returns {Promise<Array>} - Array com [guests, reservations, employees, expenses, properties]
 */
export async function loadDataCacheFirst(onCacheData = null, onFreshData = null, forceRefresh = false) {
    // 1. Tenta carregar do cache local primeiro
    const cachedData = await readFromCache();

    if (cachedData && !forceRefresh) {
        console.log('[Sync] Dados carregados do cache local.');
        if (onCacheData) onCacheData(cachedData);
    }

    // 2. Se o cache está fresco e não é forçado, retorna o cache
    if (cachedData && isCacheFresh() && !forceRefresh) {
        console.log('[Sync] Cache ainda fresco, pulando busca na API.');
        return [
            cachedData.guests,
            cachedData.reservations,
            cachedData.employees,
            cachedData.expenses,
            cachedData.properties
        ];
    }

    // 3. Busca dados frescos da API
    if (!_isOnline && cachedData) {
        console.warn('[Sync] Offline — usando dados do cache.');
        return [
            cachedData.guests,
            cachedData.reservations,
            cachedData.employees,
            cachedData.expenses,
            cachedData.properties
        ];
    }

    try {
        const [guests, reservations, employees, expenses, properties] = await api.fetchInitialData();

        // 4. Atualiza o cache com dados frescos
        await saveToCache({ guests, reservations, employees, expenses, properties });

        if (onFreshData) onFreshData({ guests, reservations, employees, expenses, properties });

        return [guests, reservations, employees, expenses, properties];
    } catch (err) {
        console.error('[Sync] Falha ao buscar dados da API. Usando fallback do cache.', err);

        // 5. Fallback: usa o cache se a API falhar
        if (cachedData) {
            console.warn('[Sync] Fallback para cache local após falha da API.');
            return [
                cachedData.guests,
                cachedData.reservations,
                cachedData.employees,
                cachedData.expenses,
                cachedData.properties
            ];
        }

        throw err; // Re-lança se não há cache disponível
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC QUEUE (OPERAÇÕES OFFLINE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adiciona uma operação à fila de sincronização offline.
 * @param {string} type - 'saveReservation' | 'saveGuest' | 'saveTask' | etc.
 * @param {object} payload - Dados da operação.
 */
export function enqueueOfflineOperation(type, payload) {
    const operation = { type, payload, timestamp: Date.now(), id: `op_${Date.now()}` };
    _syncQueue.push(operation);

    // Persiste a fila no localStorage para sobreviver a reloads
    try {
        localStorage.setItem('sync_queue', JSON.stringify(_syncQueue));
    } catch (e) { /* localStorage cheio */ }

    console.log(`[Sync] Operação enfileirada offline: ${type}`, payload);
}

/**
 * Processa a fila de operações offline quando a conexão é restaurada.
 */
async function _processSyncQueue() {
    if (_syncQueue.length === 0) {
        // Verifica se há operações salvas no localStorage de sessões anteriores
        try {
            const saved = localStorage.getItem('sync_queue');
            if (saved) _syncQueue = JSON.parse(saved);
        } catch (e) { _syncQueue = []; }
    }

    if (_syncQueue.length === 0) return;

    console.log(`[Sync] Processando ${_syncQueue.length} operação(ões) offline...`);

    const failed = [];
    for (const op of _syncQueue) {
        try {
            switch (op.type) {
                case 'saveReservation': await api.saveReservation(op.payload); break;
                case 'saveGuest':       await api.saveGuest(op.payload); break;
                case 'saveEmployee':    await api.saveEmployee(op.payload); break;
                case 'saveExpense':     await api.saveExpense(op.payload); break;
                case 'saveTask':        await api.saveTask(op.payload); break;
                default: console.warn('[Sync] Tipo de operação desconhecido:', op.type);
            }
            console.log(`[Sync] ✓ Operação sincronizada: ${op.type}`);
        } catch (err) {
            console.error(`[Sync] ✗ Falha ao sincronizar: ${op.type}`, err);
            failed.push(op); // Mantém as que falharam para retry
        }
    }

    _syncQueue = failed;
    localStorage.setItem('sync_queue', JSON.stringify(_syncQueue));

    if (failed.length === 0) {
        console.log('[Sync] Fila de sincronização processada com sucesso.');
    } else {
        console.warn(`[Sync] ${failed.length} operação(ões) falharam e serão reenviadas.`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-BACKUP PERIÓDICO (DEXIE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Salva um snapshot completo dos dados no Dexie como auto-backup.
 * Mantém no máximo 5 backups para não sobrecarregar o IndexedDB.
 */
export async function saveAutoBackup(stateData) {
    const db = getDb();
    if (!db) return;

    try {
        const backupPayload = {
            timestamp: new Date(),
            data: {
                guests: stateData.guests || [],
                reservations: stateData.reservations || [],
                employees: stateData.employees || [],
                expenses: stateData.expenses || [],
            }
        };

        await db.auto_backups.add(backupPayload);

        // Mantém apenas os 5 backups mais recentes
        const count = await db.auto_backups.count();
        if (count > 5) {
            const oldest = await db.auto_backups.orderBy('timestamp').first();
            if (oldest) await db.auto_backups.delete(oldest.id);
        }

        console.log('[Sync] Auto-backup local criado com sucesso.');
    } catch (err) {
        console.error('[Sync] Erro ao criar auto-backup:', err);
    }
}

/**
 * Inicia o ciclo de auto-backup periódico.
 * @param {Function} getStateData - Função que retorna os dados atuais do estado.
 */
export function startAutoBackupCycle(getStateData) {
    if (_autoBackupTimer) clearInterval(_autoBackupTimer);

    // Primeiro backup imediato após 2 minutos
    setTimeout(() => {
        saveAutoBackup(getStateData());
        // Depois repete a cada 30 minutos
        _autoBackupTimer = setInterval(() => {
            saveAutoBackup(getStateData());
        }, AUTO_BACKUP_INTERVAL_MS);
    }, 2 * 60 * 1000);

    console.log('[Sync] Ciclo de auto-backup iniciado (a cada 30 min).');
}

/**
 * Para o ciclo de auto-backup.
 */
export function stopAutoBackupCycle() {
    if (_autoBackupTimer) {
        clearInterval(_autoBackupTimer);
        _autoBackupTimer = null;
    }
}

/**
 * Restaura dados do último auto-backup disponível no Dexie.
 * @returns {Promise<object|null>} - Os dados do backup ou null se não houver.
 */
export async function getLatestAutoBackup() {
    const db = getDb();
    if (!db) return null;

    try {
        const latest = await db.auto_backups.orderBy('timestamp').last();
        return latest || null;
    } catch (err) {
        console.error('[Sync] Erro ao buscar último auto-backup:', err);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDICADOR DE STATUS DE CONEXÃO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Retorna o status atual da conexão e da fila de sync.
 * @returns {object} - { isOnline, pendingQueue, lastCacheUpdate }
 */
export function getSyncStatus() {
    return {
        isOnline: _isOnline,
        pendingQueue: _syncQueue.length,
        lastCacheUpdate: parseInt(localStorage.getItem('cache_last_updated') || '0', 10),
        isCacheFresh: isCacheFresh(),
    };
}

/**
 * Força uma sincronização completa: busca dados frescos da API e atualiza o cache.
 * @returns {Promise<Array>} - Dados frescos
 */
export async function forceSync() {
    console.log('[Sync] Forçando sincronização completa...');
    const result = await loadDataCacheFirst(null, null, true);
    await _processSyncQueue();
    return result;
}
