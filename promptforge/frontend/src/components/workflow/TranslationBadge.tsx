import { useSessionStore } from "../../stores/sessionStore";

export default function TranslationBadge() {
  const { detectedLanguage, translatedInput, originalInput } = useSessionStore();

  if (detectedLanguage !== "my" || !translatedInput) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-amber/30 bg-amber/5">
      <span className="text-xs">🇲🇲</span>
      <span className="text-[11px] font-jetbrains text-amber/70">Burmese → English</span>
      <span className="text-[10px] text-white/30 font-jetbrains max-w-xs truncate">{translatedInput}</span>
    </div>
  );
}
