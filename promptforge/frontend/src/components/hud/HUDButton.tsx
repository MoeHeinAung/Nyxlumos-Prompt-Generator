import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "cyan" | "magenta" | "amber" | "ghost";
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "md";
}

export default function HUDButton({ children, onClick, variant = "cyan", className = "", disabled, loading, size = "md" }: Props) {
  const colors = {
    cyan: "border-cyan/40 text-cyan hover:bg-cyan/10 hover:border-cyan hover:shadow-[0_0_24px_rgba(0,240,255,0.2)]",
    magenta: "border-magenta/40 text-magenta hover:bg-magenta/10 hover:border-magenta hover:shadow-[0_0_24px_rgba(255,0,85,0.2)]",
    amber: "border-amber/40 text-amber hover:bg-amber/10 hover:border-amber hover:shadow-[0_0_24px_rgba(255,184,0,0.2)]",
    ghost: "border-white/5 text-white/50 hover:text-white/90 hover:border-white/15 hover:bg-white/3",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[10px]",
    md: "px-5 py-2.5 text-xs",
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`inline-flex items-center rounded-lg border font-orbitron uppercase tracking-widest transition-all duration-300 ${colors[variant]} ${sizes[size]} ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Processing...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
