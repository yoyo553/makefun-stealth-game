// Everything the player sees, painted on one canvas in room space (1280 by 720,
// scaled to fit the window). Painting order: floor and rugs, the Dawn Door glow,
// footstep ripples, cover, the wardens' lamplight cones, wardens and player, then
// the HUD and whichever full screen is showing (title, paused, caught, room clear,
// the archive sleeps). A cone is the raycast polygon from vision.js, tinted by how
// aware its warden is: calm lamplight yellow, wary orange, about-to-catch red.

import { BOOKMARK, FIELD, PALETTE, VISION } from './config.js';
import { conePolygon } from './vision.js';
import { hash01 } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';

const SPINE_COLOURS = ['#a34a3f', '#3f5f8a', '#4a7a52', '#b08a3e', '#6a4a7a', '#7a6a52', '#3e6a72'];

function formatTime(totalSeconds) {
  const whole = Math.floor(totalSeconds);
  return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
}

/** The device pixel ratio the canvas uses, capped at 2. */
function pixelRatio() {
  return Math.min(2, window.devicePixelRatio || 1);
}

function disc(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let viewScale = 1;
  let shiftX = 0;
  let shiftY = 0;

  function fitCanvasToWindow() {
    const dpr = pixelRatio();
    const wantedWidth = Math.round(canvas.clientWidth * dpr);
    const wantedHeight = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== wantedWidth || canvas.height !== wantedHeight) {
      canvas.width = wantedWidth;
      canvas.height = wantedHeight;
    }
    viewScale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    shiftX = (canvas.width - FIELD.width * viewScale) / 2;
    shiftY = (canvas.height - FIELD.height * viewScale) / 2;
  }

  /** Convert a client (window) point into room coordinates. */
  function toField(clientX, clientY) {
    const dpr = pixelRatio();
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * dpr;
    const py = (clientY - rect.top) * dpr;
    return { x: (px - shiftX) / viewScale, y: (py - shiftY) / viewScale };
  }

  function paintFloor(state) {
    const tile = 64;
    const tilesX = Math.ceil(FIELD.width / tile);
    const tilesY = Math.ceil(FIELD.height / tile);
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.floorAlt;
    for (let row = 0; row < tilesY; row += 1) {
      for (let col = 0; col < tilesX; col += 1) {
        if ((col + row) % 2 !== 0) continue;
        ctx.fillRect(col * tile, row * tile, tile, tile);
      }
    }
    for (const rug of state.level.rugs) {
      ctx.fillStyle = rug.tone === 'A' ? PALETTE.rugA : PALETTE.rugB;
      ctx.fillRect(rug.x, rug.y, rug.w, rug.h);
      ctx.strokeStyle = 'rgba(255, 220, 150, 0.14)';
      ctx.lineWidth = 3;
      ctx.strokeRect(rug.x + 7, rug.y + 7, rug.w - 14, rug.h - 14);
    }
    // The room's own walls: a thin bright edge inside a thick dark one.
    ctx.strokeStyle = PALETTE.wallEdge;
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, FIELD.width - 24, FIELD.height - 24);
    ctx.strokeStyle = PALETTE.wall;
    ctx.lineWidth = 14;
    ctx.strokeRect(5, 5, FIELD.width - 10, FIELD.height - 10);
  }

  function paintExit(state) {
    const exit = state.level.exit;
    const centreX = exit.x + exit.w / 2;
    const centreY = exit.y + exit.h / 2;
    const lightFallsDown = centreY <= FIELD.height / 2;
    const spill = lightFallsDown ? 1 : -1;
    const baseY = lightFallsDown ? exit.y + exit.h : exit.y;
    ctx.save();
    ctx.shadowColor = PALETTE.exit;
    ctx.shadowBlur = 26;
    ctx.fillStyle = PALETTE.exit;
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.restore();
    ctx.fillStyle = 'rgba(60, 42, 8, 0.85)';
    ctx.fillRect(centreX - 2, exit.y + 4, 4, exit.h - 8);
    ctx.beginPath();
    ctx.moveTo(exit.x + 6, baseY);
    ctx.lineTo(exit.x + exit.w - 6, baseY);
    ctx.lineTo(exit.x + exit.w + 26, baseY + spill * 64);
    ctx.lineTo(exit.x - 26, baseY + spill * 64);
    ctx.closePath();
    ctx.fillStyle = `rgba(${PALETTE.exitGlow}, 0.13)`;
    ctx.fill();
    ctx.fillStyle = '#3a2a05';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DAWN DOOR', centreX, centreY + 5);
  }

  function paintShelf(rect, index) {
    ctx.fillStyle = PALETTE.shelf;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = PALETTE.shelfEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3);
    // Book spines: two columns or two rows of thin coloured strips, steady per shelf.
    const upright = rect.h >= rect.w;
    const spineCount = Math.floor((upright ? rect.h : rect.w) / 13);
    for (let i = 0; i < spineCount; i += 1) {
      const colour = SPINE_COLOURS[Math.floor(hash01(index * 31 + 7, i) * SPINE_COLOURS.length)];
      ctx.fillStyle = colour;
      if (upright) {
        ctx.fillRect(rect.x + 5 + (i % 2) * (rect.w / 2 - 4), rect.y + 6 + i * 13, rect.w / 2 - 9, 9);
      } else {
        ctx.fillRect(rect.x + 6 + i * 13, rect.y + 5 + (i % 2) * (rect.h / 2 - 4), 9, rect.h / 2 - 9);
      }
    }
  }

  function paintTable(rect) {
    const centreX = rect.x + rect.w / 2;
    const centreY = rect.y + rect.h / 2;
    ctx.fillStyle = PALETTE.table;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = PALETTE.tableEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3);
    ctx.save();
    ctx.shadowColor = PALETTE.lamp;
    ctx.shadowBlur = 18;
    ctx.fillStyle = PALETTE.lamp;
    disc(ctx, centreX, centreY, 6);
    ctx.restore();
  }

  function paintPlant(rect, index) {
    ctx.fillStyle = '#7a4a30';
    ctx.fillRect(rect.x + rect.w / 2 - 9, rect.y + rect.h - 16, 18, 14);
    for (let i = 0; i < 6; i += 1) {
      const spread = hash01(index * 17 + 3, i);
      const height = hash01(index * 17 + 9, i);
      ctx.fillStyle = i % 2 ? PALETTE.plant : PALETTE.plantLight;
      disc(ctx, rect.x + 8 + spread * (rect.w - 16), rect.y + 8 + height * (rect.h - 26), 11 + spread * 6);
    }
  }

  function paintPillar(rect) {
    ctx.fillStyle = PALETTE.pillar;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = PALETTE.pillarEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
    ctx.beginPath();
    ctx.moveTo(rect.x + 5, rect.y + 10);
    ctx.lineTo(rect.x + rect.w - 5, rect.y + 10);
    ctx.moveTo(rect.x + 5, rect.y + rect.h - 10);
    ctx.lineTo(rect.x + rect.w - 5, rect.y + rect.h - 10);
    ctx.stroke();
  }

  function paintCover(state) {
    state.level.cover.forEach((rect, index) => {
      if (rect.kind === 'shelf') paintShelf(rect, index);
      else if (rect.kind === 'table') paintTable(rect);
      else if (rect.kind === 'plant') paintPlant(rect, index);
      else paintPillar(rect);
    });
  }

  function paintRipples(state) {
    for (const ripple of state.ripples) {
      const fade = 1 - ripple.age / ripple.life;
      const alpha = ripple.kind === 'ping' ? 0.55 * fade : 0.4 * fade;
      const tint = ripple.kind === 'ping' ? '255, 220, 130' : '165, 185, 225';
      ctx.strokeStyle = `rgba(${tint}, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function paintBookmarks(state) {
    for (const mark of state.bookmarks) {
      ctx.fillStyle = '#f5efe0';
      if (!mark.landed) {
        const progress = Math.min(1, mark.t / BOOKMARK.flightSeconds);
        const x = mark.fromX + (mark.x - mark.fromX) * progress;
        const y = mark.fromY + (mark.y - mark.fromY) * progress - Math.sin(progress * Math.PI) * 42;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(progress * 5.2);
        ctx.fillRect(-7, -5, 14, 10);
        ctx.fillStyle = PALETTE.danger;
        ctx.fillRect(-7, -5, 4, 10);
        ctx.restore();
      } else {
        const fade = Math.max(0, 1 - (mark.t - BOOKMARK.flightSeconds) / 0.8);
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.65 * fade;
        ctx.fillRect(mark.x - 7, mark.y - 5, 14, 10);
        ctx.fillStyle = PALETTE.danger;
        ctx.fillRect(mark.x - 7, mark.y - 5, 4, 10);
        ctx.restore();
      }
    }
  }

  function coneColour(warden) {
    if (warden.awareness >= 0.7) return PALETTE.coneAlert;
    if (warden.awareness >= VISION.suspiciousAt) return PALETTE.coneWary;
    return PALETTE.coneCalm;
  }

  function paintCones(state) {
    for (const warden of state.wardens) {
      const colour = coneColour(warden);
      const outline = conePolygon(warden.x, warden.y, warden.facing, VISION.range, VISION.halfAngle, state.segments);
      ctx.beginPath();
      outline.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fillStyle = `rgba(${colour}, 0.15)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${colour}, 0.28)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // A brighter heart to the cone, so its near field reads as the dangerous part.
      const heart = conePolygon(warden.x, warden.y, warden.facing, VISION.range * 0.55, VISION.halfAngle, state.segments);
      ctx.beginPath();
      heart.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fillStyle = `rgba(${colour}, 0.12)`;
      ctx.fill();
    }
  }

  function paintWarden(warden) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(warden.x, warden.y + 12, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.warden;
    disc(ctx, warden.x, warden.y, 14);
    ctx.fillStyle = PALETTE.wardenCap;
    ctx.beginPath();
    ctx.arc(warden.x, warden.y, 14, warden.facing + Math.PI * 0.65, warden.facing + Math.PI * 2.35);
    ctx.lineTo(warden.x, warden.y);
    ctx.closePath();
    ctx.fill();
    // The lantern, carried at the front: the source of the cone.
    const lampX = warden.x + Math.cos(warden.facing) * 15;
    const lampY = warden.y + Math.sin(warden.facing) * 15;
    ctx.save();
    ctx.shadowColor = PALETTE.lamp;
    ctx.shadowBlur = 12;
    ctx.fillStyle = PALETTE.lamp;
    disc(ctx, lampX, lampY, 4.5);
    ctx.restore();
    if (warden.awareness < VISION.suspiciousAt) return;
    const mark = warden.seesPlayer && warden.awareness > 0.55 ? '!' : '?';
    ctx.fillStyle = '#ffffff';
    disc(ctx, warden.x + 14, warden.y - 20, 10);
    ctx.fillStyle = mark === '!' ? PALETTE.danger : '#c77f1a';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mark, warden.x + 14, warden.y - 15);
  }

  function paintPlayer(state) {
    const player = state.player;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 11, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (player.tiptoe) {
      ctx.strokeStyle = 'rgba(63, 210, 197, 0.4)';
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 19, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const facing = Math.atan2(player.faceY, player.faceX);
    ctx.fillStyle = PALETTE.player;
    disc(ctx, player.x, player.y, 13);
    ctx.fillStyle = PALETTE.playerHood;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 13, facing + Math.PI * 0.6, facing + Math.PI * 2.4);
    ctx.lineTo(player.x, player.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#eafffb';
    disc(ctx, player.x + Math.cos(facing) * 5, player.y + Math.sin(facing) * 5, 3.4);
  }

  /** The SEEN meter's colour: green, amber, then red as the most aware warden fills up. */
  function meterColourFor(fill, anyoneSees, time) {
    let colour = '#7bc47f';
    if (fill >= 0.7) colour = PALETTE.danger;
    else if (fill >= VISION.suspiciousAt) colour = '#ffb84d';
    if (anyoneSees && Math.sin(time * 14) > 0) colour = PALETTE.danger;
    return colour;
  }

  /** A small panel chip with one line of text, its left edge at `leftX`. */
  function chip(text, leftX) {
    ctx.font = '400 14px system-ui, sans-serif';
    const width = ctx.measureText(text).width + 20;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(leftX, FIELD.height - 34, width, 24);
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(text, leftX + 10, FIELD.height - 17);
    return width;
  }

  /** A crosshair where the next bookmark would fly. */
  function paintCrosshair(point) {
    ctx.strokeStyle = 'rgba(245, 239, 224, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
    ctx.moveTo(point.x - 13, point.y);
    ctx.lineTo(point.x - 4, point.y);
    ctx.moveTo(point.x + 4, point.y);
    ctx.lineTo(point.x + 13, point.y);
    ctx.moveTo(point.x, point.y - 13);
    ctx.lineTo(point.x, point.y - 4);
    ctx.moveTo(point.x, point.y + 4);
    ctx.lineTo(point.x, point.y + 13);
    ctx.stroke();
  }

  /** Room intro banner for the first seconds of a room. */
  function paintRoomBanner(state, meta) {
    if (meta.roomAge >= 3.6) return;
    const fade = meta.roomAge < 3 ? 1 : 1 - (meta.roomAge - 3) / 0.6;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(FIELD.width / 2 - 330, 64, 660, 74);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.level.name, FIELD.width / 2, 98);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '400 15px system-ui, sans-serif';
    ctx.fillText(state.level.intro, FIELD.width / 2, 124);
    ctx.restore();
  }

  function paintHud(state, meta) {
    const meterWidth = 300;
    const meterX = FIELD.width / 2 - meterWidth / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, FIELD.width, 40);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.level.name, 16, 26);
    // The SEEN meter: how close the most aware warden is to catching the player.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('SEEN', meterX - 10, 26);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(meterX, 14, meterWidth, 13);
    ctx.fillStyle = meterColourFor(state.detection, state.anyoneSees, state.time);
    ctx.fillRect(meterX, 14, meterWidth * state.detection, 13);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(meterX, 14, meterWidth, 13);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatTime(meta.totalTime), FIELD.width - 16, 26);
    // Objective, bottom left; controls reminder, bottom right.
    ctx.textAlign = 'left';
    chip(state.level.intro, 10);
    const hint = 'WASD / arrows move · Shift tiptoe · Click toss a bookmark · Esc pause';
    ctx.font = '400 14px system-ui, sans-serif';
    const hintWidth = ctx.measureText(hint).width + 20;
    chip(hint, FIELD.width - hintWidth - 10);
    if (meta.mouse) paintCrosshair(meta.mouse);
    paintRoomBanner(state, meta);
  }

  /** A translucent full-screen wash, the backdrop of every full screen. */
  function overlay(fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  /** One centred line of text on a full screen. */
  function centred(text, y, font, colour) {
    ctx.fillStyle = colour;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.fillText(text, FIELD.width / 2, y);
  }

  function panel(width, height) {
    const left = FIELD.width / 2 - width / 2;
    const top = FIELD.height / 2 - height / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(left, top, width, height);
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, width, height);
    return { x: left, y: top };
  }

  function paintTitle(state) {
    overlay('rgba(8, 10, 18, 0.62)');
    const { y } = panel(700, 400);
    centred('MOONLIGHT ARCHIVE', y + 92, '700 62px system-ui, sans-serif', PALETTE.exit);
    centred('The library sleeps. Its wardens do not.', y + 132, '400 18px system-ui, sans-serif', PALETTE.text);
    centred('Cross all three rooms and slip out of the Dawn Door, unseen.', y + 168, '400 16px system-ui, sans-serif', PALETTE.muted);
    centred('Stay out of the lamplight. Shelves, tables and plants break a warden\'s gaze.', y + 194, '400 16px system-ui, sans-serif', PALETTE.muted);
    centred('Walking is heard — tiptoe past, or click to toss a bookmark and pull a gaze away.', y + 220, '400 16px system-ui, sans-serif', PALETTE.muted);
    centred('WASD / arrows — move      Shift — tiptoe      Click — toss bookmark      Esc — pause', y + 268, '600 16px system-ui, sans-serif', PALETTE.text);
    if (Math.sin(state.time * 3.2) > -0.2) {
      centred('Press Enter or click to slip in', y + 322, '700 19px system-ui, sans-serif', PALETTE.exit);
    }
    centred('An original game of patience in three rooms', y + 362, '400 13px system-ui, sans-serif', PALETTE.muted);
  }

  function paintCaught(state, meta) {
    overlay('rgba(110, 12, 10, 0.42)');
    const { y } = panel(620, 300);
    centred('SPOTTED!', y + 88, '700 58px system-ui, sans-serif', PALETTE.danger);
    centred('A warden\'s gaze filled up — you were caught in the lamplight.', y + 132, '400 18px system-ui, sans-serif', PALETTE.text);
    centred(`${state.level.name} · ${formatTime(meta.totalTime)} on the run · ${meta.nearMisses} near misses`, y + 172, '400 16px system-ui, sans-serif', PALETTE.muted);
    centred('Press Enter or R to try the room again', y + 232, '700 18px system-ui, sans-serif', PALETTE.exit);
  }

  function paintClear(state, meta) {
    overlay('rgba(8, 20, 14, 0.5)');
    const { y } = panel(620, 290);
    centred('UNSEEN', y + 82, '700 44px system-ui, sans-serif', '#7bc47f');
    centred(`${state.level.name} crossed without a single catch.`, y + 124, '400 18px system-ui, sans-serif', PALETTE.text);
    centred(`Time ${formatTime(meta.totalTime)} · Near misses ${meta.nearMisses} · Bookmarks tossed ${meta.throws}`, y + 164, '400 16px system-ui, sans-serif', PALETTE.muted);
    centred('Press Enter for the next room', y + 224, '700 18px system-ui, sans-serif', PALETTE.exit);
  }

  function paintWin(meta) {
    overlay('rgba(10, 14, 8, 0.55)');
    const { y } = panel(680, 360);
    centred('THE ARCHIVE SLEEPS ON', y + 84, '700 46px system-ui, sans-serif', PALETTE.exit);
    centred('Three rooms crossed in the dark, and not one warden the wiser.', y + 124, '400 18px system-ui, sans-serif', PALETTE.text);
    centred(`Total time  ${formatTime(meta.totalTime)}`, y + 172, '400 17px system-ui, sans-serif', PALETTE.muted);
    centred(`Near misses  ${meta.nearMisses}      Bookmarks tossed  ${meta.throws}`, y + 202, '400 17px system-ui, sans-serif', PALETTE.muted);
    if (meta.best !== null) centred(`Fastest full run  ${formatTime(meta.best)}`, y + 232, '400 17px system-ui, sans-serif', PALETTE.muted);
    centred('Press Enter to slip in again', y + 292, '700 18px system-ui, sans-serif', PALETTE.exit);
  }

  function paintPaused() {
    overlay('rgba(8, 10, 18, 0.6)');
    centred('PAUSED', FIELD.height / 2 - 8, '700 42px system-ui, sans-serif', PALETTE.text);
    centred('The archive holds its breath. Esc or Enter to go on.', FIELD.height / 2 + 28, '400 16px system-ui, sans-serif', PALETTE.muted);
  }

  /** The full screen for `screen`, if any. */
  function paintScreen(state, screen, meta) {
    if (screen === SCREEN_TITLE) paintTitle(state);
    else if (screen === SCREEN_PAUSED) paintPaused();
    else if (screen === SCREEN_CAUGHT) paintCaught(state, meta);
    else if (screen === SCREEN_CLEAR) paintClear(state, meta);
    else if (screen === SCREEN_WIN) paintWin(meta);
  }

  function draw(state, screen, meta) {
    fitCanvasToWindow();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(viewScale, 0, 0, viewScale, shiftX, shiftY);
    paintFloor(state);
    paintExit(state);
    paintRipples(state);
    paintCover(state);
    paintBookmarks(state);
    paintCones(state);
    for (const warden of state.wardens) paintWarden(warden);
    paintPlayer(state);
    if (screen !== SCREEN_TITLE) paintHud(state, meta);
    paintScreen(state, screen, meta);
  }

  return { draw, toField };
}
