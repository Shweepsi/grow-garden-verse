import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AdMobSimpleService } from '@/services/ads/AdMobSimpleService';
import { AdMonitoringService } from '@/services/ads/AdMonitoringService';
import { useToast } from '@/hooks/use-toast';

export function AdEnhancedDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingAd, setIsTestingAd] = useState(false);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const data = AdMobSimpleService.getDiagnostics();
      setDiagnostics(data);
    } catch (error) {
      console.error('Erreur diagnostics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testAdFlow = async () => {
    setIsTestingAd(true);
    try {
      toast({
        title: "Test en cours...",
        description: "Test du flux publicitaire complet"
      });

      const result = await AdMobSimpleService.showAd();
      
      if (result.success) {
        toast({
          title: "✅ Test réussi",
          description: `Publicité affichée avec succès (récompense: ${result.rewarded ? 'Oui' : 'Non'})`
        });
      } else {
        toast({
          title: "❌ Test échoué",
          description: result.error || "Erreur inconnue",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erreur de test",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    } finally {
      setIsTestingAd(false);
      runDiagnostics(); // Refresh after test
    }
  };

  const toggleTestMode = () => {
    const newTestMode = !AdMobSimpleService.isTestMode();
    AdMobSimpleService.setTestMode(newTestMode);
    toast({
      title: `Mode ${newTestMode ? 'TEST' : 'PROD'} activé`,
      description: `AdMob configuré en mode ${newTestMode ? 'test' : 'production'}`
    });
    runDiagnostics();
  };

  const resetMetrics = () => {
    AdMonitoringService.resetMetrics();
    AdMobSimpleService.resetErrorTracking();
    toast({
      title: "Métriques réinitialisées",
      description: "Toutes les statistiques ont été remises à zéro"
    });
    runDiagnostics();
  };

  const clearAlerts = () => {
    AdMonitoringService.clearAlerts();
    toast({
      title: "Alertes supprimées",
      description: "Toutes les alertes ont été effacées"
    });
    runDiagnostics();
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusBadge = (status: boolean, trueText = "OK", falseText = "KO") => (
    <Badge variant={status ? "default" : "destructive"}>
      {status ? trueText : falseText}
    </Badge>
  );

  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des diagnostics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔧 Diagnostics AdMob Avancés</span>
          <div className="flex gap-2">
            <Button
              onClick={runDiagnostics}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              🔄 Actualiser
            </Button>
            <Button
              onClick={toggleTestMode}
              size="sm"
              variant={diagnostics?.state.isTestMode ? "default" : "secondary"}
            >
              {diagnostics?.state.isTestMode ? "🧪 TEST" : "🚀 PROD"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {diagnostics && (
          <>
            {/* Status général */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Initialisé</div>
                {getStatusBadge(diagnostics.state.isInitialized)}
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Pub chargée</div>
                {getStatusBadge(diagnostics.state.isAdLoaded)}
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Mode</div>
                <Badge variant={diagnostics.state.isTestMode ? "secondary" : "default"}>
                  {diagnostics.state.isTestMode ? "TEST" : "PROD"}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Plateforme</div>
                <Badge variant="outline">{diagnostics.platform}</Badge>
              </div>
            </div>

            <Separator />

            {/* Métriques de performance */}
            {diagnostics.monitoring && (
              <div>
                <h3 className="text-lg font-semibold mb-3">📊 Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercentage(diagnostics.monitoring.metrics.successRate)}
                    </div>
                    <div className="text-sm text-muted-foreground">Taux de succès</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {diagnostics.monitoring.metrics.totalAttempts}
                    </div>
                    <div className="text-sm text-muted-foreground">Tentatives</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {diagnostics.monitoring.metrics.successfulAds}
                    </div>
                    <div className="text-sm text-muted-foreground">Succès</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {diagnostics.monitoring.metrics.failedAds}
                    </div>
                    <div className="text-sm text-muted-foreground">Échecs</div>
                  </div>
                </div>
              </div>
            )}

            {/* Alertes actives */}
            {diagnostics.monitoring?.activeAlerts?.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">🚨 Alertes Actives</h3>
                    <Button onClick={clearAlerts} size="sm" variant="outline">
                      Effacer
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {diagnostics.monitoring.activeAlerts.map((alert: any, index: number) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border ${
                          alert.severity === 'critical' 
                            ? 'border-red-200 bg-red-50' 
                            : 'border-yellow-200 bg-yellow-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{alert.message}</span>
                          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {alert.severity === 'critical' ? 'CRITIQUE' : 'ATTENTION'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Erreurs */}
            {diagnostics.state.lastError && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">❌ Dernière Erreur</h3>
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <div className="font-medium text-red-800">
                      {diagnostics.state.lastErrorCode}
                    </div>
                    <div className="text-sm text-red-600 mt-1">
                      {diagnostics.state.lastError}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <Separator />
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={testAdFlow}
                disabled={isTestingAd}
                variant="outline"
              >
                {isTestingAd ? "Test en cours..." : "🎬 Tester une pub"}
              </Button>
              <Button
                onClick={resetMetrics}
                variant="outline"
              >
                🔄 Reset métriques
              </Button>
              <Button
                onClick={() => AdMobSimpleService.forceRefresh()}
                variant="outline"
              >
                🔄 Forcer refresh
              </Button>
            </div>

            {/* Détails techniques */}
            <details className="text-xs">
              <summary className="cursor-pointer font-medium mb-2">
                🔍 Détails techniques
              </summary>
              <pre className="whitespace-pre-wrap overflow-x-auto bg-gray-100 p-3 rounded text-xs">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}