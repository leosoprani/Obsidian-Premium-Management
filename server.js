// 1. Importar as bibliotecas necessárias
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

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
            }).then(() => { // Emite o evento WebSocket com os dados enriquecidos
                req.app.get('io').emit('data_updated', eventData);
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

    const payload = { username: user.username, role: user.role, apartment: user.apartment };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    res.json({ accessToken });
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
        const { username, password, role, apartment } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Nome de usuário, senha e função são obrigatórios.' });
        }

        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Este nome de usuário já está em uso.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUserDoc = { username, password: hashedPassword, role, apartment: role === 'owner' ? apartment : null };
        const result = await db.collection('users').insertOne(newUserDoc);
        const newUser = { _id: result.insertedId, username, role, apartment: newUserDoc.apartment };
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
        res.status(200).json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir usuário', error: error.message });
    }
});

// Rota para atualizar um usuário
app.put('/api/users/:id', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { role, password, apartment } = req.body;
        const updateDoc = { $set: { role, apartment: role === 'owner' ? apartment : null } };

        if (role !== 'owner') {
            updateDoc.$unset = { apartment: "" };
        }

        if (password) {
            updateDoc.$set.password = await bcrypt.hash(password, 10);
        }

        await db.collection('users').updateOne({ _id: new ObjectId(id) }, updateDoc);
        res.status(200).json({ message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
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
        if (role === 'owner') {
            query = { name: apartment };
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
        res.status(201).json({ message: 'Propriedade criada com sucesso', data: { _id: result.insertedId, name } });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar propriedade', error: error.message });
    }
});

// Rota para deletar uma propriedade
app.delete('/api/properties/:id', authenticateToken, authorize('admin'), logActivity('delete_property'), async (req, res) => {
    try {
        await db.collection('properties').deleteOne({ _id: new ObjectId(req.params.id) });
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

        res.status(200).json({ message: 'Propriedade atualizada com sucesso', data: { _id: id, name, capacity, amenities } });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar propriedade', error: error.message });
    }
});

// --- ROTAS DE LEITURA DE DADOS ---

// Rota para buscar todas as reservas
app.get('/api/reservations', authenticateToken, async (req, res) => {
    const { role, apartment } = req.user;
    let query = {};
    if (role === 'owner') {
        query = { apartment: apartment };
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
        reservations = reservations.map(res => ({ ...res, guestName: guestMap[res.guestId] }));
    }

    res.json(reservations);
});

// Rota para buscar todos os hóspedes
app.get('/api/guests', authenticateToken, async (req, res) => {
    const { role, apartment, username } = req.user;
    let query = {};
    if (role === 'owner') {
        // Proprietários podem ver:
        // 1. Hóspedes que eles mesmos cadastraram (createdBy)
        // 2. Hóspedes que já tiveram reservas em seu apartamento
        const myReservations = await db.collection('reservations').find({ apartment: apartment }).toArray();
        const myGuestIds = myReservations.map(r => r.guestId).filter(id => id && id !== 'TASK');
        
        query = {
            $or: [
                { id: { $in: myGuestIds } },
                { createdBy: username }
            ]
        };
    }
    const guests = await db.collection('guests').find(query).toArray();
    res.json(guests);
});

// Rota para buscar todos os funcionários
app.get('/api/employees', authenticateToken, async (req, res) => {
    const employees = await db.collection('employees').find({}).toArray();
    res.json(employees);
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
        const { role, apartment } = req.user;

        // Medida de segurança: Garante que um proprietário só pode salvar reservas para seu próprio apartamento.
        if (role === 'owner' && reservationData.apartment !== apartment) {
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
                    // Emite um evento específico para o proprietário
                    const notificationData = {
                        targetUser: owner.username,
                        action: 'reservation_status_changed',
                        status: dataToUpdate.status,
                        apartment: originalReservation.apartment,
                        reason: dataToUpdate.notes || null // Inclui o motivo da recusa
                    };
                    req.app.get('io').emit('user_notification', notificationData);
                }
            }
        }

        await db.collection('reservations').updateOne(filter, update, options);
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
        const result = await db.collection('employees').deleteOne({ id: id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Funcionário não encontrado' });
        }
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

        // Deleta todas as reservas associadas a esse hóspede
        await db.collection('reservations').deleteMany({ guestId: id });

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
        const { to, message, file } = req.body;
        const from = req.user.username;

        if (!to || (!message && !file)) {
            return res.status(400).json({ message: 'Destinatário e um conteúdo (mensagem ou arquivo) são obrigatórios.' });
        }

        // Se houver um arquivo, ele já vem como base64.
        // Em uma aplicação real, salvaríamos em disco/S3 e guardaríamos a URL.
        // Por simplicidade aqui, vamos embutir o dado, mas cientes do limite de 16MB do BSON.
        // A limitação de payload do express já foi configurada para '10mb'.

        const messageDoc = {
            from,
            to,
            message,
            timestamp: new Date(),
            read: false,
            file: file || null // Salva o objeto do arquivo se ele existir
        };

        await db.collection('messages').insertOne(messageDoc);

        // Notificar o destinatário via WebSocket
        req.app.get('io').emit('new_message', messageDoc);

        res.status(201).json({ message: 'Mensagem enviada com sucesso', data: messageDoc });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao enviar mensagem', error: error.message });
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

        res.json(messages);
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

// 3. Conectar ao MongoDB e depois iniciar o servidor
MongoClient.connect(mongoUrl, {})
    .then(client => {
        console.log('Conectado ao MongoDB com sucesso!');
        db = client.db(dbName);

        // Garante que o usuário 'admin' exista e tenha a senha correta
        const users = db.collection('users');
        bcrypt.hash('stl2025', 10).then(hashedPassword => {
            users.updateOne(
                { username: 'admin' },
                { $set: { username: 'admin', password: hashedPassword, role: 'admin' } },
                { upsert: true } // Cria se não existir, atualiza se existir
            ).then(() => {
                console.log('Usuário "admin" configurado com a senha "stl2025".');
            });
        });

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
