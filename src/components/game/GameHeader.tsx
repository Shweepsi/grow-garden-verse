
import React from 'react';
import { PlayerStats } from './PlayerStats';
import { PlayerGarden } from '@/types/game';

interface GameHeaderProps {
  garden: PlayerGarden | null;
}

// Mémorisation pour éviter les re-renders inutiles
export const GameHeader = React.memo(({ garden }: GameHeaderProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-green-50/95 to-transparent backdrop-blur-sm border-b border-green-200/50">
      <div className="container mx-auto px-4 py-3">
        <PlayerStats garden={garden} />
      </div>
    </div>
  );
});

GameHeader.displayName = 'GameHeader';
