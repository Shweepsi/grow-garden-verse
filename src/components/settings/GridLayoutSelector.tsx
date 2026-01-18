import { Grid3X3, Grid2X2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useGridLayout, GridLayout } from '@/hooks/useGridLayout';
import { cn } from '@/lib/utils';

export const GridLayoutSelector = () => {
  const { gridLayout, setGridLayout } = useGridLayout();

  const layouts: { value: GridLayout; label: string; icon: typeof Grid3X3 }[] = [
    { value: '3x3', label: '3×3', icon: Grid3X3 },
    { value: '4x4', label: '4×4', icon: Grid2X2 },
  ];

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Disposition de la grille</Label>
      <p className="text-sm text-muted-foreground">
        Choisissez le nombre de colonnes pour les parcelles
      </p>
      <div className="flex gap-3">
        {layouts.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setGridLayout(value)}
            className={cn(
              "flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
              gridLayout === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <Icon className="w-6 h-6" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
