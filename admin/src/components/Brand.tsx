export function Brand({
  size = 34,
  wordmark = false,
}: {
  size?: number;
  wordmark?: boolean;
}) {
  return (
    <span className="moment-brand">
      <img src="/assets/moment-mark.svg" alt="" width={size} height={size} />
      {wordmark && <span className="moment-wordmark">Moment</span>}
    </span>
  );
}
