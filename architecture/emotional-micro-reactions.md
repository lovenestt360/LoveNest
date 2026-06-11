# Emotional Micro Reactions — LoveNest

## Objective

Improve emotional warmth, emotional presence and emotional engagement inside LoveNest through small contextual emotional reactions across the app.

This implementation must feel:
- subtle
- emotionally intelligent
- calm
- premium
- human

The goal is NOT gamification noise.
The goal is emotional presence.

---

# Context

LoveNest is an emotional relationship platform for couples.

The product already contains:
- LoveStreak
- mood tracking
- emotional gestures
- prayers
- memories
- routines
- challenges

This task adds:
small emotional contextual reactions based on user activity.

---

# Important Rules

## DO:
- keep everything minimal
- use soft emotional language
- preserve current UI structure
- preserve existing architecture
- reuse existing data when possible
- keep implementation lightweight

## DO NOT:
- redesign screens
- add heavy animations
- add new backend systems
- create providers
- create global emotional engines
- break current components
- add visual noise

---

# Emotional Goal

The user should feel:

- emotionally remembered
- emotionally awaited
- emotionally noticed
- emotionally connected

without the app becoming exaggerated or childish.

---

# Implementation Scope

This task should ONLY add:
- contextual emotional phrases
- lightweight emotional states
- subtle UI reactions
- small visual emotional feedbacks

---

# Feature 1 — Home Emotional Reactions

Inside the Home screen:

Add contextual emotional messages depending on couple activity.

## Cases

### Both partners active today

Show messages like:
- "Hoje o vosso amor apareceu 💛"
- "O ninho esteve vivo hoje ✨"
- "Vocês encontraram-se hoje 🌤️"

### Only one partner active

Show messages like:
- "O teu par ainda não chegou hoje ❤️"
- "O ninho aguarda em silêncio 🌙"
- "A presença também espera"

### No activity today

Show messages like:
- "O amor também precisa de presença 🤍"
- "Hoje o vosso espaço está silencioso"
- "Pequenos gestos mantêm o ninho vivo"

IMPORTANT:
Rotate phrases randomly from small arrays.

---

# Feature 2 — LoveStreak Emotional Feedback

Inside LoveStreak:

Improve emotional contextual feedback.

## Cases

### Both completed gestures

Show:
- subtle positive emotional message
- soft highlighted state

Examples:
- "Hoje cuidaram um do outro ✨"
- "A chama esteve protegida hoje 💛"

### One partner missing

Show:
- calm waiting emotional tone

Examples:
- "O teu par ainda não apareceu hoje ❤️"
- "A chama continua à espera"

### Streak at risk

When streak is near loss:
- use soft amber tones
- never use aggressive warnings

Examples:
- "A chama sente saudades 🕯️"
- "Hoje ainda podem proteger o vosso momento"

---

# Feature 3 — Emotional Daily Cards

Improve microcopy inside:
- Mood
- Prayer
- Chat
- Jejum
- Agenda

Examples:

## Mood
Instead of:
"Registar humor"

Use:
- "Como está o teu coração hoje?"
- "Partilha como te sentes"

## Chat
Instead of:
"Abrir conversa"

Use:
- "Uma pequena mensagem importa"
- "Às vezes presença começa aqui"

## Prayer
Instead of:
"Partilha a tua oração"

Use:
- "Um momento sagrado juntos"
- "Cuidem um do outro em silêncio"

---

# Feature 4 — Emotional Toast Messages

Improve toast messages across the app.

Examples:

Instead of:
"Concluído"

Use:
- "O teu gesto foi guardado 💛"
- "O amor também vive nestes momentos"
- "Hoje estiveste presente ✨"

IMPORTANT:
Keep toasts soft and emotionally premium.

Avoid:
- childish language
- excessive emojis
- exaggerated excitement

---

# Technical Notes

Implementation should:
- use lightweight conditional rendering
- use small helper arrays when needed
- avoid creating new architecture layers
- avoid unnecessary refactors

---

# Files That MAY Be Modified

- Home screen
- LoveStreak components
- Daily cards
- Toast system
- Existing UI copy files

---

# Files That MUST NOT Be Modified

- backend structure
- auth system
- database schema
- routing system
- provider architecture
- global state systems

---

# Final Goal

LoveNest should start feeling:
- emotionally alive
- emotionally aware
- emotionally warm

without losing simplicity, elegance and calmness.