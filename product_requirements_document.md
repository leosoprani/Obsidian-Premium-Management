# Product Requirements Document (PRD)

**Project Title:** Storey Luxor / Obsidian Architect - Property Management System
**Document Type:** Project Brief & High-Level PRD
**Version:** 1.0

---

## 1. Executive Summary

O projeto "Storey Luxor / Obsidian Architect" é um sistema web responsivo e moderno voltado ao gerenciamento imobiliário premium (Property Management System). Ele centraliza o controle de propriedades de altíssimo padrão, oferecendo uma visão integrada (Dashboard Bento Grid) de receitas, taxas de ocupação, manutenções, limpeza e interações com proprietários/hóspedes. A proposta atual de modernização visa unificar o visual sob um tema escuro (Obsidian) elegante, sofisticado e de alto contraste, melhorando a métrica de "Premium Feel" para administradores e usuários proprietários.

---

## 2. Problem / Opportunity Statement

O gerenciamento de propriedades múltiplas (e.g., Airbnb, Booking, locações diretas) frequentemente envolve dados espalhados entre plataformas financeiras, calendários externos e grupos de comunicação de manutenção. A oportunidade reside em unificar todas essas funções de forma embutida com os dados salvos primariamente via IndexedDB, e prover um portal único onde a administração pode visualizar a saúde financeira, autorizar acessos, e rastrear logs detalhados (check-ins, limpezas, histórico). 

---

## 3. Vision & Goals

### 3.1 Vision Statement
Tornar o "Storey Luxor" uma referência absoluta em software de controle patrimonial para moradias e imóveis de temporada, combinando desempenho off-line local (PWA/IndexedDB), estética ultra premium (Tailwind CSS - Obsidian Theme) e fluxo operacional sem fricções.

### 3.2 Project Goals (SMART)
*   **Design Unificado:** Migrar 100% da interface administrativa para a padronagem Obsidian (UI escura com elementos translúcidos de vidro).
*   **Centralização de Dados:** Permitir busca global super-rápida (reservas, hóspedes, faturas) usando o motor de busca superior do Dashboard em até 1 mês.
*   **Comunicação Integrada:** Estabelecer canais de chat estáveis para Proprietário↔Admin na própria plataforma.

---

## 4. Target Audience

*   **Administradores Gerais (Staff/Admin):** Gerentes da propriedade responsáveis por aprovar reservas, controlar fluxo financeiro e coordenar as equipes de limpeza/manutenção.
*   **Proprietários (Owners):** Donos das unidades que acessam o portal para verificar os rendimentos mensais de suas propriedades, solicitar bloqueios de suas unidades ou aprovar solicitações de reserva pendentes.
*   **Equipe Operacional:** Funcionários ou prestadores de serviço focados nas tarefas geradas no calendário secundário (limpeze e manutenção).

---

## 5. Scope Definition

### 5.1 In-Scope
*   **Autenticação e Funções:** Login local para Admin, Staff e Owner.
*   **Design System:** Interface Escura (Dark Theme) global obrigatória; painel lateral esquerdo ancorado e topo flutuante translúcido.
*   **Visualização Principal (Dashboard "Portfolio Intelligence"):** Exibição de Resumo de Receitas, Taxa de ocupação (Doughnut Chart) e Próximos Eventos em cartões modulares.
*   **Gerenciador de Reservas e Calendário:** Tabela interativa de blocos por data, diferenciando Check-in, Check-out, Manutenções e Bloqueios.
*   **Controle de Hóspedes e Veículos:** Formulário padrão salvando dados em cache local.
*   **Módulo Financeiro:** Balanço de Despesas vs Transações das Reservas (Receitas).

### 5.2 Out-of-Scope (Por enquanto)
*   Integração real via API com Booking e Airbnb.
*   Processador de Pagamentos via gateway (Stripe/MercadoPago). (Atualmente os pagamentos são puramente marcados como pagos/pendentes no sistema).
*   Aplicativo Nativo (Apenas formato PWA).

---

## 6. Key Features / Core Functionality (High-Level)

1.  **Dashboard de Inteligência:** Cartões de receita em grid, métricas vitais e lista de pendências do dia.
2.  **Calendário Arrastável (Drag & Drop Block):** Funcionalidades de calendário com representação visual em barras coloridas por status (Confirmado, Aguardando, Cancelado).
3.  **Owner Portal (Portal do Proprietário):** Telas exclusivas e limitadas mostrando a performance do apartamento associado ao proprietário.
4.  **Log de Atividade:** Registro inalterável de todas as ações de usuários, modificações de reservas e exclusões no sistema, passíveis de filtragem por data ou autor.
5.  **Chat Local (Owner/Admin):** Interface de mensagens (texto e gravação simulada de áudio) atrelada à reserva ou ao apartamento em foco.
6.  **Gerador de PDF:** Geração da ficha do apartamento com relatórios exportáveis via `jsPDF`.

---

## 7. Technical Considerations / Constraints

*   **Armazenamento de Dados:** Todo o projeto roda lado-cliente, salvando as informações em um banco IndexedDB gerido pela biblioteca Dexie.js (Não há chamadas para backend rodando banco de dados relacional SQL).
*   **Frontend Framework:** Vanilla Javascript (sem React ou Vue.js), gerenciamento via manipulação de DOM.
*   **Estilização:** Tailwind CSS (via script CDN - sem processamento Node/PostCSS atrelado inicialmente) + Classes customizadas no head injetado.
*   **Exportação/Importação:** O sistema precisa permitir exportar e importar `.json` das reservas para backup, pois não há sincronismo de banco central (Last Sync mechanism).