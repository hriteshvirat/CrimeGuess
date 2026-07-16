// High-quality subtle audio manager for the React components of CrimeGuess
class AudioManager {
  public initialize() {
    // No-op - gameplay audio assets are preloaded and managed dynamically by Phaser
  }

  public play(name: string, volume?: number) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('PHASER_PLAY_SOUND', { detail: { name, volume } }));
    }
  }
}

export const audioHelper = new AudioManager();
