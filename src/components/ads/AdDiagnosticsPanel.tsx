import React from 'react';
import { Button } from '@/components/ui/button';

interface AdDiagnosticsPanelProps {
  debugInfo: any;
  onTestConnectivity: () => void;
}

export function AdDiagnosticsPanel({ debugInfo, onTestConnectivity }: AdDiagnosticsPanelProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in slide-in-from-top-5 duration-300">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">⚙️</span>
        </div>
        <span className="font-semibold text-red-800">Diagnostics AdMob</span>
      </div>
      <div className="bg-white rounded-lg p-3 border border-red-100 shadow-sm">
        <pre className="whitespace-pre-wrap overflow-x-auto pb-1 text-xs text-gray-700 font-mono">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onTestConnectivity}
        className="mt-3 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors duration-200"
      >
        <span className="mr-1">🔍</span>
        Tester la connectivité
      </Button>
    </div>
  );
}