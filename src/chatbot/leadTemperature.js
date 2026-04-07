/**
 * CLASSIFICADOR DE TEMPERATURA DE LEAD
 *
 * Quente  → Pronto para fechar. Vai direto para Eduardo.
 * Morno   → Interessado mas precisa de mais contexto/confiança. Entra no ciclo de 14 dias.
 * Frio    → Pouco engajamento ou muitas objeções. Entra no ciclo de 14 dias com abordagem suave.
 *
 * A temperatura é calculada em tempo real a partir dos sinais emitidos pelo lead durante a conversa.
 */

const TEMPERATURA = {
  QUENTE: 'quente',
  MORNO: 'morno',
  FRIO: 'frio',
};

// Sinais que aumentam a temperatura (pontos positivos)
const SINAIS_QUENTES = [
  // Palavras de intenção de compra
  /\b(quero|vou|me interessa|quanto custa|como pago|link|boleto|pix|cartão|parcela|comprar|entrar|garantir|me inscrever)\b/i,
  // Urgência do lead
  /\b(hoje|agora|logo|já|rápido|urgente|essa semana)\b/i,
  // Validação positiva forte
  /\b(perfeito|exatamente|é isso|tô dentro|adorei|incrível|me convenceu)\b/i,
];

// Sinais de objeção (reduzem temperatura)
const SINAIS_FRIOS = [
  /\b(caro|não tenho|sem dinheiro|depois|talvez|pensando|não sei|não posso|complicado|difícil|não quero)\b/i,
  /\b(não tenho tempo|ocupado|vou ver|semana que vem|mês que vem|agora não)\b/i,
];

// Sinais de dúvida / pesquisa ativa (lead morno)
const SINAIS_MORNOS = [
  /\b(como funciona|me conta mais|o que inclui|tem garantia|posso cancelar|como é|quero saber|me explica)\b/i,
  /\b(interessante|legal|gostei|parece bom|pode ser|vou considerar)\b/i,
];

/**
 * Analisa o histórico de mensagens e dados do lead para classificar a temperatura.
 * @param {object} dadosLead - Dados coletados pelo chatbot
 * @param {Array} historico - Histórico de mensagens
 * @param {number} pontuacaoAtual - Pontuação acumulada da sessão
 * @returns {{ temperatura: string, pontuacao: number, sinais: string[] }}
 */
function classificarTemperatura(dadosLead, historico = [], pontuacaoAtual = 0) {
  let pontos = pontuacaoAtual;
  const sinaisDetectados = [];

  // Analisa mensagens do lead no histórico
  const mensagensLead = historico
    .filter((h) => h.role === 'user')
    .map((h) => String(h.content));

  for (const mensagem of mensagensLead) {
    for (const padraoQuente of SINAIS_QUENTES) {
      if (padraoQuente.test(mensagem)) {
        pontos += 3;
        sinaisDetectados.push(`sinal_quente: ${mensagem.substring(0, 40)}`);
      }
    }
    for (const padraoMorno of SINAIS_MORNOS) {
      if (padraoMorno.test(mensagem)) {
        pontos += 1;
        sinaisDetectados.push(`sinal_morno: ${mensagem.substring(0, 40)}`);
      }
    }
    for (const padraoFrio of SINAIS_FRIOS) {
      if (padraoFrio.test(mensagem)) {
        pontos -= 2;
        sinaisDetectados.push(`sinal_frio: ${mensagem.substring(0, 40)}`);
      }
    }
  }

  // Bônus pelos dados coletados
  if (dadosLead.nome) pontos += 1; // Deu o nome → engajamento básico
  if (dadosLead.objetivo === 'investir') pontos += 2; // Quer investir → intenção clara
  if (dadosLead.objetivo === 'sair_dividas') pontos += 1; // Dor ativa → motivação
  if (dadosLead.renda === 'acima_10k') pontos += 2; // Poder de compra alto
  if (dadosLead.renda === '5k_10k') pontos += 1;
  if (dadosLead.interessado === true) pontos += 4; // Sinalizou interesse explícito
  if (dadosLead.interessado === false) pontos -= 3;

  // Classifica
  let temperatura;
  if (pontos >= 8) {
    temperatura = TEMPERATURA.QUENTE;
  } else if (pontos >= 3) {
    temperatura = TEMPERATURA.MORNO;
  } else {
    temperatura = TEMPERATURA.FRIO;
  }

  return { temperatura, pontuacao: pontos, sinais: sinaisDetectados };
}

/**
 * Retorna a ação a tomar com base na temperatura.
 */
function acaoPorTemperatura(temperatura) {
  switch (temperatura) {
    case TEMPERATURA.QUENTE:
      return {
        acao: 'escalar_para_humano',
        descricao: 'Lead quente — encaminhar para Eduardo fechar',
      };
    case TEMPERATURA.MORNO:
      return {
        acao: 'ciclo_followup',
        descricao: 'Lead morno — iniciar ciclo de follow-up 14 dias',
      };
    case TEMPERATURA.FRIO:
      return {
        acao: 'ciclo_followup_suave',
        descricao: 'Lead frio — ciclo de follow-up com abordagem leve',
      };
    default:
      return { acao: 'ciclo_followup', descricao: 'Comportamento padrão' };
  }
}

module.exports = { TEMPERATURA, classificarTemperatura, acaoPorTemperatura };
