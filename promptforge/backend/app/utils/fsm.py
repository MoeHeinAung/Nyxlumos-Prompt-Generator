import logging

logger = logging.getLogger(__name__)


class PromptForgeFSM:
    STATES = [
        "S1_INGEST", "S2_TRANSLATE", "S3_EXTRACT",
        "S4_GAP_ANALYSIS", "S5_CLARIFY", "S6_CLASSIFY",
        "S7_MODEL_SELECT", "S8_HARNESS_SELECT", "S9_OPTIMIZE",
        "S10_GENERATE", "S11_VALIDATE", "S12_EXPORT"
    ]

    TRANSITIONS = {
        "S1_INGEST": "S2_TRANSLATE",
        "S2_TRANSLATE": "S3_EXTRACT",
        "S3_EXTRACT": "S4_GAP_ANALYSIS",
        "S4_GAP_ANALYSIS": "dynamic",
        "S5_CLARIFY": "dynamic",
        "S6_CLASSIFY": "S7_MODEL_SELECT",
        "S7_MODEL_SELECT": "S8_HARNESS_SELECT",
        "S8_HARNESS_SELECT": "S9_OPTIMIZE",
        "S9_OPTIMIZE": "S10_GENERATE",
        "S10_GENERATE": "S11_VALIDATE",
        "S11_VALIDATE": "S12_EXPORT",
    }

    @classmethod
    def next_state(cls, current_state: str, session: dict) -> str:
        if current_state == "S4_GAP_ANALYSIS":
            return "S5_CLARIFY" if session.get("pending_questions") else "S6_CLASSIFY"
        if current_state == "S5_CLARIFY":
            return "S5_CLARIFY" if session.get("pending_questions") else "S6_CLASSIFY"
        transition = cls.TRANSITIONS.get(current_state)
        if transition is None:
            logger.warning(f"No transition defined for state {current_state}")
            return current_state
        if transition == "dynamic":
            return current_state
        return transition

    @classmethod
    def get_state_index(cls, state: str) -> int:
        try:
            return cls.STATES.index(state)
        except ValueError:
            return -1
