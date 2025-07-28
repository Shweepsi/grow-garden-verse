import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { useActiveBoosts } from '@/hooks/useActiveBoosts';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';

export function BoostStatusIndicator() {
  const { boosts, formatTimeRemaining, getTimeRemaining } = useActiveBoosts();
  const { multipliers } = useGameMultipliers();

  const getBoostIcon = (effectType: string) => {
    switch (effectType) {
      case 'coin_boost': return '🪙';
      case 'gem_boost': return '💎';
      case 'growth_speed':
      case 'growth_boost':
        return '🌱';
      default: return '⚡';
    }
  };

  const getBoostLabel = (effectType: string, effectValue: number) => {
    switch (effectType) {
      case 'coin_boost': 
        return `Pièces ×${effectValue}`;
      case 'gem_boost': 
        return `Gemmes ×${effectValue}`;
      case 'growth_speed':
      case 'growth_boost':
        // Afficher la réduction de temps en pourcentage (plus intuitif)
        const reductionPercent = Math.round((1 - (1 / effectValue)) * 100);
        return `Croissance -${reductionPercent}% (×${effectValue})`;
      default: 
        return `Boost ×${effectValue}`;
    }
  };

  const getBoostDescription = (effectType: string, effectValue: number) => {
    switch (effectType) {
      case 'coin_boost': 
        return `Les récoltes rapportent ${effectValue} fois plus de pièces`;
      case 'gem_boost': 
        return `Les récoltes rapportent ${effectValue} fois plus de gemmes`;
      case 'growth_speed':
      case 'growth_boost':
        const reductionPercent = Math.round((1 - (1 / effectValue)) * 100);
        return `Les plantes poussent ${reductionPercent}% plus vite`;
      default: 
        return `Effet multiplicateur actif`;
    }
  };

  const getBoostColor = (effectType: string) => {
    switch (effectType) {
      case 'coin_boost': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'gem_boost': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'growth_speed':
      case 'growth_boost':
        return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const getProgressColor = (effectType: string) => {
    switch (effectType) {
      case 'coin_boost': return 'bg-gradient-to-r from-yellow-400 to-amber-500';
      case 'gem_boost': return 'bg-gradient-to-r from-purple-400 to-pink-500';
      case 'growth_speed':
      case 'growth_boost':
        return 'bg-gradient-to-r from-green-400 to-emerald-500';
      default: return 'bg-gradient-to-r from-blue-400 to-indigo-500';
    }
  };

  if (boosts.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/50 dark:to-slate-900/50 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6 text-center">
          <div className="text-2xl mb-2">😴</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Aucun boost actif
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Regardez une publicité pour activer des boosts temporaires
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-orange-600" />
          Boosts Actifs
          <Badge variant="secondary" className="ml-2">
            {boosts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Résumé des multiplicateurs actuels */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-orange-200/50">
          <div className="text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">Pièces</div>
            <div className="font-bold text-yellow-700 dark:text-yellow-400 flex items-center justify-center gap-1">
              {multipliers.coin > 1 ? (
                <>
                  <TrendingUp className="w-3 h-3" />
                  ×{multipliers.coin.toFixed(1)}
                </>
              ) : (
                <span className="text-gray-500">×1.0</span>
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">Gemmes</div>
            <div className="font-bold text-purple-700 dark:text-purple-400 flex items-center justify-center gap-1">
              {multipliers.gem > 1 ? (
                <>
                  <TrendingUp className="w-3 h-3" />
                  ×{multipliers.gem.toFixed(1)}
                </>
              ) : (
                <span className="text-gray-500">×1.0</span>
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">Croissance</div>
            <div className="font-bold text-green-700 dark:text-green-400 flex items-center justify-center gap-1">
              {multipliers.growth > 1 ? (
                <>
                  <TrendingUp className="w-3 h-3" />
                  ×{multipliers.growth.toFixed(1)}
                </>
              ) : (
                <span className="text-gray-500">×1.0</span>
              )}
            </div>
          </div>
        </div>

        {/* Liste détaillée des boosts */}
        <div className="space-y-3">
          {boosts.map((boost) => {
            const timeRemaining = getTimeRemaining(boost.expires_at);
            const maxDuration = boost.duration_minutes ? boost.duration_minutes * 60 : 3600; // Fallback: 1 heure
            const progressPercentage = Math.max(0, (timeRemaining / maxDuration) * 100);
            
            return (
              <div key={boost.id} className={`p-3 rounded-lg border ${getBoostColor(boost.effect_type)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getBoostIcon(boost.effect_type)}</span>
                    <div>
                      <div className="font-semibold text-sm">
                        {getBoostLabel(boost.effect_type, boost.effect_value)}
                      </div>
                      <div className="text-xs opacity-80">
                        {getBoostDescription(boost.effect_type, boost.effect_value)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3" />
                      <span className="font-medium">
                        {formatTimeRemaining(timeRemaining)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Barre de progression du temps restant */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs opacity-70">
                    <span>Temps restant</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${getProgressColor(boost.effect_type)}`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note explicative */}
        <div className="text-xs text-orange-700 dark:text-orange-300 bg-orange-100/50 dark:bg-orange-900/30 p-2 rounded-lg border border-orange-200/50 text-center">
          💡 Les boosts sont appliqués automatiquement pendant leur durée active
        </div>
      </CardContent>
    </Card>
  );
}