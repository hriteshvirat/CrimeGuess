import Phaser from 'phaser';
import AssetHelper from '../assets/AssetHelper';
import { PlayerProgress, MysteryClient, InvestigationAction } from '../../../shared/types';

export default class DetectiveOffice extends Phaser.Scene {
  private onSelect: (action: InvestigationAction) => void;
  private ipRemaining: number;
  private gameState: PlayerProgress;
  private mystery: MysteryClient;

  // Visual widgets references
  private ipTextHUD!: Phaser.GameObjects.Text;
  private rainGraphics!: Phaser.GameObjects.Graphics;
  private rainDrops: { x: number; y: number; speed: number; len: number }[] = [];
  private dustParticles: Phaser.GameObjects.Arc[] = [];
  private lampCone!: Phaser.GameObjects.Graphics;

  private slotIcons: Record<string, Phaser.GameObjects.Sprite | Phaser.GameObjects.Text> = {};
  constructor(
    onSelect: (action: InvestigationAction) => void,
    ipRemaining: number,
    gameState: PlayerProgress,
    mystery: MysteryClient
  ) {
    super('DetectiveOffice');
    this.onSelect = onSelect;
    this.ipRemaining = ipRemaining;
    this.gameState = gameState;
    this.mystery = mystery;
  }

  public init(data: { ip: number; gameState: PlayerProgress; mystery: MysteryClient }): void {
    if (data.ip !== undefined) this.ipRemaining = data.ip;
    if (data.gameState) this.gameState = data.gameState;
    if (data.mystery) this.mystery = data.mystery;

    if (this.sys.isActive() && this.slotIcons) {
      const categories: ('culprit' | 'motive' | 'method' | 'twist')[] = ['culprit', 'motive', 'method', 'twist'];
      const boardStartX = 230;
      const boardGap = 100;
      categories.forEach((cat, index) => {
        const x = boardStartX + (index * boardGap);
        const y = 90;
        this.drawSlotStatus(cat, x, y);
      });
    }
  }

  public preload(): void {
    // Scaffold dynamic asset textures
    AssetHelper.createAllTextures(this);
    this.load.audio('ui_click', 'audio/ui_click.wav');
    this.load.audio('hover_tick', 'audio/hover_tick.wav');
    this.load.audio('dossier_open', 'audio/dossier_open.wav');
    this.load.audio('forensics_open', 'audio/forensics_open.wav');
    this.load.audio('latch_unlock', 'audio/latch_unlock.wav');
    this.load.audio('wrong_guess', 'audio/wrong_guess.wav');
    this.load.audio('warm_ping', 'audio/warm_ping.wav');
    this.load.audio('hot_ping', 'audio/hot_ping.wav');
    this.load.audio('correct_ping', 'audio/correct_ping.wav');
    this.load.audio('lock_open', 'audio/lock_open.wav');
    this.load.audio('case_solved', 'audio/case_solved.wav');
    this.load.audio('rain_loop', 'audio/rain_loop.wav');
  }

  public create(): void {
    const { width, height } = this.scale;
    // Silence unused warning
    this.onSelect;

    // Camera entry slide
    this.cameras.main.fadeIn(600, 10, 11, 14);

    // 1. Draw floorboards procedurally
    const floor = this.add.graphics();
    floor.fillStyle(0x13151a, 1);
    floor.fillRect(0, 0, width, height);
    
    // Draw wood lines
    floor.lineStyle(1, 0xffffff, 0.02);
    for (let y = 180; y < height; y += 20) {
      floor.lineBetween(0, y, width, y);
    }
    // Vertical seams
    for (let x = 40; x < width; x += 120) {
      floor.lineBetween(x, 180 + (Math.random() * 20), x, height);
    }

    // 2. Draw Office Rain Window
    const winFrame = this.add.graphics();
    winFrame.fillStyle(0x050608, 1);
    winFrame.fillRect(40, 40, 100, 110);
    winFrame.lineStyle(2, 0x00f0ff, 1);
    winFrame.strokeRect(40, 40, 100, 110);
    // Vertical frame line
    winFrame.lineBetween(90, 40, 90, 150);
    winFrame.lineBetween(40, 95, 140, 95);

    // Initialize rain drops inside window boundaries
    this.rainGraphics = this.add.graphics();
    for (let i = 0; i < 20; i++) {
      this.rainDrops.push({
        x: 42 + Math.random() * 96,
        y: 42 + Math.random() * 106,
        speed: 1.5 + Math.random() * 2,
        len: 4 + Math.random() * 6
      });
    }
    // 3. Draw Corkboard backing on the Wall
    this.add.image(380, 100, 'corkboard_bg').setOrigin(0.5);

    // Draw the 4 locked slots on the corkboard
    const categories: ('culprit' | 'motive' | 'method' | 'twist')[] = ['culprit', 'motive', 'method', 'twist'];
    const boardStartX = 230;
    const boardGap = 100;

    categories.forEach((cat, index) => {
      const x = boardStartX + (index * boardGap);
      const y = 90;

      // Polaroid photo backing
      this.add.image(x, y, 'polaroid_slot').setOrigin(0.5);

      // Category label text underneath polaroid frame
      this.add.text(x, y + 36, cat.toUpperCase(), {
        fontFamily: 'Share Tech Mono',
        fontSize: '10px',
        color: '#8e9cae'
      }).setOrigin(0.5);

      // Check solve status to draw corresponding checkmark or padlock
      this.drawSlotStatus(cat, x, y);
    });
    // 4. Draw Detective Desk & Lamp Light Cone overlay
    this.add.image(width / 2, 290, 'office_desk').setOrigin(0.5);

    this.lampCone = this.add.graphics();
    this.lampCone.setBlendMode(Phaser.BlendModes.ADD);

    // Notebook (Click triggers guess focus)
    const notebook = this.add.sprite(width / 2 - 40, 270, 'desk_notebook').setOrigin(0.5);
    notebook.setInteractive();
    this.addHoverGlow(notebook, 'Open Deduction Notes (Focus guess console)');
    notebook.on('pointerdown', () => {
      this.sound.play('ui_click', { volume: 0.8 });
      // Focus Guess console event dispatch to React
      window.dispatchEvent(new CustomEvent('PHASER_FOCUS_GUESS'));
    });

    // Case Folder on desk (Click triggers tab switch to Forensics)
    const caseFolder = this.add.sprite(width / 2 + 40, 270, 'case_folder').setOrigin(0.5);
    caseFolder.setInteractive();
    this.addHoverGlow(caseFolder, 'Open Lab Case Files (Go to Forensics)');
    caseFolder.on('pointerdown', () => {
      this.sound.play('ui_click', { volume: 0.8 });
      window.dispatchEvent(new CustomEvent('PHASER_NAV_TAB', { detail: 'forensics' }));
    });

    // Add slight wiggle rotation to paper items on hover
    notebook.on('pointerover', () => {
      this.tweens.add({
        targets: notebook,
        angle: { from: 0, to: 4 },
        duration: 120,
        yoyo: true,
        repeat: 1
      });
    });
    caseFolder.on('pointerover', () => {
      this.tweens.add({
        targets: caseFolder,
        angle: { from: 0, to: -4 },
        duration: 120,
        yoyo: true,
        repeat: 1
      });
    });

    // Spawn floating dust particles
    for (let i = 0; i < 20; i++) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const dot = this.add.circle(px, py, 1 + Math.random() * 1.5, 0xffffff, 0.08);
      this.dustParticles.push(dot);
    }

    // 5. HUD overlays & Ambient sound descriptors
    this.ipTextHUD = this.add.text(20, 15, `⚡ IP REMAINING: ${this.ipRemaining}`, {
      fontFamily: 'Share Tech Mono',
      fontSize: '13px',
      color: '#00f0ff'
    });
    this.ipTextHUD.setShadow(0, 0, 'rgba(0,240,255,0.4)', 6, true, true);

    this.add.text(width - 20, 15, '[🔊 Rain Ambience • 🔊 Lamp hum]', {
      fontFamily: 'Share Tech Mono',
      fontSize: '9px',
      color: '#8e9cae'
    }).setOrigin(1, 0);

    // Play quiet rain loop
    const rain = this.sound.add('rain_loop', { volume: 0.15, loop: true });
    rain.play();

    // Play sound helper event listener
    const playSoundHandler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const soundName = customEvent.detail?.name;
      if (soundName && this.sound) {
        const soundManager = this.sound as any;
        if (soundManager.context && soundManager.context.state === 'suspended') {
          soundManager.context.resume().catch((err: any) => {
            console.warn('Failed to resume AudioContext:', err);
          });
        }
        if (soundManager.unlock) {
          try {
            soundManager.unlock();
          } catch (unlockErr) {}
        }
        try {
          this.sound.play(soundName, { volume: customEvent.detail?.volume ?? 0.8 });
        } catch (playErr) {
          console.error(`Failed to play sound ${soundName}:`, playErr);
        }
      }
    };
    window.addEventListener('PHASER_PLAY_SOUND', playSoundHandler);
    this.events.on('shutdown', () => {
      window.removeEventListener('PHASER_PLAY_SOUND', playSoundHandler);
      this.sound.stopAll();
    });
  }

  public update(time: number): void {
    const { width, height } = this.scale;

    // A. Animate falling rain window lines
    this.rainGraphics.clear();
    this.rainGraphics.lineStyle(1, 0x00f0ff, 0.45);

    for (const drop of this.rainDrops) {
      drop.y += drop.speed;
      if (drop.y > 146) {
        drop.y = 42;
        drop.x = 42 + Math.random() * 96;
      }
      this.rainGraphics.lineBetween(drop.x, drop.y, drop.x - 0.5, drop.y + drop.len);
    }

    // B. Floating dust animation
    this.dustParticles.forEach((p, idx) => {
      p.y -= 0.12 + (idx % 3) * 0.04;
      p.x += Math.sin(time * 0.002 + idx) * 0.12;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
    });

    // C. Desk Lamp cone flicker/glow update
    this.lampCone.clear();
    const flicker = 0.90 + Math.sin(time * 0.04) * 0.06 + Math.random() * 0.04;
    this.lampCone.fillStyle(0xffea88, 0.12 * flicker);
    this.lampCone.beginPath();
    this.lampCone.moveTo(width / 2, 180);
    this.lampCone.lineTo(width / 2 - 140, height);
    this.lampCone.lineTo(width / 2 + 140, height);
    this.lampCone.closePath();
    this.lampCone.fill();
  }

  /**
   * Refreshes IP amount text
   */
  public updateIP(newIP: number): void {
    this.ipRemaining = newIP;
    if (this.ipTextHUD) {
      this.ipTextHUD.setText(`⚡ IP REMAINING: ${this.ipRemaining}`);
    }
  }



  /**
   * Outlines interactable sprites on pointer hover
   */
  private addHoverGlow(item: Phaser.GameObjects.Sprite, description: string): void {
    let glowBox: Phaser.GameObjects.Graphics | null = null;
    let descText: Phaser.GameObjects.Text | null = null;

    item.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      this.sound.play('hover_tick', { volume: 0.6 });
      glowBox = this.add.graphics();
      glowBox.lineStyle(2, 0x00f0ff, 0.7);
      glowBox.strokeRect(item.x - (item.width / 2) - 4, item.y - (item.height / 2) - 4, item.width + 8, item.height + 8);

      descText = this.add.text(pointer.worldX + 12, pointer.worldY - 12, description, {
        fontFamily: 'Outfit',
        fontSize: '11px',
        color: '#050608',
        backgroundColor: '#00f0ff',
        padding: { x: 6, y: 4 }
      }).setOrigin(0, 1).setDepth(200);
    });

    item.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (descText) {
        descText.setPosition(pointer.worldX + 12, pointer.worldY - 12);
      }
    });

    item.on('pointerout', () => {
      if (glowBox) { glowBox.destroy(); glowBox = null; }
      if (descText) { descText.destroy(); descText = null; }
    });
  }

  /**
   * Redraws slot lock/unlock statuses when guesses are entered
   */
  private drawSlotStatus(cat: 'culprit' | 'motive' | 'method' | 'twist', x: number, y: number): void {
    const isSolved = this.gameState.solved[cat];
    const key = `icon_${cat}`;

    // Clean up old graphics
    if (this.slotIcons[key]) {
      this.slotIcons[key].destroy();
      delete this.slotIcons[key];
    }
    const labelKey = `val_${cat}`;
    if (this.slotIcons[labelKey]) {
      this.slotIcons[labelKey].destroy();
      delete this.slotIcons[labelKey];
    }

    if (isSolved) {
      // Solved Green Checkmark
      this.slotIcons[key] = this.add.sprite(x, y - 8, 'check_icon').setOrigin(0.5);
      
      // Try to get actual answer text or display "SOLVED"
      const ansText = this.mystery.solvedAnswers[cat] || 'Solved';
      const shortAns = ansText.length > 9 ? `${ansText.substring(0, 8)}...` : ansText;
      
      this.slotIcons[labelKey] = this.add.text(x, y + 16, shortAns, {
        fontFamily: 'Outfit',
        fontSize: '9px',
        color: '#39d353',
        align: 'center',
        wordWrap: { width: 56 }
      }).setOrigin(0.5);
    } else {
      // Locked Red Lock
      this.slotIcons[key] = this.add.sprite(x, y - 8, 'lock_icon').setOrigin(0.5);
    }
  }
}
