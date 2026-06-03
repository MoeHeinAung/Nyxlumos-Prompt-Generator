interface Props {
  children: React.ReactNode;
  variant?: "cyan" | "magenta" | "amber";
  className?: string;
  as?: "h1" | "h2" | "h3" | "span" | "p";
  glitch?: boolean;
}

export default function NeonText({ children, variant = "cyan", className = "", as: Tag = "span", glitch }: Props) {
  const colors = {
    cyan: "text-cyan neon-text",
    magenta: "text-magenta neon-magenta",
    amber: "text-amber neon-amber",
  };
  return (
    <Tag className={`font-orbitron tracking-wider ${colors[variant]} ${glitch ? "animate-flicker-in" : ""} ${className}`}>
      {children}
    </Tag>
  );
}
