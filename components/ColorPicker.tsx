"use client";

export const TAB_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#a855f7", "#ec4899", "#84cc16", "#06b6d4",
];

export const COVER_COLORS = [
  "#4f7cff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#8b5cf6",
  "#ec4899",
  "#78716c",
  "#1f2937",
];

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="row">
      {COVER_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          className={`swatch${value.toLowerCase() === c ? " active" : ""}`}
          style={{ backgroundColor: c }}
          onClick={() => onChange(c)}
        />
      ))}
      <input
        type="color"
        aria-label="Custom color"
        className="color-input"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#4f7cff"}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
