import React from "react";
import { useGetLinktreeData, getGetLinktreeDataQueryKey, useTrackClick } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Design } from "@workspace/api-zod/src/generated/types";

function getPhotoSrc(photo: string) {
  if (!photo) return "";
  if (photo.startsWith("/objects/")) return `/api/storage${photo}`;
  return photo;
}

function applyDesign(design: Design) {
  const root = document.documentElement;
  root.style.setProperty("--lt-bg", design.bgColor);
  root.style.setProperty("--lt-glow", design.glowColor);
  root.style.setProperty("--lt-glow-opacity", String(design.glowOpacity));
  root.style.setProperty("--lt-accent", design.accentColor);
  root.style.setProperty("--lt-text", design.textColor);
}

export default function PublicPage() {
  const { data, isLoading } = useGetLinktreeData({
    query: { queryKey: getGetLinktreeDataQueryKey() }
  });

  const track = useTrackClick();

  React.useEffect(() => {
    if (data?.design) applyDesign(data.design);
  }, [data?.design]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--lt-bg,#0a0a0a)] text-[var(--lt-text,#fff)] relative overflow-hidden bg-grid-pattern">
        <div className="max-w-xl mx-auto px-4 py-16 flex flex-col items-center gap-8 relative z-10">
          <Skeleton className="h-28 w-28 rounded-full" />
          <div className="flex flex-col items-center gap-4 w-full">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex flex-col w-full gap-4 mt-8">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { profile, links, design } = data;
  const bg = design?.bgColor ?? "#0a0a0a";
  const glowColor = design?.glowColor ?? "#cc0000";
  const glowOpacity = design?.glowOpacity ?? 0.55;
  const accentColor = design?.accentColor ?? "#cc0000";
  const textColor = design?.textColor ?? "#ffffff";

  const validLinks = links
    .filter(link => link.url && link.url.trim() !== "")
    .sort((a, b) => a.order - b.order);

  const handleLinkClick = (id: string, url: string) => {
    track.mutate({ id });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="min-h-[100dvh] relative overflow-hidden bg-grid-pattern"
      style={{ backgroundColor: bg, color: textColor }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[120px] pointer-events-none -z-10"
        style={{ backgroundColor: glowColor, opacity: glowOpacity }}
      />

      <main className="max-w-xl mx-auto px-4 py-16 flex flex-col items-center relative z-10 animate-fade-in-up">

        <Avatar className="h-32 w-32 mb-6 border-4 shadow-xl" style={{ borderColor: `${accentColor}33` }}>
          <AvatarImage src={getPhotoSrc(profile.photo)} alt={profile.name} className="object-cover" />
          <AvatarFallback className="bg-secondary text-2xl font-display">{profile.name.charAt(0) || "U"}</AvatarFallback>
        </Avatar>

        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-center mb-3">
          {profile.name || "Unnamed"}
        </h1>

        <p className="text-center max-w-sm mb-10 text-lg font-light leading-relaxed opacity-70">
          {profile.description}
        </p>

        <div className="w-full flex flex-col gap-4">
          {validLinks.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-xl" style={{ borderColor: `${accentColor}33`, opacity: 0.6 }}>
              No links available
            </div>
          ) : (
            validLinks.map((link, index) => (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id, link.url)}
                className="group relative w-full flex items-center p-4 min-h-[64px] rounded-xl transition-all duration-300 ease-out shadow-lg overflow-hidden transform hover:-translate-y-1"
                style={{
                  background: `${accentColor}10`,
                  border: `1px solid ${accentColor}25`,
                  color: textColor,
                  animationDelay: `${index * 100}ms`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = accentColor;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = accentColor;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}10`;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = `${accentColor}25`;
                }}
              >
                {link.emoji && (
                  <span className="text-2xl mr-4 flex-shrink-0" aria-hidden="true">{link.emoji}</span>
                )}
                <span className="font-semibold text-lg flex-grow text-left">
                  {link.label || "Untitled Link"}
                </span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
              </button>
            ))
          )}
        </div>

        <footer className="mt-16 text-center transition-opacity" style={{ opacity: 0.5 }}>
          <a href="#" className="font-display font-bold tracking-widest text-sm uppercase flex items-center gap-2">
            <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: accentColor }}></span>
            Linktree
          </a>
        </footer>
      </main>
    </div>
  );
}
