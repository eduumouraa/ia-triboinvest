# Agente IA Tribo Invest — Guia de Setup

## Pré-requisitos
- Node.js >= 18
- Conta no [Anthropic Console](https://console.anthropic.com) (API Key do Claude)
- Conta de desenvolvedor Meta (Facebook Developer) com app configurado
- Conta Kommo CRM com API habilitada
- Servidor com HTTPS (obrigatório para webhooks Meta) — recomendado: Railway, Render, ou VPS com Nginx

---

## 1. Instalar dependências

```bash
npm install
```

---

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o arquivo `.env` com:

| Variável | Onde encontrar |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `META_ACCESS_TOKEN` | Facebook Developer → App → Instagram → Token |
| `META_VERIFY_TOKEN` | Você define (qualquer string segura) |
| `META_APP_SECRET` | Facebook Developer → App → Configurações → App Secret |
| `KOMMO_BASE_URL` | URL da sua conta: `https://suaconta.kommo.com` |
| `KOMMO_ACCESS_TOKEN` | Kommo → Configurações → Integrações → API |
| `KOMMO_PIPELINE_ID` | Kommo → URL do pipeline (número na URL) |
| `KOMMO_STAGE_*` | Kommo → IDs dos estágios do pipeline |

---

## 3. Configurar Kommo CRM

### Criar o Pipeline
1. Acesse Kommo → Pipelines → Criar novo pipeline "Tribo Invest"
2. Crie os estágios:
   - `Novo Lead` → cole o ID em `KOMMO_STAGE_NOVO_LEAD`
   - `Qualificado - Tribo do Investidor` → `KOMMO_STAGE_QUALIFICADO_TRIBO`
   - `Qualificado - Org. Financeira` → `KOMMO_STAGE_QUALIFICADO_ORG_FIN`
   - `Não Qualificado` → `KOMMO_STAGE_NAO_QUALIFICADO`

### Criar Campos Personalizados nos Leads
Vá em Configurações → Campos e crie:
- `CF_OBJETIVO` (texto)
- `CF_TEM_DIVIDAS` (texto)
- `CF_EXPERIENCIA` (texto)
- `CF_RENDA` (texto)
- `CF_FONTE` (texto)
- `CF_PRODUTO_INDICADO` (texto)

---

## 4. Configurar Instagram Webhook (Meta)

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Crie ou acesse seu App
3. Adicione o produto "Messenger" (para Instagram DMs)
4. Em Webhooks → Instagram → Configure:
   - **URL do Callback:** `https://seu-servidor.com/webhook/instagram`
   - **Token de Verificação:** valor que você colocou em `META_VERIFY_TOKEN`
5. Subscreva os eventos: `messages`, `messaging_postbacks`
6. Conecte a Página do Instagram ao App

---

## 5. Configurar Tráfego Pago (Facebook Ads)

Para capturar leads do Facebook/Instagram Ads com Lead Forms:

### Opção A: Zapier/Make
1. Crie um Zap: `Facebook Lead Ads → POST /webhook/lead`
2. Mapeie os campos do formulário para o body:
```json
{
  "id": "{{email}}",
  "nome": "{{nome_completo}}",
  "fonte": "facebook_ads"
}
```

### Opção B: Integração direta
Use a [Lead Ads API](https://developers.facebook.com/docs/marketing-api/guides/lead-ads) para receber notificações em tempo real.

---

## 6. Iniciar o servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

---

## 7. Testar sem Instagram

```bash
npm test
```

Isso roda uma conversa simulada completa pelo terminal.

---

## Fluxo do Funil

```
Lead chega (Instagram DM / Tráfego Pago)
         ↓
  Boas-vindas automática
         ↓
  Pergunta o nome
         ↓
  Qual seu objetivo? (investir / sair de dívidas / aprender)
         ↓
  Tem dívidas? (sim / não / em controle)
         ↓
  Experiência com investimentos (se sem dívidas)
         ↓
  Faixa de renda
         ↓
     ROTEAMENTO
    /           \
Tem dívidas    Quer investir
    ↓               ↓
Org. Financeira  Tribo do Investidor
(R$97 único)    (12x R$97)
    ↓               ↓
  Oferta          Oferta
    ↓               ↓
  Fechamento → Link de compra
         ↓
  Lead vai pro Kommo (estágio correto)
```
