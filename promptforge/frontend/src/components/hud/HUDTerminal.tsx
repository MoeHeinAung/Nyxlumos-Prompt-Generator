import { useEffect, useRef } from "react";

interface Props {
  lines: string[];
  className?: string;
  maxLines?: number;
  title?: string;
}

export default function HUDTerminal({ lines, className = "", maxLines = 50, title }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div className={`terminal-output p-4 overflow-y-auto max-h-72 ${className}`}>
      {title && (
        <div className="text-[10px] font-jetbrains text-cyan/40 mb-2 uppercase tracking-wider">{title}</div>
      )}
      {lines.slice(-maxLines).map((line, i) => {
        const isFail = line.includes("FAIL") || line.includes("ERROR") || line.includes("fail");
        const isPass = line.includes("PASS") || line.includes("pass");
        const lineClass = isFail ? "line-fail" : isPass ? "line-pass" : "line-info";
        return (
          <div key={i} className="leading-relaxed text-xs">
            <span className="text-cyan/40 mr-2 select-none">&rsaquo;</span>
            <span className={lineClass}>{line}</span>
          </div>
        );
      })}
      <div ref={endRef} className="h-4 flex items-center">
        <span className="w-2.5 h-4 bg-cyan/80 inline-block animate-blink" />
      </div>
    </div>
  );
}
