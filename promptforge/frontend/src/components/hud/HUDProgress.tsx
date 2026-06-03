interface Props {
  current: number;
  total: number;
  label?: string;
}

export default function HUDProgress({ current, total, label }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-[10px] font-jetbrains text-cyan/50 mb-1.5 tracking-wider uppercase">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-600 ease-out"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--cyan), rgba(0,240,255,0.5), var(--cyan))",
            backgroundSize: "200% 100%",
            animation: "dataFlow 2s linear infinite",
          }}
        />
      </div>
    </div>
  );
}
