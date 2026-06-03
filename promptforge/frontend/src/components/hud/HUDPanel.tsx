import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  cornerBrackets?: boolean;
  glow?: boolean;
}

export default function HUDPanel({ children, className = "", animate = true, cornerBrackets = false, glow }: Props) {
  const Comp = animate ? motion.div : "div";
  const animProps = animate
    ? { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: "easeOut" } }
    : {};

  return (
    <Comp {...animProps} className={`hud-panel p-5 ${glow ? "shadow-cyan-glow" : ""} ${className}`}>
      {cornerBrackets && (
        <>
          <div className="absolute top-3 left-3 w-6 h-6 border-t border-l border-cyan/30 pointer-events-none rounded-tl" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-cyan/30 pointer-events-none rounded-tr" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-cyan/30 pointer-events-none rounded-bl" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b border-r border-cyan/30 pointer-events-none rounded-br" />
        </>
      )}
      {children}
    </Comp>
  );
}
