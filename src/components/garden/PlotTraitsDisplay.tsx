import { memo } from 'react';
import { PlotTraits, PlotIndividualizationService } from '@/services/PlotIndividualizationService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PlotTraitsDisplayProps {
  traits: PlotTraits | null;
  className?: string;
}

export const PlotTraitsDisplay = memo(({ traits, className = '' }: PlotTraitsDisplayProps) => {
  if (!traits) return null;

  const descriptions = PlotIndividualizationService.getTraitDescription(traits);
  const qualityEmoji = PlotIndividualizationService.getQualityEmoji(traits);

  if (descriptions.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`absolute top-1 left-1 text-xs cursor-help ${className}`}>
            {qualityEmoji}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-sm mb-2">Traits de la parcelle</p>
            {descriptions.map((desc, index) => (
              <p key={index} className="text-xs">{desc}</p>
            ))}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                Multiplicateurs totaux:
              </p>
              <p className="text-xs">
                🌱 Croissance: x{traits.growthMultiplier.toFixed(2)}
              </p>
              <p className="text-xs">
                💰 Rendement: x{traits.yieldMultiplier.toFixed(2)}
              </p>
              <p className="text-xs">
                ⭐ Expérience: x{traits.expMultiplier.toFixed(2)}
              </p>
              {traits.gemChanceBonus > 0 && (
                <p className="text-xs">
                  💎 Gemmes: +{(traits.gemChanceBonus * 100).toFixed(0)}%
                </p>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

PlotTraitsDisplay.displayName = 'PlotTraitsDisplay';