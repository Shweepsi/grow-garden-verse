import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone } from 'lucide-react';
import React from 'react';

// Définition des résolutions Android courantes à simuler
const resolutions = [
  { label: '480 × 800 (MDPI)', width: 480, height: 800 },
  { label: '720 × 1280 (HDPI)', width: 720, height: 1280 },
  { label: '1080 × 1920 (XHDPI)', width: 1080, height: 1920 },
  { label: '1440 × 2560 (XXHDPI)', width: 1440, height: 2560 },
];

type Resolution = (typeof resolutions)[number] | null;

/**
 * ResolutionSimulator
 *
 * Composant de debug qui permet de simuler différentes résolutions Android
 * en appliquant un scale CSS au conteneur racine de l'application.
 * Visible uniquement en environnement de développement.
 */
export function ResolutionSimulator() {
  // Ne rien rendre en production
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const [activeResolution, setActiveResolution] = React.useState<Resolution>(null);

  // Applique ou retire la simulation de résolution
  const applyResolution = React.useCallback((res: Resolution) => {
    const root = document.getElementById('root');
    if (!root) return;

    if (!res) {
      // Réinitialisation
      root.style.transform = '';
      root.style.transformOrigin = '';
      root.style.width = '';
      root.style.height = '';
      localStorage.removeItem('debugResolution');
      setActiveResolution(null);
      return;
    }

    const scale = Math.min(window.innerWidth / res.width, window.innerHeight / res.height);

    root.style.transform = `scale(${scale})`;
    root.style.transformOrigin = 'top left';
    root.style.width = `${res.width}px`;
    root.style.height = `${res.height}px`;

    localStorage.setItem('debugResolution', JSON.stringify(res));
    setActiveResolution(res);
  }, []);

  // Charger la résolution enregistrée le cas échéant
  React.useEffect(() => {
    const saved = localStorage.getItem('debugResolution');
    if (saved) {
      try {
        const parsed: Resolution = JSON.parse(saved);
        applyResolution(parsed);
      } catch (_) {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      applyResolution(null);
      return;
    }
    const [w, h] = value.split('x').map(Number);
    const res = resolutions.find(r => r.width === w && r.height === h) ?? null;
    applyResolution(res);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center space-y-0 pb-4">
        <div className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Simulation de Résolution</CardTitle>
            <CardDescription>
              Testez la compatibilité avec différentes résolutions Android
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <select
          value={activeResolution ? `${activeResolution.width}x${activeResolution.height}` : ''}
          onChange={handleChange}
          className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Désactivé</option>
          {resolutions.map((r) => (
            <option key={r.label} value={`${r.width}x${r.height}`}>
              {r.label}
            </option>
          ))}
        </select>
        {activeResolution && (
          <p className="text-sm text-muted-foreground">
            Simulation active&nbsp;: {activeResolution.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}