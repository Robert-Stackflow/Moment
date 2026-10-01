export function Brand({
  size = 34,
  wordmark = false,
}: {
  size?: number;
  wordmark?: boolean;
}) {
  return (
    <span className="moment-brand">
      <img src={brandIcon} alt="" width={size} height={size} />
      {wordmark && <span className="moment-wordmark">Moment</span>}
    </span>
  );
}
export const brandIcon = "/assets/moment-mark.svg?v=photo-1";
export const brandAppleIcon = "/assets/moment-mark.png?v=photo-1";
