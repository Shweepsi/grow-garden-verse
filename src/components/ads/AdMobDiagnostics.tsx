import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { AdMobService } from '@/services/AdMobService';

export function AdMobDiagnostics() {
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const info = await AdMobService.getDiagnosticInfo();
      setDiagnosticInfo(info);
    } catch (error) {
      console.error('Diagnostic failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Diagnostic AdMob
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
      <CardContent className="space-y-4">
        {diagnosticInfo ? (
          <>
            <div className="space-y-2">
              <h4 className="font-semibold">Plateforme</h4>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(diagnosticInfo.platform.isNative)}>
                  {getStatusIcon(diagnosticInfo.platform.isNative)}
                  {diagnosticInfo.platform.isNative ? 'Native' : 'Web'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {diagnosticInfo.platform.platformName}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">AdMob</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(diagnosticInfo.admob.isInitialized)}>
                    {getStatusIcon(diagnosticInfo.admob.isInitialized)}
                    Initialisé
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(diagnosticInfo.admob.isAdLoaded)}>
                    {getStatusIcon(diagnosticInfo.admob.isAdLoaded)}
                    Pub chargée
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(diagnosticInfo.admob.connectivity)}>
                    {getStatusIcon(diagnosticInfo.admob.connectivity)}
                    Connectivité
                  </Badge>
                </div>
              </div>
            </div>

            {diagnosticInfo.admob.lastError && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">Dernière erreur</h4>
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {diagnosticInfo.admob.lastError.message}
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Dernière mise à jour: {new Date(diagnosticInfo.timestamp).toLocaleTimeString()}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Cliquez sur le bouton pour lancer le diagnostic
          </p>
        )}
      </CardContent>
    </Card>
  );
}