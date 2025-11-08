/**
 * Écran de configuration des règles du jeu
 * Permet de personnaliser le plateau, les pièces et les conditions de victoire
 */

import { useState } from 'react';
import type { GameConfig, BoardType } from '../types/GameConfig';
import { DEFAULT_CONFIG, validateGameConfig } from '../types/GameConfig';
import '../App.css';

interface GameSettingsScreenProps {
  onStartGame: (config: GameConfig) => void;
  onBack?: () => void;
  title?: string;
}

export function GameSettingsScreen({ 
  onStartGame, 
  onBack,
  title = "Configuration de la partie"
}: GameSettingsScreenProps) {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [errors, setErrors] = useState<string[]>([]);

  const updateConfig = <K extends keyof GameConfig>(key: K, value: GameConfig[K]) => {
    const newConfig = { ...config, [key]: value };
    
    // Si on change le nombre de BLOKs, ajuster l'objectif si nécessaire
    if (key === 'blokCount' && typeof value === 'number') {
      if (newConfig.captureGoal > value) {
        newConfig.captureGoal = value;
      }
    }
    
    setConfig(newConfig);
    
    // Valider la nouvelle configuration
    const validation = validateGameConfig(newConfig);
    setErrors(validation.errors);
  };

  const handleStartGame = () => {
    const validation = validateGameConfig(config);
    if (validation.valid) {
      onStartGame(config);
    } else {
      setErrors(validation.errors);
    }
  };

  return (
    <div className="game-container">
      <div className="settings-screen">
        <h1 className="game-title">{title}</h1>
        
        <div className="settings-container">
          {/* Erreurs de validation */}
          {errors.length > 0 && (
            <div className="settings-errors">
              {errors.map((error, i) => (
                <div key={i} className="error-message">⚠️ {error}</div>
              ))}
            </div>
          )}

          {/* Nombre de BLOKs */}
          <div className="setting-group">
            <label className="setting-label">Nombre de BLOKs par joueur</label>
            <div className="setting-options">
              {[4, 6, 8].map(count => (
                <button
                  key={count}
                  className={`setting-option ${config.blokCount === count ? 'selected' : ''}`}
                  onClick={() => updateConfig('blokCount', count)}
                >
                  {count} BLOKs
                </button>
              ))}
            </div>
            <p className="setting-description">BLOKs placés sur la première ligne (centrés)</p>
          </div>

          {/* Nombre de BLOKERs */}
          <div className="setting-group">
            <label className="setting-label">Nombre de BLOKERs par joueur</label>
            <div className="setting-options">
              {[2, 3, 4].map(count => (
                <button
                  key={count}
                  className={`setting-option ${config.blokerCount === count ? 'selected' : ''}`}
                  onClick={() => updateConfig('blokerCount', count)}
                >
                  {count} BLOKERs
                </button>
              ))}
            </div>
            <p className="setting-description">BLOKERs placés sur la deuxième ligne (centrés)</p>
          </div>

          {/* Type de plateau */}
          <div className="setting-group">
            <label className="setting-label">Type de plateau</label>
            <div className="setting-options">
              <button
                className={`setting-option ${config.boardType === '8x8' ? 'selected' : ''}`}
                onClick={() => updateConfig('boardType', '8x8' as BoardType)}
              >
                <strong>8x8</strong><br/><small>64 cases</small>
              </button>
              <button
                className={`setting-option ${config.boardType === '6x8' ? 'selected' : ''}`}
                onClick={() => updateConfig('boardType', '6x8' as BoardType)}
              >
                <strong>6x8</strong><br/><small>48 cases</small>
              </button>
              <button
                className={`setting-option ${config.boardType === '4x8' ? 'selected' : ''}`}
                onClick={() => updateConfig('boardType', '4x8' as BoardType)}
              >
                <strong>4x8</strong><br/><small>32 cases</small>
              </button>
              <button
                className={`setting-option ${config.boardType === '8x8-no-corners' ? 'selected' : ''}`}
                onClick={() => updateConfig('boardType', '8x8-no-corners' as BoardType)}
              >
                <strong>8x8 sans coins</strong><br/><small>60 cases</small>
              </button>
            </div>
            <p className="setting-description">
              Taille et configuration du plateau de jeu
            </p>
          </div>

          {/* Coups par tour */}
          <div className="setting-group">
            <label className="setting-label">Coups par tour</label>
            <div className="setting-options">
              <button
                className={`setting-option ${config.movesPerTurn === 1 ? 'selected' : ''}`}
                onClick={() => updateConfig('movesPerTurn', 1)}
              >
                1 coup
              </button>
              <button
                className={`setting-option ${config.movesPerTurn === 2 ? 'selected' : ''}`}
                onClick={() => updateConfig('movesPerTurn', 2)}
              >
                2 coups
              </button>
            </div>
            <p className="setting-description">
              Nombre de mouvements autorisés par tour (actuellement: 1 seul coup implémenté)
            </p>
          </div>

          {/* Objectif de victoire */}
          <div className="setting-group">
            <label className="setting-label">Objectif de victoire</label>
            <div className="setting-options">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(goal => (
                <button
                  key={goal}
                  className={`setting-option small ${config.captureGoal === goal ? 'selected' : ''}`}
                  onClick={() => updateConfig('captureGoal', goal)}
                  disabled={goal > config.blokCount}
                  title={goal > config.blokCount ? `Maximum: ${config.blokCount}` : undefined}
                >
                  {goal}
                </button>
              ))}
            </div>
            <p className="setting-description">
              Nombre de BLOKs adverses à capturer pour gagner (avec +1 d'écart et dernier tour)
            </p>
          </div>

          {/* Récapitulatif */}
          <div className="settings-summary">
            <h3>Récapitulatif</h3>
            <ul>
              <li><strong>{config.blokCount}</strong> BLOKs et <strong>{config.blokerCount}</strong> BLOKERs par joueur</li>
              <li>Plateau <strong>{config.boardType}</strong></li>
              <li><strong>{config.movesPerTurn}</strong> coup{config.movesPerTurn > 1 ? 's' : ''} par tour</li>
              <li>Victoire à <strong>{config.captureGoal}</strong> BLOK{config.captureGoal > 1 ? 's' : ''} capturé{config.captureGoal > 1 ? 's' : ''}</li>
            </ul>
          </div>

          {/* Boutons d'action */}
          <div className="settings-actions">
            <button 
              className="play-button"
              onClick={handleStartGame}
              disabled={errors.length > 0}
            >
              Commencer la partie
            </button>
            {onBack && (
              <button className="back-button" onClick={onBack}>
                ← Retour
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
