import re
import unicodedata

BURMESE_RANGE = re.compile(r"[က-႟ꩠ-ꩿꧠ-꧿]")


def contains_burmese(text: str) -> bool:
    return bool(BURMESE_RANGE.search(text))


def normalize_unicode(text: str) -> str:
    """Normalize Burmese unicode, handling Zawgyi->Unicode conversion."""
    text = unicodedata.normalize("NFC", text)
    text = text.replace("္န", "္မ")
    text = text.replace("္ပ", "္ရ")
    return text


def sanitize_burmese(text: str) -> str:
    return normalize_unicode(text)
