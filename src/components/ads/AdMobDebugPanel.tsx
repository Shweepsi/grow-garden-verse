import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, Play, Smartphone, Wifi } from 'lucide-react';
import { AdMobService } from '@/services/AdMobService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function AdMobDebugPanel() {
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingAd, setIsTestingAd] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const info = await AdMobService.getDiagnosticInfo();
      setDiagnosticInfo(info);
      console.log('[Debug] Diagnostic complet:', info);
    } catch (error) {
      console.error('[Debug] Échec diagnostic:', error);
      toast({
        title: "Erreur diagnostic",
        description: "Impossible d'obtenir les informations de diagnostic",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAdFlow = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour tester les publicités",
        variant: "destructive"
      });
      return;
    }

    setIsTestingAd(true);
    try {
      console.log('[Debug] 🧪 DÉBUT TEST AD FLOW');
      
      // Test 1: Initialisation
      console.log('[Debug] Test 1: Initialisation...');
      const initialized = await AdMobService.initialize();
      console.log('[Debug] Initialisation:', initialized);

      if (!initialized) {
        throw new Error('Échec initialisation AdMob');
      }

      // Test 2: Chargement
      console.log('[Debug] Test 2: Chargement annonce...');
      const loaded = await AdMobService.loadRewardedAd(user.id, 'coins', 100);
      console.log('[Debug] Chargement:', loaded);

      if (!loaded) {
        throw new Error('Échec chargement annonce');
      }

      // Test 3: Affichage
      console.log('[Debug] Test 3: Affichage annonce...');
      const result = await AdMobService.showRewardedAd(user.id, 'coins', 100);
      console.log('[Debug] Résultat affichage:', result);

      toast({
        title: result.success ? "Test réussi" : "Test échoué", 
        description: result.success 
          ? `Annonce ${result.rewarded ? 'complétée avec récompense' : 'affichée sans récompense'}`
          : `Erreur: ${result.error}`,
        variant: result.success ? "default" : "destructive"
      });

    } catch (error) {
      console.error('[Debug] Erreur test ad flow:', error);
      toast({
        title: "Test échoué",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsTestingAd(false);
      // Rafraîchir les diagnostics après le test
      setTimeout(runDiagnostics, 1000);
    }
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Debug AdMob
          <Button 
            onClick={runDiagnostics} 
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {diagnosticInfo ? (
          <>
            {/* Section Plateforme */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Plateforme
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Badge className={getStatusColor(diagnosticInfo.platform.isNative)}>
                  {getStatusIcon(diagnosticInfo.platform.isNative)}
                  {diagnosticInfo.platform.isNative ? 'Native' : 'Web'}
                </Badge>
                <span className="text-sm text-muted-foreground flex items-center">
                  {diagnosticInfo.platform.platformName}
                </span>
              </div>
            </div>

            {/* Section AdMob */}
            <div className="space-y-3">
              <h4 className="font-semibold">État AdMob</h4>
              <div className="grid grid-cols-2 gap-2">
                <Badge className={getStatusColor(diagnosticInfo.admob.isInitialized)}>
                  {getStatusIcon(diagnosticInfo.admob.isInitialized)}
                  Initialisé
                </Badge>
                <Badge className={getStatusColor(diagnosticInfo.admob.isAdLoaded)}>
                  {getStatusIcon(diagnosticInfo.admob.isAdLoaded)}
                  Ad chargée
                </Badge>
                <Badge className={getStatusColor(diagnosticInfo.admob.isAdLoading)}>
                  {diagnosticInfo.admob.isAdLoading ? 'En cours...' : 'Prête'}
                </Badge>
                <Badge className={getStatusColor(diagnosticInfo.admob.connectivity)}>
                  <Wifi className="w-3 h-3 mr-1" />
                  {diagnosticInfo.admob.connectivity ? 'Connecté' : 'Déconnecté'}
                </Badge>
              </div>
            </div>

            {/* Section Erreur */}
            {diagnosticInfo.admob.lastError && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Dernière erreur
                </h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600 font-mono">
                    {diagnosticInfo.admob.lastError}
                  </p>
                </div>
              </div>
            )}

            {/* Section Actions */}
            <div className="space-y-3">
              <h4 className="font-semibold">Actions de test</h4>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={testAdFlow}
                  disabled={isTestingAd || !user}
                  className="w-full"
                  variant="outline"
                >
                  {isTestingAd ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Test en cours...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Tester le flux complet
                    </>
                  )}
                </Button>
              </div>
              {!user && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  Connexion requise pour tester les annonces
                </p>
              )}
            </div>

            {/* Section Info technique */}
            <details className="text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground mb-2">
                Informations techniques
              </summary>
              <div className="bg-muted rounded-lg p-3 font-mono text-xs overflow-x-auto">
                <pre>{JSON.stringify(diagnosticInfo, null, 2)}</pre>
              </div>
            </details>

            <div className="text-xs text-muted-foreground border-t pt-2">
              Dernière mise à jour: {new Date(diagnosticInfo.timestamp).toLocaleTimeString()}
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              Cliquez sur rafraîchir pour lancer le diagnostic
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}