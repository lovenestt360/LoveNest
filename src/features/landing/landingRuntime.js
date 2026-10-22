// Comportamento da página inicial: Guardiões, conversa, capítulos e scroll.
// Portado da maqueta aprovada; cada temporizador, evento e observador é limpo ao sair.

/**
 * @param {HTMLElement} root
 * @param {{ A: Record<string, string>, onStart: () => void, onLogin: () => void }} opts
 * @returns {() => void} limpeza
 */
export function mountLanding(root, { A, onStart, onLogin }) {
  let alive = true;
  const cleanups = [];
  const on = (target, type, fn, options) => { target.addEventListener(type, fn, options); cleanups.push(() => target.removeEventListener(type, fn, options)); };
  const every = (fn, ms) => { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); return id; };
  const watch = (cb, options) => { const o = new IntersectionObserver(cb, options); cleanups.push(() => o.disconnect()); return o; };
  const doc = {
    querySelector: (s) => root.querySelector(s),
    querySelectorAll: (s) => root.querySelectorAll(s),
    addEventListener: (type, fn, options) => on(root, type, fn, options),
    createElement: (t) => document.createElement(t),
    get visibilityState() { return document.visibilityState; },
  };

  // Formulários: nunca recarregam a página.
  on(root, "submit", (e) => e.preventDefault(), true);
  // Navegação: criar conta e entrar.
  on(root, "click", (e) => {
    const t = e.target.closest("[data-nav], [data-act='start'], [data-go='start']");
    if (!t) return;
    if (t.dataset.nav === "login") { onLogin(); return; }
    setTimeout(() => alive && onStart(), 650);
  });

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sleep = (ms) => new Promise(r => setTimeout(r, reduced ? 0 : ms));
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
        h.className = "burst"; h.textContent = "♥";
        const a = (Math.PI * 2 * i) / n + Math.random() * .6;
        h.style.setProperty("--dx", `${Math.cos(a) * (40 + Math.random() * 30)}px`);
        h.style.setProperty("--dy", `${-30 - Math.random() * 50}px`);
        h.style.setProperty("--r", `${(Math.random() - .5) * 60}deg`);
        h.style.fontSize = `${10 + Math.random() * 8}px`;
        h.style.animationDelay = `${i * 30}ms`;
        pet.appendChild(h); setTimeout(() => h.remove(), 1300);
      }
    }


    // Envolve as imagens para os Guardiões se poderem inclinar e reagir.
    doc.querySelectorAll(".pet").forEach(pet => {
      let body = pet.querySelector(".pet-body");
      const img = pet.querySelector("img");
      if (!body) { body = document.createElement("span"); body.className = "pet-body"; img.replaceWith(body); body.appendChild(img); }
      if (pet.closest(".stage-item")) return;
      body.addEventListener("click", () => { react(pet, "happy"); hearts(pet); say(pet, ["Olá! 💕", "Hehe 😊", "Vamos?"][Math.floor(Math.random() * 3)]); });
      body.addEventListener("mouseenter", () => react(pet, "wiggle"));
    });

    // Inclinam-se para o rato.
    on(window, "pointermove", (e) => {
      if (reduced) return;
      doc.querySelectorAll(".pet-body").forEach(body => {
        const r = body.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
        body.style.setProperty("--rot", `${Math.max(-10, Math.min(10, dx * 30))}deg`);
        body.style.setProperty("--tx", `${Math.max(-6, Math.min(6, dx * 20))}px`);
        body.style.setProperty("--ty", `${Math.max(-4, Math.min(4, dy * 12))}px`);
      });
    });

    // A app "escreve".
    async function play(chat) {
      const script = JSON.parse(chat.dataset.script || "[]");
      chat.innerHTML = "";
      await sleep(Number(chat.dataset.start || 0));
      for (const [who, text] of script) {
        if (who !== "me") {
          const t = document.createElement("div"); t.className = "typing"; t.innerHTML = "<i></i><i></i><i></i>";
          chat.appendChild(t); await sleep(Math.min(1100, 380 + text.length * 14)); t.remove();
        } else await sleep(600);
        const b = document.createElement("div"); b.className = "bub " + who; b.textContent = text; chat.appendChild(b);
        await sleep(260);
      }
    }

    // Contagem.
    doc.querySelectorAll("[data-count]").forEach(el => {
      const to = Number(el.dataset.count), t0 = performance.now() + (reduced ? 0 : 600), dur = reduced ? 0 : 1400;
      const tick = (now) => { const p = dur ? Math.max(0, Math.min(1, (now - t0) / dur)) : 1; el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });

    const her = $pet(doc, "her"), him = $pet(doc, "him");
    let visitor = "";
    const halos = ["rgba(244,114,182,.45)","rgba(255,139,61,.4)","rgba(45,217,196,.35)","rgba(77,124,254,.4)","rgba(155,93,229,.4)","rgba(255,200,61,.45)","rgba(155,93,229,.45)"];

    // Palavra a palavra.
    doc.querySelectorAll(".words").forEach(h => {
      h.innerHTML = h.textContent.split(" ").map((w, i) => `<span class="w" style="--wi:${i}">${w}</span>`).join(" ");
    });
    function setWords(h, text) {
      h.innerHTML = text.split(" ").map((w, i) => `<span class="w" style="--wi:${i}">${w}</span>`).join(" ");
      h.classList.remove("seen"); void h.offsetWidth; h.classList.add("seen");
    }
    const heroH1 = doc.querySelector("h1");
    heroH1.classList.add("words");
    heroH1.innerHTML = heroH1.textContent.split(" ").map((w, i) => `<span class="w" style="--wi:${i + 2}">${w}</span>`).join(" ");
    requestAnimationFrame(() => heroH1.classList.add("seen"));

    // ── Conversa com quem chega ──
    const helloChat = doc.querySelector("[data-hello-chat]");
    const rows = Object.fromEntries([...doc.querySelectorAll("[data-reply]")].map(r => [r.dataset.reply, r]));
    const showRow = (name) => Object.entries(rows).forEach(([k, r]) => r.classList.toggle("show", k === name));
    async function guardianSays(lines, pet = him) {
      for (const text of lines) {
        const t = document.createElement("div"); t.className = "typing"; t.innerHTML = "<i></i><i></i><i></i>";
        helloChat.appendChild(t); pet.classList.add("talking"); helloChat.scrollTop = 1e6;
        await sleep(Math.min(1000, 360 + text.length * 13));
        t.remove(); pet.classList.remove("talking");
        const b = document.createElement("div"); b.className = "bub app"; b.textContent = text; helloChat.appendChild(b);
        helloChat.scrollTop = 1e6; await sleep(240);
      }
    }
    function youSay(text) {
      const b = document.createElement("div"); b.className = "bub me"; b.textContent = text; helloChat.appendChild(b); helloChat.scrollTop = 1e6;
    }
    function personalise(name) {
      visitor = name;
      try { localStorage.setItem("onboarding_name", name); } catch {}
      const eb = doc.querySelector("[data-hello-eyebrow]");
      eb.innerHTML = `<span class="name-swap">Olá, ${name} 👋</span>`;
      doc.querySelectorAll("[data-cta]").forEach(b => { if (!b.classList.contains("nav-cta")) b.innerHTML = `Começar, ${name} <span class="arrow">→</span>`; });
      setWords(doc.querySelector("[data-final-title]"), `${name}, comecem pelos dias comuns.`);
    }

    (async () => {
      await sleep(1400);
      react(him, "wiggle"); say(him, "Olá! 👋", 1800);
      await guardianSays(["Olá! Sou o Guardião do LoveNest.", "Como te chamas?"]);
      showRow("name");
    })();

    const nameForm = rows.name, nameIn = nameForm.querySelector("input"), sendBtn = nameForm.querySelector("button");
    nameIn.addEventListener("input", () => {
      sendBtn.disabled = !nameIn.value.trim();
      react(her, "nod");
      const v = nameIn.value.trim().split(" ")[0];
      if (v) say(her, `Olá, ${v}! 👋`, 0); else say(her, "…", 800);
    });
    nameForm.addEventListener("submit", async () => {
      const name = nameIn.value.trim().split(" ")[0]; if (!name) return;
      const nice = name.charAt(0).toUpperCase() + name.slice(1);
      showRow(null); youSay(nice); personalise(nice);
      react(her, "happy"); react(him, "happy"); hearts(him, 8);
      say(her, `${nice}! 💕`, 1800);
      await sleep(400);
      await guardianSays([`Prazer, ${nice} 💙`, "Há alguém especial na tua vida?"]);
      showRow("who");
    });
    rows.who.addEventListener("click", async (e) => {
      const c = e.target.closest("[data-who]"); if (!c) return;
      showRow(null); youSay(c.textContent);
      if (c.dataset.who === "yes") {
        react(her, "happy"); react(him, "spin"); hearts(her, 10); hearts(him, 10);
        await guardianSays(["Que bonito! 💕", "Este espaço é para vocês os dois. Criamos o vosso?"]);
      } else if (c.dataset.who === "solo") {
        react(him, "nod");
        await guardianSays(["Também tens o modo a solo, só para ti 🌿", "Queres experimentar?"]);
      } else {
        react(him, "wiggle");
        await guardianSays(["Fica à vontade! 😊", "Desce e eu mostro-te tudo."]);
      }
      showRow("go");
    });
    rows.go.addEventListener("click", (e) => {
      const c = e.target.closest("[data-go]"); if (!c) return;
      if (c.dataset.go === "tour") { scrollTo({ top: doc.querySelector(".chapter").offsetTop, behavior: "smooth" }); }
      else { react(him, "spin"); hearts(him, 12); say(him, "Vamos a isso! ✨"); }
    });

    // ── Hero: os Guardiões criam os cartões da app ──
    const sceneTop = doc.querySelector(".scene-top");
    const slots = [...doc.querySelectorAll("[data-slot]")];
    const centre = (el) => { const r = el.getBoundingClientRect(), b = sceneTop.getBoundingClientRect(); return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 }; };
    function arc(el, from, to, dur = 900, lift = 90) {
      sceneTop.appendChild(el);
      const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift };
      const kf = [0, .25, .5, .75, 1].map(t => {
        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * mid.x + t * t * to.x;
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * mid.y + t * t * to.y;
        return { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${t * 20 - 10}deg) scale(${1 + Math.sin(t * Math.PI) * .25})`, opacity: t > .92 ? 0 : 1 };
      });
      return el.animate(kf, { duration: reduced ? 1 : dur, easing: "cubic-bezier(.45,.05,.35,1)" }).finished.then(() => el.remove());
    }
    let slotTurn = 0;
    async function place(html, fromPet) {
      const slot = slots[slotTurn++ % slots.length];
      const card = Object.assign(document.createElement("span"), { className: "fly-card" });
      await arc(card, centre(fromPet), centre(slot), 800, 60);
      slot.classList.add("swap");
      slot.innerHTML = `<div class="c-in">${html}</div>`;
      slot.animate([{ transform: `rotate(${getComputedStyle(slot).getPropertyValue("--r")}) scale(1.06)` }, { transform: `rotate(${getComputedStyle(slot).getPropertyValue("--r")}) scale(1)` }], { duration: 450, easing: "cubic-bezier(.22,1,.36,1)" });
    }
    const ACTS = [
      async () => { // a Faísca atira um coração, o Guardião apanha
        react(her, "wiggle");
        await arc(Object.assign(document.createElement("span"), { className: "fly", textContent: "❤️" }), centre(her), centre(him), 950, 110);
        react(him, "happy"); hearts(him, 5);
        await place(`<div class="k">LoveNest · agora</div><div class="c-row"><span class="c-emo">💌</span><div><b>O Miguel pensou em ti</b><small>Toca para responder</small></div></div>`, him);
      },
      async () => { // humor
        react(him, "nod");
        await arc(Object.assign(document.createElement("span"), { className: "fly", textContent: "😊" }), centre(him), { x: centre(him).x, y: centre(him).y - 80 }, 700, 20);
        await place(`<div class="k">LoveNest · agora</div><div class="c-row"><span class="c-emo">😊</span><div><b>A Ana está feliz</b><small>Humor de hoje</small></div></div>`, him);
      },
      async () => { // memória
        react(her, "happy");
        await place(`<div class="k">LoveNest · agora</div><div class="c-row"><span class="c-photo"></span><div><b>Nova memória</b><small>O primeiro café · 12 fotos</small></div></div>`, her);
      },
      async () => { // plano
        react(him, "spin");
        await place(`<div class="k">LoveNest · agora</div><div class="c-row"><span class="c-date"><small>SÁB</small>25</span><div><b>Cinema no sábado</b><small>19:30 · os dois</small></div></div>`, him);
      },
      async () => { // a chama sobe com os dois
        react(her, "happy"); setTimeout(() => react(him, "happy"), 150); hearts(her, 4); hearts(him, 4);
        await place(`<div class="k">LoveNest · agora</div><div class="c-row"><img src="${A.chama_thumb}" alt="" style="width:36px;height:36px" /><div><b>12 dias de chama 🔥</b><small>Os dois apareceram hoje</small></div></div>`, her);
      },
    ];
    (async () => {
      await sleep(2600);
      let i = 0;
      while (alive) {
        if (document.visibilityState === "visible" && sceneTop.getBoundingClientRect().bottom > 0) await ACTS[i++ % ACTS.length]();
        await new Promise(r => setTimeout(r, reduced ? 4000 : 2600)); if (!alive) return;
      }
    })();

    // ── Capítulos ──
    const chapters = [...doc.querySelectorAll("[data-chapter]")];
    const dotsNav = doc.querySelector("[data-ch-dots]");
    function push(ch, text, ms = 3200) {
      const el = ch.querySelector("[data-push]"); if (!el) return;
      el.querySelector("[data-push-text]").textContent = text;
      el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
      clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), ms);
    }
    function tapAt(ch, xPct, yPct) {
      const ring = ch.querySelector("[data-tap-ring]");
      ring.style.left = xPct + "%"; ring.style.top = yPct + "%";
      ring.classList.remove("go"); void ring.offsetWidth; ring.classList.add("go");
    }
    const greeted = new Set();
    function onChapters() {
      let active = null;
      chapters.forEach(ch => {
        const r = ch.getBoundingClientRect();
        const total = ch.offsetHeight - innerHeight;
        const pr = Math.max(0, Math.min(1, -r.top / (total || 1)));
        if (r.top < innerHeight * .5 && r.bottom > innerHeight * .5) active = ch;
        const pan = ch.querySelector("[data-pan]");
        if (pan && !reduced) {
          const screen = pan.parentElement;
          pan.style.transform = `translateY(${-pr * (pan.offsetHeight - screen.offsetHeight)}px)`;
        }
        if (r.top < innerHeight * .4 && r.bottom > innerHeight * .6 && !greeted.has(ch)) {
          greeted.add(ch);
          const g = ch.querySelector(".ch-guide");
          setTimeout(() => { react(g, "wiggle"); say(g, (visitor && ch.dataset.chapter === "casa" ? `${visitor}, ` : "") + ch.dataset.say, 2600); }, 500);
        }
      });
      dotsNav.classList.toggle("show", !!active);
      dotsNav.querySelectorAll("a").forEach(a => a.classList.toggle("on", active && a.dataset.dot === active.dataset.chapter));
    }
    on(window, "scroll", onChapters, { passive: true }); onChapters();

    // Casa: o tempo juntos a correr de verdade.
    const since = new Date(2026, 0, 17);
    every(() => {
      const ms = Date.now() - since; const t = { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
      doc.querySelectorAll("[data-t]").forEach(el => { el.textContent = String(t[el.dataset.t]).padStart(el.dataset.t === "d" ? 1 : 2, "0"); });
    }, 1000);

    // Conversa: o que escreves aparece no chat real e o Miguel responde.
    const chatCh = doc.querySelector("#ch-chat"), msgs = chatCh.querySelector("[data-msgs]"), chatG = chatCh.querySelector(".ch-guide");
    const replies = ["Também tenho ❤️", "Combinado 🍝", "Amo-te mais 🥰", "Hehe, já vou 😊"];
    const hhmm = () => new Date().toTimeString().slice(0, 5);
    function sendMsg(text) {
      if (!text) return;
      const b = document.createElement("div"); b.className = "nb me"; b.innerHTML = `${text.replace(/</g, "&lt;")}<small>${hhmm()} ✓✓</small>`; msgs.appendChild(b);
      tapAt(chatCh, 95, 97.5); react(chatG, "nod");
      setTimeout(() => {
        const r = /\bamo/i.test(text) ? "Amo-te mais 🥰" : /saudade/i.test(text) ? "Também tenho ❤️ Já vou" : /jant/i.test(text) ? "Combinado 🍝 Às 20h?" : replies[Math.floor(Math.random() * replies.length)];
        const y = document.createElement("div"); y.className = "nb you"; y.innerHTML = `${r}<small>${hhmm()}</small>`; msgs.appendChild(y);
        react(chatG, "happy"); hearts(chatG, 5);
      }, reduced ? 0 : 1300);
    }
    const chatForm = chatCh.querySelector("[data-try-chat]"), chatIn = chatForm.querySelector("input");
    chatForm.addEventListener("submit", () => { sendMsg(chatIn.value.trim()); chatIn.value = ""; });
    chatCh.querySelectorAll("[data-quick] button").forEach(b => b.addEventListener("click", () => sendMsg(b.textContent)));

    // Humor: o teu par recebe a notificação; o Guardião reage ao que sentes.
    const humorCh = doc.querySelector("#ch-humor"), humorG = humorCh.querySelector(".ch-guide");
    const moodPos = { Feliz: [19, 30], Tranquilo: [41, 30], Apaixonado: [63, 30], Ansioso: [84, 30], Triste: [19, 40], Cansado: [41, 40], Irritado: [63, 40], Grato: [84, 40] };
    humorCh.querySelectorAll("[data-mood]").forEach(b => b.addEventListener("click", () => {
      humorCh.querySelectorAll("[data-mood]").forEach(x => x.classList.toggle("sel", x === b));
      const m = b.dataset.mood, emo = b.querySelector("span").textContent;
      tapAt(humorCh, ...moodPos[m]);
      push(humorCh, `Humor ${visitor ? "de " + visitor : "da Ana"}: ${m} ${emo}`);
      const kind = b.dataset.react;
      if (kind === "hug") { react(humorG, "nod"); say(humorG, "Estou aqui contigo 🤍", 2400); hearts(humorG, 4); }
      else if (kind === "love") { react(humorG, "happy"); hearts(humorG, 12); say(humorG, "Que bonito 😍", 2200); }
      else { react(humorG, "happy"); say(humorG, kind === "nod" ? "Boa, com calma 🌿" : "Isso! 😊", 2200); }
    }));

    // Agenda: escolher o dia marca o jantar e chega a notificação.
    const agCh = doc.querySelector("#ch-agenda"), agG = agCh.querySelector(".ch-guide");
    const dayPos = { "23": [73, 79.5], "24": [85, 79.5], "25": [10.5, 84.5], "26": [23, 84.5] };
    agCh.querySelectorAll("[data-day]").forEach(b => b.addEventListener("click", () => {
      agCh.querySelectorAll("[data-day]").forEach(x => x.classList.toggle("sel", x === b));
      tapAt(agCh, ...dayPos[b.dataset.day]);
      push(agCh, `Jantar marcado para ${b.dataset.label}, às 20:30 🍝`);
      react(agG, "spin"); say(agG, "Marcado! 🗓️", 2000);
    }));

    // Cápsula: a mensagem fica guardada para daqui a um ano.
    const capCh = doc.querySelector("#ch-capsula"), capG = capCh.querySelector(".ch-guide");
    const capForm = capCh.querySelector("[data-try-capsule]"), capIn = capForm.querySelector("input");
    capForm.addEventListener("submit", () => {
      if (!capIn.value.trim()) { react(capG, "shake"); say(capG, "Escreve algo primeiro ✍️", 1800); return; }
      const d = new Date(); d.setFullYear(d.getFullYear() + 1);
      tapAt(capCh, 94, 5.5);
      push(capCh, `Cápsula guardada. Abre a ${d.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })} 🔒`, 3800);
      react(capG, "spin"); hearts(capG, 8); say(capG, "Guardada até lá 🔒", 2400);
      capIn.value = "";
    });

    // ── Memórias: a foto vai para o espaço do casal ──
    const memCh = doc.querySelector("#ch-memorias"), memG = memCh.querySelector(".ch-guide");
    memCh.querySelector("[data-keep]").addEventListener("click", () => {
      const left = [...memCh.querySelectorAll(".polaroid:not(.gone)")];
      if (!left.length) { memCh.querySelectorAll(".polaroid").forEach(p => p.classList.remove("gone")); return; }
      const top = left[left.length - 1];
      const dev = memCh.querySelector(".device").getBoundingClientRect(), r = top.getBoundingClientRect();
      if (!reduced) top.animate([{ transform: getComputedStyle(top).transform }, { transform: `translate(${dev.left + dev.width / 2 - (r.left + r.width / 2)}px, ${dev.top + dev.height * .3 - (r.top + r.height / 2)}px) scale(.3) rotate(12deg)`, opacity: .2 }], { duration: 700, easing: "cubic-bezier(.45,.05,.35,1)" });
      setTimeout(() => {
        top.classList.add("gone");
        tapAt(memCh, 92, 6.5);
        push(memCh, `Nova memória: ${top.dataset.photo} 📸`);
        react(memG, "happy"); hearts(memG, 6); say(memG, "Guardada para sempre 💛", 2200);
        if (left.length === 1) memCh.querySelector("[data-keep]").innerHTML = 'Ver outra vez <span class="arrow">↺</span>';
      }, reduced ? 0 : 650);
    });

    // ── Desafios: concluir dá festa ──
    const dsCh = doc.querySelector("#ch-desafios"), dsG = dsCh.querySelector(".ch-guide"), dsCard = dsCh.querySelector("[data-challenge]");
    dsCh.querySelector("[data-done]").addEventListener("click", () => {
      if (dsCard.classList.contains("ok")) return;
      dsCard.classList.add("ok"); dsCh.querySelector("[data-done]").innerHTML = 'Concluído <span class="arrow">✓</span>';
      tapAt(dsCh, 78.5, 44.2);
      push(dsCh, "Desafio concluído: Cozinhar juntos um prato novo 🎉");
      react(dsG, "spin"); hearts(dsG, 14); say(dsG, "Vocês conseguiram! 🎉", 2600);
    });

    // ── Wrapped: os slides avançam com o scroll; os números contam ──
    const wrCh = doc.querySelector("#ch-wrapped"), slides = wrCh.querySelectorAll("[data-story]");
    let slideNow = -1;
    function onWrapped() {
      const r = wrCh.getBoundingClientRect(), total = wrCh.offsetHeight - innerHeight;
      const pr = reduced ? 1 : Math.max(0, Math.min(.999, -r.top / (total || 1)));
      const k = pr * slides.length, idx = Math.floor(k);
      if (idx !== slideNow) {
        slideNow = idx; slides.forEach((sl, i) => sl.classList.toggle("on", i === idx));
        if (r.top < innerHeight * .5 && r.bottom > innerHeight * .5) { const g = wrCh.querySelector(".ch-guide"); react(g, idx === slides.length - 1 ? "spin" : "nod"); if (idx === slides.length - 1) hearts(g, 10); }
      }
    }
    on(window, "scroll", onWrapped, { passive: true }); onWrapped();
    watch((es, o) => es.forEach(en => {
      if (!en.isIntersecting) return; o.disconnect();
      en.target.querySelectorAll("[data-to]").forEach(el => {
        const to = Number(el.dataset.to), t0 = performance.now(), dur = reduced ? 0 : 1600;
        const tick = (now) => { const q = dur ? Math.min(1, (now - t0) / dur) : 1; el.textContent = Math.round(to * (1 - Math.pow(1 - q, 3))).toLocaleString("pt-PT"); if (q < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
    }), { threshold: .6 }).observe(wrCh.querySelector("[data-stats]"));

    // ── Companheiro ──
    const buddy = doc.querySelector("[data-buddy]"), buddyPet = $pet(doc, "buddy");
    function buddySay(text) {
      react(buddyPet, "nod");
      say(buddyPet, visitor && Math.random() < .5 ? `${visitor}, ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text, 3200);
    }
    const hide = new Set();
    const heroIO = watch((es) => { es.forEach(en => en.isIntersecting ? hide.add(en.target) : hide.delete(en.target)); buddy.classList.toggle("show", hide.size === 0); }, { threshold: .15 });
    heroIO.observe(doc.querySelector(".hero"));
    const chIO = watch((es) => { es.forEach(en => en.isIntersecting ? hide.add(en.target) : hide.delete(en.target)); buddy.classList.toggle("show", hide.size === 0); }, { threshold: 0 });
    doc.querySelectorAll("[data-chapter]").forEach(c => chIO.observe(c));

    const commented = new Set();
    const cIO = watch((es) => es.forEach(en => {
      if (!en.isIntersecting || commented.has(en.target)) return;
      commented.add(en.target); setTimeout(() => buddySay(en.target.dataset.comment), 500);
    }), { threshold: .35 });
    doc.querySelectorAll("[data-comment]").forEach(el => cIO.observe(el));
    buddyPet.querySelector(".pet-body")?.addEventListener("click", () => doc.querySelector(".final").scrollIntoView({ behavior: "smooth" }));

    // ── A chama evolui com o scroll ──
    const STAGES = [["Faísca",0,"Uma faísca chega para começar ✨"],["Brasa",3,"Já há calor aqui 🔥"],["Chama",7,"Uma semana! A chama acende 💫"],["Guardião",14,"Agora protejo-vos 💙"],["Sentinela",30,"Um mês. Sempre atento 👀"],["Eterno",90,"Isto já é para durar ♾️"],["Soberano",365,"Um ano juntos 👑"]];
    const evo = doc.querySelector("[data-evolve]"), evoPet = $pet(doc, "evo");
    const evoImgs = evo.querySelectorAll(".orb img"), ring = evo.querySelector("[data-ring]"), halo = evo.querySelector("[data-halo]");
    const dots = evo.querySelectorAll(".evolve-dots i");
    let stageNow = -1;
    function onEvolve() {
      const r = evo.getBoundingClientRect();
      const total = evo.offsetHeight - innerHeight;
      const p = reduced ? 1 : Math.max(0, Math.min(1, -r.top / (total || 1)));
      const idx = Math.min(STAGES.length - 1, Math.floor(p * STAGES.length));
      ring.style.strokeDashoffset = String(100 - p * 100);
      // dias entre o limiar do estágio e o seguinte
      const within = p * STAGES.length - idx;
      const d0 = STAGES[idx][1], d1 = STAGES[idx + 1] ? STAGES[idx + 1][1] : 365;
      const days = idx === STAGES.length - 1 ? 365 : Math.round(d0 + (d1 - d0) * within);
      evo.querySelector("[data-stage-days]").textContent = days >= 365 ? "1 ano" : `dia ${days}`;
      if (idx !== stageNow) {
        stageNow = idx;
        evoImgs.forEach((im, i) => im.classList.toggle("on", i === idx));
        dots.forEach((d, i) => d.classList.toggle("on", i <= idx));
        evo.querySelector("[data-stage-name]").textContent = STAGES[idx][0];
        halo.style.background = halos[idx];
        if (r.top < innerHeight * .5 && r.bottom > innerHeight * .5) { react(evoPet, "happy"); hearts(evoPet, 5); say(evoPet, STAGES[idx][2], 2000); }
      }
    }
    on(window, "scroll", onEvolve, { passive: true }); onEvolve();
    // A faixa dos 7 leva ao ponto certo da evolução.
    doc.querySelectorAll(".stage-item").forEach((item, i) => item.addEventListener("dblclick", () => {
      const total = evo.offsetHeight - innerHeight;
      scrollTo({ top: evo.offsetTop + total * (i + .5) / STAGES.length, behavior: "smooth" });
    }));

    // ── Privacidade: as promessas marcam-se ──
    const guardP = $pet(doc, "guard");
    const promises = [...doc.querySelectorAll(".promise")];
    function tick(pr) {
      if (pr.classList.contains("ok")) return;
      pr.classList.add("ok"); react(guardP, "nod");
      if (promises.every(x => x.classList.contains("ok"))) setTimeout(() => { react(guardP, "happy"); hearts(guardP, 10); say(guardP, "Prometido 🤝", 2600); }, 300);
    }
    promises.forEach(pr => pr.addEventListener("click", () => tick(pr)));
    watch((es, o) => es.forEach(en => {
      if (!en.isIntersecting) return; o.disconnect();
      promises.forEach((pr, i) => setTimeout(() => tick(pr), reduced ? 0 : 900 + i * 650));
    }), { threshold: .5 }).observe(doc.querySelector(".promises"));

    // ── Botões magnéticos ──
    doc.querySelectorAll(".magnetic").forEach(b => {
      b.addEventListener("pointermove", (e) => {
        if (reduced || e.pointerType !== "mouse") return;
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .12}px, ${(e.clientY - r.top - r.height / 2) * .25}px)`;
      });
      b.addEventListener("pointerleave", () => { b.style.transform = ""; });
    });

    // Aparecer ao fazer scroll.
    const io = watch((entries) => entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add("seen");
      en.target.querySelectorAll(".words").forEach(w => w.classList.add("seen"));
      en.target.querySelectorAll("[data-onview]").forEach(c => { delete c.dataset.onview; play(c); });
      io.unobserve(en.target);
    }), { threshold: 0.2 });
    doc.querySelectorAll(".reveal, .words").forEach(el => io.observe(el));

    // Barra de navegação ganha linha ao descer.
    on(window, "scroll", () => doc.querySelector(".nav").classList.toggle("scrolled", scrollY > 8), { passive: true });

    // Estágios da chama: cada um fala ao passar ou tocar.
    doc.querySelectorAll(".stage-item").forEach(item => {
      const pet = item.querySelector(".pet");
      const go = () => {
        doc.querySelectorAll(".stage-item").forEach(x => x.classList.toggle("on", x === item));
        react(pet, "happy"); say(pet, item.dataset.say, 2400);
      };
      item.addEventListener("mouseenter", go); item.addEventListener("click", go);
    });

    // Privacidade: o Guardião fala quando aparece.
    const guard = $pet(doc, "guard");
    watch((es, o) => es.forEach(en => { if (en.isIntersecting) { setTimeout(() => { react(guard, "wiggle"); say(guard, "Isto fica entre vocês 🔒", 2200); }, 200); o.disconnect(); } }), { threshold: .6 }).observe(guard);

    // Final: os dois saltam juntos.
    const her2 = $pet(doc, "her2"), him2 = $pet(doc, "him2");
    watch((es, o) => es.forEach(en => { if (en.isIntersecting) { setTimeout(() => { react(her2, "happy"); setTimeout(() => { react(him2, "happy"); hearts(him2, 8); }, 180); }, 400); o.disconnect(); } }), { threshold: .6 }).observe(her2);

    // Ondinha e festa no "Criar".
    doc.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".btn"); if (!btn || reduced) return;
      const r = btn.getBoundingClientRect(); const s = Math.max(r.width, r.height) / 2;
      const span = document.createElement("span"); span.className = "ripple";
      span.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
      btn.appendChild(span); setTimeout(() => span.remove(), 650);
    });
    doc.querySelectorAll('[data-act="start"]').forEach(b => b.addEventListener("click", () => { react(him, "spin"); hearts(him, 10); say(him, visitor ? `Vamos a isso, ${visitor}! ✨` : "Vamos a isso! ✨"); }));

  return () => { alive = false; cleanups.forEach((f) => f()); };
}
