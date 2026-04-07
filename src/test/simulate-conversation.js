/**
 * Simulador de conversa — testa o funil completo sem precisar do Instagram
 * Execute: node src/test/simulate-conversation.js
 */

require('dotenv').config();
const { processarLeadIncoming } = require('../handlers/leadHandler');

const LEAD_ID = 'test_lead_001';

const CONVERSA_SIMULADA = [
  'Oi',
  'Meu nome é Carlos',
  '2', // Objetivo: sair das dívidas
  '1', // Tem dívidas: sim
  '2', // Renda: R$2k a R$5k
  '1', // Decisão: interessado
];

async function simular() {
  console.log('\n========================================');
  console.log(' SIMULAÇÃO DE CONVERSA - TRIBO INVEST');
  console.log('========================================\n');

  for (const mensagem of CONVERSA_SIMULADA) {
    console.log(`\n👤 LEAD: ${mensagem}`);
    console.log('⏳ Processando...\n');

    try {
      const respostas = await processarLeadIncoming(LEAD_ID, mensagem, 'simulacao');

      for (const resposta of respostas) {
        console.log(`🤖 BOT:\n${resposta}`);
        console.log('\n' + '-'.repeat(50));
      }

      // Pausa entre mensagens para simular conversa real
      await new Promise((r) => setTimeout(r, 800));
    } catch (error) {
      console.error('❌ ERRO:', error.message);
    }
  }

  console.log('\n✅ Simulação finalizada!');
  process.exit(0);
}

simular();
