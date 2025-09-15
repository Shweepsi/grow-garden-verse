import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

/**
 * Simple info component explaining the new gem system
 */
export const GemSystemInfo = () => {
  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-purple-700">
          <div className="text-xl">💎</div>
          Système de Gemmes Simplifié
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-purple-600">
            <p className="font-medium mb-1">Nouvelle mécanique :</p>
            <p>Chaque récolte a <span className="font-bold">15% de chance</span> de vous donner <span className="font-bold">1 gemme</span>.</p>
            <p className="text-xs text-purple-500 mt-2">
              Plus de multiplicateurs complexes - juste une chance fixe et équitable !
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};