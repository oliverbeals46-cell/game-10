// Tiny synthesized sound effects using the Web Audio API (no audio files needed).
const Sfx = (() => {
  let ctx = null, master = null, muted = false;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }

  function tone(freq, dur, type = 'square', vol = 0.3, slide = 0, delay = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  let noiseBuf = null;
  function noise(dur, vol = 0.3, freq = 1200, delay = 0) {
    if (!ctx || muted) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  const lib = {
    jump() { tone(260, 0.12, 'square', 0.12, 260); },
    walljump() { tone(320, 0.1, 'square', 0.12, 300); noise(0.06, 0.15, 2000); },
    swing() { noise(0.09, 0.22, 3200); },
    hit() { tone(170, 0.1, 'square', 0.25, -100); noise(0.07, 0.3, 900); },
    kill() { tone(400, 0.08, 'triangle', 0.25, -250); noise(0.15, 0.3, 600); },
    hurt() { tone(240, 0.35, 'sawtooth', 0.28, -190); noise(0.2, 0.25, 500); },
    candy() { tone(990, 0.05, 'triangle', 0.13); tone(1480, 0.07, 'triangle', 0.12, 0, 0.04); },
    dash() { noise(0.16, 0.22, 1400); tone(180, 0.12, 'sine', 0.12, 200); },
    pogo() { tone(520, 0.09, 'square', 0.15, 400); },
    heal() { tone(440, 0.15, 'sine', 0.2, 0); tone(660, 0.2, 'sine', 0.2, 0, 0.12); tone(880, 0.3, 'sine', 0.2, 0, 0.24); },
    focus() { tone(220, 0.5, 'sine', 0.1, 220); },
    bench() { tone(523, 0.2, 'triangle', 0.2); tone(659, 0.2, 'triangle', 0.2, 0, 0.15); tone(784, 0.4, 'triangle', 0.2, 0, 0.3); },
    roar() { tone(90, 0.7, 'sawtooth', 0.35, -40); noise(0.7, 0.3, 300); },
    slam() { tone(70, 0.4, 'square', 0.35, -30); noise(0.35, 0.45, 200); },
    spit() { tone(300, 0.08, 'square', 0.15, -150); },
    gate() { tone(110, 0.5, 'square', 0.25, -40); noise(0.5, 0.3, 250); },
    bolt() { tone(700, 0.25, 'sine', 0.2, -400); noise(0.2, 0.15, 2500); },
    die() { tone(300, 1.0, 'sawtooth', 0.25, -260); },
    victory() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'triangle', 0.2, 0, i * 0.15)); },
    buy() { tone(784, 0.1, 'triangle', 0.2); tone(1046, 0.25, 'triangle', 0.2, 0, 0.1); },
    click() { tone(600, 0.04, 'square', 0.08); },
    deny() { tone(150, 0.15, 'square', 0.15); },
  };

  return {
    init,
    play(name) { if (lib[name]) lib[name](); },
    toggle() { muted = !muted; return muted; },
    get muted() { return muted; },
  };
})();
