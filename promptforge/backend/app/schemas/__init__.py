from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from datetime import datetime


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    source_lang: str = Field(default="auto", max_length=10)
    target_lang: str = Field(default="en", max_length=10)

    @field_validator("text")
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        v = v.replace("<|", "").replace("###", "").replace("SYSTEM:", "")
        return v[:10000]


class TranslateResponse(BaseModel):
    translated_text: str
    confidence: float
    was_burmese: bool
    warnings: list[str] = Field(default_factory=list)


class CreateSessionRequest(BaseModel):
    original_input: str = Field(..., min_length=1, max_length=10000)
    language: str = Field(default="en", max_length=10)

    @field_validator("original_input")
    @classmethod
    def sanitize_input(cls, v: str) -> str:
        v = v.replace("<|", "").replace("###", "").replace("SYSTEM:", "")
        return v[:10000]


class AdvanceSessionRequest(BaseModel):
    user_input: Any = None


class SessionResponse(BaseModel):
    session_id: str
    current_state: str
    original_input: Optional[str] = None
    translated_input: Optional[str] = None
    detected_language: Optional[str] = None
    extracted_intent: Optional[dict] = None
    classification: Optional[dict] = None
    target_model: Optional[str] = None
    selected_harnesses: Optional[list] = None
    answers: Optional[dict] = None
    pending_questions: Optional[list] = None
    generated_prompt: Optional[str] = None
    final_output: Optional[str] = None
    next_action: Optional[str] = None
    data: Optional[dict] = None


class IntentExtractRequest(BaseModel):
    session_id: str
    translated_text: str = Field(..., max_length=10000)


class IntentExtractResponse(BaseModel):
    intent: dict
    classification: dict


class ClarifyRequest(BaseModel):
    session_id: str
    missing_info: list = Field(default_factory=list)


class ClarifyResponse(BaseModel):
    questions: list[dict]


class GenerateRequest(BaseModel):
    session_id: str
    target_model: str
    enabled_harnesses: list[str] = Field(default_factory=list)


class GenerateResponse(BaseModel):
    final_prompt: str
    reasoning_trace: str
    validation_result: dict


class ModelInfo(BaseModel):
    id: str
    name: str
    family: str
    strengths: str
    supports_harnesses: list[str]


class AnalyticsSessionsResponse(BaseModel):
    daily_counts: list[dict]


class AnalyticsModelsResponse(BaseModel):
    model_usage: list[dict]


class AnalyticsHarnessesResponse(BaseModel):
    harness_stats: list[dict]


class AnalyticsComplexityResponse(BaseModel):
    distribution: list[dict]
