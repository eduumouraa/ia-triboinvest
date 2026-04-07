/**
 * SCRIPT DE VENDAS - TRIBO INVEST
 * Funil de qualificação com decisão por produto
 *
 * Fluxo:
 * BOAS_VINDAS → OBJETIVO → SITUACAO_FINANCEIRA → EXPERIENCIA → RENDA → DECISAO → OFERTA → FECHAMENTO
 */

const ETAPAS = {
  BOAS_VINDAS: 'boas_vindas',
  OBJETIVO: 'objetivo',
  SITUACAO_FINANCEIRA: 'situacao_financeira',
  EXPERIENCIA: 'experiencia',
  RENDA: 'renda',
  DECISAO: 'decisao',
  OFERTA_TRIBO: 'oferta_tribo',
  OFERTA_ORG_FIN: 'oferta_org_fin',
  FECHAMENTO: 'fechamento',
  ENCERRADO: 'encerrado',
};

const PRODUTOS = {
  TRIBO: 'tribo_do_investidor',
  ORG_FIN: 'organizacao_financeira',
  NENHUM: 'nao_qualificado',
};

/**
 * Define qual etapa vem depois com base na etapa atual e resposta do lead.
 * Retorna a próxima etapa e o produto recomendado quando aplicável.
 */
function proximaEtapa(etapaAtual, dadosLead) {
  switch (etapaAtual) {
    case ETAPAS.BOAS_VINDAS:
      return { etapa: ETAPAS.OBJETIVO };

    case ETAPAS.OBJETIVO:
      // Se tem dívidas → caminho Organização Financeira
      if (dadosLead.objetivo === 'sair_dividas') {
        return { etapa: ETAPAS.SITUACAO_FINANCEIRA };
      }
      // Quer investir → verificar situação
      return { etapa: ETAPAS.SITUACAO_FINANCEIRA };

    case ETAPAS.SITUACAO_FINANCEIRA:
      // Endividado e quer sair das dívidas → Org. Financeira
      if (dadosLead.objetivo === 'sair_dividas' && dadosLead.temDividas) {
        return { etapa: ETAPAS.RENDA };
      }
      // Quer investir mas tem dívidas → Org. Financeira primeiro
      if (dadosLead.temDividas) {
        return { etapa: ETAPAS.RENDA };
      }
      // Sem dívidas e quer investir → Tribo
      return { etapa: ETAPAS.EXPERIENCIA };

    case ETAPAS.EXPERIENCIA:
      return { etapa: ETAPAS.RENDA };

    case ETAPAS.RENDA:
      return { etapa: ETAPAS.DECISAO };

    case ETAPAS.DECISAO: {
      const produto = rotearProduto(dadosLead);
      if (produto === PRODUTOS.TRIBO) {
        return { etapa: ETAPAS.OFERTA_TRIBO, produto };
      }
      if (produto === PRODUTOS.ORG_FIN) {
        return { etapa: ETAPAS.OFERTA_ORG_FIN, produto };
      }
      return { etapa: ETAPAS.ENCERRADO, produto: PRODUTOS.NENHUM };
    }

    case ETAPAS.OFERTA_TRIBO:
    case ETAPAS.OFERTA_ORG_FIN:
      return { etapa: ETAPAS.FECHAMENTO };

    case ETAPAS.FECHAMENTO:
      return { etapa: ETAPAS.ENCERRADO };

    default:
      return { etapa: ETAPAS.ENCERRADO };
  }
}

/**
 * Lógica de roteamento de produto com base nos dados coletados do lead.
 */
function rotearProduto(dadosLead) {
  const { objetivo, temDividas, renda } = dadosLead;

  // Sem renda mínima → não qualificado por enquanto
  if (renda === 'sem_renda') {
    return PRODUTOS.NENHUM;
  }

  // Quer sair de dívidas OU tem dívidas → Organização Financeira
  if (objetivo === 'sair_dividas' || temDividas) {
    return PRODUTOS.ORG_FIN;
  }

  // Quer investir e está organizado → Tribo do Investidor
  if (objetivo === 'investir' || objetivo === 'aprender') {
    return PRODUTOS.TRIBO;
  }

  return PRODUTOS.NENHUM;
}

/**
 * Mensagens de cada etapa do funil.
 * As perguntas têm opções numeradas para facilitar resposta rápida.
 */
const MENSAGENS = {
  [ETAPAS.BOAS_VINDAS]: () => `Olá! Que bom ter você aqui! 😊

Eu sou a assistente da *Tribo Invest* e estou aqui pra entender o que você precisa e te mostrar o melhor caminho.

Pode me falar seu nome pra eu te chamar direitinho? 👇`,

  [ETAPAS.OBJETIVO]: (nome) => `Prazer, ${nome}! 🤝

Pra eu te ajudar da melhor forma, me conta: *qual é o seu principal objetivo hoje?*

1️⃣ Quero começar a investir meu dinheiro
2️⃣ Quero sair das dívidas e organizar minhas finanças
3️⃣ Já invisto mas quero aprender mais e crescer
4️⃣ Quero entender melhor sobre finanças no geral

Responde com o número ou com suas próprias palavras! 👇`,

  [ETAPAS.SITUACAO_FINANCEIRA]: (nome) => `Entendido, ${nome}!

Me conta um pouco mais sobre a sua situação hoje. *Você tem alguma dívida em aberto?* (cartão, empréstimo, cheque especial, etc.)

1️⃣ Sim, tenho dívidas e quero resolver isso
2️⃣ Tenho algumas dívidas mas estão sob controle
3️⃣ Não tenho dívidas, estou organizado

Pode ser honesto, tô aqui pra ajudar mesmo! 👇`,

  [ETAPAS.EXPERIENCIA]: (nome) => `Que ótimo, ${nome}! Alguém com as finanças organizadas já tem um passo enorme à frente! 🙌

*Qual é a sua experiência com investimentos hoje?*

1️⃣ Sou iniciante, nunca investi
2️⃣ Já invisto um pouco (poupança, CDB, Tesouro)
3️⃣ Já invisto em renda variável (ações, fundos, cripto)
4️⃣ Tenho experiência mas quero aprofundar

👇`,

  [ETAPAS.RENDA]: () => `Ótimo! Só mais uma pergunta rápida pra eu te indicar o melhor caminho:

*Qual é a sua faixa de renda mensal aproximada?*

1️⃣ Até R$ 2.000
2️⃣ De R$ 2.000 a R$ 5.000
3️⃣ De R$ 5.000 a R$ 10.000
4️⃣ Acima de R$ 10.000

(Essa informação é só pra personalizar a indicação, não precisa ser exato 😉) 👇`,

  [ETAPAS.OFERTA_TRIBO]: (nome, config) => `Perfeito, ${nome}! Com base no que você me contou, a melhor solução pra você é a *${config.produtos.triboDoInvestidor.nome}*! 🚀

🎯 *O que você vai ter acesso:*
• Comunidade ativa de investidores
• Mentorias e aulas ao vivo com o Lucas
• Carteiras recomendadas e análises exclusivas
• Suporte direto pra tirar dúvidas

💰 *Investimento:* ${config.produtos.triboDoInvestidor.preco}

Isso equivale a *menos de R$ 3,00 por dia* pra transformar sua vida financeira.

*Você quer garantir sua vaga agora?*

1️⃣ Sim! Quero entrar na Tribo
2️⃣ Tenho dúvidas antes de decidir
3️⃣ Preciso pensar mais um pouco`,

  [ETAPAS.OFERTA_ORG_FIN]: (nome, config) => `Entendido, ${nome}! Com base no que você me contou, o primeiro passo ideal pra você é o *${config.produtos.organizacaoFinanceira.nome}*! 💪

🎯 *O que você vai aprender:*
• Como organizar seu orçamento do zero
• Estratégias para negociar e eliminar dívidas
• Como criar uma reserva de emergência
• Base financeira pra começar a investir depois

💰 *Investimento:* ${config.produtos.organizacaoFinanceira.preco} *(pagamento único, sem mensalidade!)*

Por *menos de R$ 100* você tem o método completo pra virar o jogo.

*Você quer dar esse passo agora?*

1️⃣ Sim! Quero garantir o acesso
2️⃣ Tenho dúvidas antes de decidir
3️⃣ Preciso pensar mais um pouco`,

  [ETAPAS.FECHAMENTO]: (nome, produto, config) => {
    const linkProduto = produto === PRODUTOS.TRIBO
      ? config.produtos.triboDoInvestidor.link
      : config.produtos.organizacaoFinanceira.link;

    const nomeProduto = produto === PRODUTOS.TRIBO
      ? config.produtos.triboDoInvestidor.nome
      : config.produtos.organizacaoFinanceira.nome;

    return `Incrível, ${nome}! Decisão excelente! 🎉

Aqui está o link seguro pra você garantir seu acesso à *${nomeProduto}*:

👉 ${linkProduto || '[LINK DO PRODUTO]'}

Qualquer dúvida sobre pagamento ou acesso, pode me chamar aqui mesmo!

E em breve um dos nossos especialistas pode entrar em contato pra te dar uma atenção extra. Tudo bem? 🙌`;
  },

  encerradoNaoQualificado: (nome) => `Obrigado pela sua sinceridade, ${nome}! 🙏

No momento, vou deixar registrado seu contato e em breve um dos nossos especialistas vai entrar em contato pra entender melhor como podemos te ajudar.

Qualquer dúvida, pode me chamar aqui! 💬`,
};

module.exports = { ETAPAS, PRODUTOS, MENSAGENS, proximaEtapa, rotearProduto };
