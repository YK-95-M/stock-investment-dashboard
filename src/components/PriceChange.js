export default function PriceChange({ value, suffix = '%', digits = 2 }) {
  const isPos = value >= 0;
  return (
    <span className={isPos ? 'text-emerald-400' : 'text-red-400'}>
      {isPos ? '+' : ''}{value?.toFixed(digits)}{suffix}
    </span>
  );
}
