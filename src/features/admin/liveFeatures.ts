/**
 * Funções que a app realmente protege com <PremiumGuard requiredFeature="…"> (src/App.tsx).
 * feature_tiers tem linhas antigas sem ecrã (ex.: "stats"); essas não aparecem no painel
 * nem na lista "Inclui" dos planos. Ao proteger um ecrã novo, junta a chave aqui.
 */
export const LIVE_FEATURES = new Set([
  "agenda", "mood", "prayer", "conflicts", "memories", "historia", "cycle",
  "challenges", "time_capsules", "wrapped", "lovestreak", "location_sharing",
]);
