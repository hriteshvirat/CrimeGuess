import Phaser from 'phaser';
import AssetHelper from '../assets/AssetHelper';

export default class LauncherScene extends Phaser.Scene {
  private rainGraphics!: Phaser.GameObjects.Graphics;
  private rainDrops: { x: number; y: number; speed: number; len: number }[] = [];
  
  // Animation states
  private lampOn: boolean = false;
  private lampIntensity: number = 0;
  private crtBooted: boolean = false;
  private introStep: number = 0; // 0: black, 1: door open, 2: rain/lamp fade, 3: crt boot, 4: typewriter, 5: completed
  
  // Visual elements
  private blackOverlay!: Phaser.GameObjects.Graphics;
  private doorLight!: Phaser.GameObjects.Graphics;
  private deskLampLight!: Phaser.GameObjects.Graphics;
  private crtMonitor!: Phaser.GameObjects.Graphics;
  private crtText!: Phaser.GameObjects.Text;
  private beginButton!: Phaser.GameObjects.Container;
  private soundText!: Phaser.GameObjects.Text;

  private skipIntro: boolean = false;

  constructor() {
    super('LauncherScene');
  }

  public init(data?: { skipIntro?: boolean }): void {
    if (data && data.skipIntro) {
      this.skipIntro = true;
    }
  }

  public preload(): void {
    AssetHelper.createAllTextures(this);
  }

  public create(): void {
    const { width, height } = this.scale;

    // 1. Draw office background (dark)
    const floor = this.add.graphics();
    floor.fillStyle(0x0c0d10, 1);
    floor.fillRect(0, 0, width, height);

    // Window frame
    const winFrame = this.add.graphics();
    winFrame.fillStyle(0x030405, 1);
    winFrame.fillRect(40, 40, 100, 110);
    winFrame.lineStyle(2, 0x00a8b5, 0.4);
    winFrame.strokeRect(40, 40, 100, 110);
    winFrame.lineBetween(90, 40, 90, 150);
    winFrame.lineBetween(40, 95, 140, 95);

    // Initial rain drops
    this.rainGraphics = this.add.graphics();
    for (let i = 0; i < 25; i++) {
      this.rainDrops.push({
        x: 42 + Math.random() * 96,
        y: 42 + Math.random() * 106,
        speed: 1.5 + Math.random() * 2,
        len: 4 + Math.random() * 6
      });
    }

    // Corkboard
    this.add.image(380, 100, 'corkboard_bg').setOrigin(0.5).setTint(0x444444);

    // Desk
    this.add.image(width / 2, 290, 'office_desk').setOrigin(0.5).setTint(0x444444);
    this.add.sprite(width / 2 - 40, 270, 'desk_notebook').setOrigin(0.5).setTint(0x444444);
    this.add.sprite(width / 2 + 40, 270, 'case_folder').setOrigin(0.5).setTint(0x444444);

    // 2. Light effect graphic elements
    this.deskLampLight = this.add.graphics();
    this.deskLampLight.setBlendMode(Phaser.BlendModes.ADD);

    // 3. CRT Monitor graphics
    this.crtMonitor = this.add.graphics();

    // CRT Screen Text
    this.crtText = this.add.text(width / 2 - 95, 235, '', {
      fontFamily: 'Share Tech Mono',
      fontSize: '11px',
      color: '#00ff66',
      lineSpacing: 4
    });

    // Sound text HUD (Bottom Right)
    this.soundText = this.add.text(width - 20, height - 20, '', {
      fontFamily: 'Share Tech Mono',
      fontSize: '10px',
      color: '#ffa800'
    }).setOrigin(1, 1);

    // Ambient floating particles
    const particles = this.add.graphics();
    particles.fillStyle(0xffffff, 0.15);
    for (let i = 0; i < 15; i++) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const pr = 1 + Math.random() * 1.5;
      particles.fillCircle(px, py, pr);
    }

    // 4. Black overlay & Door Light for intro sequence
    this.blackOverlay = this.add.graphics();
    this.blackOverlay.fillStyle(0x000000, 1);
    this.blackOverlay.fillRect(0, 0, width, height);

    this.doorLight = this.add.graphics();
    this.doorLight.fillStyle(0xffffff, 0.15);

    if (this.skipIntro) {
      this.introStep = 5;
      this.lampOn = true;
      this.lampIntensity = 1;
      this.crtBooted = true;
      this.crtText.setText("GOOD EVENING, DETECTIVE.\nOne new case has arrived.");
      this.blackOverlay.setAlpha(0.15);
      this.doorLight.setAlpha(0);
      this.cameras.main.resetFX();
    } else {
      // Start cinematic sequence
      this.time.delayedCall(800, () => this.playDoorOpen());
    }
  }

  public update(time: number): void {
    const { width, height } = this.scale;

    // A. Rain Animation
    this.rainGraphics.clear();
    if (this.introStep >= 2) {
      this.rainGraphics.lineStyle(1, 0x00f0ff, 0.35);
      for (const drop of this.rainDrops) {
        drop.y += drop.speed;
        if (drop.y > 146) {
          drop.y = 42;
          drop.x = 42 + Math.random() * 96;
        }
        this.rainGraphics.lineBetween(drop.x, drop.y, drop.x - 0.5, drop.y + drop.len);
      }
    }

    // B. Desk Lamp Glow Animation
    if (this.lampOn) {
      this.deskLampLight.clear();
      // Flicker slightly
      const flicker = 0.85 + Math.sin(time * 0.05) * 0.05 + Math.random() * 0.05;
      const intensity = this.lampIntensity * flicker;

      // Draw light cone
      this.deskLampLight.fillStyle(0xffea88, 0.15 * intensity);
      this.deskLampLight.beginPath();
      this.deskLampLight.moveTo(width / 2, 180); // lamp origin on desk back
      this.deskLampLight.lineTo(width / 2 - 140, height);
      this.deskLampLight.lineTo(width / 2 + 140, height);
      this.deskLampLight.closePath();
      this.deskLampLight.fill();

      // Soft desk center highlights
      this.deskLampLight.fillStyle(0xffea88, 0.08 * intensity);
      this.deskLampLight.fillCircle(width / 2, 280, 100);
      this.deskLampLight.fillCircle(width / 2, 280, 160);
    }

    // C. CRT flicker
    if (this.crtBooted) {
      this.crtMonitor.clear();
      const flicker = 0.9 + Math.random() * 0.1;
      
      // Draw CRT Outer casing on center of desk
      this.crtMonitor.lineStyle(2, 0x333333, 1);
      this.crtMonitor.fillStyle(0x181a1f, 1);
      this.crtMonitor.fillRect(width / 2 - 110, 220, 220, 80);
      this.crtMonitor.strokeRect(width / 2 - 110, 220, 220, 80);

      // CRT screen bezel
      this.crtMonitor.fillStyle(0x08250f, 0.95 * flicker);
      this.crtMonitor.fillRect(width / 2 - 102, 226, 204, 68);
      this.crtMonitor.lineStyle(1.5, 0x00ff66, 0.65 * flicker);
      this.crtMonitor.strokeRect(width / 2 - 102, 226, 204, 68);

      // Scanlines effect
      this.crtMonitor.lineStyle(0.5, 0x000000, 0.2);
      for (let y = 227; y < 294; y += 3) {
        this.crtMonitor.lineBetween(width / 2 - 102, y, width / 2 + 102, y);
      }
    }
  }

  private playDoorOpen(): void {
    this.introStep = 1;
    this.soundText.setText('* DOOR OPENS *');

    // Create a tween that animates the width of the door light
    const lightWidth = { val: 0 };
    this.tweens.add({
      targets: lightWidth,
      val: 60,
      duration: 1500,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        const { width, height } = this.scale;
        this.doorLight.clear();
        this.doorLight.fillStyle(0xffffff, 0.08);
        this.doorLight.fillRect(width / 2 - lightWidth.val, 0, lightWidth.val * 2, height);
      },
      onComplete: () => {
        this.time.delayedCall(400, () => this.playRainAndLamp());
      }
    });

    // Fade out black overlay slightly
    this.tweens.add({
      targets: this.blackOverlay,
      alpha: 0.8,
      duration: 1500
    });
  }

  private playRainAndLamp(): void {
    this.introStep = 2;
    this.soundText.setText('* RAIN AMBIENCE STARTS *');

    // Turn on lamp
    this.lampOn = true;
    this.tweens.add({
      targets: this,
      lampIntensity: 1,
      duration: 1000,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.time.delayedCall(600, () => this.playCRTBoot());
      }
    });

    // Fade out door light and black overlay more
    this.tweens.add({
      targets: [this.doorLight, this.blackOverlay],
      alpha: 0.15,
      duration: 1200
    });
  }

  private playCRTBoot(): void {
    this.introStep = 3;
    this.soundText.setText('* CRT MONITOR BOOTS *');
    this.crtBooted = true;

    // CRT monitor startup flash
    const flash = this.add.graphics();
    flash.fillStyle(0xffffff, 0.8);
    flash.fillRect(this.scale.width / 2 - 102, 226, 204, 68);
    
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        flash.destroy();
        this.time.delayedCall(400, () => this.playTypewriter());
      }
    });
  }

  private playTypewriter(): void {
    this.introStep = 4;
    const fullText = "GOOD EVENING, DETECTIVE.\nOne new case has arrived.";
    let currentIndex = 0;

    this.time.addEvent({
      delay: 70,
      callback: () => {
        currentIndex++;
        this.crtText.setText(fullText.substring(0, currentIndex));
        this.soundText.setText('* TYPEWRITER TICK *');

        if (currentIndex >= fullText.length) {
          this.soundText.setText('');
          this.time.delayedCall(500, () => this.showBeginButton());
        }
      },
      repeat: fullText.length - 1
    });
  }

  private showBeginButton(): void {
    this.introStep = 5;
    const { width } = this.scale;
    const bx = width / 2;
    const by = 276;

    // Container for styling
    this.beginButton = this.add.container(bx, by);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x00ff66, 0.1);
    btnBg.lineStyle(1.5, 0x00ff66, 0.85);
    btnBg.fillRect(-35, -9, 70, 18);
    btnBg.strokeRect(-35, -9, 70, 18);

    const btnText = this.add.text(0, 0, 'BEGIN', {
      fontFamily: 'Share Tech Mono',
      fontSize: '10px',
      color: '#00ff66',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.beginButton.add([btnBg, btnText]);

    // Make interactive
    btnBg.setInteractive(new Phaser.Geom.Rectangle(-35, -9, 70, 18), Phaser.Geom.Rectangle.Contains);

    // Hover logic
    btnBg.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x00ff66, 0.25);
      btnBg.lineStyle(1.5, 0x00ff66, 1);
      btnBg.fillRect(-35, -9, 70, 18);
      btnBg.strokeRect(-35, -9, 70, 18);
      btnText.setColor('#ffffff');
      this.soundText.setText('* BUTTON HOVER *');
    });

    btnBg.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x00ff66, 0.1);
      btnBg.lineStyle(1.5, 0x00ff66, 0.85);
      btnBg.fillRect(-35, -9, 70, 18);
      btnBg.strokeRect(-35, -9, 70, 18);
      btnText.setColor('#00ff66');
      this.soundText.setText('');
    });

    btnBg.on('pointerdown', () => {
      this.handleBeginClick();
    });
  }

  private handleBeginClick(): void {
    // Zoom and Fade Out cinematic transition
    this.soundText.setText('* SWOOSH *');
    this.cameras.main.zoomTo(1.4, 700, 'Quad.easeInOut', true);
    this.cameras.main.fadeOut(700, 10, 11, 14);

    this.time.delayedCall(750, () => {
      // Dispatches custom event to notify React
      window.dispatchEvent(new CustomEvent('PHASER_LAUNCHER_BEGIN'));
    });
  }
}
