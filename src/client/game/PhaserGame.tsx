import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import LauncherScene from '../phaser/scenes/LauncherScene';
import DetectiveOffice from '../phaser/scenes/DetectiveOffice';
import SolvedScene from '../phaser/scenes/SolvedScene';
import { PlayerProgress, MysteryClient, GameStateResponse, InvestigationAction } from '../../shared/types';

interface PhaserGameProps {
  ipRemaining: number;
  onSelectInvestigation: (action: InvestigationAction) => void;
  gameState: PlayerProgress;
  mystery: MysteryClient;
  solvedSummary: GameStateResponse['solvedSummary'] | null;
  isLauncher?: boolean;
  showIntro?: boolean;
}

export default function PhaserGame({
  ipRemaining,
  onSelectInvestigation,
  gameState,
  mystery,
  solvedSummary,
  isLauncher = false,
  showIntro = true
}: PhaserGameProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    // Instantiate scenes
    const launcherScene = new LauncherScene();
    const officeScene = new DetectiveOffice(onSelectInvestigation, ipRemaining, gameState, mystery);
    const solvedScene = new SolvedScene();

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 600,
      height: 340,
      parent: gameContainerRef.current,
      backgroundColor: '#0a0b0e',
      scene: [launcherScene, officeScene, solvedScene]
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    if (isLauncher) {
      game.scene.start('LauncherScene', { skipIntro: !showIntro });
    } else if (gameState.completed && solvedSummary) {
      game.scene.start('SolvedScene', { solvedSummary, score: gameState.score });
    } else {
      game.scene.start('DetectiveOffice', { ip: ipRemaining, gameState, mystery });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onSelectInvestigation]);

  // Keep Phaser office/launcher scene updated
  useEffect(() => {
    if (!gameRef.current) return;
    
    const game = gameRef.current;

    if (isLauncher) {
      if (game.scene.isActive('DetectiveOffice')) {
        game.scene.stop('DetectiveOffice');
      }
      if (game.scene.isActive('SolvedScene')) {
        game.scene.stop('SolvedScene');
      }
      game.scene.start('LauncherScene', { skipIntro: !showIntro });
    } else if (gameState.completed && solvedSummary) {
      if (game.scene.isActive('DetectiveOffice')) {
        game.scene.stop('DetectiveOffice');
      }
      if (game.scene.isActive('LauncherScene')) {
        game.scene.stop('LauncherScene');
      }
      if (!game.scene.isActive('SolvedScene')) {
        game.scene.start('SolvedScene', { solvedSummary, score: gameState.score });
      }
    } else {
      if (game.scene.isActive('LauncherScene')) {
        game.scene.stop('LauncherScene');
      }
      if (game.scene.isActive('SolvedScene')) {
        game.scene.stop('SolvedScene');
      }
      const activeOffice = game.scene.getScene('DetectiveOffice') as DetectiveOffice;
      if (activeOffice && game.scene.isActive('DetectiveOffice')) {
        activeOffice.updateIP(ipRemaining);
        activeOffice.init({ ip: ipRemaining, gameState, mystery });
      } else {
        game.scene.start('DetectiveOffice', { ip: ipRemaining, gameState, mystery });
      }
    }
  }, [ipRemaining, gameState, mystery, solvedSummary, isLauncher, showIntro]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '600px',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 0 15px rgba(0, 240, 255, 0.05)',
        position: 'relative'
      }}
    >
      <div ref={gameContainerRef} style={{ width: '100%', height: '340px' }} />
    </div>
  );
}
