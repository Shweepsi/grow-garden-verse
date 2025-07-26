import React from 'react';
import { Button } from '@/components/ui/button';

interface AdDiagnosticsPanelProps {
  debugInfo: any;
  onTestConnectivity: () => void;
}

export function AdDiagnosticsPanel({ debugInfo, onTestConnectivity }: AdDiagnosticsPanelProps) {
  return (
    <div className="glassmorphism p-3 rounded-lg text-xs border border-white/20">
      <div className="font-medium mb-2 text-white">Diagnostics AdMob:</div>
      <pre className="whitespace-pre-wrap overflow-x-auto text-white/80 bg-white/10 p-2 rounded">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      <Button
        variant="outline"
        size="sm"
        onClick={onTestConnectivity}
        className="mt-2 glassmorphism border-white/20 text-white hover:bg-white/10"
      >
        Tester la connectivité
      </Button>
    </div>
  );
}