import Phaser from 'phaser';

export default class AssetHelper {
  /**
   * Generates all procedural canvas textures required by the game scenes.
   */
  public static createAllTextures(scene: Phaser.Scene): void {
    // Prevent duplicate creations if already defined
    if (scene.textures.exists('office_desk')) return;

    // 1. Detective Desk
    const desk = scene.textures.createCanvas('office_desk', 180, 80)!;
    const ctxD = desk.getContext();
    // Wooden top
    ctxD.fillStyle = '#1e1c18';
    ctxD.fillRect(5, 10, 170, 60);
    ctxD.strokeStyle = '#3d301f';
    ctxD.lineWidth = 3;
    ctxD.strokeRect(5, 10, 170, 60);
    // Desk drawers outline
    ctxD.strokeStyle = '#ffa800';
    ctxD.lineWidth = 1;
    ctxD.strokeRect(20, 20, 40, 40);
    ctxD.strokeRect(120, 20, 40, 40);
    // Handles
    ctxD.fillStyle = '#ffa800';
    ctxD.fillRect(35, 38, 10, 4);
    ctxD.fillRect(135, 38, 10, 4);
    desk.refresh();

    // 2. Notebook
    const book = scene.textures.createCanvas('desk_notebook', 60, 40)!;
    const ctxB = book.getContext();
    ctxB.fillStyle = '#5c1b1b'; // Maroon leather
    ctxB.fillRect(2, 2, 56, 36);
    ctxB.strokeStyle = '#ffa800';
    ctxB.lineWidth = 1.5;
    ctxB.strokeRect(2, 2, 56, 36);
    // Page edge
    ctxB.fillStyle = '#cbd5e1';
    ctxB.fillRect(52, 4, 4, 32);
    // Spiral rings
    ctxB.fillStyle = '#8e9cae';
    for (let y = 6; y < 36; y += 6) {
      ctxB.fillRect(2, y, 4, 2);
    }
    book.refresh();

    // 3. Corkboard texture backing
    const board = scene.textures.createCanvas('corkboard_bg', 360, 160)!;
    const ctxBd = board.getContext();
    // Warm corkboard HSL brown
    ctxBd.fillStyle = '#261b15';
    ctxBd.fillRect(0, 0, 360, 160);
    ctxBd.strokeStyle = '#00f0ff';
    ctxBd.lineWidth = 2;
    ctxBd.strokeRect(0, 0, 360, 160);
    // Speckled cork grain patterns
    ctxBd.fillStyle = 'rgba(0, 240, 255, 0.03)';
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 360;
      const y = Math.random() * 160;
      const r = 1 + Math.random() * 2;
      ctxBd.beginPath();
      ctxBd.arc(x, y, r, 0, Math.PI * 2);
      ctxBd.fill();
    }
    board.refresh();

    // 4. Polaroid slot silhouette
    const pol = scene.textures.createCanvas('polaroid_slot', 70, 90)!;
    const ctxP = pol.getContext();
    ctxP.fillStyle = '#10131c';
    ctxP.fillRect(2, 2, 66, 86);
    ctxP.strokeStyle = '#8e9cae';
    ctxP.lineWidth = 1.5;
    ctxP.strokeRect(2, 2, 66, 86);
    // Inner photograph slot
    ctxP.fillStyle = '#05070a';
    ctxP.fillRect(6, 6, 58, 62);
    ctxP.strokeRect(6, 6, 58, 62);
    pol.refresh();

    // 5. Lock Icon
    const lock = scene.textures.createCanvas('lock_icon', 20, 24)!;
    const ctxL = lock.getContext();
    ctxL.strokeStyle = '#ff2d55';
    ctxL.lineWidth = 2;
    // Shackle arch
    ctxL.beginPath();
    ctxL.arc(10, 8, 5, Math.PI, 0, false);
    ctxL.stroke();
    // Lock base body
    ctxL.fillStyle = '#ff2d55';
    ctxL.fillRect(4, 10, 12, 10);
    lock.refresh();

    // 6. Solved Checkmark Icon
    const check = scene.textures.createCanvas('check_icon', 20, 20)!;
    const ctxCh = check.getContext();
    ctxCh.strokeStyle = '#39d353';
    ctxCh.lineWidth = 3;
    ctxCh.lineCap = 'round';
    ctxCh.beginPath();
    ctxCh.moveTo(4, 10);
    ctxCh.lineTo(8, 14);
    ctxCh.lineTo(16, 5);
    ctxCh.stroke();
    check.refresh();

    // 7. Case Folder closed
    const folder = scene.textures.createCanvas('case_folder', 120, 90)!;
    const ctxF = folder.getContext();
    ctxF.fillStyle = '#9e7b4f'; // Manila color
    ctxF.fillRect(5, 15, 110, 70);
    // Folder tab
    ctxF.beginPath();
    ctxF.moveTo(5, 15);
    ctxF.lineTo(15, 5);
    ctxF.lineTo(45, 5);
    ctxF.lineTo(55, 15);
    ctxF.closePath();
    ctxF.fill();
    // Borders
    ctxF.strokeStyle = '#614828';
    ctxF.lineWidth = 2;
    ctxF.strokeRect(5, 15, 110, 70);
    folder.refresh();
  }
}
