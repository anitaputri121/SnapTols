// Cyber ambient audio synthesizer using Web Audio API
class CyberAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private oscillatorNode: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private intervalId: any = null;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  toggle(): boolean {
    this.init();
    if (!this.ctx) return false;

    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  start() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.04, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);

      // Play pleasant synth chords progression (A minor, F, C, G)
      const freqs = [220, 261.63, 329.63, 392, 440, 523.25];
      let step = 0;

      this.intervalId = setInterval(() => {
        if (!this.ctx || !this.gainNode || !this.isPlaying) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[step % freqs.length], this.ctx.currentTime);

        noteGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        noteGain.gain.exponentialRampToValueAtTime(0.03, this.ctx.currentTime + 0.3);
        noteGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

        osc.connect(noteGain);
        noteGain.connect(this.gainNode);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 2.0);

        step++;
      }, 700);

      this.isPlaying = true;
    } catch (e) {
      console.warn('Audio start failed', e);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.gainNode && this.ctx) {
      try {
        this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch (e) {}
    }
    this.isPlaying = false;
  }

  status(): boolean {
    return this.isPlaying;
  }
}

export const cyberAudio = new CyberAudioEngine();
