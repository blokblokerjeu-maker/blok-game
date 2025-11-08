/**
 * Version ÉQUILIBRÉE du DQN Agent
 * - Learning rate modéré (0.002)
 * - Batch size réduit (64)
 * - Récompenses massives maintenues
 * - Architecture optimale
 */

import * as tf from '@tensorflow/tfjs';
import { GameEngine } from './GameEngine';
import type { Move, PlayerColor } from './GameEngine';

interface Transition {
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
  done: boolean;
}

export interface DQNAgentConfig {
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
  explorationDecay: number;
  minExploration: number;
  batchSize: number;
  targetUpdateFrequency: number;
  replayBufferSize: number;
}

export class DQNAgentBalanced {
  private color: PlayerColor;
  private model: tf.LayersModel;
  private targetModel: tf.LayersModel;
  private replayBuffer: Transition[];
  private config: DQNAgentConfig;
  private explorationRate: number;
  private trainSteps: number;
  private gamesPlayed: number;

  constructor(color: PlayerColor, config?: Partial<DQNAgentConfig>) {
    this.color = color;
    this.gamesPlayed = 0;
    this.trainSteps = 0;
    this.replayBuffer = [];

    // Configuration ÉQUILIBRÉE
    this.config = {
      learningRate: 0.002,        // Compromis entre 0.001 et 0.005
      discountFactor: 0.98,       
      explorationRate: 1.0,
      explorationDecay: 0.996,    // Compromis
      minExploration: 0.05,
      batchSize: 64,              // Réduit pour stabilité
      targetUpdateFrequency: 300, // Compromis
      replayBufferSize: 15000,    // Compromis
      ...config
    };

    this.explorationRate = this.config.explorationRate;

    this.model = this.createNetwork();
    this.targetModel = this.createNetwork();
    this.updateTargetNetwork();
  }

  private createNetwork(): tf.LayersModel {
    const model = tf.sequential();

    model.add(tf.layers.dense({
      inputShape: [68],
      units: 128,
      activation: 'relu',
      kernelInitializer: 'heNormal'
    }));

    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      kernelInitializer: 'heNormal'
    }));

    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu',
      kernelInitializer: 'heNormal'
    }));

    model.add(tf.layers.dense({
      units: 4096,
      activation: 'linear',
      kernelInitializer: 'heNormal'
    }));

    model.compile({
      optimizer: tf.train.adam(this.config.learningRate, 0.9, 0.999, 1e-7),
      loss: 'meanSquaredError'
    });

    return model;
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
    encoded[67] = state.lastTurnPlayer === this.color ? 1 : (state.lastTurnPlayer ? -1 : 0);

    return encoded;
  }

  selectMove(engine: GameEngine): Move | null {
    const legalMoves = engine.getLegalMoves();
    if (legalMoves.length === 0) return null;

    if (Math.random() < this.explorationRate) {
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    const state = this.encodeState(engine);
    const qValues = tf.tidy(() => {
      const stateTensor = tf.tensor2d([state]);
      return this.model.predict(stateTensor) as tf.Tensor;
    });

    const qArray = qValues.dataSync();
    qValues.dispose();

    let bestMove = legalMoves[0];
    let bestQ = -Infinity;

    for (const move of legalMoves) {
      const actionIndex = move.from * 64 + move.to;
      if (qArray[actionIndex] > bestQ) {
        bestQ = qArray[actionIndex];
        bestMove = move;
      }
    }

    return bestMove;
  }

  storeTransition(
    state: number[],
    action: number,
    reward: number,
    nextState: number[],
    done: boolean
  ): void {
    this.replayBuffer.push({ state, action, reward, nextState, done });

    if (this.replayBuffer.length > this.config.replayBufferSize) {
      this.replayBuffer.shift();
    }
  }

  async train(): Promise<number> {
    if (this.replayBuffer.length < this.config.batchSize) {
      return 0;
    }

    const batch: Transition[] = [];
    for (let i = 0; i < this.config.batchSize; i++) {
      const idx = Math.floor(Math.random() * this.replayBuffer.length);
      batch.push(this.replayBuffer[idx]);
    }

    const states = batch.map(t => t.state);
    const actions = batch.map(t => t.action);
    const rewards = batch.map(t => t.reward);
    const nextStates = batch.map(t => t.nextState);
    const dones = batch.map(t => t.done);

    const stateTensor = tf.tensor2d(states);
    const nextStateTensor = tf.tensor2d(nextStates);

    const qValues = this.model.predict(stateTensor) as tf.Tensor2D;
    const nextQValues = this.targetModel.predict(nextStateTensor) as tf.Tensor2D;
    const maxNextQ = nextQValues.max(1);

    const targets = await qValues.array();
    const maxNextQData = await maxNextQ.data();
    
    for (let i = 0; i < this.config.batchSize; i++) {
      const target = dones[i] 
        ? rewards[i] 
        : rewards[i] + this.config.discountFactor * maxNextQData[i];
      
      targets[i][actions[i]] = target;
    }

    const targetTensor = tf.tensor2d(targets);

    const history = await this.model.fit(stateTensor, targetTensor, {
      epochs: 1,
      verbose: 0,
      batchSize: this.config.batchSize
    });

    const loss = history.history.loss[0] as number;

    stateTensor.dispose();
    nextStateTensor.dispose();
    qValues.dispose();
    nextQValues.dispose();
    maxNextQ.dispose();
    targetTensor.dispose();

    this.trainSteps++;

    if (this.trainSteps % this.config.targetUpdateFrequency === 0) {
      this.updateTargetNetwork();
    }

    return loss;
  }

  /**
   * Récompenses MASSIVES (gardées de la version ULTRA)
   */
  calculateReward(prevEngine: GameEngine, currentEngine: GameEngine): number {
    let reward = 0;
    
    const prevStats = prevEngine.getCaptureStats();
    const currentStats = currentEngine.getCaptureStats();
    
    const myPrevCaptures = this.color === 'blanc' ? prevStats.black : prevStats.white;
    const myCurrentCaptures = this.color === 'blanc' ? currentStats.black : currentStats.white;
    const oppPrevCaptures = this.color === 'blanc' ? prevStats.white : prevStats.black;
    const oppCurrentCaptures = this.color === 'blanc' ? currentStats.white : currentStats.black;

    // Récompenses MASSIVES maintenues
    if (myCurrentCaptures > myPrevCaptures) reward += 10.0;
    if (oppCurrentCaptures > oppPrevCaptures) reward -= 10.0;

    if (currentEngine.isGameOver()) {
      const winner = currentEngine.getWinner();
      if (winner === this.color) reward += 40.0;
      else if (winner && winner !== this.color) reward -= 40.0;
    }

    const currentLegalMoves = currentEngine.getLegalMoves();
    if (currentLegalMoves.length === 0 && !currentEngine.isGameOver()) {
      reward -= 0.5;
    }

    reward -= 0.02;

    return reward;
  }

  updateTargetNetwork(): void {
    const weights = this.model.getWeights();
    this.targetModel.setWeights(weights);
  }

  updateExploration(): void {
    this.explorationRate = Math.max(
      this.config.minExploration,
      this.explorationRate * this.config.explorationDecay
    );
    this.gamesPlayed++;
  }

  getStats() {
    return {
      explorationRate: this.explorationRate,
      replayBufferSize: this.replayBuffer.length,
      trainSteps: this.trainSteps,
      gamesPlayed: this.gamesPlayed
    };
  }

  async saveModel(_path: string): Promise<void> {}

  exportParams(): string {
    return JSON.stringify({
      color: this.color,
      explorationRate: this.explorationRate,
      trainSteps: this.trainSteps,
      gamesPlayed: this.gamesPlayed,
      replayBufferSize: this.replayBuffer.length
    });
  }

  dispose(): void {
    this.model.dispose();
    this.targetModel.dispose();
  }
}
