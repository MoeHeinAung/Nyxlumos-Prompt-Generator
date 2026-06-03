import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HUDPanel from "../hud/HUDPanel";
import HUDButton from "../hud/HUDButton";
import HUDProgress from "../hud/HUDProgress";
import NeonText from "../hud/NeonText";
import { useSessionStore } from "../../stores/sessionStore";

export default function ClarificationWizard() {
  const { pendingQuestions, currentQuestionIndex, submitAnswer, advanceToNextQuestion } = useSessionStore();
  const [customInput, setCustomInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  if (!pendingQuestions.length || currentQuestionIndex >= pendingQuestions.length) return null;

  const question = pendingQuestions[currentQuestionIndex];
  if (!question) return null;

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    if (option !== "Other (specify)") {
      submitAnswer(question.id, option);
      setTimeout(() => {
        setSelectedOption(null);
        advanceToNextQuestion();
      }, 300);
    }
  };

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      submitAnswer(question.id, customInput.trim());
      setCustomInput("");
      setSelectedOption(null);
      advanceToNextQuestion();
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-2xl mx-auto"
      >
        <HUDPanel cornerBrackets>
          <NeonText as="h3" variant="magenta" className="text-sm mb-3 tracking-[0.15em]">
            CLARIFICATION
          </NeonText>
          <HUDProgress
            current={currentQuestionIndex + 1}
            total={pendingQuestions.length}
            label={`Question ${currentQuestionIndex + 1} of ${pendingQuestions.length}`}
          />

          <div className="mt-4 p-4 rounded-xl bg-black/30 border border-magenta/[0.08]">
            <p className="text-sm font-rajdhani font-medium text-white/80 mb-1">{question.question}</p>
            {question.context && (
              <p className="text-[11px] text-white/30 italic font-rajdhani">{question.context}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            {question.options.map((option: string, i: number) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.02, borderColor: "rgba(255,0,85,0.5)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(option)}
                className={`p-3.5 rounded-xl border text-left text-xs font-jetbrains transition-all duration-200 ${
                  selectedOption === option
                    ? "border-magenta/40 bg-magenta/[0.06] text-magenta shadow-[0_0_12px_rgba(255,0,85,0.1)]"
                    : "border-cyan/[0.08] hover:border-magenta/20 text-white/50 hover:text-white/80"
                }`}
              >
                <span className="text-[9px] text-white/15 mr-2">{String.fromCharCode(65 + i)}</span>
                {option}
              </motion.button>
            ))}
          </div>

          {selectedOption === "Other (specify)" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 flex gap-2"
            >
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 bg-black/40 border border-cyan/10 rounded-lg px-3 py-2.5 text-xs font-jetbrains text-white focus:border-magenta/40 transition-all duration-300"
                onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                autoFocus
              />
              <HUDButton variant="magenta" onClick={handleCustomSubmit} size="sm">
                Submit
              </HUDButton>
            </motion.div>
          )}
        </HUDPanel>
      </motion.div>
    </AnimatePresence>
  );
}
