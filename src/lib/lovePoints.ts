// Os LovePoints são dados pelo servidor: triggers em photos,
// relationship_events, book_reflections e book_reading_progress gravam no
// extrato (lovepoints_ledger) e atualizam o saldo (points), com valor fixo e
// uma única vez por registo. O browser só avisa a UI para recarregar o saldo
// depois de criar o registo. Fontes novas ganham um ramo no trigger
// tr_lovepoints_on_action, não uma chamada daqui.
export function notifyLovePointsChanged(): void {
  window.dispatchEvent(new CustomEvent("streak-updated"));
}
