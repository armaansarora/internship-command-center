"use client";

import type { JSX } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { soundEngine, type SoundId } from "@/lib/sound/engine";

const SESSION_KEY = "tower-sound-enabled";

interface SoundContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  playSound: (id: SoundId) => void;
  playAmbient: (floor: string) => void;
}

const SoundContext = createContext<SoundContextValue>({
  enabled: false,
  setEnabled: () => undefined,
  volume: 0.3,
  setVolume: () => undefined,
  playSound: () => undefined,
  playAmbient: () => undefined,
});

interface SoundProviderProps {
  children: React.ReactNode;
}

/**
 * SoundProvider — wraps the application to expose sound controls.
 * Reads/writes enabled state from sessionStorage (never localStorage).
 * Sound is ALWAYS disabled on first load unless previously enabled this session.
 */
export function SoundProvider({ children }: SoundProviderProps): JSX.Element {
  const [enabled, setEnabledState] = useState(false);
  const [volume, setVolumeState] = useState(0.3);

  // Restore session state on mount (client-side only)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved === "true") {
        soundEngine.enable();
        setEnabledState(true);
      }
    } catch {
      // sessionStorage may be blocked — stay muted
    }
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    if (v) {
      soundEngine.enable();
    } else {
      soundEngine.disable();
    }
    try {
      sessionStorage.setItem(SESSION_KEY, String(v));
    } catch {
      // sessionStorage blocked — non-fatal
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    soundEngine.setVolume(v);
  }, []);

  const playSound = useCallback((id: SoundId) => {
    soundEngine.play(id);
  }, []);

  const playAmbient = useCallback((floor: string) => {
    soundEngine.playAmbient(floor);
  }, []);

  return (
    <SoundContext.Provider
      value={{ enabled, setEnabled, volume, setVolume, playSound, playAmbient }}
    >
      {children}
    </SoundContext.Provider>
  );
}

/**
 * Hook to access the sound engine context.
 * Must be used inside <SoundProvider>.
 */
export function useSoundEngine(): SoundContextValue {
  return useContext(SoundContext);
}
