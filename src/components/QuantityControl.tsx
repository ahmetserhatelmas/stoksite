"use client";

type Props = {
  value: number;
  max: number;
  onChange: (value: number) => void;
  size?: "sm" | "md";
};

export function QuantityControl({ value, max, onChange, size = "md" }: Props) {
  const btn =
    size === "sm"
      ? "flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-sm font-medium hover:bg-slate-50 disabled:opacity-30"
      : "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-lg disabled:opacity-30";
  const input =
    size === "sm"
      ? "w-12 rounded-md border border-slate-300 py-1 text-center text-sm font-semibold"
      : "w-14 rounded-lg border border-slate-300 py-1.5 text-center text-sm font-semibold";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        className={btn}
        aria-label="Adedi azalt"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value === 0 ? "" : String(value)}
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(0);
            return;
          }
          if (!/^\d+$/.test(raw)) return;
          onChange(Math.min(parseInt(raw, 10), max));
        }}
        onBlur={() => {
          if (value < 0) onChange(0);
          if (value > max) onChange(max);
        }}
        className={input}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={btn}
        aria-label="Adedi artır"
      >
        +
      </button>
    </div>
  );
}
