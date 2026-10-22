// Comportamento do filme do LoveWrapped: cenas, efeitos e som gerado no telemóvel.
// Portado da maqueta aprovada; temporizadores, eventos e som são limpos ao fechar.

/**
 * @param {HTMLElement} root
 * @param {{ onClose: () => void, onShare: () => void }} opts
 * @returns {() => void} limpeza
 */
export function mountFilm(root, { onClose, onShare }) {
  const cleanups = [];
  const every = (fn, ms) => { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); return id; };
  const doc = {
    querySelector: (s) => root.querySelector(s),
    querySelectorAll: (s) => root.querySelectorAll(s),
    createElement: (t) => document.createElement(t),
  };

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // ── Guardiões que reagem ─────────────────────────────────────────────────
    const $pet = (root, name) => root.querySelector(`[data-pet="${name}"]`);

    function react(pet, cls) {
      if (!pet) return;
      ["nod", "wiggle", "shake", "spin", "happy"].forEach(c => pet.classList.remove(c));
      void pet.offsetWidth;
      pet.classList.add(cls);
    }

    function say(pet, text, ms = 2200) {
      if (!pet) return;
      let b = pet.querySelector(".pet-say");
      if (!b) { b = document.createElement("div"); b.className = "pet-say"; pet.appendChild(b); }
      b.textContent = text;
      b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
      clearTimeout(b._t);
      if (ms) b._t = setTimeout(() => b.classList.remove("show"), ms);
    }

    function hearts(pet, n = 7) {
      if (!pet || reduced) return;
      for (let i = 0; i < n; i++) {
        const h = document.createElement("span");
        h.className = "burst"; h.innerHTML = '<svg class="ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path fill="currentColor" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
        const a = (Math.PI * 2 * i) / n + Math.random() * .6;
        h.style.setProperty("--dx", `${Math.cos(a) * (40 + Math.random() * 30)}px`);
        h.style.setProperty("--dy", `${-30 - Math.random() * 50}px`);
        h.style.setProperty("--r", `${(Math.random() - .5) * 60}deg`);
        h.style.fontSize = `${10 + Math.random() * 8}px`;
        h.style.animationDelay = `${i * 30}ms`;
        pet.appendChild(h); setTimeout(() => h.remove(), 1300);
      }
    }


    doc.querySelectorAll(".pet").forEach(pet => { const img = pet.querySelector("img"); const b = document.createElement("span"); b.className = "pet-body"; img.replaceWith(b); b.appendChild(img); });
    doc.querySelectorAll("[data-chars]").forEach(el => { let i = 0; el.innerHTML = el.textContent.split(" ").map(w => `<span class="word">${[...w].map(c => `<span style="--i:${i++}">${c}</span>`).join("")}</span>`).join(" "); });

    // ═════════ Som: alegre e a acompanhar o ecrã (gerado no telemóvel, sem ficheiros) ═════════
    let AC = null, OUT = null, ECHO = null, soundOn = false, songTimer = 0;
    // Dó maior: tudo soa alegre.
    const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568, C3: 130.81, F3: 174.61, G3: 196, A3: 220 };
    function audio() {
      if (AC) return AC;
      AC = new (window.AudioContext || window.webkitAudioContext)();
      OUT = AC.createGain(); OUT.gain.value = 0; const lim = AC.createDynamicsCompressor(); lim.threshold.value = -12; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = .003; lim.release.value = .2; OUT.connect(lim); lim.connect(AC.destination);
      // eco curto e brilhante
      ECHO = AC.createDelay(1); ECHO.delayTime.value = .22; const fb = AC.createGain(); fb.gain.value = .28; const wet = AC.createGain(); wet.gain.value = .22; const hp = AC.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 700;
      ECHO.connect(fb); fb.connect(ECHO); ECHO.connect(hp); hp.connect(wet); wet.connect(OUT);
      return AC;
    }
    const now = () => (AC ? AC.currentTime : 0);
    function voice(freq, t, { type = "triangle", dur = .35, vol = .16, echo = true, attack = .005, glide = 0 } = {}) {
      if (!soundOn) return; const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t); if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(OUT); if (echo) g.connect(ECHO); o.start(t); o.stop(t + dur + .05);
    }
    const pluck = (f, t, v = .14) => { voice(f, t, { type: "triangle", dur: .45, vol: v }); voice(f * 2, t, { type: "sine", dur: .25, vol: v * .35 }); };
    const marimba = (f, t, v = .18) => { voice(f, t, { type: "sine", dur: .32, vol: v }); voice(f * 4, t, { type: "sine", dur: .06, vol: v * .25, echo: false }); };
    const bell = (f, t, v = .1) => { voice(f, t, { type: "sine", dur: 1.4, vol: v }); voice(f * 2.76, t, { type: "sine", dur: .5, vol: v * .25 }); };
    function noise(t, dur, { vol = .2, type = "highpass", freq = 6000, q = 1 } = {}) {
      if (!soundOn) return; const len = Math.max(1, AC.sampleRate * dur | 0), buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
      s.connect(f); f.connect(g); g.connect(OUT); s.start(t);
    }
    function kick(t, v = .55) { if (!soundOn) return; const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + .16); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .22); o.connect(g); g.connect(OUT); o.start(t); o.stop(t + .25); }
    const clap = (t) => { [0, .012, .024].forEach(d => noise(t + d, .08, { vol: .16, type: "bandpass", freq: 1500, q: .8 })); };
    const hat = (t, v = .06) => noise(t, .04, { vol: v, freq: 8000 });
    const chord = (notes, t, v = .09, dur = 1.2) => notes.forEach((f, i) => { voice(f, t + i * .02, { type: "triangle", dur, vol: v, attack: .02 }); voice(f * 2, t + i * .02, { type: "sine", dur: dur * .7, vol: v * .3 }); });
    const tada = (t = now()) => { chord([N.C4, N.E4, N.G4, N.C5], t, .1, 1.6); bell(N.C6, t + .05, .08); bell(N.G6, t + .12, .05); sparkle(t + .1, 6); };
    function sparkle(t = now(), n = 8) { const sc = [N.C6, N.E6, N.G6, N.A5, N.E6]; for (let i = 0; i < n; i++) bell(sc[i % sc.length] * (1 + Math.random() * .01), t + i * .05, .035); }
    function whoosh(t = now(), up = true) { if (!soundOn) return; const len = AC.sampleRate * .8 | 0, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len); const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(up ? 300 : 2400, t); f.frequency.exponentialRampToValueAtTime(up ? 3000 : 300, t + .7); g.gain.value = .09; s.buffer = buf; s.connect(f); f.connect(g); g.connect(OUT); s.start(t); }
    const heartbeat = (t = now()) => { kick(t, .45); kick(t + .26, .3); };
    const pop = (f) => { if (!soundOn) return; const t = now(); voice(f, t, { type: "sine", dur: .12, vol: .14, glide: 1.8, echo: false }); };
    const shutter = () => { if (!soundOn) return; const t = now(); noise(t, .03, { vol: .25, freq: 3000 }); noise(t + .07, .05, { vol: .18, freq: 2000 }); bell(N.E6, t + .1, .03); };
    const crackle = (t) => { for (let i = 0; i < 6; i++) noise(t + Math.random() * .5, .015, { vol: .12, type: "bandpass", freq: 2500 + Math.random() * 3000, q: 4 }); };
    // Tiques que sobem com o número; "ta-dá" quando chega.
    let lastTick = 0;
    function countTick(q) { if (!soundOn) return; const t = now(); if (t - lastTick < .055) return; lastTick = t; const scale = [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6, N.E6, N.G6]; voice(scale[Math.min(scale.length - 1, q * scale.length | 0)], t, { type: "square", dur: .05, vol: .035, echo: false }); }
    const countLand = () => { if (soundOn) tada(); };
    // Pequenas frases para cada cena (curtas: o som acompanha, não é constante).
    function phrase(steps, bpm = 112) { const t0 = now() + .05, step = 60 / bpm / 2; steps.forEach(([k, f, v]) => { if (f === "kick") kick(t0 + k * step); else if (f === "clap") clap(t0 + k * step); else if (f === "hat") hat(t0 + k * step); else (v === "m" ? marimba : pluck)(N[f], t0 + k * step); }); }
    function scoreFor(sc) {
      if (!soundOn) return; const t = now(); clearTimeout(songTimer);
      const c = sc.className;
      if (sc.classList.contains("s-title")) { whoosh(t); kick(t + .6, .7); setTimeout(() => sparkle(now(), 10), 900); }
      else if (sc.classList.contains("s0")) { whoosh(t); phrase([[0,"C4"],[1,"E4"],[2,"G4"],[3,"C5"],[4,"E5"],[6,"D5"],[7,"C5"],[8,"G4"],[10,"A4"],[11,"C5"],[12,"E5"],[14,"G5"]]); }
      else if (sc.classList.contains("s1")) { whoosh(t); heartbeat(t + .3); }
      else if (sc.classList.contains("s2")) { whoosh(t); crackle(t); const iv = every(() => soundOn && crackle(now()), 500); stops.push(() => clearInterval(iv)); }
      else if (sc.classList.contains("s3")) { whoosh(t); voice(N.C4, t + .55, { type: "sine", dur: .5, vol: .2, glide: 2.2, echo: false }); phrase([[2,"C5","m"],[3,"E5","m"],[4,"G5","m"],[5,"E5","m"],[6,"C6","m"],[8,"A5","m"],[9,"G5","m"],[10,"E5","m"],[11,"G5","m"],[12,"C6","m"]], 128); }
      else if (sc.classList.contains("s4")) { whoosh(t); }
      else if (sc.classList.contains("s5")) { whoosh(t); const ft = t + .5; [N.G4, N.C5, N.E5, N.G5].forEach((f, i) => voice(f, ft + i * .12, { type: "sawtooth", dur: i === 3 ? .9 : .18, vol: .05, attack: .01 })); setTimeout(() => { sparkle(now(), 12); }, 1100); }
      else if (sc.classList.contains("s6")) { whoosh(t); bell(N.E5, t + .3, .06); }
      else if (sc.classList.contains("s7")) { heartbeat(t + .2); chord([N.F3, N.A3, N.C4, N.E4], t + .3, .07, 3); const iv = every(() => soundOn && heartbeat(now()), 1100); stops.push(() => clearInterval(iv)); }
      else if (sc.classList.contains("s8")) { for (let i = 0; i < 14; i++) bell([N.C5, N.E5, N.G5, N.C6, N.E6, N.G6, N.C6][i % 7] * (i > 6 ? 1 : 1), t + .3 + i * .07, .04); }
      else if (sc.classList.contains("s9")) { chord([N.C4, N.G4, N.E5], t + .1, .02, .3); [0, .4, .8, 1.2].forEach((d, i) => chord([N.C4, N.E4, N.G4, N.C5], t + d, .02 + i * .025, 1.5)); setTimeout(() => tada(), 1900); }
      else if (sc.classList.contains("s10")) {
        // Final: dois compassos de batida alegre, confetes e "ta-dá".
        const t0 = t + .1, b = 60 / 118;
        for (let i = 0; i < 8; i++) { kick(t0 + i * b, .5); hat(t0 + i * b + b / 2); if (i % 2) clap(t0 + i * b); }
        const mel = ["C5","E5","G5","E5","A5","G5","E5","D5","C5","E5","G5","C6"]; mel.forEach((n, i) => pluck(N[n], t0 + i * b / 1.5, .12));
        [N.C3, N.C3, N.F3, N.G3].forEach((f, i) => voice(f, t0 + i * b * 2, { type: "triangle", dur: b * 1.8, vol: .14, echo: false }));
        for (let i = 0; i < 18; i++) pop(800 + Math.random() * 900), noise(t0 + Math.random() * 2.5, .02, { vol: .08, freq: 5000 });
        songTimer = setTimeout(() => tada(), b * 8 * 1000 + 200);
      }
    }
    doc.querySelector("[data-snd]").addEventListener("click", (e) => {
      e.stopPropagation(); soundOn = !soundOn; audio(); AC.resume();
      OUT.gain.cancelScheduledValues(now()); OUT.gain.setTargetAtTime(soundOn ? .78 : 0, now(), .05);
      e.currentTarget.innerHTML = soundOn ? '<svg class="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.4 18.4a9 9 0 0 0 0-12.8"/></svg>' : '<svg class="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>'; doc.querySelector("[data-snd-hint]").style.display = "none";
      if (soundOn) { sparkle(now(), 5); scoreFor(scenes[cur]); }
    });

    // ═════════ Efeitos (canvas) ═════════
    const HEART = new Path2D("M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z");
    function runFx(sc, kind) {
      const cv = sc.querySelector("canvas.fx"); if (!cv || reduced) return null; const ctx = cv.getContext("2d");
      const W = cv.width = cv.offsetWidth * 2, H = cv.height = cv.offsetHeight * 2; let ps = [], alive = true, t0 = performance.now();
      const add = () => {
        if (kind === "sparks") ps.push({ x: Math.random() * W, y: H + 10, vx: (Math.random() - .5) * 1.2, vy: -(2 + Math.random() * 3), r: 1.5 + Math.random() * 3, c: `rgba(253,${150 + Math.random() * 80 | 0},80,`, life: 1 });
        if (kind === "hearts") ps.push({ x: Math.random() * W, y: H + 30, vx: (Math.random() - .5) * .6, vy: -(1 + Math.random() * 1.6), hs: 14 + Math.random() * 22, a: Math.random() * 6, life: 1 });
        if (kind === "gold") ps.push({ x: W / 2 + (Math.random() - .5) * 80, y: H * .42, vx: (Math.random() - .5) * 12, vy: -(4 + Math.random() * 8), r: 3 + Math.random() * 5, c: ["#FDE68A","#FBBF24","#fff"][Math.random() * 3 | 0], g: .25, a: Math.random() * 6, life: 1 });
        if (kind === "stars") ps.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.4, tw: Math.random() * 6, life: 1, st: true });
        if (kind === "confetti") ps.push({ x: Math.random() * W, y: -20, vx: (Math.random() - .5) * 3, vy: 3 + Math.random() * 4, r: 6 + Math.random() * 8, c: ["#E5466D","#FFB4C6","#4D7CFE","#FDE68A","#fff"][Math.random() * 5 | 0], a: Math.random() * 6, g: .02, life: 1 });
      };
      if (kind === "stars") for (let i = 0; i < 160; i++) add();
      if (kind === "gold") for (let i = 0; i < 90; i++) add();
      (function draw(n) {
        if (!alive) return; ctx.clearRect(0, 0, W, H);
        const el = n - t0;
        if (kind === "sparks") for (let i = 0; i < 3; i++) add();
        if (kind === "hearts" && Math.random() < .12) add();
        if (kind === "confetti" && el < 3000) for (let i = 0; i < 4; i++) add();
        ps.forEach(p => {
          if (p.st) { p.tw += .05; ctx.globalAlpha = .4 + Math.sin(p.tw) * .4; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); return; }
          p.x += p.vx; p.y += p.vy; if (p.g) p.vy += p.g; if (p.a !== undefined) p.a += .12;
          if (p.hs) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.a += .03) * .3); const k = p.hs / 24; ctx.scale(k, k); ctx.translate(-12, -12); ctx.globalAlpha = .55; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.8 / k * 1.2; ctx.stroke(HEART); ctx.restore(); return; }
          p.life -= kind === "sparks" ? .006 : 0; ctx.globalAlpha = Math.max(0, p.life);
          if (p.a !== undefined) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); }
          else { ctx.fillStyle = p.c + p.life + ")"; ctx.shadowColor = "#FB923C"; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
        });
        ps = ps.filter(p => p.st || (p.y > -80 && p.y < H + 80 && p.life > 0));
        ctx.globalAlpha = 1; requestAnimationFrame(draw);
      })(t0);
      return () => { alive = false; ctx.clearRect(0, 0, W, H); };
    }

    // ═════════ O filme ═════════
    const film = doc.querySelector("[data-film]"), scenes = [...film.querySelectorAll(".sc")], barsEl = film.querySelector("[data-bars]");
    let cur = -1, timer = 0, stops = [], startedAt = 0, remaining = 0;
    scenes.forEach(() => { const i = document.createElement("i"); i.appendChild(document.createElement("b")); barsEl.appendChild(i); });
    const bars = [...barsEl.children];
    const count = (el) => { const to = +el.dataset.count, t0 = performance.now() + 700, d = reduced ? 1 : 1700;
      const t = (n) => { const q = Math.max(0, Math.min(1, (n - t0) / d)); const v = Math.round(to * (1 - Math.pow(1 - q, 4))); el.textContent = v >= 1000 ? v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : v; if (q > 0 && q < 1) countTick(q); if (q < 1) requestAnimationFrame(t); else if (!el.dataset.quiet) countLand(); }; requestAnimationFrame(t); };
    function clearFx() { stops.forEach(s => s && s()); stops = []; film.querySelectorAll(".fbub").forEach(e => e.remove()); }
    function go(i) {
      clearFx(); clearTimeout(timer);
      const prev = scenes[cur]; cur = Math.max(0, Math.min(scenes.length - 1, i));
      if (prev && prev !== scenes[cur]) { prev.classList.remove("on"); prev.classList.add("out"); setTimeout(() => prev.classList.remove("out"), 900); }
      scenes[cur].classList.add("on");
      bars.forEach((b, k) => b.className = k < cur ? "done" : "");
      void barsEl.offsetWidth;
      const sc = scenes[cur], dur = +sc.dataset.dur || 0;
      if (dur) { bars[cur].className = "now"; bars[cur].style.setProperty("--dur", dur + "ms"); } else bars[cur].className = "done";
      film.classList.toggle("open", cur === 0); film.classList.toggle("play", cur > 0);
      if (cur > 0) { film.classList.remove("leaking"); void film.offsetWidth; film.classList.add("leaking"); }
      scoreFor(sc);
      sc.querySelectorAll("[data-count]").forEach(count);
      const fx = sc.dataset.fx;
      if (fx && fx !== "bubbles" && fx !== "montage") stops.push(runFx(sc, fx));
      if (fx === "bubbles" && !reduced) { const msgs = [["me","Já saíste?"],["you","Quase, 20 minutos"],["me","Amo-te"],["you","Jantar às 20h?"],["me","Combinado"],["you","Tenho saudades"],["me","Bom dia, amor"],["you","Dorme bem"]]; let k = 0;
        const iv = every(() => { const [w, t] = msgs[k++ % msgs.length]; const b = document.createElement("span"); b.className = "fbub " + w; b.textContent = t; b.style.left = (w === "me" ? 45 + Math.random() * 25 : 5 + Math.random() * 25) + "%"; b.style.animationDuration = (5 + Math.random() * 2) + "s"; sc.appendChild(b); pop(w === "me" ? 900 + Math.random() * 300 : 600 + Math.random() * 200); setTimeout(() => b.remove(), 7200); }, 420); stops.push(() => clearInterval(iv)); }
      if (fx === "montage") { const imgs = [...sc.querySelectorAll(".bgimg")]; let k = 0; imgs.forEach(im => im.classList.remove("show")); imgs[0].classList.add("show");
        const iv = every(() => { imgs[k % imgs.length].classList.remove("show"); k++; imgs[k % imgs.length].classList.add("show"); shutter(); }, 1800); stops.push(() => clearInterval(iv)); }
      if (cur === scenes.length - 1) setTimeout(() => { const a = $pet(sc, "ff"), b = $pet(sc, "fg"); react(a, "happy"); setTimeout(() => { react(b, "happy"); hearts(b, 14); }, 180); }, 700);
      if (dur) { remaining = dur; startedAt = performance.now(); timer = setTimeout(() => go(cur + 1), dur); }
    }
    let pressT = 0;
    film.addEventListener("pointerdown", () => { pressT = performance.now(); clearTimeout(timer); film.classList.add("paused"); remaining -= performance.now() - startedAt; });
    film.addEventListener("pointerup", (e) => {
      film.classList.remove("paused");
      if (e.target.closest(".x")) { onClose(); return; }
      if (e.target.closest("[data-snd]")) { startedAt = performance.now(); if (+scenes[cur].dataset.dur) timer = setTimeout(() => go(cur + 1), Math.max(300, remaining)); return; }
      if (e.target.closest("[data-again]")) { go(0); return; }
      if (e.target.closest("[data-share]")) { onShare(); return; }
      if (performance.now() - pressT > 300) { startedAt = performance.now(); if (+scenes[cur].dataset.dur) timer = setTimeout(() => go(cur + 1), Math.max(300, remaining)); return; }
      const r = film.getBoundingClientRect(); go(e.clientX - r.left < r.width * .3 ? cur - 1 : cur + 1);
    });
    go(0);

  return () => {
    cleanups.forEach((f) => f());
    try { clearTimeout(timer); clearTimeout(songTimer); clearFx(); } catch (e) { /* já limpo */ }
    try { if (AC) AC.close(); } catch (e) { /* sem áudio */ }
  };
}
