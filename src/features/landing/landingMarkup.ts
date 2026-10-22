// Marcação da página inicial, gerada a partir da maqueta aprovada (docs/mockups/landing-proposta.html).
import brasa_full from "./stages/brasa.webp";
import brasa_thumb from "@/assets/flame/flame_02_brasa_thumb.png";
import capsula from "./shots/capsula.webp";
import chama_full from "./stages/chama.webp";
import chama_thumb from "@/assets/flame/flame_03_chama_thumb.png";
import chat from "./shots/chat.webp";
import chat_msgs from "./shots/chat-msgs.webp";
import desafios from "./shots/desafios.webp";
import eterno_full from "./stages/eterno.webp";
import eterno_thumb from "@/assets/flame/flame_06_eterno_thumb.png";
import faisca from "@/features/entry/assets/faisca.webp";
import faisca_full from "./stages/faisca.webp";
import faisca_thumb from "@/assets/flame/flame_01_faisca_thumb.png";
import foto_p1011 from "./shots/foto-p1011.webp";
import foto_p1035 from "./shots/foto-p1035.webp";
import foto_p360 from "./shots/foto-p360.webp";
import guardiao from "@/features/entry/assets/guardiao.webp";
import guardiao_full from "./stages/guardiao.webp";
import guardiao_thumb from "@/assets/flame/flame_04_guardiao_thumb.png";
import home_full from "./shots/home-full.webp";
import humor from "./shots/humor.webp";
import memorias_full from "./shots/memorias-full.webp";
import plano from "./shots/plano.webp";
import sentinela_full from "./stages/sentinela.webp";
import sentinela_thumb from "@/assets/flame/flame_05_sentinela_thumb.png";
import soberano_full from "./stages/soberano.webp";
import soberano_thumb from "@/assets/flame/flame_07_soberano_thumb.png";
import story1 from "./shots/story1.webp";
import story2 from "./shots/story2.webp";
import story3 from "./shots/story3.webp";
import story4 from "./shots/story4.webp";

export const LANDING_ASSETS = { brasa_full, brasa_thumb, capsula, chama_full, chama_thumb, chat, chat_msgs, desafios, eterno_full, eterno_thumb, faisca, faisca_full, faisca_thumb, foto_p1011, foto_p1035, foto_p360, guardiao, guardiao_full, guardiao_thumb, home_full, humor, memorias_full, plano, sentinela_full, sentinela_thumb, soberano_full, soberano_thumb, story1, story2, story3, story4 };

export const landingMarkup = (A: typeof LANDING_ASSETS) => `

<header class="nav">
  <div class="wrap">
    <span class="word">Love<i>N</i>est</span>
    <div class="nav-actions">
      <button class="nav-link" data-nav="login">Entrar</button>
      <button class="btn nav-cta" data-cta data-nav="start">Criar o nosso espaço</button>
    </div>
  </div>
</header>

<main>
  <!-- Hero: os dois Guardiões a conversar -->
  <section class="hero">
    <div class="wrap">
      <div>
        <p class="eyebrow rise" style="--d:0" data-hello-eyebrow>Um espaço só para os dois</p>
        <h1 class="rise" style="--d:1">O amor também vive nos dias comuns.</h1>
        <p class="lead rise" style="--d:2">Conversem, cuidem um do outro e guardem a vossa história num lugar privado. Sem feed, sem publicidade, sem pressão.</p>
        <div class="ctas rise" style="--d:3">
          <button class="btn magnetic" data-act="start" data-cta>Criar o nosso espaço <span class="arrow">→</span></button>
          <button class="btn ghost magnetic" data-nav="login">Já temos conta</button>
        </div>
        <p class="fine rise" style="--d:4">Grátis · leva menos de um minuto</p>
      </div>

      <div class="scene" data-scene>
        <div class="scene-top">
        <div class="card" data-slot="0" style="top:8px;left:0;--r:-2.5deg;animation-delay:.3s,1.1s;min-width:150px"><div class="k">Tempo juntos</div><div class="big"><span data-count="278">0</span> <small>dias</small></div></div>
        <div class="card" data-slot="1" style="top:30px;right:0;--r:2deg;animation-delay:.5s,1.7s;max-width:210px;min-width:170px"><div class="k">A vossa chama</div><div class="duo"><span><span class="av a">A</span><span class="av b">M</span></span>Os dois apareceram hoje</div></div>
        <div class="floor"></div>
        <div class="pair">
          <div class="pet f glow-rose pet-in" data-pet="her" style="--d:3"><img src="${A.faisca}" alt="" /></div>
          <div class="pet glow-blue pet-in say-right" data-pet="him" style="--d:4"><img src="${A.guardiao}" alt="" /></div>
        </div>
        </div>
        <div class="hello" data-hello>
          <div class="hello-top"><img src="${A.guardiao_thumb}" alt="" />O Guardião<span class="dot"></span></div>
          <div class="chat" data-hello-chat></div>
          <form class="reply-row" data-reply="name">
            <input class="name-in" placeholder="O teu nome" maxlength="30" autocomplete="given-name" />
            <button class="send" disabled aria-label="Enviar">→</button>
          </form>
          <div class="reply-row" data-reply="who">
            <button class="chip-btn" data-who="yes">Sim 💕</button>
            <button class="chip-btn" data-who="solo">Ainda não</button>
            <button class="chip-btn" data-who="peek">Só a espreitar 👀</button>
          </div>
          <div class="reply-row" data-reply="go">
            <button class="chip-btn" data-go="start" style="background:var(--ink);color:#fff;border-color:var(--ink)">Criar agora →</button>
            <button class="chip-btn quiet" data-go="tour">Mostrar primeiro <span class="scroll-hint">↓</span></button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Capítulos: cada função sentida ao descer -->
  <nav class="ch-dots" data-ch-dots aria-label="Funções"><a href="#ch-casa" data-dot="casa"><i></i><span>Casa</span></a><a href="#ch-chat" data-dot="chat"><i></i><span>Conversa</span></a><a href="#ch-humor" data-dot="humor"><i></i><span>Humor</span></a><a href="#ch-agenda" data-dot="agenda"><i></i><span>Agenda</span></a><a href="#ch-capsula" data-dot="capsula"><i></i><span>Cápsula do tempo</span></a><a href="#ch-memorias" data-dot="memorias"><i></i><span>Memórias</span></a><a href="#ch-desafios" data-dot="desafios"><i></i><span>Desafios</span></a><a href="#ch-wrapped" data-dot="wrapped"><i></i><span>O vosso mês</span></a></nav>
  <section class="chapter " id="ch-casa" data-chapter="casa" data-say="Cada segundo conta 💙" style="height:230vh">
    <div class="ch-pin">
      <div class="wrap ch-grid">
        <div class="ch-copy">
          <p class="ch-kicker"><span>01</span>Casa</p>
          <h2 class="words">Tudo o que importa hoje, num só olhar.</h2>
          <p class="sec-lead ch-text">O tempo que estão juntos, a vossa chama, o que vem a seguir e como está o teu par.</p>
          <div class="ch-widget"><div class="live"><span class="k">Tempo juntos</span><div class="live-n"><span><b data-t="d">278</b>dias</span><span><b data-t="h">11</b>hrs</span><span><b data-t="m">50</b>min</span><span><b data-t="s">19</b>seg</span></div><small>Desde 17 de janeiro de 2026</small></div></div>
        </div>
        <div class="ch-stage">
          <div class="pet glow-blue ch-guide say-right" data-pet="g-casa"><img src="${A.guardiao_thumb}" alt="" /></div>
          <div class="device"><div class="device-screen"><img class="shot pan" src="${A.home_full}" alt="Ecrã inicial do LoveNest" data-pan /><div class="push" data-push><span class="push-ic"><img src="${A.faisca_thumb}" alt="" /></span><div><b>LoveNest</b><span data-push-text></span></div><small>agora</small></div><span class="tap-ring" data-tap-ring></span></div></div>
        </div>
      </div>
    </div>
  </section>
  <section class="chapter flip" id="ch-chat" data-chapter="chat" data-say="Escreve-lhe 💬" style="height:170vh">
    <div class="ch-pin">
      <div class="wrap ch-grid">
        <div class="ch-copy">
          <p class="ch-kicker"><span>02</span>Conversa</p>
          <h2 class="words">Um chat só vosso.</h2>
          <p class="sec-lead ch-text">Sem grupos e sem ruído. Experimenta: escreve uma mensagem ao Miguel.</p>
          <div class="ch-widget"><form class="try-chat" data-try-chat><input placeholder="Escreve ao Miguel…" maxlength="60" /><button aria-label="Enviar">↑</button></form><div class="quick" data-quick><button>Já tenho saudades 🥺</button><button>Jantamos fora? 🍝</button><button>Amo-te ❤️</button></div></div>
        </div>
        <div class="ch-stage">
          <div class="pet glow-blue ch-guide say-right" data-pet="g-chat"><img src="${A.guardiao_thumb}" alt="" /></div>
          <div class="device"><div class="device-screen"><img class="shot" src="${A.chat}" alt="Conversa do LoveNest" /><div class="msgs" data-msgs><img src="${A.chat_msgs}" alt="" /></div><div class="push" data-push><span class="push-ic"><img src="${A.faisca_thumb}" alt="" /></span><div><b>LoveNest</b><span data-push-text></span></div><small>agora</small></div><span class="tap-ring" data-tap-ring></span></div></div>
        </div>
      </div>
    </div>
  </section>
  <section class="chapter " id="ch-humor" data-chapter="humor" data-say="Como estás hoje? 😊" style="height:170vh">
    <div class="ch-pin">
      <div class="wrap ch-grid">
        <div class="ch-copy">
          <p class="ch-kicker"><span>03</span>Humor</p>
          <h2 class="words">Diz como te sentes, num toque.</h2>
          <p class="sec-lead ch-text">O teu par fica a saber antes de perguntar. Escolhe um:</p>
          <div class="ch-widget"><div class="moods-real" data-moods-real><button data-mood="Feliz" data-react="happy"><span>😊</span>Feliz</button><button data-mood="Tranquilo" data-react="nod"><span>😌</span>Tranquilo</button><button data-mood="Apaixonado" data-react="love"><span>😍</span>Apaixonado</button><button data-mood="Ansioso" data-react="hug"><span>😰</span>Ansioso</button><button data-mood="Triste" data-react="hug"><span>😢</span>Triste</button><button data-mood="Cansado" data-react="nod"><span>😴</span>Cansado</button><button data-mood="Irritado" data-react="hug"><span>😤</span>Irritado</button><button data-mood="Grato" data-react="happy"><span>🙏</span>Grato</button></div></div>
        </div>
        <div class="ch-stage">
          <div class="pet glow-blue ch-guide say-right" data-pet="g-humor"><img src="${A.guardiao_thumb}" alt="" /></div>
          <div class="device"><div class="device-screen"><img class="shot" src="${A.humor}" alt="Humor do dia" /><div class="push" data-push><span class="push-ic"><img src="${A.faisca_thumb}" alt="" /></span><div><b>LoveNest</b><span data-push-text></span></div><small>agora</small></div><span class="tap-ring" data-tap-ring></span></div></div>
        </div>
      </div>
    </div>
  </section>
  <section class="chapter flip" id="ch-agenda" data-chapter="agenda" data-say="Quando é o jantar? 🍝" style="height:170vh">
    <div class="ch-pin">
      <div class="wrap ch-grid">
        <div class="ch-copy">
          <p class="ch-kicker"><span>04</span>Agenda</p>
          <h2 class="words">Combinem o que vem a seguir.</h2>
          <p class="sec-lead ch-text">Jantares, datas e rotinas a dois, sem agenda pesada. Escolhe o dia do jantar:</p>
          <div class="ch-widget"><div class="days" data-days><button data-day="23" data-label="quinta"><small>QUI</small><b>23</b></button><button data-day="24" data-label="sexta"><small>SEX</small><b>24</b></button><button data-day="25" data-label="sábado"><small>SÁB</small><b>25</b></button><button data-day="26" data-label="domingo"><small>DOM</small><b>26</b></button></div></div>
        </div>
        <div class="ch-stage">
          <div class="pet glow-blue ch-guide say-right" data-pet="g-agenda"><img src="${A.guardiao_thumb}" alt="" /></div>
          <div class="device"><div class="device-screen"><img class="shot" src="${A.plano}" alt="Agenda do casal" /><div class="push" data-push><span class="push-ic"><img src="${A.faisca_thumb}" alt="" /></span><div><b>LoveNest</b><span data-push-text></span></div><small>agora</small></div><span class="tap-ring" data-tap-ring></span></div></div>
        </div>
      </div>
    </div>
  </section>
  <section class="chapter " id="ch-capsula" data-chapter="capsula" data-say="Eu guardo isto 🔒" style="height:170vh">
    <div class="ch-pin">
      <div class="wrap ch-grid">
        <div class="ch-copy">
          <p class="ch-kicker"><span>05</span>Cápsula do tempo</p>
          <h2 class="words">Mensagens para o futuro.</h2>
          <p class="sec-lead ch-text">Escrevam hoje o que só vão abrir daqui a um ano.</p>
          <div class="ch-widget"><form class="try-chat" data-try-capsule><input placeholder="Para nós, daqui a um ano…" maxlength="60" /><button aria-label="Guardar">↓</button></form></div>
        </div>
        <div class="ch-stage">
          <div class="pet glow-blue ch-guide say-right" data-pet="g-capsula"><img src="${A.guardiao_thumb}" alt="" /></div>
          <div class="device"><div class="device-screen"><img class="shot" src="${A.capsula}" alt="Cápsula do tempo" /><div class="push" data-push><span class="push-ic"><img src="${A.faisca_thumb}" alt="" /></span><div><b>LoveNest</b><span data-push-text></span></div><small>agora</small></div><span class="tap-ring" data-tap-ring></span></div></div>
        </div>
      </div>
    </div>
  </section>

  <section class="chapter flip" id="ch-memorias" data-chapter="memorias" data-say="Que fotos bonitas 📸" style="height:230vh">
    <div class="ch-pin">
      <div class="wrap ch-grid">
        <div class="ch-copy">
          <p class="ch-kicker"><span>06</span>Memórias</p>
          <h2 class="words">O que vivem não se perde.</h2>
          <p class="sec-lead ch-text">Fotos e momentos guardados por mês, só para vocês os dois. Guarda uma:</p>
          <div class="ch-widget"><div class="deck" data-deck><figure class="polaroid" data-photo="Lago ao fim da tarde" style="--i:0"><img src="${A.foto_p1011}" alt="" /><figcaption>Lago ao fim da tarde</figcaption></figure><figure class="polaroid" data-photo="A cascata" style="--i:1"><img src="${A.foto_p1035}" alt="" /><figcaption>A cascata</figcaption></figure><figure class="polaroid" data-photo="As tuas flores" style="--i:2"><img src="${A.foto_p360}" alt="" /><figcaption>As tuas flores</figcaption></figure></div><button class="btn deck-btn" data-keep>Guardar esta <span class="arrow">→</span></button></div>
        </div>
        <div class="ch-stage">
          <div class="pet glow-blue ch-guide say-right" data-pet="g-memorias"><img src="${A.guardiao_thumb}" alt="" /></div>
          <div class="device"><div class="device-screen"><img class="shot pan" src="${A.memorias_full}" alt="Memórias do casal" data-pan /><div class="push" data-push><span class="push-ic"><img src="${A.faisca_thumb}" alt="" /></span><div><b>LoveNest</b><span data-push-text></span></div><small>agora</small></div><span class="tap-ring" data-tap-ring></span></div></div>
        </div>
      </div>
    </div>
  </section>
  <section class="chapter" id="ch-desafios" data-chapter="desafios" data-say="Bora fazer isto? 💪" style="height:170vh">
    <div class="ch-pin">
      <div class="wrap ch-grid">
        <div class="ch-copy">
          <p class="ch-kicker"><span>07</span>Desafios</p>
          <h2 class="words">Pequenas aventuras a dois.</h2>
          <p class="sec-lead ch-text">Um desafio por dia para fazerem juntos. Hoje é este:</p>
          <div class="ch-widget"><div class="challenge" data-challenge><span class="k">O desafio de hoje</span><b>Cozinhar juntos um prato novo</b><small>Escolham uma receita que nenhum dos dois fez.</small><button class="btn" data-done>Concluir <span class="arrow">✓</span></button></div></div>
        </div>
        <div class="ch-stage">
          <div class="pet glow-blue ch-guide say-right" data-pet="g-desafios"><img src="${A.guardiao_thumb}" alt="" /></div>
          <div class="device"><div class="device-screen"><img class="shot" src="${A.desafios}" alt="Desafios do casal" /><div class="push" data-push><span class="push-ic"><img src="${A.faisca_thumb}" alt="" /></span><div><b>LoveNest</b><span data-push-text></span></div><small>agora</small></div><span class="tap-ring" data-tap-ring></span></div></div>
        </div>
      </div>
    </div>
  </section>
  <section class="chapter flip" id="ch-wrapped" data-chapter="wrapped" data-say="Que mês! 🎉" style="height:260vh">
    <div class="ch-pin">
      <div class="wrap ch-grid">
        <div class="ch-copy">
          <p class="ch-kicker"><span>08</span>O vosso mês</p>
          <h2 class="words">No fim do mês, a vossa história.</h2>
          <p class="sec-lead ch-text">Um resumo bonito de tudo o que viveram. Desce e vê o de setembro:</p>
          <div class="ch-widget"><div class="stats" data-stats><span><b data-to="1248">0</b>mensagens</span><span><b data-to="24">0</b>memórias</span><span><b data-to="21">0</b>dias de chama</span><span><b data-to="3">0</b>desafios</span></div></div>
        </div>
        <div class="ch-stage">
          <div class="pet glow-blue ch-guide say-right" data-pet="g-wrapped"><img src="${A.guardiao_thumb}" alt="" /></div>
          <div class="device"><div class="device-screen"><img class="shot story" src="${A.story1}" alt="" data-story="0" /><img class="shot story" src="${A.story2}" alt="" data-story="1" /><img class="shot story" src="${A.story3}" alt="" data-story="2" /><img class="shot story" src="${A.story4}" alt="" data-story="3" /><div class="push" data-push><span class="push-ic"><img src="${A.faisca_thumb}" alt="" /></span><div><b>LoveNest</b><span data-push-text></span></div><small>agora</small></div><span class="tap-ring" data-tap-ring></span></div></div>
        </div>
      </div>
    </div>
  </section>
  <!-- A chama evolui com o scroll -->
  <section class="evolve" data-evolve data-comment="Desce devagar e vê-me crescer 🔥">
    <div class="evolve-pin">
      <div class="wrap">
        <div>
          <p class="eyebrow">A vossa chama</p>
          <h2 class="words">Cresce quando os dois aparecem.</h2>
          <p class="sec-lead" style="max-width:440px">Cada casal tem um Guardião. Começa como uma faísca e evolui com a vossa presença, um dia de cada vez.</p>
          <div class="evolve-meta" style="margin-top:22px"><b data-stage-name>Faísca</b><span data-stage-days>dia 0</span></div>
          <div class="evolve-dots" style="margin-top:12px"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <p class="evolve-tip" style="margin-top:12px">Continua a descer ↓</p>
        </div>
        <div class="orb">
          <div class="halo" data-halo></div>
          <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="track" cx="50" cy="50" r="47" /><circle class="bar" cx="50" cy="50" r="47" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" data-ring /></svg>
          <div class="pet" data-pet="evo"><span class="pet-body">
            <img src="${A.faisca_full}" alt="" data-i="0" class="on" />
            <img src="${A.brasa_full}" alt="" data-i="1" />
            <img src="${A.chama_full}" alt="" data-i="2" />
            <img src="${A.guardiao_full}" alt="" data-i="3" />
            <img src="${A.sentinela_full}" alt="" data-i="4" />
            <img src="${A.eterno_full}" alt="" data-i="5" />
            <img src="${A.soberano_full}" alt="" data-i="6" />
          </span></div>
        </div>
      </div>
    </div>
  </section>

  <!-- A chama cresce -->
  <section class="block flame-sec" style="padding-top:56px" data-comment="Toca neles, eles falam 😄">
    <div class="wrap">
      <div class="sec-head center reveal">
        <p class="eyebrow">Os sete Guardiões</p>
        <h2 class="words" style="font-size:clamp(26px,4.6vw,36px)">Toca em cada um.</h2>
      </div>
      <div class="stages" data-stages>
        <button class="stage-item reveal" style="--i:0" data-stage="Faísca" data-say="Uma faísca é suficiente para começar ✨">
          <span class="pet"><span class="pet-body"><img src="${A.faisca_thumb}" alt="" /></span></span>
          <b>Faísca</b><small>Começa aqui</small>
        </button>
        <button class="stage-item reveal" style="--i:1" data-stage="Brasa" data-say="Já há calor 🔥">
          <span class="pet"><span class="pet-body"><img src="${A.brasa_thumb}" alt="" /></span></span>
          <b>Brasa</b><small>3 dias</small>
        </button>
        <button class="stage-item reveal" style="--i:2" data-stage="Chama" data-say="A chama acende 💫">
          <span class="pet"><span class="pet-body"><img src="${A.chama_thumb}" alt="" /></span></span>
          <b>Chama</b><small>7 dias</small>
        </button>
        <button class="stage-item reveal" style="--i:3" data-stage="Guardião" data-say="Agora protejo-vos 💙">
          <span class="pet"><span class="pet-body"><img src="${A.guardiao_thumb}" alt="" /></span></span>
          <b>Guardião</b><small>14 dias</small>
        </button>
        <button class="stage-item reveal" style="--i:4" data-stage="Sentinela" data-say="Sempre atento 👀">
          <span class="pet"><span class="pet-body"><img src="${A.sentinela_thumb}" alt="" /></span></span>
          <b>Sentinela</b><small>30 dias</small>
        </button>
        <button class="stage-item reveal" style="--i:5" data-stage="Eterno" data-say="Isto já é para sempre ♾️">
          <span class="pet"><span class="pet-body"><img src="${A.eterno_thumb}" alt="" /></span></span>
          <b>Eterno</b><small>90 dias</small>
        </button>
        <button class="stage-item reveal" style="--i:6" data-stage="Soberano" data-say="Um ano juntos 👑">
          <span class="pet"><span class="pet-body"><img src="${A.soberano_thumb}" alt="" /></span></span>
          <b>Soberano</b><small>1 ano</small>
        </button>
      </div>
      <div class="flame-steps reveal">
        <div><span class="n">1</span>Os dois aparecem no dia</div>
        <div><span class="n">2</span>A chama ganha força</div>
        <div><span class="n">3</span>O Guardião evolui convosco</div>
      </div>
    </div>
  </section>

  <!-- Privacidade -->
  <section class="block" data-comment="Toca nas promessas. Eu cumpro-as 🔒">
    <div class="wrap private">
      <div class="reveal">
        <p class="eyebrow">Privacidade</p>
        <h2 class="words">A vossa relação não é conteúdo.</h2>
        <p class="sec-lead">Conversas, humor, memórias e localização são íntimos. Tratamo-los como tal.</p>
        <div class="promises">
          <div class="promise"><i>✓</i><div><b>Privado por defeito</b><span>Só vocês os dois veem o vosso espaço.</span></div></div>
          <div class="promise"><i>✓</i><div><b>Sem publicidade</b><span>Nada do que partilham serve para vender anúncios.</span></div></div>
          <div class="promise"><i>✓</i><div><b>Sem feed público</b><span>Não há gostos, seguidores nem comparações.</span></div></div>
          <div class="promise"><i>✓</i><div><b>Vocês decidem</b><span>A localização e o resto ligam-se só se quiserem.</span></div></div>
        </div>
      </div>
      <div class="vault reveal" style="--i:2">
        <div class="pet glow-blue say-top" data-pet="guard" style="width:150px;margin:20px auto 0"><img src="${A.guardiao}" alt="" /></div>
        <p class="k" style="margin-top:14px">O vosso Guardião</p>
        <p style="margin-top:6px;font-size:15px;color:var(--text)">Toma conta do que é vosso.</p>
      </div>
    </div>
  </section>

  <!-- Final -->
  <section class="final" data-comment="Vamos? Eu fico à vossa espera 💙">
    <div class="wrap">
      <div class="pair-sm reveal">
        <div class="pet f glow-rose" data-pet="her2"><img src="${A.faisca}" alt="" /></div>
        <div class="pet glow-blue" data-pet="him2"><img src="${A.guardiao}" alt="" /></div>
      </div>
      <h2 class="reveal words" style="margin-top:18px" data-final-title>Comecem pelos dias comuns.</h2>
      <p class="sec-lead reveal" style="max-width:460px;margin-left:auto;margin-right:auto">Criem o vosso espaço hoje. O vosso par junta-se depois com um código.</p>
      <div class="ctas reveal" style="justify-content:center">
        <button class="btn magnetic" data-act="start" data-cta>Criar o nosso espaço <span class="arrow">→</span></button>
      </div>
    </div>
  </section>
</main>

<div class="buddy" data-buddy>
  <div class="pet" data-pet="buddy"><img src="${A.guardiao_thumb}" alt="" /></div>
</div>

<footer><div class="wrap"><span class="word" style="font-size:15px">Love<i>N</i>est</span>O amor também vive nos dias comuns.</div></footer>

`;
