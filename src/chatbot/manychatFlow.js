/**
 * FLUXO DE QUALIFICAÇÃO — MANYCHAT
 *
 * Fluxo guiado fixo (sem Claude) para respeitar o timeout de 10s do ManyChat.
 * Coleta: perfil → objetivo → renda mensal → WhatsApp do lead.
 * Ao final, notifica o especialista com o resumo do lead.
 *
 * Estado armazenado em sessao.dadosLead._mc para não alterar o schema do banco.
 */

const { obterOuCriarSessao, salvarSessao } = require('../sessions/sessionManager');
const { notificarLeadManyChat } = require('../integrations/notificacaoHumano');
const logger = require('../config/logger');

const ETAPA = {
  AGUARDANDO_PERFIL: 'mc_perfil',
  AGUARDANDO_OBJETIVO: 'mc_objetivo',
  AGUARDANDO_RENDA: 'mc_renda',
  AGUARDANDO_WHATSAPP: 'mc_whatsapp',
  ENCERRADO: 'mc_encerrado',
};

const OBJETIVOS = [
  'Aposentadoria tranquila',
  'Renda extra mensal',
  'Crescimento de patrimônio',
  'Segurança para minha família',
];

// ─── Mensagens ────────────────────────────────────────────────────────────────

function msgBoasVindas(nome) {
  const saudacao = nome ? `Olá, ${nome}! 👋\n\n` : '';
  return `${saudacao}🌍 Seja bem-vindo à Tribo Invest!

Somos uma comunidade de investidores que acredita que a liberdade financeira está ao alcance de todos — e estamos aqui pra te ajudar a chegar lá. 🚀

Me conta uma coisa rápida:

1️⃣ Quero começar a investir do zero
2️⃣ Já invisto, mas quero ir mais longe

Qual das duas é você hoje?`;
}

const MSG_OBJETIVO = `Excelente! 💪

Agora me conta: qual é o seu principal objetivo com os investimentos?

1️⃣ Aposentadoria tranquila
2️⃣ Renda extra mensal
3️⃣ Crescimento de patrimônio
4️⃣ Segurança para minha família`;

const MSG_RENDA = `Entendido! 😊

Quanto você consegue guardar por mês? (mesmo que seja pouco, todo valor conta)

Pode me dizer um número aproximado — tipo: R$200, R$500, R$1.000...`;

const MSG_WHATSAPP = `Perfeito! Com essas informações já consigo direcionar você para o especialista ideal. 🎯

Me passa o seu WhatsApp com DDD para entrarmos em contato:

(Ex: 11 99999-9999)`;

function msgEncerrado(nome, objetivo, renda) {
  const primeiro = nome ? nome.split(' ')[0] : null;
  const saudacao = primeiro ? `Perfeito, ${primeiro}!` : 'Perfeito!';
  const linhaObjetivo = objetivo && renda
    ? `Para quem tem o objetivo de *${objetivo}* e consegue poupar *${renda}*, nós temos uma excelente solução aqui na Tribo.`
    : `Para o seu perfil, nós temos uma excelente solução aqui na Tribo.`;

  return `${saudacao} Já entendi o seu perfil. 😊

${linhaObjetivo}

O nosso especialista vai te chamar no WhatsApp em instantes para te mostrar como a nossa mentoria e o acompanhamento da Comunidade Tribo do Investidor vão te ajudar a acelerar esse processo e investir com total segurança.

Fique atento ao seu celular! 🚀`;
}

const MSG_JA_ENCERRADO = `Já temos suas informações! Nosso especialista vai entrar em contato pelo WhatsApp que você nos passou em breve. 😊`;

// ─── Helpers de estado ────────────────────────────────────────────────────────

function getMC(sessao) {
  return (sessao.dadosLead && sessao.dadosLead._mc) || {};
}

function setMC(sessao, campos) {
  if (!sessao.dadosLead) sessao.dadosLead = {};
  sessao.dadosLead._mc = { ...(sessao.dadosLead._mc || {}), ...campos };
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Chamado pelo endpoint /iniciar quando o lead entra pela primeira vez.
 * Envia a mensagem de boas-vindas e aguarda a resposta de perfil.
 */
function iniciarConversaManyChat(platformId, nome, canal) {
  const sessao = obterOuCriarSessao(platformId, canal);
  const mc = getMC(sessao);

  if (mc.etapa === ETAPA.ENCERRADO) {
    return [MSG_JA_ENCERRADO];
  }

  setMC(sessao, { etapa: ETAPA.AGUARDANDO_PERFIL, nome: nome || null });
  salvarSessao(platformId, sessao);

  return [msgBoasVindas(nome)];
}

/**
 * Chamado a cada mensagem recebida via ManyChat.
 * Avança o fluxo de qualificação conforme a resposta do lead.
 */
async function processarMensagemManyChat(platformId, mensagem, nome, canal) {
  const sessao = obterOuCriarSessao(platformId, canal);
  const mc = getMC(sessao);

  // Primeira mensagem sem estado → inicia o fluxo
  if (!mc.etapa) {
    setMC(sessao, { etapa: ETAPA.AGUARDANDO_PERFIL, nome: nome || null });
    salvarSessao(platformId, sessao);
    return [msgBoasVindas(nome)];
  }

  if (mc.etapa === ETAPA.ENCERRADO) {
    return [MSG_JA_ENCERRADO];
  }

  const texto = mensagem.trim();

  switch (mc.etapa) {
    case ETAPA.AGUARDANDO_PERFIL: {
      const perfil = texto === '1' || /zero|começ|inici/i.test(texto) ? 'Iniciante' : 'Já investe';
      setMC(sessao, { perfil, etapa: ETAPA.AGUARDANDO_OBJETIVO });
      salvarSessao(platformId, sessao);
      return [MSG_OBJETIVO];
    }

    case ETAPA.AGUARDANDO_OBJETIVO: {
      const idx = parseInt(texto, 10) - 1;
      const objetivo = OBJETIVOS[idx] !== undefined ? OBJETIVOS[idx] : texto;
      setMC(sessao, { objetivo, etapa: ETAPA.AGUARDANDO_RENDA });
      salvarSessao(platformId, sessao);
      return [MSG_RENDA];
    }

    case ETAPA.AGUARDANDO_RENDA: {
      setMC(sessao, { renda: texto, etapa: ETAPA.AGUARDANDO_WHATSAPP });
      salvarSessao(platformId, sessao);
      return [MSG_WHATSAPP];
    }

    case ETAPA.AGUARDANDO_WHATSAPP: {
      const nomeSalvo = getMC(sessao).nome;
      setMC(sessao, { whatsapp: texto, etapa: ETAPA.ENCERRADO });
      sessao.encerrada = true;
      salvarSessao(platformId, sessao);

      const dadosMC = getMC(sessao);
      logger.info('Lead ManyChat qualificado', {
        platformId,
        nome: dadosMC.nome,
        perfil: dadosMC.perfil,
        objetivo: dadosMC.objetivo,
        renda: dadosMC.renda,
        whatsapp: texto,
      });

      notificarLeadManyChat({
        nome: dadosMC.nome || 'Não informado',
        perfil: dadosMC.perfil,
        objetivo: dadosMC.objetivo,
        renda: dadosMC.renda,
        whatsapp: texto,
        platformId,
        canal,
      }).catch((err) => logger.error('Erro ao notificar lead ManyChat', { err: err.message }));

      return [msgEncerrado(nomeSalvo, dadosMC.objetivo, dadosMC.renda)];
    }

    default:
      return [MSG_JA_ENCERRADO];
  }
}

module.exports = { iniciarConversaManyChat, processarMensagemManyChat };
