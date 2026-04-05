import React from "react";

const starPath =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

/** Read-only star row (0–5, supports halves for averages) */
export function StarDisplay({ value, size = "md", className = "" }) {
  const px = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-5 h-5";
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= full || (i === full + 1 && hasHalf);
        return (
          <svg
            key={i}
            className={`${px} ${filled ? "text-amber-400" : "text-gray-200"}`}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d={starPath} />
          </svg>
        );
      })}
    </div>
  );
}

/** Interactive 1–5 selection */
export default function StarRating({ value, onChange, disabled, name = "rating" }) {
  const [hover, setHover] = React.useState(null);
  const display = hover ?? value;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = display >= n;
        return (
          <button
            key={n}
            type="button"
            name={name}
            disabled={disabled}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(n)}
            className={`p-0.5 rounded transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1 disabled:opacity-50 ${
              active ? "text-amber-400" : "text-gray-300"
            }`}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={value === n}
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d={starPath} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
