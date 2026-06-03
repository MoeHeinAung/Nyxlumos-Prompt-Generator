import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  code: string;
  language?: string;
}

function extractCodeBlocks(text: string): { language: string; code: string }[] {
  const blocks: { language: string; code: string }[] = [];
  const regex = /```(\w+)?\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({ language: match[1] || "text", code: match[2].trim() });
  }
  return blocks;
}

function CodeBlock({ language, code: blockCode }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(blockCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg overflow-hidden border border-cyan/[0.08] bg-black/60">
      <div className="flex items-center justify-between px-4 py-2 bg-cyan/[0.03] border-b border-cyan/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan/40" />
          <span className="text-[10px] font-jetbrains text-cyan/40 tracking-wider uppercase">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[9px] font-jetbrains text-white/20 hover:text-cyan/60 transition-colors"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 font-jetbrains text-xs leading-relaxed text-green-300/60 overflow-auto max-h-64 whitespace-pre-wrap">
        {blockCode}
      </pre>
    </div>
  );
}

export default function CodePreview({ code }: Props) {
  const blocks = extractCodeBlocks(code);

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 bg-black/40 rounded-lg border border-cyan/[0.06]">
        <span className="text-2xl opacity-15">&lt;/&gt;</span>
        <p className="text-xs font-jetbrains text-white/20">No code blocks detected in output.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <CodeBlock key={i} language={block.language} code={block.code} />
      ))}
    </div>
  );
}
