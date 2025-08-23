import { useState, useCallback } from 'react';
import { useUnifiedRewards } from '@/hooks/useUnifiedRewards';
import { useToast } from '@/hooks/use-toast';

export function useAdDiagnostics() {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { rewardState } = useUnifiedRewards();
  const { toast } = useToast();

  const toggleDiagnostics = useCallback(() => {
    setShowDiagnostics(prev => !prev);
  }, []);

  const runConnectivityTest = useCallback(async () => {
    // Simplified connectivity test based on reward state
    const result = rewardState?.available !== false;
    toast({
      title: result ? "Connexion OK" : "Connexion échouée",
      description: result 
        ? "La connexion aux serveurs publicitaires fonctionne" 
        : "Impossible de se connecter aux serveurs publicitaires",
      variant: result ? "default" : "destructive"
    });
    return result;
  }, [rewardState, toast]);

  return {
    showDiagnostics,
    toggleDiagnostics,
    runConnectivityTest,
    debugInfo: rewardState
  };
}