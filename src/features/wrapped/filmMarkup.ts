// Marcação do filme do LoveWrapped (gerada a partir de docs/mockups/wrapped-local-proposta.html).
import faisca from "@/features/entry/assets/faisca.webp";
import guardiao from "@/features/entry/assets/guardiao.webp";
import chama from "@/features/landing/stages/chama.webp";

export interface FilmData {
  names: string; month: string; year: number; cover: string | null; photos: string[];
  days: number; streak: number; mood: string; moodCheckins: number; messages: number;
  challenges: number; memories: number; house: string;
}

const A = { faisca, guardiao, chama };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

export const filmMarkup = (D: FilmData) => `<div class="film" data-film>
    <div class="lb t"></div><div class="lb b"></div>
    <div class="leak"></div><div class="vignette"></div><div class="grain"></div>
    <div class="bars" data-bars></div>
    <button class="fbtn snd" data-snd aria-label="Ligar som"><svg class="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg></button><button class="fbtn x" aria-label="Fechar"><svg class="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
    <span class="snd-hint" data-snd-hint>Liga o som</span>

    <section class="sc s-title" data-dur="5600"><div class="aurora"><i></i><i></i><i></i></div>
      <div class="countdown"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="70" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="2"/><circle class="sweep" cx="75" cy="75" r="70" fill="none" stroke="#fff" stroke-width="2"/></svg><b>3</b><b>2</b><b>1</b></div>
      <div class="meet"><div class="pet f glow-rose"><img src="${A.faisca}" alt="" /></div><span class="love"><svg class="ico" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></span><div class="pet g glow-blue"><img src="${A.guardiao}" alt="" /></div></div>
      <p class="line serif names" style="font-size:38px;margin-top:18px">${esc(D.names)}</p><p class="presents note" style="letter-spacing:.32em;font-size:11px;font-weight:700;margin-top:8px">O VOSSO MÊS NO LOVENEST</p></section>
    <section class="sc s0" data-dur="6000">${D.cover ? `<div class="bgimg kb" style="background-image:url('${D.cover}')"></div>` : `<div class="aurora"><i></i><i></i><i></i></div>`}<div class="shade"></div>
      <p class="kick r1">O vosso filme de</p><p class="month serif chars" data-chars>${esc(D.month)}</p><p class="note r3">${D.year}${D.cover ? " · a última foto do mês" : ""}</p>
      <div class="pair r4"><div class="pet f glow-rose"><img src="${A.faisca}" alt="" /></div><div class="pet glow-blue"><img src="${A.guardiao}" alt="" /></div></div></section>
    <section class="sc s1" data-dur="5200" data-sfx="heart"><span class="ring"></span><span class="ring"></span><span class="ring"></span>
      <p class="kick r1">Vocês já somam…</p><p class="mega r2" data-count="${D.days}">0</p><p class="line r3">dias de <em>pura história</em></p></section>
    <section class="sc s2" data-dur="5600" data-fx="sparks"><canvas class="fx"></canvas><p class="kick r1">"Nem sempre foi fácil…"</p><p class="line r2" style="color:#FED7AA">…mas vocês continuaram</p><div class="pet flame"><img src="${A.chama}" alt="" /></div><p class="mega r3" data-count="${D.streak}" style="font-size:86px">0</p><p class="note r4">dias seguidos de chama</p></section>
    <section class="sc s3" data-dur="5200" data-fx="none"><canvas class="fx"></canvas>
      <span class="bokeh" style="left:8%;top:18%;width:90px;height:90px"></span><span class="bokeh" style="right:4%;top:30%;width:60px;height:60px;animation-delay:-2s"></span><span class="bokeh" style="left:14%;bottom:16%;width:70px;height:70px;animation-delay:-4s"></span><span class="bokeh" style="right:12%;bottom:22%;width:110px;height:110px;animation-delay:-1s"></span>
      <p class="kick r1">Este mês sentiram-se…</p><div class="moodcircle"><div class="pet glow-rose" data-pet="moodpet"><img src="${A.faisca}" alt="" /></div></div><p class="mega serif r3" style="font-size:70px;letter-spacing:-.03em">${esc(D.mood)}</p><p class="note r4">${D.moodCheckins} ${D.moodCheckins === 1 ? "registo" : "registos"} de humor a dois</p></section>
    <section class="sc s4" data-dur="5600" data-fx="bubbles"><p class="kick r1">Este mês…</p><p class="line r1">as vossas palavras aqueceram a casa</p><p class="mega r2" data-count="${D.messages}" style="font-size:96px;margin-top:10px">0</p><p class="note r3">mensagens enviadas com carinho</p></section>
    <section class="sc s5" data-dur="5200" data-fx="gold"><canvas class="fx"></canvas><svg class="trophy" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3C4"/><stop offset=".5" stop-color="#FBBF24"/><stop offset="1" stop-color="#B45309"/></linearGradient></defs><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill="url(#gold)" stroke="#FFF3C4" stroke-width=".6"/><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" fill="none" stroke="#FBBF24" stroke-width="1.6" stroke-linecap="round"/><path d="M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22h10c0-1.8-.9-3.2-2-3.8-.5-.2-1-.6-1-1.2v-2.3" fill="url(#gold)"/><path d="M9.5 6.5l1.2 1.2 2.6-2.6" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/></svg><p class="line r2">Cresceram juntos,<br/>desafio a desafio</p><p class="mega r3" data-count="${D.challenges}" style="font-size:96px">0</p><p class="note r4">desafios concluídos</p></section>
    <section class="sc s6" data-dur="7600" data-fx="montage">
      ${D.photos.map((p) => `<div class="bgimg" style="background-image:url('${p}')"></div>`).join("")}<div class="shade"></div>
      ${D.photos.length ? `<p class="line serif r1" style="font-size:34px">Momentos que ficam<br/>para sempre</p>` : `<p class="line serif r1" style="font-size:30px">Nem todos os momentos<br/>foram registados…</p><p class="line r2" style="color:#FFB4C6">…mas foram vividos</p>`}<p class="note r2"><b style="color:#fff" data-count="${D.memories}">0</b> memórias guardadas este mês</p>
      <div class="strip">${D.photos.map((p, i) => `<img src="${p}" alt="" style="--i:${i}" />`).join("")}</div></section>
    <section class="sc s7" data-dur="5000" data-sfx="heart"><svg class="drawheart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg><div class="pair2"><div class="pet f glow-rose"><img src="${A.faisca}" alt="" /></div><div class="pet glow-blue"><img src="${A.guardiao}" alt="" /></div></div><p class="line serif r2" style="font-size:32px;margin-top:20px">Vocês são mais<br/>do que números…</p></section>
    <section class="sc s8" data-dur="4200" data-fx="stars"><canvas class="fx"></canvas><p class="mega serif chars" data-chars style="font-size:52px;letter-spacing:-.02em;line-height:1.05">…são uma história de amor.</p></section>
    <section class="sc s9" data-dur="5200"><div class="sun"></div><p class="kick r1">E isto…</p><p class="mega serif r2" style="font-size:58px;letter-spacing:-.02em;margin-top:8px">é só o começo.</p></section>
    <section class="sc s10" data-dur="0" data-fx="confetti"><canvas class="fx"></canvas>
      <div class="pair r1"><div class="pet f glow-rose" data-pet="ff"><img src="${A.faisca}" alt="" /></div><div class="pet glow-blue" data-pet="fg"><img src="${A.guardiao}" alt="" /></div></div>
      <p class="house serif r2">${esc(D.house)}</p><p class="refuge r2">O VOSSO REFÚGIO</p>
      <div class="cta r3"><button class="w" data-share>Partilhar o mês</button><button class="g" data-again>Ver outra vez</button></div></section>
    <p class="taphint">Toca para avançar · mantém para pausar</p>
  </div>`;
