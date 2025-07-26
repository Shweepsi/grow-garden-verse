import React from 'react';
import { Button } from '@/components/ui/button';

interface AdProgressBarProps {
  dailyCount: number;
  maxDaily: number;
  onToggleDiagnostics: () => void;
}

export function AdProgressBar({ dailyCount, maxDaily, onToggleDiagnostics }: AdProgressBarProps) {
  const progressPercentage = (dailyCount / maxDaily) * 100;

  return (
    <div className="flex items-center justify-between mt-3 p-2 premium-card rounded-lg">
      <div className="flex items-center space-x-2">
        <span className="text-white/90 text-sm font-medium">
          {dailyCount}/{maxDaily} publicités
        </span>
        <div className="w-20 bg-white/20 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleDiagnostics}
        className="opacity-60 hover:opacity-100 text-white hover:bg-white/10 w-8 h-8 p-0"
      >
        🔧
      </Button>
    </div>
  );
}