import Image from "next/image";

/**
 * LeadScout brand logo ("LeadScout Modern Logo v3").
 *
 * - variant "lockup": icon + wordmark. variant "mark": icon only.
 * - theme "color": for light backgrounds. theme "light": white knockout for
 *   dark backgrounds (e.g. the navy dashboard sidebar).
 *
 * Size is driven by `height` (px); width is derived from the asset aspect ratio.
 */
const ASSETS = {
  lockup: {
    color: "/brand/leadscout-logo.png",
    light: "/brand/leadscout-logo-light.png",
    w: 422,
    h: 128,
  },
  mark: {
    color: "/brand/leadscout-mark.png",
    light: "/brand/leadscout-mark-light.png",
    w: 116,
    h: 128,
  },
} as const;

export function Logo({
  variant = "lockup",
  theme = "color",
  height = 28,
  priority = false,
  className,
}: {
  variant?: "lockup" | "mark";
  theme?: "color" | "light";
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  const a = ASSETS[variant];
  const width = Math.round((a.w / a.h) * height);
  return (
    <Image
      src={theme === "light" ? a.light : a.color}
      alt="LeadScout"
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{ height, width: "auto" }}
    />
  );
}

export default Logo;
