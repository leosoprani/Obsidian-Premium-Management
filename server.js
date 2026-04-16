require('dotenv').config(); // Carrega as variáveis de ambiente o mais cedo possível

// 1. Importar as bibliotecas necessárias
console.log('--- INICIANDO SERVIDOR ---');
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendReservationStatusEmail } = require('./mailer');
const ical = require('node-ical');
const fetch = require('node-fetch');

// 2. Configurações
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const port = process.env.PORT || 3000;
const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017'; // Usa a URL do Atlas em produção ou a local como fallback
const dbName = 'storeyLuxorDB'; // Nome do banco de dados

const JWT_SECRET = process.env.JWT_SECRET || 'stl_secret_key_2025'; // Carrega a chave do arquivo .env ou usa fallback

// Middleware para servir arquivos estáticos (HTML, CSS, JS do cliente)
// O index.html agora é gerenciado via EJS - apenas assets estáticos são servidos aqui
app.use(express.static(path.join(__dirname, '/'), {
    index: false // Desativa o índice automático para que o EJS possa renderizar
}));

// Configuração do Motor de Templates EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cors()); // Permite que a página HTML acesse o backend
app.use(express.json({ limit: '10mb' })); // Aumenta o limite do payload para aceitar imagens
app.set('io', io); // Torna o 'io' acessível nas rotas

// Logging Middleware for Diagnostics
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (Role: ${req.user ? req.user.role : 'None'})`);
    });
    next();
});

let db;

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // Se não há token, não autorizado

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Se o token não é válido, acesso proibido
        req.user = user;
        next();
    });
};

// Middleware de Autorização por Função (Role)
const authorize = (roles = []) => {
    // roles param pode ser uma string única ou um array de strings
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!roles.length || (req.user && roles.includes(req.user.role))) {
            // usuário tem a função necessária, continua
            return next();
        }
        // usuário não tem a permissão, retorna 403 Forbidden
        return res.status(403).json({ message: 'Acesso negado: permissão insuficiente.' });
    };
};
// 4. Criar as "rotas" da API (os endpoints)

// Middleware para Log de Atividades
const logActivity = (action) => (req, res, next) => {
    // Anexa um listener ao evento 'finish' da resposta.
    // Isso garante que o log só será gravado após a resposta ser enviada com sucesso.
    res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
            let eventData = { action: action, user: req.user.username };

            // Adiciona contexto extra para novas solicitações de reserva
            if (action === 'save_reservation' && req.body.status === 'pending-approval' && !req.body.id) {
                eventData.sub_action = 'new_approval_request';
            }

            db.collection('activity_logs').insertOne({
                username: req.user.username,
                action: action,
                timestamp: new Date(),
            }).catch(err => {
                console.error('Falha ao registrar log de atividade:', err);
            });
        }
    });
    next();
};

// Rota raiz - renderiza o template EJS principal
app.get('/', (req, res) => {
    res.render('index');
});

// Rota de Login (não protegida)
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.collection('users').findOne({ username });

    if (!user) {
        return res.status(400).json({ message: 'Usuário não encontrado' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return res.status(400).json({ message: 'Senha inválida' });
    }

    const apartments = Array.isArray(user.apartments) ? user.apartments : (user.apartment ? [user.apartment.trim()] : []);
    const payload = { username: user.username, role: user.role, apartments: apartments };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
    res.json({ accessToken, role: user.role, apartments: apartments });
});

// Rota para alterar a própria senha (protegida)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { username } = req.user;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias.' });
    }

    try {
        const user = await db.collection('users').findOne({ username });
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: 'A senha atual está incorreta.' });

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.collection('users').updateOne({ username }, { $set: { password: hashedNewPassword } });

        res.status(200).json({ message: 'Senha alterada com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao alterar a senha', error: error.message });
    }
});

// --- ROTAS DE TAREFAS (LIMPEZA E MANUTENÇÃO) ---

app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const tasks = await db.collection('tasks').find().toArray();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar tarefas' });
    }
});

app.post('/api/tasks', authenticateToken, logActivity('save_task'), async (req, res) => {
    const task = req.body;
    try {
        if (task.id) {
            const id = task.id;
            const { _id, id: taskId, ...updateData } = task;
            await db.collection('tasks').updateOne({ id: id }, { $set: updateData });
            res.json({ message: 'Tarefa atualizada com sucesso' });
        } else {
            task.id = Date.now().toString();
            await db.collection('tasks').insertOne(task);
            res.status(201).json({ message: 'Tarefa criada com sucesso' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar tarefa' });
    }
});

app.delete('/api/tasks/:id', authenticateToken, logActivity('delete_task'), async (req, res) => {
    try {
        await db.collection('tasks').deleteOne({ id: req.params.id });
        res.json({ message: 'Tarefa removida com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover tarefa' });
    }
});

// --- ROTAS DE EQUIPE (COLABORADORES) ---

app.get('/api/employees', authenticateToken, async (req, res) => {
    try {
        const employees = await db.collection('employees').find().toArray();
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar equipe' });
    }
});

app.post('/api/employees', authenticateToken, logActivity('save_employee'), async (req, res) => {
    const employee = req.body;
    try {
        if (employee.id) {
            const id = employee.id;
            const { _id, id: empId, ...updateData } = employee;
            await db.collection('employees').updateOne({ id: id }, { $set: updateData }, { upsert: true });
            res.json({ message: 'Colaborador atualizado com sucesso' });
        } else {
            employee.id = `emp_${Date.now()}`;
            await db.collection('employees').insertOne(employee);
            res.status(201).json({ message: 'Colaborador criado com sucesso' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar colaborador' });
    }
});

app.delete('/api/employees/:id', authenticateToken, logActivity('delete_employee'), async (req, res) => {
    try {
        await db.collection('employees').deleteOne({ id: req.params.id });
        res.json({ message: 'Colaborador removido com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover colaborador' });
    }
});

// Rota para obter dados do usuário logado (incluindo calendários)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.collection('users').findOne({ username: req.user.username }, { projection: { password: 0 } });
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados do usuário', error: error.message });
    }
});

// --- ROTAS DE GERENCIAMENTO DE USUÁRIOS (Apenas Admin) ---

// Rota para listar todos os usuários
app.get('/api/users', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const users = await db.collection('users').find({}).toArray();
        // Nunca retorne a senha, mesmo que hasheada
        const usersWithoutPasswords = users.map(({ password, ...user }) => user);
        res.json(usersWithoutPasswords);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
    }
});

// Rota para criar um novo usuário
app.post('/api/users', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const { username, password, role, apartments } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Nome de usuário, senha e função são obrigatórios.' });
        }

        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Este nome de usuário já está em uso.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let normalizedApartments = [];
        if (Array.isArray(apartments)) {
            normalizedApartments = apartments.map(a => a.trim()).filter(a => a !== '');
        } else if (typeof apartments === 'string') {
            normalizedApartments = apartments.split(',').map(a => a.trim()).filter(a => a !== '');
        } else if (req.body.apartment) {
            normalizedApartments = [req.body.apartment.trim()];
        }
        const newUserDoc = { username, password: hashedPassword, role, apartments: normalizedApartments };
        const result = await db.collection('users').insertOne(newUserDoc);

        // Emite WebSocket AFTER DB update
        req.app.get('io').emit('data_updated', { action: 'create_user', user: req.user.username });

        const newUser = { _id: result.insertedId, username, role, apartments: newUserDoc.apartments };
        res.status(201).json({ message: 'Usuário criado com sucesso', data: newUser });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar usuário', error: error.message });
    }
});

// Rota para deletar um usuário
app.delete('/api/users/:id', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const user = await db.collection('users').findOne({ _id: new ObjectId(id) });

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        if (user.username === 'admin') {
            return res.status(403).json({ message: 'O usuário "admin" não pode ser excluído.' });
        }

        await db.collection('users').deleteOne({ _id: new ObjectId(id) });

        // Emite WebSocket AFTER DB update
        req.app.get('io').emit('data_updated', { action: 'delete_user', user: req.user.username });

        res.status(200).json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir usuário', error: error.message });
    }
});

// Rota para atualizar um usuário
app.put('/api/users/:id', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { role, password, apartments } = req.body;
        
        let normalizedApartments = [];
        if (Array.isArray(apartments)) {
            normalizedApartments = apartments.map(a => a.trim()).filter(a => a !== '');
        } else if (typeof apartments === 'string') {
            normalizedApartments = apartments.split(',').map(a => a.trim()).filter(a => a !== '');
        } else if (req.body.apartment) {
            normalizedApartments = [req.body.apartment.trim()];
        }

        const updateDoc = { $set: { role, apartments: role === 'owner' ? normalizedApartments : [] } };
        if (role !== 'owner') {
            updateDoc.$unset = { apartment: "", apartments: "" }; // Clean up both fields
        } else {
            updateDoc.$unset = { apartment: "" }; // Migration: remove old singular field
        }

        if (password) {
            updateDoc.$set.password = await bcrypt.hash(password, 10);
        }

        await db.collection('users').updateOne({ _id: new ObjectId(id) }, updateDoc);

        // Emite WebSocket AFTER DB update
        req.app.get('io').emit('data_updated', { action: 'update_user', user: req.user.username });

        res.status(200).json({ message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
    }
});

// --- ROTAS DE CALENDÁRIO EXTERNO (iCal Sync) ---

// Rota para buscar e processar calendários externos
app.get('/api/external-calendars', authenticateToken, async (req, res) => {
    try {
        const { apartments } = req.user;
        const user = await db.collection('users').findOne({ username: req.user.username });
        const calendarLinks = user.externalCalendars || {}; // Ex: { "101": { airbnb: "url", booking: "url" } }
        
        const allEvents = [];
        
        for (const apt of Object.keys(calendarLinks)) {
            // Se o proprietário tiver vários aptos, garantimos que ele só veja os dele
            if (req.user.role === 'owner' && !apartments.includes(apt)) continue;

            const platforms = calendarLinks[apt];
            for (const platform of Object.keys(platforms)) {
                const url = platforms[platform];
                if (!url) continue;

                try {
                    const response = await fetch(url);
                    const icalContent = await response.text();
                    const data = ical.parseICS(icalContent);

                    for (const k in data) {
                        if (data[k].type === 'VEVENT') {
                            const ev = data[k];
                            allEvents.push({
                                id: `ext_${apt}_${platform}_${ev.uid || Math.random()}`,
                                apartment: apt,
                                platform: platform,
                                startDate: ev.start.toISOString().split('T')[0],
                                endDate: ev.end.toISOString().split('T')[0],
                                status: 'external',
                                summary: ev.summary || `Reserva ${platform.toUpperCase()}`
                            });
                        }
                    }
                } catch (err) {
                    console.error(`Falha ao processar calendário ${platform} do apto ${apt}:`, err);
                }
            }
        }
        
        res.json(allEvents);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar calendários externos', error: error.message });
    }
});

// Rota para salvar links de calendários externos
app.post('/api/users/calendars', authenticateToken, async (req, res) => {
    try {
        const { calendars } = req.body; // { "101": { airbnb: "url", booking: "url" } }
        const { username } = req.user;

        await db.collection('users').updateOne(
            { username },
            { $set: { externalCalendars: calendars } }
        );

        res.json({ message: 'Configurações de calendário salvas com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar configurações de calendário', error: error.message });
    }
});

// Rota para buscar os logs de atividade
app.get('/api/logs', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const { username, startDate, endDate, page = 1, limit = 20 } = req.query;
        const query = {};
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        if (username) {
            query.username = new RegExp(username, 'i'); // Busca case-insensitive
        }

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) {
                query.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                query.timestamp.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999)); // Inclui o dia inteiro
            }
        }

        const totalCount = await db.collection('activity_logs').countDocuments(query);
        const logs = await db.collection('activity_logs').find(query).sort({ timestamp: -1 }).skip(skip).limit(limitNum).toArray();

        res.json({ logs, totalCount, page: pageNum, totalPages: Math.ceil(totalCount / limitNum) });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar logs de atividade', error: error.message });
    }
});

// --- ROTAS DE GERENCIAMENTO DE PROPRIEDADES (Apenas Admin) ---

// Rota para listar todas as propriedades
app.get('/api/properties', authenticateToken, async (req, res) => {
    const { role, apartment } = req.user;
    try {
        let query = {};
        if (role === 'owner' && apartment) {
            // Busca tolerante a espaços e maiúsculas/minúsculas
            query = { name: new RegExp(`^${apartment.trim()}$`, 'i') };
        }
        const properties = await db.collection('properties').find(query).sort({ name: 1 }).toArray();
        res.json(properties);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar propriedades', error: error.message });
    }
});

// Rota para criar uma nova propriedade
app.post('/api/properties', authenticateToken, authorize('admin'), logActivity('create_property'), async (req, res) => {
    const { role, apartment } = req.user;
    try {
        let { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'O nome da propriedade é obrigatório.' });
        }
        name = name.trim(); // Remove espaços extras no início e fim
        const existing = await db.collection('properties').findOne({ name: new RegExp(`^${name}$`, 'i') }); // Busca insensível a maiúsculas/minúsculas
        if (existing) {
            return res.status(400).json({ message: 'Esta propriedade já existe.' });
        }
        const result = await db.collection('properties').insertOne({ name, capacity: req.body.capacity || 0, amenities: req.body.amenities || {} });

        // Emite WebSocket AFTER DB update
        req.app.get('io').emit('data_updated', { action: 'create_property', user: req.user.username });

        res.status(201).json({ message: 'Propriedade criada com sucesso', data: { _id: result.insertedId, name } });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar propriedade', error: error.message });
    }
});

// Rota para deletar uma propriedade
app.delete('/api/properties/:id', authenticateToken, authorize('admin'), logActivity('delete_property'), async (req, res) => {
    try {
        await db.collection('properties').deleteOne({ _id: new ObjectId(req.params.id) });

        // Emite WebSocket AFTER DB update
        req.app.get('io').emit('data_updated', { action: 'delete_property', user: req.user.username });

        res.status(200).json({ message: 'Propriedade excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir propriedade', error: error.message });
    }
});

// Rota para atualizar uma propriedade
app.put('/api/properties/:id', authenticateToken, authorize('admin'), logActivity('update_property'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, capacity, amenities } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'O nome da propriedade é obrigatório.' });
        }

        const updateDoc = { $set: { name, capacity, amenities } };
        const result = await db.collection('properties').updateOne({ _id: new ObjectId(id) }, updateDoc);

        if (result.matchedCount === 0) return res.status(404).json({ message: 'Propriedade não encontrada.' });

        // Emite WebSocket AFTER DB update
        req.app.get('io').emit('data_updated', { action: 'update_property', user: req.user.username });

        res.status(200).json({ message: 'Propriedade atualizada com sucesso', data: { _id: id, name, capacity, amenities } });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar propriedade', error: error.message });
    }
});

// --- ROTAS DE LEITURA DE DADOS ---

// Rota para buscar todas as reservas
app.get('/api/reservations', authenticateToken, async (req, res) => {
    try {
        const { role, apartments } = req.user;
        let query = {};
        if (role === 'owner') {
            // Se tiver múltiplos apartamentos, busca todos eles
            query = { apartment: { $in: apartments || [] } };
        }
        let reservations = await db.collection('reservations').find(query).toArray();

        // Se for proprietário, anexa o nome do hóspede a cada reserva por questões de privacidade
        if (role === 'owner') {
            const guestIds = reservations.map(r => r.guestId).filter(id => id && id !== 'TASK');
            const guests = await db.collection('guests').find({ id: { $in: guestIds } }).toArray();
            const guestMap = guests.reduce((map, guest) => {
                map[guest.id] = guest.name;
                return map;
            }, {});
            reservations = reservations.map(res => ({ 
                ...res, 
                guestName: guestMap[res.guestId] || res.guestName || 'Hóspede' 
            }));
        }

        res.json(reservations);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar reservas', error: error.message });
    }
});

// Rota para buscar todos os hóspedes
app.get('/api/guests', authenticateToken, async (req, res) => {
    const { role, apartments, username } = req.user;
    let query = {};
    if (role === 'owner') {
        const myApartments = req.user.apartments || [];
        const myReservations = await db.collection('reservations').find({ apartment: { $in: myApartments } }).toArray();
        const myGuestIds = myReservations.map(r => r.guestId).filter(id => id && id !== 'TASK');

        query = {
            $or: [
                { id: { $in: myGuestIds } },
                { createdBy: username }
            ]
        };
    }
    // Excluir os dados sensíveis e pesados base64 dos documentos na resposta inicial para economizar banda
    const guests = await db.collection('guests').find(query, { projection: { 'documents.data': 0 } }).toArray();
    res.json(guests);
});

// Rota para buscar todos os funcionários
app.get('/api/employees', authenticateToken, async (req, res) => {
    const employees = await db.collection('employees').find({}).toArray();
    res.json(employees);
});

// Rota para buscar os documentos de um hóspede específico
app.get('/api/guests/:id/documents', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, apartments, username } = req.user;

        const guest = await db.collection('guests').findOne({ id: id }, { projection: { documents: 1, id: 1, name: 1 } });

        if (!guest) {
            return res.status(404).json({ message: 'Hóspede não encontrado.' });
        }

        // Proprietário só pode ver documentos de hóspedes vinculados ao seu apartamento
        if (role === 'owner') {
            const myApartments = req.user.apartments || [];
            const myReservations = await db.collection('reservations').find({ apartment: { $in: myApartments } }).toArray();
            const myGuestIds = myReservations.map(r => r.guestId).filter(gid => gid && gid !== 'TASK');
            if (!myGuestIds.includes(id) && guest.createdBy !== username) {
                return res.status(403).json({ message: 'Acesso negado.' });
            }
        }

        res.json({ id: guest.id, name: guest.name, documents: guest.documents || [] });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar documentos', error: error.message });
    }
});

// Rota para buscar todas as despesas
app.get('/api/expenses', authenticateToken, authorize('admin'), async (req, res) => {
    const expenses = await db.collection('expenses').find({}).toArray();
    res.json(expenses);
});

// Rota de busca global
app.get('/api/search', authenticateToken, async (req, res) => {
    try {
        const { term } = req.query;
        if (!term || term.length < 2) {
            return res.status(400).json({ message: 'O termo de busca deve ter pelo menos 2 caracteres.' });
        }

        // Cria uma expressão regular para busca case-insensitive
        const regex = new RegExp(term, 'i');

        // Busca em paralelo nas diferentes coleções
        const [guests, reservations, employees] = await Promise.all([
            // Busca Hóspedes
            db.collection('guests').find({
                $or: [
                    { name: regex },
                    { doc: regex },
                    { phone: regex },
                    { email: regex }
                ]
            }).limit(10).toArray(),

            // Busca Reservas (pelo apartamento ou placa do veículo)
            // Agora também busca por notas (para encontrar tarefas)
            db.collection('reservations').find({
                $or: [
                    { apartment: regex },
                    { vehiclePlate: regex },
                    { notes: regex }
                ]
            }).limit(10).toArray(),

            // Busca Funcionários
            db.collection('employees').find({
                $or: [{ name: regex }, { role: regex }, { doc: regex }]
            }).limit(10).toArray()
        ]);

        res.status(200).json({ guests, reservations, employees });
    } catch (error) {
        console.error('Erro na busca global:', error);
        res.status(500).json({ message: 'Erro ao realizar a busca', error: error.toString() });
    }
});

// Rota para salvar/atualizar uma reserva
app.post('/api/reservations', authenticateToken, logActivity('save_reservation'), async (req, res) => { // logActivity estava aqui
    try {
        const reservationData = req.body;
        const { role, apartments } = req.user;

        // Medida de segurança: Garante que um proprietário só pode salvar reservas para seus próprios apartamentos.
        if (role === 'owner' && (!apartments || !apartments.includes(reservationData.apartment))) {
            return res.status(403).json({ message: 'Acesso negado: você não pode criar ou editar reservas para este apartamento.' });
        }

        // Se tem um ID, atualiza. Se não, insere.
        // O MongoDB usa _id por padrão, então precisamos adaptar.
        const { _id, ...dataToUpdate } = reservationData; // Remove o _id do objeto de atualização
        const filter = { id: reservationData.id };
        const update = { $set: dataToUpdate };
        const options = { upsert: true }; // Se não encontrar, cria um novo

        // Lógica para notificar o proprietário sobre aprovação/recusa
        if (reservationData.id && (dataToUpdate.status === 'confirmed' || dataToUpdate.status === 'canceled')) {
            const originalReservation = await db.collection('reservations').findOne(filter);
            if (originalReservation && originalReservation.status === 'pending-approval') {
                // Encontra o usuário proprietário do apartamento
                const owner = await db.collection('users').findOne({ role: 'owner', apartment: originalReservation.apartment });
                if (owner) {
                    // Emite um evento específico para o proprietário via WebSocket
                    const notificationData = {
                        targetUser: owner.username,
                        action: 'reservation_status_changed',
                        status: dataToUpdate.status,
                        apartment: originalReservation.apartment,
                        reason: dataToUpdate.notes || null // Inclui o motivo da recusa
                    };
                    req.app.get('io').emit('user_notification', notificationData);

                    // Dispara notificação por e-mail para o proprietário assincronamente
                    // O campo 'username' está sendo utilizado como e-mail conforme modelo de dados atual
                    sendReservationStatusEmail(owner.username, dataToUpdate, dataToUpdate.status, dataToUpdate.notes).catch(err => {
                        console.error("Falha ao enviar e-mail de notificação:", err);
                    });
                }
            }
        }

        await db.collection('reservations').updateOne(filter, update, options);

        // Emite WebSocket AFTER DB update
        req.app.get('io').emit('data_updated', { action: 'save_reservation', sub_action: dataToUpdate.status === 'pending-approval' ? 'new_approval_request' : null, user: req.user.username });

        res.status(200).json({ message: 'Reserva salva com sucesso', data: dataToUpdate });
    } catch (error) {
        console.error('Erro ao salvar reserva:', error);
        res.status(500).json({ message: 'Erro ao salvar reserva', error: error.toString() });
    }
});

// Rota para deletar uma reserva
app.delete('/api/reservations/:id', authenticateToken, logActivity('delete_reservation'), async (req, res) => { // logActivity estava aqui
    try {
        const { id } = req.params;
        const result = await db.collection('reservations').deleteOne({ id: id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Reserva não encontrada' });
        }

        // Emite WebSocket AFTER DB update
        req.app.get('io').emit('data_updated', { action: 'delete_reservation', user: req.user.username });

        res.status(200).json({ message: 'Reserva deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar reserva:', error);
        res.status(500).json({ message: 'Erro ao deletar reserva', error: error.toString() });
    }
});

// Rota para salvar/atualizar um hóspede
app.post('/api/guests', authenticateToken, authorize(['admin', 'staff', 'owner']), logActivity('save_guest'), async (req, res) => {
    try {
        const guestData = req.body;
        let finalGuestData;

        // Se um ID foi fornecido, tenta atualizar.
        // A verificação principal para evitar duplicatas será pelo documento.
        if (guestData.id) {
            const filter = { id: guestData.id };
            const { _id, ...dataToUpdate } = guestData;

            // Se a nova foto for nula, não a remova, mantenha a antiga.
            // Apenas atualize se uma nova foto (data:image) for enviada.
            if (dataToUpdate.photoUrl === null) delete dataToUpdate.photoUrl;

            const update = { $set: dataToUpdate };
            const options = { upsert: true }; // Se não encontrar, cria um novo

            await db.collection('guests').updateOne(filter, update, options);
            finalGuestData = dataToUpdate;
        } else {
            // Se não tem ID, é um novo hóspede. Gera um novo ID.
            guestData.id = new ObjectId().toHexString();
            guestData.createdAt = new Date(); // Adiciona a data de criação
            guestData.createdBy = req.user.username; // Rastreia quem criou
            if (req.user.role === 'owner') {
                guestData.apartment = req.user.apartment; // Vincula ao apartamento do proprietário
            }
            const insertResult = await db.collection('guests').insertOne(guestData);
            // Busca o documento recém-criado para retornar o objeto completo.
            finalGuestData = await db.collection('guests').findOne({ _id: insertResult.insertedId });
        }

        // Emite WebSocket AFTER DB update
        req.app.get('io').emit('data_updated', { action: 'save_guest', user: req.user.username });

        res.status(200).json({ message: 'Hóspede salvo com sucesso', data: finalGuestData });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar hóspede', error: error.message });
    }
});

// Rota para salvar/atualizar um funcionário
app.post('/api/employees', authenticateToken, logActivity('save_employee'), async (req, res) => { // logActivity estava aqui
    try {
        const employeeData = req.body;
        const filter = { id: employeeData.id };
        const { _id, ...dataToUpdate } = employeeData;
        const update = { $set: dataToUpdate };
        const options = { upsert: true };

        await db.collection('employees').updateOne(filter, update, options);
        res.status(200).json({ message: 'Funcionário salvo com sucesso', data: dataToUpdate });
    } catch (error) {
        console.error('Erro ao salvar funcionário:', error);
        res.status(500).json({ message: 'Erro ao salvar funcionário', error: error.toString() });
    }
});

// Rota para deletar um funcionário
app.delete('/api/employees/:id', authenticateToken, logActivity('delete_employee'), async (req, res) => { // logActivity estava aqui
    try {
        const { id } = req.params;
        await db.collection('employees').deleteOne({ id: id });

        // Emite WebSocket AFTER DB update
        req.app.get('io').emit('data_updated', { action: 'delete_employee', user: req.user.username });

        res.status(200).json({ message: 'Funcionário deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar funcionário:', error);
        res.status(500).json({ message: 'Erro ao deletar funcionário', error: error.toString() });
    }
});

// Rota para deletar um hóspede e suas reservas
app.delete('/api/guests/:id', authenticateToken, logActivity('delete_guest'), async (req, res) => { // logActivity estava aqui
    try {
        const { id } = req.params;
        // Deleta o hóspede
        const guestResult = await db.collection('guests').deleteOne({ id: id });

        if (guestResult.deletedCount === 0) {
            return res.status(404).json({ message: 'Hóspede não encontrado' });
        }

        await db.collection('reservations').deleteMany({ guestId: id });

        // Emite WebSocket AFTER DB update
        req.app.get('io').emit('data_updated', { action: 'delete_guest', user: req.user.username });

        res.status(200).json({ message: 'Hóspede e suas reservas foram deletados com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar hóspede:', error);
        res.status(500).json({ message: 'Erro ao deletar hóspede', error: error.toString() });
    }
});

// Rota para salvar/atualizar uma despesa
app.post('/api/expenses', authenticateToken, authorize('admin'), logActivity('save_expense'), async (req, res) => { // logActivity estava aqui
    try {
        const expenseData = req.body;
        // Se não tiver ID, é uma nova despesa, crio um ID.
        if (!expenseData.id) {
            expenseData.id = `exp_${Date.now()}`;
        }

        const filter = { id: expenseData.id };
        const { _id, ...dataToUpdate } = expenseData;
        const update = { $set: dataToUpdate };
        const options = { upsert: true };

        await db.collection('expenses').updateOne(filter, update, options);
        res.status(200).json({ message: 'Despesa salva com sucesso', data: dataToUpdate });
    } catch (error) {
        console.error('Erro ao salvar despesa:', error);
        res.status(500).json({ message: 'Erro ao salvar despesa', error: error.toString() });
    }
});

// Rota para deletar uma despesa
app.delete('/api/expenses/:id', authenticateToken, authorize('admin'), logActivity('delete_expense'), async (req, res) => { // logActivity estava aqui
    try {
        const { id } = req.params;
        const result = await db.collection('expenses').deleteOne({ id: id });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'Despesa não encontrada' });

        // Emite WebSocket AFTER DB update
        req.app.get('io').emit('data_updated', { action: 'delete_expense', user: req.user.username });

        res.status(200).json({ message: 'Despesa deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar despesa:', error);
        res.status(500).json({ message: 'Erro ao deletar despesa', error: error.toString() });
    }
});

// Rota para importar dados de um backup
app.post('/api/import', authenticateToken, authorize('admin'), logActivity('import_backup'), async (req, res) => { // logActivity estava aqui
    try {
        const data = req.body;

        // Validação básica do backup
        if (!data || !Array.isArray(data.guests) || !Array.isArray(data.reservations)) {
            return res.status(400).json({ message: 'Arquivo de backup inválido ou mal formatado.' });
        }

        // Inicia uma transação para garantir a consistência dos dados
        // Embora o MongoDB < 4.0 não suporte transações multi-documento da mesma forma,
        // a lógica de apagar e inserir em sequência é geralmente segura para este caso de uso.

        // Limpa as coleções existentes
        await db.collection('guests').deleteMany({});
        await db.collection('reservations').deleteMany({});
        await db.collection('employees').deleteMany({});
        await db.collection('expenses').deleteMany({});

        // Insere os novos dados do backup
        if (data.guests.length > 0) await db.collection('guests').insertMany(data.guests);
        if (data.reservations.length > 0) await db.collection('reservations').insertMany(data.reservations);
        if (data.employees && data.employees.length > 0) await db.collection('employees').insertMany(data.employees);
        if (data.expenses && data.expenses.length > 0) await db.collection('expenses').insertMany(data.expenses);

        res.status(200).json({ message: 'Backup restaurado com sucesso no servidor.' });
    } catch (error) {
        console.error('Erro ao importar dados:', error);
        res.status(500).json({ message: 'Erro no servidor ao restaurar o backup.', error: error.toString() });
    }
});

// --- ROTAS DE MENSAGENS ---

// Rota para enviar uma mensagem
app.post('/api/messages', authenticateToken, async (req, res) => {
    try {
        const { to, message, file, apartment } = req.body;
        const from = req.user.username;

        if (!to || (!message && !file)) {
            return res.status(400).json({ message: 'Destinatário e um conteúdo (mensagem ou arquivo) são obrigatórios.' });
        }

        const messageDoc = {
            from,
            to,
            apartment: apartment || null, // Novo campo para contexto de unidade
            message,
            timestamp: new Date(),
            read: false,
            file: file || null
        };

        await db.collection('messages').insertOne(messageDoc);

        // Força o ID a ser string para evitar problemas de serialização no mobile/websocket
        const serializedMsg = { ...messageDoc, _id: messageDoc._id.toString() };

        // Notificar o destinatário via WebSocket
        req.app.get('io').emit('new_message', serializedMsg);

        res.status(201).json({ message: 'Mensagem enviada com sucesso', data: serializedMsg });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao enviar mensagem', error: error.message });
    }
});

// Rota para buscar todas as conversas ativas (apenas admin)
app.get('/api/messages/threads', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const currentUser = req.user.username;

        // 1. Buscar todos os parceiros de conversa distintos
        const partnersSent = await db.collection('messages').distinct('to', { from: currentUser });
        const partnersReceived = await db.collection('messages').distinct('from', { to: currentUser });
        const allPartners = [...new Set([...partnersSent, ...partnersReceived])].filter(p => p !== currentUser);

        // 2. Para cada parceiro, obter a última mensagem e a contagem de não lidas
        const threads = await Promise.all(allPartners.map(async (partner) => {
            const lastMsg = await db.collection('messages')
                .find({ $or: [{ from: currentUser, to: partner }, { from: partner, to: currentUser }] })
                .sort({ timestamp: -1 })
                .limit(1)
                .toArray();
            
            const unreadCount = await db.collection('messages')
                .countDocuments({ from: partner, to: currentUser, read: false });

            // Buscar dados do usuário para mostrar o nome real e apartamentos se for 'owner'
            const userData = await db.collection('users').findOne({ username: partner }, { projection: { password: 0 } });

            return {
                username: partner,
                lastMessage: lastMsg[0]?.message || '',
                timestamp: lastMsg[0]?.timestamp || null,
                unreadCount: unreadCount,
                role: userData?.role || 'user',
                apartments: userData?.apartments || []
            };
        }));

        // Ordenar por data da última mensagem (mais recentes primeiro)
        threads.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        res.json(threads);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar threads de conversa', error: error.message });
    }
});

// Rota para buscar uma conversa
app.get('/api/messages/:partner', authenticateToken, async (req, res) => {
    try {
        const currentUser = req.user.username;
        const partner = req.params.partner;

        const messages = await db.collection('messages').find({
            $or: [{ from: currentUser, to: partner }, { from: partner, to: currentUser }]
        }).sort({ timestamp: 1 }).toArray();

        // Normaliza IDs
        const normalizedMessages = messages.map(m => ({ ...m, _id: m._id.toString() }));

        res.json(normalizedMessages);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar mensagens', error: error.message });
    }
});

// Rota para marcar mensagens como lidas
app.post('/api/messages/read', authenticateToken, async (req, res) => {
    try {
        const currentUser = req.user.username;
        const { partner } = req.body;

        if (!partner) {
            return res.status(400).json({ message: 'Parceiro de conversa não especificado.' });
        }

        await db.collection('messages').updateMany(
            { from: partner, to: currentUser, read: false },
            { $set: { read: true } }
        );

        res.status(200).json({ message: 'Mensagens marcadas como lidas.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao marcar mensagens como lidas', error: error.message });
    }
});

// Rota para buscar um resumo de mensagens não lidas agrupadas por remetente
app.get('/api/messages/unread-summary', authenticateToken, async (req, res) => {
    try {
        const currentUser = req.user.username;

        const unreadSummary = await db.collection('messages').aggregate([
            { $match: { to: currentUser, read: false } },
            { $group: { _id: "$from", count: { $sum: 1 } } },
            { $project: { _id: 0, from: "$_id", count: "$count" } }
        ]).toArray();

        res.json(unreadSummary);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar mensagens', error: error.message });
    }
});

// Novo: Rota para apagar uma mensagem individual para todos
app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validação básica do formato do MongoDB ID
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({ message: 'ID da mensagem inválido.' });
        }

        const msg = await db.collection('messages').findOne({ _id: new ObjectId(id) });
        
        if (!msg) {
            return res.status(404).json({ message: 'Mensagem não encontrada.' });
        }

        // Log para Debug
        console.log(`[DELETE MSG] Requester: ${req.user.username} (${req.user.role}), Sender: ${msg.from}, MsgID: ${id}`);

        // Permissão: Apenas o remetente ou um Admin pode apagar
        // Verifica se o username bate OU se o role é admin
        const isSender = msg.from === req.user.username;
        const isAdmin = req.user.role === 'admin';

        if (!isSender && !isAdmin) {
            return res.status(403).json({ message: 'Você não tem permissão para excluir esta mensagem.' });
        }

        await db.collection('messages').deleteOne({ _id: new ObjectId(id) });

        // Notificar via WebSocket para remover da tela de ambos
        req.app.get('io').emit('message_deleted', { id });

        res.status(200).json({ message: 'Mensagem excluída para todos.' });
    } catch (error) {
        console.error('Erro ao excluir mensagem:', error);
        res.status(500).json({ message: 'Erro interno ao excluir mensagem', error: error.message });
    }
});

// Rota para apagar um histórico de conversa (apenas admin)
app.delete('/api/messages/history/:partner', authenticateToken, async (req, res) => {
    try {
        const currentUser = req.user.username;
        const currentUserRole = req.user.role;
        const partner = req.params.partner;

        if (!partner) {
            return res.status(400).json({ message: 'Parceiro de conversa não especificado.' });
        }

        // Regra: Admin pode apagar qualquer conversa. Owner só pode apagar a conversa com o 'admin'.
        if (currentUserRole !== 'admin' && (currentUserRole !== 'owner' || partner !== 'admin')) {
            return res.status(403).json({ message: 'Permissão negada para apagar este histórico.' });
        }

        await db.collection('messages').deleteMany({
            $or: [{ from: currentUser, to: partner }, { from: partner, to: currentUser }]
        });

        res.status(200).json({ message: 'Histórico de conversa apagado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao apagar histórico de conversa', error: error.message });
    }
});

// Rota "catch-all" para servir o index.html para qualquer rota não-API
// Isso é útil para single-page applications (SPA) e evita erros "Cannot GET"
app.use((req, res, next) => {
    // Se a rota não começa com /api, serve o arquivo HTML principal.
    if (!req.path.startsWith('/api')) {
        return res.sendFile(path.join(__dirname, 'index.html'));
    }
    next(); // Se for uma rota /api, passa para o próximo middleware (ou para um erro 404 se não houver)
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(`[INTERNAL ERROR] ${req.method} ${req.url}:`, err);
    res.status(500).json({ 
        message: 'Erro interno no servidor', 
        error: err.message,
        path: req.url
    });
});

// 3. Conectar ao MongoDB e depois iniciar o servidor
console.log('Tentando conectar ao MongoDB em:', mongoUrl);
MongoClient.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 })
    .then(async client => {
        console.log('Conectado ao MongoDB com sucesso!');
        db = client.db(dbName);

        // Garante que o usuário 'admin' exista e tenha a senha correta
        const users = db.collection('users');
        // Usa a variável de ambiente ADMIN_PASSWORD ou o fallback padrão
        const adminPassword = process.env.ADMIN_PASSWORD || 'stl2025';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Sempre garante que o admin exista com a senha correta (cria ou atualiza)
        const adminResult = await users.updateOne(
            { username: 'admin' },
            { $set: { username: 'admin', password: hashedPassword, role: 'admin' }, $setOnInsert: { apartments: [] } },
            { upsert: true }
        );
        if (adminResult.upsertedCount > 0) {
            console.log(`Usuário "admin" criado com a senha configurada.`);
        } else {
            console.log(`Usuário "admin" verificado e senha sincronizada.`);
        }

        // 5. Iniciar o servidor APENAS DEPOIS de conectar ao banco
        server.listen(port, () => {
            console.log(`Backend rodando em http://localhost:${port}`);
        });

        // Lógica do Socket.io
        io.on('connection', (socket) => {
            console.log('Um usuário se conectou via WebSocket');
        });
    })
    .catch(err => {
        console.error('Falha ao conectar ao MongoDB. O servidor não foi iniciado.', err);
        process.exit(1); // Encerra o processo se não conseguir conectar
    });
