/**
 * Script d'entraînement ÉQUILIBRÉ
 * - Learning rate modéré: 0.002
 * - Limite raisonnable: 120 coups
 * - Entraînement: /3 coups
 * - Batch: 64 (stabilité)
 */

import * as fs from 'fs';
import * as path from 'path';
import { GameEngine } from '../src/bot/GameEngine';
import { DQNAgentBalanced } from '../src/bot/DQNAgentBalanced';
import type { PlayerColor } from '../src/bot/GameEngine';

interface GameResult {
  winner: PlayerColor | null;
  moves: number;
  capturesWhite: number;
  capturesBlack: number;
  duration: number;
  averageLoss: number;
  blokMoves: number;
  blokerMoves: number;
}

export class TrainerBalanced {
  private agentWhite: DQNAgentBalanced;
  private agentBlack: DQNAgentBalanced;
  private stats: {
    gamesPlayed: number;
    whiteWins: number;
    blackWins: number;
    draws: number;
    gameResults: GameResult[];
  };
  private totalLoss: number;
  private lossCount: number;

  constructor() {
    this.agentWhite = new DQNAgentBalanced('blanc');
    this.agentBlack = new DQNAgentBalanced('noir');

    this.stats = {
      gamesPlayed: 0,
      whiteWins: 0,
      blackWins: 0,
      draws: 0,
      gameResults: []
    };

    this.totalLoss = 0;
    this.lossCount = 0;

    console.log('⚖️  DQN Agent ÉQUILIBRÉ créé pour blanc');
    console.log('   LR: 0.002 | Batch: 64 | Buffer: 15k\n');
  }

  private async playGame(gameNumber: number): Promise<GameResult> {
    const startTime = Date.now();
    const engine = new GameEngine();
    let moveCount = 0;
    let gameLoss = 0;
    let gameLossCount = 0;
    let blokMoves = 0;
    let blokerMoves = 0;

    const whiteHistory: {
      state: number[];
      actionIndex: number;
      prevEngine: GameEngine;
    }[] = [];
    
    const blackHistory: {
      state: number[];
      actionIndex: number;
      prevEngine: GameEngine;
    }[] = [];

    // LIMITE: 120 coups (compromis entre 100 et 150)
    while (!engine.isGameOver() && moveCount < 120) {
      const currentPlayer = engine.getCurrentPlayer();
      const agent = currentPlayer === 'blanc' ? this.agentWhite : this.agentBlack;
      const history = currentPlayer === 'blanc' ? whiteHistory : blackHistory;

      const prevEngine = engine.clone();
      const state = this.encodeState(engine);

      const move = agent.selectMove(engine);
      if (!move) break;

      const actionIndex = move.from * 64 + move.to;

      const piece = prevEngine.getState().pieces[move.from];
      if (piece?.includes('bloker')) {
        blokerMoves++;
      } else if (piece?.includes('blok')) {
        blokMoves++;
      }

      engine.makeMove(move);
      moveCount++;

      history.push({ state, actionIndex, prevEngine });

      // Entraîner tous les 3 coups (compromis)
      if (moveCount % 3 === 0) {
        const loss1 = await this.agentWhite.train();
        const loss2 = await this.agentBlack.train();
        
        if (loss1 > 0 && loss1 < 100) {
          gameLoss += loss1;
          gameLossCount++;
        }
        if (loss2 > 0 && loss2 < 100) {
          gameLoss += loss2;
          gameLossCount++;
        }
      }
    }

    this.processGameHistory(whiteHistory, engine, this.agentWhite);
    this.processGameHistory(blackHistory, engine, this.agentBlack);

    const finalLoss1 = await this.agentWhite.train();
    const finalLoss2 = await this.agentBlack.train();
    
    if (finalLoss1 > 0 && finalLoss1 < 100) {
      gameLoss += finalLoss1;
      gameLossCount++;
    }
    if (finalLoss2 > 0 && finalLoss2 < 100) {
      gameLoss += finalLoss2;
      gameLossCount++;
    }

    this.agentWhite.updateExploration();
    this.agentBlack.updateExploration();

    const duration = Date.now() - startTime;
    const captureStats = engine.getCaptureStats();
    const winner = engine.getWinner();
    const avgLoss = gameLossCount > 0 ? gameLoss / gameLossCount : 0;

    if (avgLoss > 0 && avgLoss < 100) {
      this.totalLoss += avgLoss;
      this.lossCount++;
    }

    const result: GameResult = {
      winner,
      moves: moveCount,
      capturesWhite: captureStats.white,
      capturesBlack: captureStats.black,
      duration,
      averageLoss: avgLoss,
      blokMoves,
      blokerMoves
    };

    const epsilon = this.agentWhite.getStats().explorationRate;
    const lossStr = avgLoss > 0 && avgLoss < 100 ? avgLoss.toFixed(4) : 'N/A';
    console.log(
      `${gameNumber}: ${winner ? `🏆 ${winner.toUpperCase()}` : 'Nul'} ` +
      `en ${moveCount} coups (${captureStats.white}-${captureStats.black}) ` +
      `| ε=${epsilon.toFixed(3)} | Loss=${lossStr}`
    );

    return result;
  }

  private processGameHistory(
    history: { state: number[]; actionIndex: number; prevEngine: GameEngine }[],
    finalEngine: GameEngine,
    agent: DQNAgentBalanced
  ): void {
    for (let i = 0; i < history.length; i++) {
      const { state, actionIndex, prevEngine } = history[i];

      let currentEngine: GameEngine;
      let nextState: number[];
      let done: boolean;

      if (i < history.length - 1) {
        currentEngine = history[i + 1].prevEngine;
        nextState = this.encodeState(currentEngine);
        done = false;
      } else {
        currentEngine = finalEngine;
        nextState = this.encodeState(currentEngine);
        done = currentEngine.isGameOver();
      }

      const reward = agent.calculateReward(prevEngine, currentEngine);
      agent.storeTransition(state, actionIndex, reward, nextState, done);
    }
  }

  private encodeState(engine: GameEngine): number[] {
    const state = engine.getState();
    const encoded = new Array(68).fill(0);

    for (let i = 0; i < 64; i++) {
      const piece = state.pieces[i];
      if (!piece) encoded[i] = 0;
      else if (piece === 'blok-blanc') encoded[i] = 1;
      else if (piece === 'bloker-blanc') encoded[i] = 2;
      else if (piece === 'blok-noir') encoded[i] = 3;
      else if (piece === 'bloker-noir') encoded[i] = 4;
    }

    const captures = engine.getCaptureStats();
    encoded[64] = state.currentPlayer === 'blanc' ? -1 : 1;
    encoded[65] = captures.white / 4;
    encoded[66] = captures.black / 4;
    encoded[67] = state.lastTurnPlayer === 'blanc' ? 1 : (state.lastTurnPlayer === 'noir' ? -1 : 0);

    return encoded;
  }

  async train(numGames: number): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log('⚖️  ENTRAÎNEMENT ÉQUILIBRÉ');
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Parties: ${numGames}`);
    console.log(`⚡ Learning Rate: 0.002 (équilibré)`);
    console.log(`💰 Capture: +10 | Victoire: +40`);
    console.log(`🎯 Limite: 120 coups`);
    console.log(`🔄 Entraînement: Tous les 3 coups`);
    console.log(`📦 Batch: 64 | Buffer: 15k`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();

    for (let i = 1; i <= numGames; i++) {
      const result = await this.playGame(i);

      this.stats.gamesPlayed++;
      this.stats.gameResults.push(result);

      if (result.winner === 'blanc') this.stats.whiteWins++;
      else if (result.winner === 'noir') this.stats.blackWins++;
      else this.stats.draws++;

      if (i % 100 === 0) {
        const recentResults = this.stats.gameResults.slice(-100);
        const recentWhite = recentResults.filter(r => r.winner === 'blanc').length;
        const recentBlack = recentResults.filter(r => r.winner === 'noir').length;
        const recentDraws = recentResults.filter(r => r.winner === null).length;

        const elapsed = (Date.now() - startTime) / 1000;
        const speed = i / elapsed;
        const remaining = (numGames - i) / speed / 60;

        const whiteStats = this.agentWhite.getStats();
        const blackStats = this.agentBlack.getStats();
        const avgLoss = this.lossCount > 0 ? this.totalLoss / this.lossCount : 0;

        console.log(`${'─'.repeat(60)}`);
        console.log(`📊 Progression: ${i}/${numGames} (${(i/numGames*100).toFixed(1)}%)`);
        console.log(`   Total  → Blanc: ${this.stats.whiteWins} | Noir: ${this.stats.blackWins} | Nuls: ${this.stats.draws}`);
        console.log(`   100 dernières → Blanc: ${recentWhite} | Noir: ${recentBlack} | Nuls: ${recentDraws}`);
        console.log(`   Vitesse: ${speed.toFixed(2)} parties/s | ETA: ${remaining.toFixed(1)} min`);
        console.log(`   Exploration: ε=${whiteStats.explorationRate.toFixed(4)}`);
        console.log(`   Replay Buffer: Blanc=${whiteStats.replayBufferSize} | Noir=${blackStats.replayBufferSize}`);
        console.log(`   Loss moyenne: ${avgLoss.toFixed(4)}`);
        console.log(`${'─'.repeat(60)}`);
      }

      if (i % 500 === 0) {
        await this.saveCheckpoint(i);
      }
    }

    await this.saveFinalResults();
    this.printFinalStats();
  }

  private async saveCheckpoint(gameNumber: number): Promise<void> {
    const dir = path.join(process.cwd(), 'bot-training-checkpoints-balanced');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(path.join(dir, `white-${gameNumber}.json`), this.agentWhite.exportParams());
    fs.writeFileSync(path.join(dir, `black-${gameNumber}.json`), this.agentBlack.exportParams());
    console.log(`💾 Checkpoint ${gameNumber}`);
  }

  private async saveFinalResults(): Promise<void> {
    const dir = path.join(process.cwd(), 'bot-training-results-balanced');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(path.join(dir, 'white-final.json'), this.agentWhite.exportParams());
    fs.writeFileSync(path.join(dir, 'black-final.json'), this.agentBlack.exportParams());
    fs.writeFileSync(path.join(dir, 'stats.json'), JSON.stringify(this.stats, null, 2));

    const csv = ['Game,Winner,Moves,WhiteCap,BlackCap,Duration,Loss,Blok,Bloker'];
    this.stats.gameResults.forEach((r, i) => {
      csv.push(`${i+1},${r.winner||'draw'},${r.moves},${r.capturesWhite},${r.capturesBlack},${r.duration},${r.averageLoss},${r.blokMoves},${r.blokerMoves}`);
    });
    fs.writeFileSync(path.join(dir, 'results.csv'), csv.join('\n'));

    console.log(`\n💾 Résultats: ${dir}`);
  }

  private printFinalStats(): void {
    const { gamesPlayed, whiteWins, blackWins, draws, gameResults } = this.stats;
    const totalBlok = gameResults.reduce((s, r) => s + r.blokMoves, 0);
    const totalBloker = gameResults.reduce((s, r) => s + r.blokerMoves, 0);
    const total = totalBlok + totalBloker;
    const avgLoss = this.lossCount > 0 ? this.totalLoss / this.lossCount : 0;

    console.log(`\n${'='.repeat(60)}`);
    console.log('     STATISTIQUES FINALES - MODE ÉQUILIBRÉ      ');
    console.log(`${'='.repeat(60)}`);
    console.log(`Parties:    ${gamesPlayed}`);
    console.log(`Blanc:      ${whiteWins} (${(whiteWins/gamesPlayed*100).toFixed(1)}%)`);
    console.log(`Noir:       ${blackWins} (${(blackWins/gamesPlayed*100).toFixed(1)}%)`);
    console.log(`Nuls:       ${draws} (${(draws/gamesPlayed*100).toFixed(1)}%)`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`BLOK:       ${totalBlok} (${(totalBlok/total*100).toFixed(1)}%)`);
    console.log(`BLOKER:     ${totalBloker} (${(totalBloker/total*100).toFixed(1)}%)`);
    console.log(`Loss:       ${avgLoss.toFixed(4)}`);
    console.log(`${'='.repeat(60)}\n`);
  }
}

async function main() {
  const trainer = new TrainerBalanced();
  await trainer.train(5000);
  console.log('✅ Terminé !');
  process.exit(0);
}

main().catch(console.error);
