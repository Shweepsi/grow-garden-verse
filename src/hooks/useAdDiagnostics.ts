import { useState, useCallback } from 'react';
import { useAdRewards } from '@/hooks/useAdRewards';
import { useToast } from '@/hooks/use-toast';

export function useAdDiagnostics() {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { testConnectivity, debug } = useAdRewards();
  const { toast } = useToast();

  const toggleDiagnostics = useCallback(() => {
    setShowDiagnostics(prev => !prev);
  }, []);

  const runConnectivityTest = useCallback(async () => {
    const result = await testConnectivity();
    toast({
      title: result ? "Connexion OK" : "Connexion échouée",
      description: result 
        ? "La connexion aux serveurs publicitaires fonctionne" 
        : "Impossible de se connecter aux serveurs publicitaires",
      variant: result ? "default" : "destructive"
    });
    return result;
  }, [testConnectivity, toast]);

  return {
    showDiagnostics,
    toggleDiagnostics,
    runConnectivityTest,
    debugInfo: debug
  };
}