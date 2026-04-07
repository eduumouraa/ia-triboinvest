/**
 * SCRIPT DE VENDAS — TRIBO INVEST
 *
 * Fluxo completo por produto:
 *
 * TRIBO DO INVESTIDOR
 * ───────────────────
 * BOAS_VINDAS → OBJETIVO → SITUACAO_FINANCEIRA → EXPERIENCIA → RENDA
 *   → APRESENTACAO_TRIBO → PROPOSTA_TRIBO → [OBJECAO_TRIBO] → FECHAMENTO_TRIBO → ENCERRADO
 *
 * ORGANIZAÇÃO FINANCEIRA
 * ──────────────────────
 * BOAS_VINDAS → OBJETIVO → SITUACAO_FINANCEIRA → RENDA
 *   → APRESENTACAO_ORG_FIN → PROPOSTA_ORG_FIN → [OBJECAO_ORG_FIN] → FECHAMENTO_ORG_FIN → ENCERRADO
 *
 * Princípio: construir VALOR antes de mostrar PREÇO.
 * O lead precisa querer o produto antes de ouvir o quanto custa.
 */

const ETAPAS = {
  BOAS_VINDAS: 'boas_vindas',
  OBJETIVO: 'objetivo',
  SITUACAO_FINANCEIRA: 'situacao_financeira',
  EXPERIENCIA: 'experiencia',
  RENDA: 'renda',
  // ─── Tribo ───
  APRESENTACAO_TRIBO: 'apresentacao_tribo',
  PROPOSTA_TRIBO: 'proposta_tribo',
  OBJECAO_TRIBO: 'objecao_tribo',
  FECHAMENTO_TRIBO: 'fechamento_tribo',
  // ─── Org. Financeira ───
  APRESENTACAO_ORG_FIN: 'apresentacao_org_fin',
  PROPOSTA_ORG_FIN: 'proposta_org_fin',
  OBJECAO_ORG_FIN: 'objecao_org_fin',
  FECHAMENTO_ORG_FIN: 'fechamento_org_fin',
  // ─── Fim ───
  ENCERRADO: 'encerrado',
};

const PRODUTOS = {
  TRIBO: 'tribo_do_investidor',
  ORG_FIN: 'organizacao_financeira',
  NENHUM: 'nao_qualificado',
};

// ─── ROTEAMENTO ───────────────────────────────────────────────────────────────

function rotearProduto(dadosLead) {
  const { objetivo, temDividas, renda } = dadosLead;

  if (renda === 'sem_renda') return PRODUTOS.NENHUM;
  if (objetivo === 'sair_dividas' || temDividas) return PRODUTOS.ORG_FIN;
  if (objetivo === 'investir' || objetivo === 'aprender' || objetivo === 'entender') return PRODUTOS.TRIBO;

  return PRODUTOS.NENHUM;
}

function proximaEtapa(etapaAtual, dadosLead) {
  switch (etapaAtual) {
    case ETAPAS.BOAS_VINDAS:
      return { etapa: ETAPAS.OBJETIVO };

    case ETAPAS.OBJETIVO:
      return { etapa: ETAPAS.SITUACAO_FINANCEIRA };

    case ETAPAS.SITUACAO_FINANCEIRA:
      if (dadosLead.temDividas) return { etapa: ETAPAS.RENDA };
      return { etapa: ETAPAS.EXPERIENCIA };

    case ETAPAS.EXPERIENCIA:
      return { etapa: ETAPAS.RENDA };

    case ETAPAS.RENDA: {
      const produto = rotearProduto(dadosLead);
      if (produto === PRODUTOS.TRIBO) return { etapa: ETAPAS.APRESENTACAO_TRIBO, produto };
      if (produto === PRODUTOS.ORG_FIN) return { etapa: ETAPAS.APRESENTACAO_ORG_FIN, produto };
      return { etapa: ETAPAS.ENCERRADO, produto: PRODUTOS.NENHUM };
    }

    // Tribo: apresentação → proposta → [objeção] → fechamento
    case ETAPAS.APRESENTACAO_TRIBO:
      return { etapa: ETAPAS.PROPOSTA_TRIBO, produto: PRODUTOS.TRIBO };
    case ETAPAS.PROPOSTA_TRIBO:
      return { etapa: ETAPAS.FECHAMENTO_TRIBO, produto: PRODUTOS.TRIBO };
    case ETAPAS.OBJECAO_TRIBO:
      return { etapa: ETAPAS.FECHAMENTO_TRIBO, produto: PRODUTOS.TRIBO };
    case ETAPAS.FECHAMENTO_TRIBO:
      return { etapa: ETAPAS.ENCERRADO };

    // Org. Fin.: apresentação → proposta → [objeção] → fechamento
    case ETAPAS.APRESENTACAO_ORG_FIN:
      return { etapa: ETAPAS.PROPOSTA_ORG_FIN, produto: PRODUTOS.ORG_FIN };
    case ETAPAS.PROPOSTA_ORG_FIN:
      return { etapa: ETAPAS.FECHAMENTO_ORG_FIN, produto: PRODUTOS.ORG_FIN };
    case ETAPAS.OBJECAO_ORG_FIN:
      return { etapa: ETAPAS.FECHAMENTO_ORG_FIN, produto: PRODUTOS.ORG_FIN };
    case ETAPAS.FECHAMENTO_ORG_FIN:
      return { etapa: ETAPAS.ENCERRADO };

    default:
      return { etapa: ETAPAS.ENCERRADO };
  }
}

// ─── MENSAGENS ────────────────────────────────────────────────────────────────

const MENSAGENS = {

  // ── Entrada ──────────────────────────────────────────────────────────────────

  [ETAPAS.BOAS_VINDAS]: () =>
`Olá! Que bom ter você aqui! 😊

Sou a assistente da *Tribo Invest* e estou aqui pra entender o que você precisa e te mostrar o melhor caminho.

Me conta seu nome pra eu te chamar direitinho? 👇`,

  [ETAPAS.OBJETIVO]: (nome) =>
`Prazer, ${nome}! 🤝

Pra eu te indicar o caminho certo, preciso entender o seu momento. *Qual é o seu principal objetivo hoje?*

1️⃣ Quero começar a investir do zero
2️⃣ Quero sair das dívidas e organizar as finanças
3️⃣ Já invisto mas quero evoluir e ter mais consistência
4️⃣ Quero entender melhor o mundo financeiro

Pode responder com o número ou do seu jeito mesmo! 👇`,

  [ETAPAS.SITUACAO_FINANCEIRA]: (nome) =>
`Entendido, ${nome}!

Só pra eu te indicar o melhor caminho: *você tem alguma dívida em aberto hoje?* (cartão, empréstimo, cheque especial...)

1️⃣ Sim, tenho dívidas e quero resolver
2️⃣ Tenho algumas mas estão sob controle
3️⃣ Não tenho dívidas, tô organizado

Pode ser sincero — tô aqui pra ajudar de verdade! 👇`,

  [ETAPAS.EXPERIENCIA]: (nome) =>
`Ótimo, ${nome}! Quem está organizado já tem o maior passo dado. 🙌

*Qual é a sua experiência com investimentos hoje?*

1️⃣ Sou iniciante — nunca investi nada
2️⃣ Invisto um pouco (poupança, CDB, Tesouro Direto)
3️⃣ Já invisto em renda variável (ações, FIIs, cripto)
4️⃣ Tenho experiência mas quero aprofundar e melhorar

👇`,

  [ETAPAS.RENDA]: (nome) =>
`Quase lá, ${nome}! Última pergunta rápida:

*Qual é a sua faixa de renda mensal aproximada?*

1️⃣ Até R$ 2.000
2️⃣ De R$ 2.000 a R$ 5.000
3️⃣ De R$ 5.000 a R$ 10.000
4️⃣ Acima de R$ 10.000

Só pra personalizar a indicação — não precisa ser exato 😉 👇`,

  // ── CAMINHO TRIBO DO INVESTIDOR ───────────────────────────────────────────────

  [ETAPAS.APRESENTACAO_TRIBO]: (nome) =>
`${nome}, com base no que você me contou, tenho a solução perfeita pra você. Mas antes de te falar o que é, deixa eu te contar o que realmente diferencia isso de tudo que você já viu por aí. 👇

*A Tribo do Investidor não é um curso.* É uma comunidade ativa que funciona como um time de investimentos — onde você não fica sozinho em nenhum momento.

📌 *O que você encontra dentro da Tribo:*

🎯 *Mentorias ao vivo com o Lucas* — toda semana, analisando o mercado em tempo real. Você faz perguntas, o Lucas responde. Sem gravação fria, sem robô.

📊 *Carteiras recomendadas* — você não precisa ficar quebrando a cabeça escolhendo onde investir. O Lucas compartilha as estratégias que ele mesmo usa.

🔍 *Análises exclusivas* — quando uma oportunidade aparece, você recebe o contexto completo antes do mercado saber. Já salvou alunos de quedas de 15% em posições erradas.

👥 *Comunidade ativa* — mais de [X] membros que, como você, estão nessa jornada. Um lugar pra trocar, aprender e crescer junto.

Posso te contar mais sobre como funciona na prática? 😊`,

  [ETAPAS.PROPOSTA_TRIBO]: (nome) =>
`${nome}, agora que você já entendeu o que a Tribo entrega, deixa eu te falar sobre o investimento.

💰 *Tribo do Investidor: 12x R$ 97,00*

Isso dá *R$ 3,23 por dia* — menos que um café.

Por esse valor você tem:
✅ Acesso a todas as mentorias ao vivo
✅ Carteiras recomendadas atualizadas
✅ Análises e alertas exclusivos
✅ Comunidade ativa 24/7
✅ Suporte direto

E o melhor: *7 dias de garantia incondicional.* Você entra, acessa tudo — se por qualquer motivo não gostar, devolvemos 100% do seu dinheiro. Sem perguntas, sem burocracia. O risco é completamente nosso. 🛡️

*Você quer garantir sua vaga agora?*

1️⃣ Sim, quero entrar!
2️⃣ Tenho uma dúvida antes
3️⃣ Preciso pensar um pouco`,

  [ETAPAS.OBJECAO_TRIBO]: (nome, objecao) => {
    const respostas = {
      duvida: `${nome}, ótimo que perguntou — é exatamente isso que estou aqui pra resolver!

Me conta: qual é a dúvida? Sobre o conteúdo, sobre o pagamento, sobre como funciona o acesso? 👇

Quero ter certeza que você vai tomar a decisão mais informada possível.`,

      pensar: `${nome}, super válido querer pensar — respeito muito isso.

Só deixa eu te dar uma informação importante: as condições que te apresentei (12x R$ 97 + garantia de 7 dias) são as condições atuais. O Lucas avalia periodicamente tanto o valor quanto o número de vagas.

Não estou te pressionando — mas queria que você soubesse disso antes de esperar demais.

Se surgir alguma dúvida enquanto você pensa, pode me chamar aqui mesmo. 😊`,

      caro: `${nome}, entendo a percepção — mas deixa eu te dar uma perspectiva diferente.

12x R$ 97 = R$ 3,23 por dia.

Quanto custa uma decisão errada de investimento? Um único aporte mal feito pode perder mais do que um ano inteiro de Tribo.

A diferença de quem investe com orientação e quem investe sozinho no achismo não é de performance — é de segurança. E isso não tem preço.

Mas te garanto: você tem 7 dias de garantia. Se entrar e não sentir que valeu, devolvemos tudo. 🛡️`,

      tempoLivre: `${nome}, esse é o ponto que mais me perguntam — e a resposta vai te surpreender.

A Tribo foi feita *pra quem não tem tempo*. As mentorias são gravadas (você assiste quando quiser), os alertas chegam prontos pra você agir, e as carteiras recomendadas eliminam horas de pesquisa.

Quem menos tempo tem é quem mais precisa de um caminho direto — sem tentativa e erro. 😉`,
    };

    const chave = objecao || 'duvida';
    return respostas[chave] || respostas.duvida;
  },

  [ETAPAS.FECHAMENTO_TRIBO]: (nome) =>
`${nome}, que decisão incrível! Você acabou de dar um passo que vai mudar sua relação com dinheiro. 🎉

Aqui está o link pra você garantir seu acesso agora:

👉 *https://triboinvest.com.br/tribo-do-investidor/*

⚠️ *Após o pagamento:*
• Você recebe o acesso no e-mail em até alguns minutos
• Salva o e-mail do Lucas para não perder nenhum conteúdo
• Entra na comunidade e já se apresenta — a galera é receptiva!

Qualquer dúvida sobre pagamento ou acesso, me chama aqui mesmo. Estou por aqui. 💪📈`,

  // ── CAMINHO ORGANIZAÇÃO FINANCEIRA ───────────────────────────────────────────

  [ETAPAS.APRESENTACAO_ORG_FIN]: (nome) =>
`${nome}, você foi honesto comigo sobre a situação — e eu agradeço isso. E é exatamente por isso que tenho o caminho certo pra te mostrar.

Mas antes de te falar o que é, deixa eu te perguntar: você já tentou se organizar antes? Planilha, aplicativo... começou, mas em algum momento perdeu o fio?

A maioria das pessoas não tem problema de *força de vontade*. Tem problema de *método*. Ninguém te ensinou como fazer isso de verdade.

📌 *Organização Financeira e Negociação de Dívidas — o que é:*

Não é mais um curso de "corta o cafezinho". É um método prático, passo a passo, que o Lucas criou pra quem está exatamente onde você está hoje.

🔧 *O que você vai aprender e aplicar:*

📋 *Organização do zero* — como montar um orçamento que funciona na vida real, não no papel

💳 *Negociação de dívidas* — técnicas reais para renegociar com cartão, banco e financeira. Nossos alunos conseguem descontos de 40%, 50%, até 70%.

🏦 *Reserva de emergência* — como construir uma proteção financeira mesmo com pouco, começando hoje

🚀 *Base para investir* — ao final, você sai pronto para dar os primeiros passos como investidor, sem voltar para o buraco

Faz sentido pra você? 😊`,

  [ETAPAS.PROPOSTA_ORG_FIN]: (nome) =>
`${nome}, agora o melhor: o investimento.

💰 *Organização Financeira e Negociação de Dívidas: R$ 97,00*

*Pagamento único. Sem mensalidade. Sem renovação.*

Acesso vitalício ao método completo.

Pra você ter uma noção: R$ 97 é menos do que a multa de um único boleto em atraso. Menos do que um mês de juros do cartão de crédito. E esse é o método que pode te livrar de anos de juros compostos contra você.

E ainda tem: *7 dias de garantia incondicional.* 🛡️
Você acessa tudo, aplica o método — e se não gostar, devolvemos 100%. Sem pergunta, sem burocracia.

*Você quer dar esse passo agora?*

1️⃣ Sim, quero garantir meu acesso!
2️⃣ Tenho uma dúvida antes
3️⃣ Preciso pensar um pouco`,

  [ETAPAS.OBJECAO_ORG_FIN]: (nome, objecao) => {
    const respostas = {
      duvida: `${nome}, pode perguntar à vontade — estou aqui pra isso!

Qual é a dúvida? Sobre o conteúdo, como funciona o acesso, o pagamento, ou algo específico sobre a sua situação? 👇`,

      pensar: `${nome}, entendo — e a decisão é completamente sua.

Só queria te deixar uma reflexão: cada dia que a dívida fica parada, os juros continuam correndo. Não é pressão — é matemática.

R$ 97 hoje vs. quanto você vai pagar de juros nos próximos meses se não mudar nada?

A garantia de 7 dias existe exatamente pra você entrar sem medo. Se não servir, devolvemos tudo. 🛡️

O que te faria se sentir mais seguro pra decidir? Me conta. 😊`,

      caro: `${nome}, R$ 97 parece muito agora — eu entendo.

Mas coloca na balança:

💳 Um mês de juros do cartão rotativo: em média R$ 150 a R$ 300
📋 Uma consultoria financeira: R$ 300 a R$ 500 a hora
💰 O que você vai economizar negociando suas dívidas: potencialmente centenas de reais

O método custa R$ 97 uma vez. O retorno começa no primeiro mês.

E com a garantia de 7 dias, o risco é zero. Se não gostar, você recebe tudo de volta. 🛡️`,

      semDinheiro: `${nome}, preciso ser honesto com você.

Se R$ 97 está impossível agora, tudo bem — não vou te empurrar pra nada.

Mas me conta: qual é a sua situação hoje, em detalhes? Às vezes tem uma alternativa que posso te indicar, ou pelo menos uma forma de dar um primeiro passo antes do curso.

Tô do seu lado aqui. 😊`,
    };

    const chave = objecao || 'duvida';
    return respostas[chave] || respostas.duvida;
  },

  [ETAPAS.FECHAMENTO_ORG_FIN]: (nome) =>
`${nome}, essa é a decisão que vai marcar um antes e um depois na sua vida financeira. Sério. 🙌

Aqui está o link pra você garantir seu acesso agora:

👉 *https://chk.eduzz.com/8WPNOBJN0P*

⚠️ *Após o pagamento:*
• Você recebe o acesso no e-mail em até alguns minutos
• O método é todo estruturado pra você seguir no seu ritmo
• Comece pela Módulo 1 — ele já vai te dar a clareza que você precisa

Qualquer dúvida sobre pagamento ou acesso, me chama aqui mesmo. Estou por aqui. 💪`,

  // ── Encerramento sem qualificação ────────────────────────────────────────────

  encerradoNaoQualificado: (nome) =>
`${nome}, obrigado pela nossa conversa! 🙏

Vou registrar seu contato e em breve um dos nossos especialistas pode entrar em contato pra entender melhor como te ajudar.

Se precisar de qualquer coisa, pode me chamar aqui! 💬`,
};

module.exports = { ETAPAS, PRODUTOS, MENSAGENS, proximaEtapa, rotearProduto };
