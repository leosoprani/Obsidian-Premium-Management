# 🏨 Storey Luxor — Guia de Deploy e Fluxo de Reservas

## Visão Geral do Sistema

O sistema já possui **dois portais integrados** no mesmo código:

| Portal | Acesso | Função |
|---|---|---|
| **Administrador** | `role: admin` | Gerencia tudo: reservas, hóspedes, funcionários, financeiro |
| **Proprietário** | `role: owner` | Visualiza suas reservas, solicita novas, chama o admin pelo chat |

---

## 📋 Fluxo de Reservas: Proprietário → Administrador

```mermaid
sequenceDiagram
    participant P as Proprietário
    participant S as Sistema
    participant A as Administrador

    P->>S: Solicita nova reserva (status: pending-approval)
    S->>A: Notificação em tempo real (WebSocket/SSE)
    A->>S: Abre painel de Aprovações
    A-->>S: Aprova + define preço (status: confirmed)
    S->>P: Notificação de aprovação
    A->>S: Edita dados se necessário (hóspede, datas, valor)
    A-->>S: Faz check-in (status: checked-in)
    A-->>S: Finaliza (status: finished)
    P->>S: Visualiza histórico no seu portal
```

### Estados da Reserva
| Status | Quem define | Descrição |
|---|---|---|
| `pending-approval` | **Proprietário** | Aguardando aprovação do admin |
| `confirmed` | **Admin** | Aprovada com preço definido |
| `checked-in` | **Admin** | Hóspede no imóvel |
| `finished` | **Admin** (automático) | Checkout realizado |
| `canceled` | **Admin** | Recusada ou cancelada |

---

## 🏗️ Arquitetura Técnica Atual

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (SPA)                       │
│  HTML + Vanilla JS + Tailwind CSS + EJS                │
│  ┌─────────────────┐  ┌──────────────────────────────┐ │
│  │  Portal Admin   │  │   Portal Proprietário        │ │
│  │  (role=admin)   │  │   (role=owner)               │ │
│  └─────────────────┘  └──────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API + JWT Auth
┌──────────────────────────▼──────────────────────────────┐
│                    BACKEND (Node.js + Express)          │
│  /api/reservations  /api/guests  /api/auth              │
│  /api/messages      /api/logs    /api/employees          │
└──────────────────────────┬──────────────────────────────┘
                           │ Mongoose ODM
┌──────────────────────────▼──────────────────────────────┐
│                    BANCO DE DADOS                       │
│  MongoDB Atlas (nuvem) + Dexie.js (cache local)        │
└─────────────────────────────────────────────────────────┘
```

---

## 🌐 Como Hospedar em um Site (Deploy em Produção)

### Opção Recomendada: Stack Gratuita/Barata

| Componente | Serviço | Custo |
|---|---|---|
| **Backend** (Node.js) | [Render.com](https://render.com) | Free tier (dorme após 15 min inativo) |
| **Frontend** (HTML/EJS) | Servido pelo próprio Express no Render | — |
| **Banco de Dados** | [MongoDB Atlas](https://www.mongodb.com/atlas) | Free tier (512 MB) |
| **Domínio** | Cloudflare Registrar | ~R$ 40/ano |

> **URL resultante:** `https://storeyluxor.onrender.com`

---

### Passo a Passo para Deploy

#### 1. MongoDB Atlas (Banco de Dados na Nuvem)
```
1. Criar conta em mongodb.com/atlas
2. Criar cluster FREE (M0)
3. Criar usuário do banco: stluser / senha-forte
4. Liberar acesso de qualquer IP: 0.0.0.0/0
5. Copiar a Connection String:
   mongodb+srv://stluser:senha@cluster0.xxxxx.mongodb.net/stl-db
```

#### 2. Variáveis de Ambiente no Servidor
Criar arquivo `.env` (ou configurar no Render):
```env
MONGO_URI=mongodb+srv://stluser:senha@cluster0.xxx.mongodb.net/stl-db
JWT_SECRET=sua-chave-secreta-aqui-muito-longa
NODE_ENV=production
PORT=3000
```

#### 3. Deploy no Render.com
```
1. Criar conta em render.com
2. New → Web Service
3. Conectar repositório GitHub (push o código para lá primeiro)
4. Configurar:
   - Build Command: npm install
   - Start Command: node server.js
   - Environment: Node
5. Adicionar Environment Variables (MONGO_URI, JWT_SECRET, etc.)
6. Deploy → URL gerada automaticamente
```

#### 4. GitHub (Repositório do Código)
```bash
# Na pasta do projeto:
git init
git add .
git commit -m "Deploy inicial Storey Luxor"
git remote add origin https://github.com/SEU_USUARIO/stl-main.git
git push -u origin main
```

---

## ✅ Funcionalidades Já Implementadas

- [x] **Login com JWT** — admin e proprietário com roles separadas
- [x] **Portal do Proprietário** — visualiza suas reservas, solicita novas
- [x] **Painel de Aprovações** — admin aprova/recusa com preço
- [x] **Chat interno** — mensagens em tempo real entre portais
- [x] **Notificações** — novas solicitações aparecem para o admin
- [x] **Calendário** — visão completa de ocupação por apartamento
- [x] **Modo Offline** — cache local com Dexie.js (Tarefa 4)
- [x] **Auto-backup** — snapshots automáticos locais

---

## 🔧 O Que Falta Implementar Para Produção

### Alta Prioridade
- [ ] **Configurar `.env` de produção** no Render com MONGO_URI real
- [ ] **Domínio customizado** (ex: `storeyluxor.com.br`) no Render
- [ ] **HTTPS automático** — o Render já fornece certificado SSL grátis

### Fluxo do Proprietário (melhorias)
- [ ] **Email de confirmação** quando admin aprovar a reserva (Nodemailer + Gmail)
- [ ] **Página de cadastro do proprietário** — hoje o admin cria manualmente
- [ ] **Upload de documentos** do hóspede pelo portal do proprietário

### Segurança e Escalabilidade
- [ ] **Rate limiting** nas rotas da API (`express-rate-limit`)
- [ ] **Helmet.js** para headers de segurança HTTP
- [ ] **Refresh token** — hoje o JWT expira e desloga o usuário

---

## 💡 Fluxo Completo de Uso em Produção

```
1. Admin cria conta do proprietário no painel (Usuários → + Proprietário)
2. Proprietário recebe login por email/WhatsApp
3. Proprietário acessa https://storeyluxor.onrender.com
4. Proprietário solicita reserva → preenchendo datas e dados do hóspede
5. Admin recebe notificação em tempo real no painel
6. Admin vai em "Aprovações" → aprova + define preço → confirma
7. Proprietário vê a reserva confirmada no seu portal
8. Admin gerencia check-in, limpeza, checkout
9. Financeiro, relatórios e PDF ficam com o admin
```

---

## 📦 Resumo dos Arquivos Importantes

| Arquivo | Função |
|---|---|
| `server.js` | Servidor Express + EJS + todas as rotas |
| `js/api.js` | Todas as chamadas à API REST |
| `js/sync.js` | Sincronização offline Dexie ↔ MongoDB |
| `js/main.js` | Ponto de entrada, estado global da app |
| `js/ui.js` | Renderização de todas as views |
| `js/events.js` | Todos os listeners de eventos |
| `views/index.ejs` | Template principal (EJS modular) |
| `css/output.css` | CSS compilado (Tailwind build) |
| `src/input.css` | CSS fonte — editar aqui, depois rodar build |

> **⚠️ Importante:** Após qualquer mudança no CSS, rodar: `npm run build:css`
