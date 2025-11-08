/**
 * Test rapide - 100 parties pour valider la configuration
 */

import { TrainerBalanced } from './train-balanced';

async function main() {
  console.log('🧪 TEST RAPIDE - 100 parties\n');
  
  const trainer = new TrainerBalanced();
  await trainer.train(100);
  
  console.log('\n✅ Test terminé !');
  console.log('📊 Si les résultats sont bons (>25% victoires, loss 0.5-1.5):');
  console.log('   → Lancer npm run train pour 5000 parties\n');
  
  process.exit(0);
}

main().catch(console.error);
