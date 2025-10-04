import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Music, Play } from 'lucide-react';
import { useAudio, SoundType } from '@/contexts/AudioContext';

export const SoundSettings = () => {
  const {
    soundEnabled,
    setSoundEnabled,
    soundVolume,
    setSoundVolume,
    musicEnabled,
    setMusicEnabled,
    musicVolume,
    setMusicVolume,
    playSound,
  } = useAudio();

  const testSounds: { type: SoundType; label: string }[] = [
    { type: 'harvest', label: 'Récolte' },
    { type: 'coin', label: 'Pièces' },
    { type: 'purchase', label: 'Achat' },
    { type: 'achievement', label: 'Succès' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Paramètres audio
        </CardTitle>
        <CardDescription>
          Gérez les effets sonores et la musique de fond
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Effets sonores */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-enabled" className="text-base">
                Effets sonores
              </Label>
              <p className="text-sm text-muted-foreground">
                Activer les sons de jeu
              </p>
            </div>
            <Switch
              id="sound-enabled"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>

          {soundEnabled && (
            <div className="space-y-2 pl-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="sound-volume" className="min-w-20">
                  Volume: {soundVolume}%
                </Label>
                {soundVolume > 0 ? (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <Slider
                id="sound-volume"
                min={0}
                max={100}
                step={5}
                value={[soundVolume]}
                onValueChange={(value) => setSoundVolume(value[0])}
                className="w-full"
              />

              {/* Boutons de test */}
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-2">
                  Tester les sons :
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {testSounds.map(({ type, label }) => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      onClick={() => playSound(type)}
                      className="gap-2"
                    >
                      <Play className="h-3 w-3" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Musique de fond */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="music-enabled" className="text-base flex items-center gap-2">
                <Music className="h-4 w-4" />
                Musique de fond
              </Label>
              <p className="text-sm text-muted-foreground">
                Activer la musique ambiante
              </p>
            </div>
            <Switch
              id="music-enabled"
              checked={musicEnabled}
              onCheckedChange={setMusicEnabled}
            />
          </div>

          {musicEnabled && (
            <div className="space-y-2 pl-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="music-volume" className="min-w-20">
                  Volume: {musicVolume}%
                </Label>
                {musicVolume > 0 ? (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <Slider
                id="music-volume"
                min={0}
                max={100}
                step={5}
                value={[musicVolume]}
                onValueChange={(value) => setMusicVolume(value[0])}
                className="w-full"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
