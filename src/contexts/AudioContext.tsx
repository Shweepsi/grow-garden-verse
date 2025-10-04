import React, { createContext, useContext, useState, useEffect } from 'react';

interface AudioContextType {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  soundVolume: number;
  setSoundVolume: (volume: number) => void;
  musicEnabled: boolean;
  setMusicEnabled: (enabled: boolean) => void;
  musicVolume: number;
  setMusicVolume: (volume: number) => void;
  playSound: (soundType: SoundType) => void;
}

export type SoundType = 
  | 'plant'
  | 'harvest'
  | 'coin'
  | 'gems'
  | 'purchase'
  | 'upgrade'
  | 'achievement'
  | 'error'
  | 'robot';

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [soundVolume, setSoundVolume] = useState(() => {
    const saved = localStorage.getItem('soundVolume');
    return saved !== null ? JSON.parse(saved) : 70;
  });

  const [musicEnabled, setMusicEnabled] = useState(() => {
    const saved = localStorage.getItem('musicEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('musicVolume');
    return saved !== null ? JSON.parse(saved) : 30;
  });

  const [audioElements] = useState<Map<SoundType, HTMLAudioElement>>(new Map());
  const [backgroundMusic, setBackgroundMusic] = useState<HTMLAudioElement | null>(null);

  // Charger les sons
  useEffect(() => {
    const sounds: Record<SoundType, string> = {
      plant: '/sounds/plant.mp3',
      harvest: '/sounds/harvest.mp3',
      coin: '/sounds/coin.mp3',
      gems: '/sounds/gems.mp3',
      purchase: '/sounds/purchase.mp3',
      upgrade: '/sounds/upgrade.mp3',
      achievement: '/sounds/achievement.mp3',
      error: '/sounds/error.mp3',
      robot: '/sounds/robot.mp3',
    };

    Object.entries(sounds).forEach(([type, src]) => {
      const audio = new Audio(src);
      audio.volume = soundVolume / 100;
      audio.preload = 'auto';
      audioElements.set(type as SoundType, audio);
    });

    return () => {
      audioElements.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  // Charger la musique de fond
  useEffect(() => {
    const music = new Audio('/music/background-ambient.mp3');
    music.loop = true;
    music.volume = musicVolume / 100;
    music.preload = 'auto';
    setBackgroundMusic(music);

    return () => {
      music.pause();
      music.src = '';
    };
  }, []);

  // Gérer le volume des sons
  useEffect(() => {
    audioElements.forEach(audio => {
      audio.volume = soundVolume / 100;
    });
  }, [soundVolume, audioElements]);

  // Gérer le volume de la musique
  useEffect(() => {
    if (backgroundMusic) {
      backgroundMusic.volume = musicVolume / 100;
    }
  }, [musicVolume, backgroundMusic]);

  // Gérer l'activation de la musique
  useEffect(() => {
    if (backgroundMusic) {
      if (musicEnabled) {
        backgroundMusic.play().catch(() => {
          // Autoplay bloqué par le navigateur
          console.log('Musique bloquée par le navigateur');
        });
      } else {
        backgroundMusic.pause();
      }
    }
  }, [musicEnabled, backgroundMusic]);

  // Persister les préférences
  useEffect(() => {
    localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('soundVolume', JSON.stringify(soundVolume));
  }, [soundVolume]);

  useEffect(() => {
    localStorage.setItem('musicEnabled', JSON.stringify(musicEnabled));
  }, [musicEnabled]);

  useEffect(() => {
    localStorage.setItem('musicVolume', JSON.stringify(musicVolume));
  }, [musicVolume]);

  const playSound = (soundType: SoundType) => {
    if (!soundEnabled) return;

    const audio = audioElements.get(soundType);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        console.log(`Son ${soundType} bloqué`);
      });
    }
  };

  return (
    <AudioContext.Provider
      value={{
        soundEnabled,
        setSoundEnabled,
        soundVolume,
        setSoundVolume,
        musicEnabled,
        setMusicEnabled,
        musicVolume,
        setMusicVolume,
        playSound,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
