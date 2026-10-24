interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  color?: string;
}

/** Styled range slider with a filled track (Runna-style). */
export function Slider({ value, min, max, step = 1, onChange, color = '#7B8CFF' }: Props) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range"
      className="slider"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        background: `linear-gradient(90deg, ${color} ${pct}%, #272734 ${pct}%)`,
      }}
    />
  );
}
