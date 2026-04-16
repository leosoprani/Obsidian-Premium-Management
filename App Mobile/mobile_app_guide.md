# 📱 Storey Luxor — App Mobile (Android + iOS)

## Estratégia: Reutilizar o Backend Existente

A **grande vantagem** é que o backend Node.js + MongoDB já está pronto e funcionando.
O app mobile só precisa **consumir a mesma API REST** que o site atual usa.

```
┌─────────────┐    ┌─────────────┐    ┌───────────────────┐
│  🌐 Web App │    │  📱 App iOS │    │  📱 App Android   │
│  (Atual)    │    │  (Novo)     │    │  (Novo)           │
└──────┬──────┘    └──────┬──────┘    └──────┬────────────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │  mesma API REST
                ┌─────────▼──────────┐
                │   Backend Node.js  │
                │   Express + JWT    │
                │   (Render.com)     │
                └─────────┬──────────┘
                          │
                ┌─────────▼──────────┐
                │   MongoDB Atlas    │
                │   (Nuvem)          │
                └────────────────────┘
```

> ✅ **Não precisa reescrever nada no backend.** O app usa os mesmos endpoints que o site.

---

## 🛠️ Stack Recomendada: React Native + Expo

### Por que React Native com Expo?

| Critério | React Native + Expo | Flutter | Nativo (Swift/Kotlin) |
|---|---|---|---|
| **Um código** → Android + iOS | ✅ Sim | ✅ Sim | ❌ Dois projetos |
| **Usa JavaScript** (você já conhece) | ✅ Sim | ❌ Dart | ❌ Swift/Kotlin |
| **Publica sem Mac** (Android) | ✅ Sim | ✅ Sim | ❌ Precisa de Mac para iOS |
| **Custo inicial** | Grátis | Grátis | — |
| **Acesso a câmera/notificações** | ✅ Via Expo SDK | ✅ | ✅ |
| **Reutiliza lógica JS** da web | ✅ 80% reutilizável | ❌ | ❌ |

---

## 📐 Arquitetura do App Mobile

```
📱 React Native App
│
├── 🔐 Tela de Login
│     └── POST /api/auth/login → recebe JWT
│
├── 👤 Portal do Proprietário (role=owner)
│     ├── 🏠 Minhas Propriedades
│     ├── 📅 Minhas Reservas (lista + status)
│     ├── ➕ Solicitar Nova Reserva → (status: pending-approval)
│     ├── 💬 Chat com Administrador
│     └── 🔔 Notificações Push (aprovações, mensagens)
│
└── 🛠️ Portal do Administrador (role=admin)
      ├── 📊 Dashboard (receita, ocupação)
      ├── ✅ Aprovações Pendentes
      │     └── Aprovar/Recusar + definir preço
      ├── 📅 Calendário de Ocupação
      ├── 🏨 Reservas Ativas (check-in/out)
      ├── 👥 Hóspedes
      ├── 💬 Chat com Proprietários
      └── 🔔 Notificações Push (novas solicitações)
```

---

## 📋 Fluxo de Reservas no App

```
PROPRIETÁRIO (App)              SISTEMA              ADMINISTRADOR (App)
      │                                                      │
      ├─── Abre formulário ──────────────────────────────────┤
      ├─── Preenche dados ───────────────────────────────────┤
      ├─── Toca "Enviar Solicitação" ────────────────────────┤
      │         │                                            │
      │    POST /api/reservations                            │
      │    { status: 'pending-approval' }                    │
      │         │                                            │
      │         └──────────────── 🔔 Push Notification ─────►
      │                                                      │
      │                                              Toca "Aprovações"
      │                                              Ver detalhes
      │                                              Definir preço
      │                                              Toca "Aprovar"
      │                                                      │
      │         ◄────────────────────────────────────────────┤
      │    PUT /api/reservations/:id                         │
      │    { status: 'confirmed', price: 450 }               │
      │         │                                            │
      ◄── 🔔 Push Notification ─────────────────────────────┤
      │                                                      │
 Vê reserva confirmada                              Gerencia check-in
```

---

## 🧩 Telas do App (por portal)

### Portal do Proprietário
| Tela | Descrição |
|---|---|
| **Login** | Email/senha, biometria opcional |
| **Home** | Cards de resumo: reservas ativas, próximas |
| **Minhas Reservas** | Lista com filtro por status e data |
| **Nova Reserva** | Formulário: apartamento, datas, hóspede, notas |
| **Detalhes da Reserva** | Ver status, valor, histórico de ações |
| **Chat** | Mensagens com o admin em tempo real |
| **Notificações** | Histórico de aprovações e mensagens |
| **Perfil** | Alterar senha, tema |

### Portal do Administrador
| Tela | Descrição |
|---|---|
| **Dashboard** | KPIs: receita, taxa de ocupação, check-ins hoje |
| **Aprovações** | Lista de reservas pending-approval com ação rápida |
| **Calendário** | Visualização mensal de ocupação |
| **Reservas** | Gerenciar check-in, check-out, editar dados |
| **Hóspedes** | Cadastro e histórico |
| **Chat** | Conversar com cada proprietário |
| **Notificações Push** | Configurar alertas |

---

## 🔔 Notificações Push (Essencial para o Fluxo)

O app precisa avisar em tempo real quando:
- Proprietário envia uma nova solicitação → **Admin recebe push**
- Admin aprova/recusa → **Proprietário recebe push**
- Mensagem no chat → **Ambos recebem push**

### Implementação com Expo
```javascript
// No backend (server.js) — adicionar ao aprovar reserva:
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

async function sendPushNotification(expoPushToken, title, body) {
    await expo.sendPushNotificationsAsync([{
        to: expoPushToken,
        sound: 'default',
        title,
        body,
    }]);
}

// Quando admin aprova:
await sendPushNotification(
    owner.expoPushToken,
    '✅ Reserva Aprovada!',
    `Sua reserva para ${apartment} foi confirmada por R$ ${price}`
);
```

---

## 🚀 Passo a Passo Para Criar o App

### Fase 1 — Configuração (1-2 dias)
```bash
# Instalar Expo CLI
npm install -g expo-cli

# Criar o projeto
npx create-expo-app StoreyLuxorApp --template blank

cd StoreyLuxorApp

# Instalar dependências principais
npm install @react-navigation/native @react-navigation/stack
npm install axios                    # chamadas à API
npm install @react-native-async-storage/async-storage  # armazenamento do token
npm install expo-notifications       # push notifications
npm install expo-secure-store        # armazenar JWT com segurança
npm install react-native-calendars   # calendário nativo
```

### Fase 2 — Autenticação (2-3 dias)
```javascript
// services/api.js — reutiliza a mesma lógica do web
const API_BASE = 'https://storeyluxor.onrender.com/api';

export async function login(username, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    return response.json(); // { accessToken, role }
}
```

### Fase 3 — Telas por Portal (1-2 semanas)
- Criar componentes React Native equivalentes às views web
- Reutilizar toda a lógica de negócio (mesma API)
- Adaptar o design para mobile (touch, gestos, etc.)

### Fase 4 — Push Notifications (2-3 dias)
- Registrar token do dispositivo via Expo
- Salvar token no perfil do usuário (adicionar campo no MongoDB)
- Enviar notificações via Expo Push API no backend

### Fase 5 — Publicação nas Lojas (3-5 dias)
```bash
# Build para Android (sem precisar de Mac)
eas build --platform android

# Build para iOS (precisa de Mac ou conta Apple Developer)
eas build --platform ios
```

---

## 💰 Custos de Publicação nas Lojas

| Loja | Taxa de Registro | Custo Recorrente |
|---|---|---|
| **Google Play Store** | US$ 25 (único) | Nenhum |
| **Apple App Store** | US$ 99/ano | US$ 99/ano |

> 💡 **Dica:** Comece pelo Android (mais barato e mais rápido para aprovar). iOS pode levar 1-3 dias para aprovação.

---

## 🌐 Hospedagem: Web + App Mobile Compartilham o Mesmo Backend

```
                    🌍 Internet
                         │
          ┌──────────────┼──────────────┐
          │              │              │
    🌐 Navegador   📱 Android      📱 iOS
    (Web App)      (App Store)    (App Store)
          │              │              │
          └──────────────┼──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │   Render.com                │
          │   storeyluxor.onrender.com  │
          │   (Node.js + Express)       │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │   MongoDB Atlas (Free)      │
          │   Todos os dados unificados │
          └─────────────────────────────┘
```

**O backend é um só.** Web e App mobile acessam a mesma API e leem o mesmo banco de dados. Uma reserva feita no app aparece imediatamente no site, e vice-versa.

---

## 📊 Resumo de Tempo e Custo

| Etapa | Tempo Estimado | Custo |
|---|---|---|
| Configuração inicial + autenticação | 3-5 dias | Grátis |
| Portal do Proprietário (app) | 1-2 semanas | Grátis |
| Portal do Administrador (app) | 1-2 semanas | Grátis |
| Push Notifications | 2-3 dias | Grátis (Expo) |
| Backend — ajustes para mobile | 2-3 dias | Grátis |
| Publicação Google Play | 1 dia | US$ 25 (único) |
| Publicação App Store | 2-3 dias | US$ 99/ano |
| **Total** | **~6-8 semanas** | **~US$ 124/ano** |

---

## ✅ Próximos Passos Sugeridos

1. **Agora:** Fazer deploy do backend web no Render + MongoDB Atlas
2. **Semana 1-2:** Criar o projeto Expo e implementar login + portal do proprietário
3. **Semana 3-4:** Implementar portal do admin + calendário mobile
4. **Semana 5:** Push notifications + testes em dispositivo real
5. **Semana 6:** Publicar na Google Play → coletar feedback → App Store

---

> 💡 **Quer começar?** O primeiro passo é fazer o deploy do backend atual no Render.com.
> Assim o app mobile já terá uma API real para consumir durante o desenvolvimento.
