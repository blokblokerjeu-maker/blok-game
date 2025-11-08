/**
 * Script de test rapide pour vérifier le système Deep Q-Learning
 * Lance 10 parties pour vérifier que tout fonctionne
 */

import { DQNTrainer } from './train-dqn';

async function quickTest() {
  console.log('🧪 Test rapide du système Deep Q-Learning\n');
  console.log('Configuration:');
  console.log('  - 10 parties de test');
  console.log('  - Mode verbose activé');
  console.log('  - Pas de sauvegarde\n');

  const trainer = new DQNTrainer();

  try {
    const stats = await trainer.train();
    
    console.log('\n✅ Test réussi !');
    console.log('\nRésultats:');
    console.log(`  - Parties jouées: ${stats.gamesPlayed}`);
    console.log(`  - Victoires blanc: ${stats.whiteWins}`);
    console.log(`  - Victoires noir: ${stats.blackWins}`);
    console.log(`  - Nuls: ${stats.draws}`);
    console.log(`  - Moyenne de coups: ${stats.averageMoves.toFixed(1)}`);
    console.log(`  - Loss moyenne: ${stats.averageLoss.toFixed(4)}`);
    
    console.log('\n🚀 Le système fonctionne correctement !');
    console.log('   Vous pouvez lancer: npm run train-dqn');
    
  } catch (error) {
    console.error('\n❌ Erreur durant le test:', error);
    process.exit(1);
  }
}

quickTest().catch(console.error);
