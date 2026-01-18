import { Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export const AnimationSettings = () => {
  const { reducedMotion, setReducedMotion } = useReducedMotion();

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        Animations
      </Label>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Réduire les animations</p>
          <p className="text-xs text-muted-foreground">
            Désactive les effets visuels pour améliorer les performances
          </p>
        </div>
        <Switch
          checked={reducedMotion}
          onCheckedChange={setReducedMotion}
          aria-label="Réduire les animations"
        />
      </div>
    </div>
  );
};
