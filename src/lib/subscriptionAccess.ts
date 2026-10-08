export type SubscriptionLike = {
  subscription_status?: string | null;
  subscription_ends_at?: string | null;
};

export function hasActivePaidSubscription(
  house: SubscriptionLike | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!house || house.subscription_status !== "active") return false;

  // NULL/undefined is reserved for lifetime access and also keeps the
  // frontend compatible during the rollout before the DB column exists.
  if (!house.subscription_ends_at) return true;

  const end = Date.parse(house.subscription_ends_at);
  return Number.isFinite(end) && end > now.getTime();
}
