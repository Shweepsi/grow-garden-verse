import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Smartphone, Wifi } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AdMobSimpleService } from '@/services/ads/AdMobSimpleService';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedRewards } from '@/hooks/useUnifiedRewards';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticInfo {
  platform: {
    name: string;
    isNative: boolean;
    version?: string;
  };
  admob: {
    initialized: boolean;
    adLoaded: boolean;
    adLoading: boolean;
    lastError: string | null;
    lastErrorCode: string | null;
    adUnitId: string;
    testAdUnitId: string;
    isTestMode: boolean;
    retryCount: number;
    maxRetries: number;
    lastRetryAt: number | null;
  };
  rewards: {
    available: boolean;
    dailyCount: number;
    maxDaily: number;
    isPremium: boolean;
  };
  connectivity: {
    online: boolean;
    status: string;
  };
}

export function AdSystemDiagnostics() {
  const { user } = useAuth();
  const { rewardState } = useUnifiedRewards();
  const { isPremium } = usePremiumStatus();
  const { toast } = useToast();
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingAd, setIsTestingAd] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const admobState = AdMobSimpleService.getState();
      const admobDiagnostics = AdMobSimpleService.getDiagnostics();

      const info: DiagnosticInfo = {
        platform: {
          name: Capacitor.getPlatform(),
          isNative: await Capacitor.isNativePlatform(),
          version: '1.0.0'
        },
        admob: {
          initialized: admobState.isInitialized,
          adLoaded: admobState.isAdLoaded,
          adLoading: admobState.isAdLoading,
          lastError: admobState.lastError,
          lastErrorCode: admobState.lastErrorCode,
          adUnitId: admobDiagnostics.adUnitId,
          testAdUnitId: admobDiagnostics.testAdUnitId,
          isTestMode: admobState.isTestMode,
          retryCount: admobState.retryCount,
          maxRetries: admobDiagnostics.retryInfo.maxRetries,
          lastRetryAt: admobState.lastRetryAt
        },
        rewards: {
          available: rewardState?.available || false,
          dailyCount: rewardState?.dailyCount || 0,
          maxDaily: rewardState?.maxDaily || 5,
          isPremium: isPremium
        },
        connectivity: {
          online: navigator.onLine,
          status: navigator.onLine ? 'Connecté' : 'Déconnecté'
        }
      };

      setDiagnostics(info);
    } catch (error) {
      console.error('Erreur diagnostics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testAdFlow = async (useTestMode: boolean = false) => {
    if (!user) {
      toast({
        title: "Authentification requise",
        description: "Connectez-vous pour tester les publicités",
        variant: "destructive"
      });
      return;
    }

    setIsTestingAd(true);
    try {
      toast({
        description: `Test du flux publicitaire en cours... (${useTestMode ? 'MODE TEST' : 'MODE PROD'})`,
      });

      // Configurer le mode test si demandé
      if (useTestMode) {
        AdMobSimpleService.setTestMode(true);
      }

      // Test d'initialisation
      const initialized = await AdMobSimpleService.initialize(useTestMode);
      if (!initialized) {
        throw new Error('Échec initialisation AdMob');
      }

      toast({
        description: `✅ AdMob initialisé (${useTestMode ? 'TEST' : 'PROD'})`,
      });

      // Test de chargement
      const loaded = await AdMobSimpleService.loadAd();
      if (!loaded) {
        const state = AdMobSimpleService.getState();
        throw new Error(`Échec chargement: ${state.lastError} (${state.lastErrorCode})`);
      }

      toast({
        description: "✅ Publicité chargée",
      });

      // Test d'affichage
      const result = await AdMobSimpleService.showAd();
      if (result.success) {
        toast({
          title: "Test réussi",
          description: `Publicité affichée avec succès. Récompensé: ${result.rewarded ? 'Oui' : 'Non'}`,
        });
      } else {
        throw new Error(`${result.error} (${result.errorCode})`);
      }

    } catch (error) {
      console.error('Erreur test publicitaire:', error);
      toast({
        title: "Test échoué",
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: "destructive"
      });
    } finally {
      setIsTestingAd(false);
      // Actualiser les diagnostics après le test
      setTimeout(runDiagnostics, 1000);
    }
  };

  const toggleTestMode = () => {
    const newTestMode = !AdMobSimpleService.isTestMode();
    AdMobSimpleService.setTestMode(newTestMode);
    toast({
      description: `Mode ${newTestMode ? 'test' : 'production'} activé`,
    });
    runDiagnostics();
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean, label: string) => {
    return (
      <Badge variant={status ? "default" : "destructive"} className="text-xs">
        {label}: {status ? 'OK' : 'KO'}
      </Badge>
    );
  };

  if (!diagnostics) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Chargement des diagnostics...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            Diagnostics Système Publicitaire
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runDiagnostics}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statut Plateforme */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Plateforme
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Type:</span>
              <Badge variant="secondary">{diagnostics.platform.name}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Natif:</span>
              {getStatusIcon(diagnostics.platform.isNative)}
            </div>
          </div>
        </div>

        <Separator />

        {/* Statut AdMob */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">État AdMob</h3>
            <Button
              variant={diagnostics.admob.isTestMode ? "default" : "outline"}
              size="sm"
              onClick={toggleTestMode}
              className="text-xs"
            >
              {diagnostics.admob.isTestMode ? 'Mode TEST' : 'Mode PROD'}
            </Button>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {getStatusBadge(diagnostics.admob.initialized, 'Initialisé')}
              {getStatusBadge(diagnostics.admob.adLoaded, 'Pub chargée')}
              {getStatusBadge(!diagnostics.admob.adLoading, 'Prêt')}
              {diagnostics.admob.isTestMode && (
                <Badge variant="secondary" className="text-xs">
                  🧪 TEST
                </Badge>
              )}
            </div>
            
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Ad Unit ID:</strong> {diagnostics.admob.adUnitId}</p>
              {diagnostics.admob.isTestMode && (
                <p><strong>Test Unit ID:</strong> {diagnostics.admob.testAdUnitId}</p>
              )}
              
              {diagnostics.admob.retryCount > 0 && (
                <p className="text-orange-600">
                  <strong>Tentatives:</strong> {diagnostics.admob.retryCount}/{diagnostics.admob.maxRetries}
                </p>
              )}
              
              {diagnostics.admob.lastError && (
                <div className="text-red-600 mt-2 p-2 bg-red-50 rounded border">
                  <p><strong>Erreur:</strong> {diagnostics.admob.lastErrorCode}</p>
                  <p className="mt-1 whitespace-pre-wrap">{diagnostics.admob.lastError}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Statut Récompenses */}
        <div>
          <h3 className="font-semibold mb-3">Récompenses</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Disponibles:</span>
              {getStatusIcon(diagnostics.rewards.available)}
            </div>
            <div className="flex items-center justify-between">
              <span>Premium:</span>
              {getStatusIcon(diagnostics.rewards.isPremium)}
            </div>
            <div className="flex items-center justify-between">
              <span>Quotidien:</span>
              <Badge variant="outline">
                {diagnostics.rewards.dailyCount}/{diagnostics.rewards.maxDaily}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Statut Connectivité */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Connectivité
          </h3>
          <div className="flex items-center justify-between">
            <span>Internet:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.connectivity.online)}
              <span className="text-sm">{diagnostics.connectivity.status}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Test Complet */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={() => testAdFlow(false)}
              disabled={isTestingAd || !user || !diagnostics.platform.isNative}
              variant="outline"
              size="sm"
            >
              {isTestingAd ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                '🏭'
              )}
              Test Prod
            </Button>
            
            <Button 
              onClick={() => testAdFlow(true)}
              disabled={isTestingAd || !user || !diagnostics.platform.isNative}
              variant="default"
              size="sm"
            >
              {isTestingAd ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                '🧪'
              )}
              Test Mode
            </Button>
          </div>
          
          {!diagnostics.platform.isNative && (
            <p className="text-xs text-center text-gray-500">
              Tests disponibles uniquement sur mobile
            </p>
          )}
          
          {!user && (
            <p className="text-xs text-center text-red-500">
              Connexion requise pour tester
            </p>
          )}
          
          {diagnostics.admob.lastErrorCode === 'NO_FILL' && (
            <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
              <p className="font-medium text-blue-800">💡 Conseil pour NO_FILL:</p>
              <p className="text-blue-700 mt-1">
                • Utilisez le mode test pour vérifier l'intégration<br/>
                • Les nouvelles apps ont souvent peu de pubs disponibles<br/>
                • Vérifiez que votre app est approuvée dans AdMob
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}