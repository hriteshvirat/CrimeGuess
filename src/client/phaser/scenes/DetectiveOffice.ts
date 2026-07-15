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

  // Slots icons references
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
  }

  public preload(): void {
    // Scaffold dynamic asset textures
    AssetHelper.createAllTextures(this);
  }

  public create(): void {
    const { width, height } = this.scale;
    // Silence unused warning
    this.onSelect;

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

    // 4. Draw Detective Desk
    this.add.image(width / 2, 290, 'office_desk').setOrigin(0.5);

    // Notebook (Click triggers guess focus)
    const notebook = this.add.sprite(width / 2 - 40, 270, 'desk_notebook').setOrigin(0.5);
    notebook.setInteractive();
    this.addHoverGlow(notebook, 'Open Deduction Notes (Focus guess console)');
    notebook.on('pointerdown', () => {
      // Focus Guess console event dispatch to React
      window.dispatchEvent(new CustomEvent('PHASER_FOCUS_GUESS'));
    });

    // Case Folder on desk (Click triggers tab switch to Forensics)
    const caseFolder = this.add.sprite(width / 2 + 40, 270, 'case_folder').setOrigin(0.5);
    caseFolder.setInteractive();
    this.addHoverGlow(caseFolder, 'Open Lab Case Files (Go to Forensics)');
    caseFolder.on('pointerdown', () => {
      window.dispatchEvent(new CustomEvent('PHASER_NAV_TAB', { detail: 'forensics' }));
    });

    // 5. HUD overlays
    this.ipTextHUD = this.add.text(20, 15, `⚡ IP REMAINING: ${this.ipRemaining}`, {
      fontFamily: 'Share Tech Mono',
      fontSize: '13px',
      color: '#00f0ff'
    });
    this.ipTextHUD.setShadow(0, 0, 'rgba(0,240,255,0.4)', 6, true, true);
  }

  public update(): void {
    // Animate falling rain window lines
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

  /**
   * Outlines interactable sprites on pointer hover
   */
  private addHoverGlow(item: Phaser.GameObjects.Sprite, description: string): void {
    let glowBox: Phaser.GameObjects.Graphics | null = null;
    let descText: Phaser.GameObjects.Text | null = null;

    item.on('pointerover', (pointer: Phaser.Input.Pointer) => {
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
}
