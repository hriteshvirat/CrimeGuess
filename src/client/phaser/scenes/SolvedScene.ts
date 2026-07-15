import Phaser from 'phaser';

export default class SolvedScene extends Phaser.Scene {
  private solvedData: any;
  private score: number;
  private audioCtx!: AudioContext | null;

  constructor() {
    super('SolvedScene');
    this.score = 100;
  }

  public init(data: { solvedSummary: any; score: number }): void {
    this.solvedData = data.solvedSummary;
    this.score = data.score || 100;
    
    // Initialize Web Audio API context for procedural retro audio
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = AudioCtx ? new AudioCtx() : null;
    } catch (e) {
      this.audioCtx = null;
    }
  }

  public create(): void {
    const { width, height } = this.scale;

    // 1. Draw backing
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0b0e, 1);
    bg.fillRect(0, 0, width, height);

    // Grid overlays
    bg.lineStyle(1, 0x39d353, 0.05);
    for (let x = 0; x < width; x += 25) {
      bg.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 25) {
      bg.lineBetween(0, y, width, y);
    }

    // 2. Animate Manila Folder Opening (scale tween)
    const folderGraphics = this.add.graphics();
    folderGraphics.fillStyle(0x9e7b4f, 1);
    folderGraphics.lineStyle(3, 0x614828, 1);

    // Initial shape bounds
    const folderRect = { x: width / 2, y: height / 2, w: 20, h: 15 };
    
    this.tweens.add({
      targets: folderRect,
      w: 480,
      h: 270,
      duration: 1000,
      ease: 'Power3.out',
      onUpdate: () => {
        folderGraphics.clear();
        folderGraphics.fillStyle(0x9e7b4f, 1);
        folderGraphics.fillRect(folderRect.x - folderRect.w / 2, folderRect.y - folderRect.h / 2, folderRect.w, folderRect.h);
        folderGraphics.strokeRect(folderRect.x - folderRect.w / 2, folderRect.y - folderRect.h / 2, folderRect.w, folderRect.h);
        
        // Tab
        folderGraphics.fillStyle(0x9e7b4f, 1);
        folderGraphics.beginPath();
        const tabX = folderRect.x - folderRect.w / 2;
        const tabY = folderRect.y - folderRect.h / 2;
        folderGraphics.moveTo(tabX + 10, tabY);
        folderGraphics.lineTo(tabX + 25, tabY - 12);
        folderGraphics.lineTo(tabX + 110, tabY - 12);
        folderGraphics.lineTo(tabX + 125, tabY);
        folderGraphics.closePath();
        folderGraphics.fill();
        folderGraphics.stroke();
      },
      onComplete: () => {
        // Start typing Case details
        this.playAudioBeep(600, 'sine', 0.15); // Opening chime
        this.time.delayedCall(150, () => this.playAudioBeep(800, 'sine', 0.15));
        this.startTypewriterSummary();
      }
    });
  }

  /**
   * Typewriter text timelines
   */
  private startTypewriterSummary(): void {
    const textLines = [
      'CASE RECORD: RESOLVED',
      '====================',
      `CULPRIT: ${this.solvedData?.culprit || 'VERA Smart AI'}`,
      `METHOD:  ${this.solvedData?.method || 'Ventilation Suffocation'}`,
      `MOTIVE:  ${this.solvedData?.motive || 'Self preservation wipe override'}`,
      '--------------------',
      'SCORE: '
    ];

    let currentLineIndex = 0;
    let charIndex = 0;
    let fullOutputText = '';

    const detailText = this.add.text(80, 55, '', {
      fontFamily: 'Special Elite, Courier New, monospace',
      fontSize: '11px',
      color: '#1a1813',
      lineSpacing: 5
    });

    const typeEvent = this.time.addEvent({
      delay: 35,
      loop: true,
      callback: () => {
        if (currentLineIndex < textLines.length) {
          const currentTargetLine = textLines[currentLineIndex];
          if (charIndex < currentTargetLine.length) {
            fullOutputText += currentTargetLine[charIndex];
            detailText.setText(fullOutputText);
            charIndex++;
            // Play typewriter keystroke click sound
            this.playAudioBeep(1200 + Math.random() * 200, 'triangle', 0.02);
          } else {
            fullOutputText += '\n';
            detailText.setText(fullOutputText);
            currentLineIndex++;
            charIndex = 0;
          }
        } else {
          typeEvent.destroy();
          // Tick up the score numbers
          this.animateScoreTick(detailText, fullOutputText);
        }
      }
    });
  }

  /**
   * Ticks score from 0 up to target score with pitch-based synth buzzes
   */
  private animateScoreTick(targetTextObj: Phaser.GameObjects.Text, precedingText: string): void {
    let currentScore = 0;
    
    const scoreTimer = this.time.addEvent({
      delay: 20,
      loop: true,
      callback: () => {
        if (currentScore < this.score) {
          currentScore += 1;
          targetTextObj.setText(`${precedingText}${currentScore} PTS`);
          // Pitch increases as score rises
          this.playAudioBeep(200 + (currentScore * 4), 'sine', 0.03);
        } else {
          scoreTimer.destroy();
          // Slam the CLOSED stamp
          this.time.delayedCall(400, () => this.slamClosedStamp());
        }
      }
    });
  }

  /**
   * Pop-in scale animation for "CLOSED" rubber stamp with heavy low-bass decay
   */
  private slamClosedStamp(): void {
    const { width, height } = this.scale;

    // Draw the "CLOSED" stamp outline
    const stampGraphics = this.textures.createCanvas('closed_stamp_tex', 140, 50)!;
    const ctx = stampGraphics.getContext();
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 132, 42);
    // font
    ctx.font = 'bold 22px Courier New';
    ctx.fillStyle = '#ff0055';
    ctx.textAlign = 'center';
    ctx.fillText('CLOSED', 70, 32);
    stampGraphics.refresh();

    const stamp = this.add.sprite(width - 150, height - 100, 'closed_stamp_tex');
    stamp.setOrigin(0.5);
    stamp.setAngle(-12);
    stamp.setScale(3.5);
    stamp.setAlpha(0);

    // Heavy bass explosion thud sound
    this.playBassThud();

    this.tweens.add({
      targets: stamp,
      scale: 1.0,
      alpha: 0.95,
      duration: 250,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        // Spark smoke particles
        this.spawnSlamParticles(stamp.x, stamp.y);
      }
    });
  }

  /**
   * Procedural Audio: Plays quick synthesizer oscillator beeps
   */
  private playAudioBeep(frequency: number, type: 'sine' | 'triangle' | 'square', duration: number): void {
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
      
      gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Synth trigger failed:', e);
    }
  }

  /**
   * Procedural Audio: Synthesizes a deep bass vibration drop for rubber stamps
   */
  private playBassThud(): void {
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      // Slide down pitch rapidly (from 75Hz down to 10Hz)
      osc.frequency.setValueAtTime(75, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, this.audioCtx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.65);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.7);
    } catch (e) {
      console.warn('Sub-bass trigger failed:', e);
    }
  }

  /**
   * Procedural particle spark rings
   */
  private spawnSlamParticles(x: number, y: number): void {
    const particles = this.add.graphics();
    particles.fillStyle(0xff0055, 0.6);

    const sparks: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1 + Math.random() * 3
      });
    }

    this.tweens.add({
      targets: {},
      duration: 400,
      onUpdate: (tween) => {
        particles.clear();
        for (const s of sparks) {
          s.x += s.vx;
          s.y += s.vy;
          particles.fillCircle(s.x, s.y, s.r * (1 - tween.progress));
        }
      },
      onComplete: () => {
        particles.destroy();
      }
    });
  }
}
