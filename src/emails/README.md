# Emails do Supabase Auth

Estes ficheiros não são usados pela app: cada um é colado à mão no Supabase, em
**Authentication → Emails → Templates** (campo *Message body*, modo *Source*).
As imagens dos mascotes vêm de `https://www.lovenestt.com/email/` (`public/email/`),
por isso têm de estar publicadas antes de colar os modelos.

| Modelo no Supabase | Ficheiro | Assunto |
|---|---|---|
| Confirm sign up | `confirm-signup.html` | Confirma o teu email no LoveNest |
| Invite user | `invite.html` | Tens um convite para o LoveNest |
| Magic link | `magic-link.html` | O teu link para entrar no LoveNest |
| Change email address | `change-email.html` | Confirma o teu novo email |
| Reset password | `reset-password.html` | Cria uma senha nova no LoveNest |
| Reauthentication | `reauthentication.html` | O teu código do LoveNest |
