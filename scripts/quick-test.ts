/**
 * Test ultra-rapide - 2 parties seulement
 */

import { DQNTrainer } from './train-dqn';

async function ultraQuickTest() {
  console.log('⚡ Test ultra-rapide (2 parties)\n');

  const trainer = new DQNTrainer({
    numGames: 2,
    saveInterval: 999999,
    maxMovesPerGame: 150,  // Augmenté de 100 à 150
    verbose: false,
    trainInterval: 4
  });

  try {
    const stats = await trainer.train();
    
    console.log('\n✅ TEST RÉUSSI !');
    console.log(`   Parties jouées: ${stats.gamesPlayed}`);
    console.log(`   Victoires blanc: ${stats.whiteWins}`);
    console.log(`   Victoires noir: ${stats.blackWins}`);
    console.log(`   Durée: ${(stats.totalDuration / 1000).toFixed(1)}s`);
    console.log('\n🎉 Le système Deep Q-Learning fonctionne correctement !');
    console.log('   Vous pouvez maintenant lancer: npm run train-dqn');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
}

ultraQuickTest().catch(console.error);
