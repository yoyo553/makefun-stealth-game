// Small sounds, synthesised with WebAudio: no audio files, nothing to load. A soft tick
// for a footstep, a papery flutter and a bright ping for a tossed bookmark, a rising chirp
// when a warden grows wary, a low fall for being caught and a little arpeggio for slipping
// out of a room. The context is created lazily on the first user gesture, as browsers
// require; until then (and on any error) every call is a quiet no-op.

export function createSound() {
  let context = null;
  let stepHigh = false;

  function ensureContext() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return context;
    }
    try {
      context = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freqFrom, freqTo, seconds, type, volume, delay = 0) {
    const ctx = ensureContext();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  function chime(notes) {
    for (const [freq, seconds, volume, delay] of notes) {
      tone(freq, freq, seconds, 'triangle', volume, delay);
    }
  }

  return {
    /** Call from a click or keypress so the browser lets the context start. */
    unlock() {
      ensureContext();
    },
    footstep() {
      stepHigh = !stepHigh;
      tone(stepHigh ? 210 : 170, 120, 0.05, 'sine', 0.05);
    },
    toss() {
      tone(500, 900, 0.09, 'triangle', 0.05);
    },
    ping() {
      tone(1568, 1568, 0.1, 'sine', 0.07);
      tone(2093, 2093, 0.14, 'sine', 0.06, 0.07);
    },
    wary() {
      tone(660, 990, 0.12, 'square', 0.035);
    },
    caught() {
      tone(392, 98, 0.5, 'sawtooth', 0.08);
      tone(415, 104, 0.5, 'sawtooth', 0.06, 0.03);
    },
    escaped() {
      chime([
        [523, 0.1, 0.07, 0],
        [659, 0.1, 0.07, 0.09],
        [784, 0.1, 0.07, 0.18],
        [1047, 0.2, 0.08, 0.27],
      ]);
    },
  };
}
