export function isCurrentPrice(
  price: {
    is_active: boolean;
    starts_at?: string | null;
    ends_at?: string | null;
  },
  now = Date.now(),
) {
  return (
    price.is_active &&
    (!price.starts_at || Date.parse(price.starts_at) <= now) &&
    (!price.ends_at || Date.parse(price.ends_at) > now)
  );
}
