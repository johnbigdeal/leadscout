"use client";

/** Reproduce un video embebido (KOMMODO u otro) con iframe controlado. */
export function VideoEmbed({ embedUrl, aspectRatio }: { embedUrl: string; aspectRatio?: string | null }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-black">
      <iframe
        src={embedUrl}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        style={{
          width: "100%",
          aspectRatio: aspectRatio || "16 / 9",
          height: "auto",
          border: 0,
          display: "block",
        }}
      />
    </div>
  );
}
