# App Mobile: Fase 2 - Autenticação e Navegação

Com o Expo rodando, o próximo passo ditado pelo nosso `mobile_app_guide.md` é estabelecer o sistema de Navegação e criar a **Tela de Login** que se comunicará com o nosso backend Node.js.

## User Review Required

> [!IMPORTANT]
> **Fluxo de Telas:** Vou criar a primeira estrutura de roteamento do App. Nele, o aplicativo tentará ler um token salvo no dispositivo ao abrir. Se houver um token válido, ele passará o usuário direto para o `OwnerDashboard` (Painel Reservado). Caso contrário, ele mostrará a tela de `LoginScreen` com a identidade visual escura do sistema.

## Proposed Changes

### 1. Novo Arquivo de Login
Vou criar uma tela bonita e moderna, adotando as mesmas cores escuro/vidro (Obsidian Theme) do seu site web atual.
#### [NEW] [mobile/src/screens/LoginScreen.js](file:///c:/Users/rafae/OneDrive/Área%20de%20Trabalho/leo/stl-main/mobile/src/screens/LoginScreen.js)
- Interface com campos de `Username` e `Password`.
- Função que aciona a rota `POST /api/auth/login` via `axios`.
- Salvar Token no celular usando `@react-native-async-storage/async-storage`.

### 2. Tela Temporária do Dashboard
Uma tela em branco que servirá inicialmente de pátio de aterrissagem após o login bem-sucedido.
#### [NEW] [mobile/src/screens/OwnerDashboard.js](file:///c:/Users/rafae/OneDrive/Área%20de%20Trabalho/leo/stl-main/mobile/src/screens/OwnerDashboard.js)
- Exibirá uma mensagem de "Bem-vindo" provisória com um botão de "Deslogar" para podermos testar o fluxo completo.

### 3. Raiz da Aplicação
Modificarei o arquivo padrão gerado pelo Expo para ancorar a navegação global.
#### [MODIFY] [mobile/App.js](file:///c:/Users/rafae/OneDrive/Área%20de%20Trabalho/leo/stl-main/mobile/App.js)
- Importado `NavigationContainer` e `createNativeStackNavigator`.
- Registro das duas telas (Login e OwnerDashboard).

## Open Questions

> [!CAUTION]
> 1. Para que a requisição de login saia do seu celular (onde o Expo está rodando) e chegue no `server.js` do seu PC, lembra daquele IP no arquivo **`mobile/src/services/api.js`**? Se o PC estiver conectado na mesma rede WiFi que o Celular, você deve usar o IPv4 do PC (ex: `192.168.0.x`). Você já alterou a URL base lá ou prefere que eu a ensine a como pegar esse IP para colocarmos juntos agora?

## Verification Plan

### Manual Verification
- O App vai recarregar sozinho (Hot Reload) no seu celular. 
- Você verá a tela de Login;
- Você digitará as credenciais (ex: \`proprietario1\`, \`senha123\`) de teste cadastradas no PC.
- Ao clicar em Entrar, se tudo der certo, você será levado para o painel de dentro do sistema!
