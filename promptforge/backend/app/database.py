import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import Column, String, Integer, Float, Text, JSON, DateTime, ForeignKey, Index, create_engine, select
from sqlalchemy.ext.mutable import MutableDict, MutableList
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import DATABASE_URL


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    current_state = Column(String, nullable=False, default="S1_INGEST")
    original_input = Column(Text)
    translated_input = Column(Text)
    detected_language = Column(String)
    extracted_intent = Column(MutableDict.as_mutable(JSON))
    classification = Column(MutableDict.as_mutable(JSON))
    target_model = Column(String)
    selected_harnesses = Column(MutableList.as_mutable(JSON), default=list)
    answers = Column(MutableDict.as_mutable(JSON), default=dict)
    pending_questions = Column(MutableList.as_mutable(JSON), default=list)
    generated_prompt = Column(Text)
    final_output = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_sessions_created_at", "created_at"),
    )

    state_data_rel = relationship("SessionState", back_populates="session", uselist=False, cascade="all, delete-orphan")


class SessionState(Base):
    __tablename__ = "session_state"
    session_id = Column(String, ForeignKey("sessions.id"), primary_key=True)
    state_data = Column(MutableDict.as_mutable(JSON), nullable=False, default=dict)
    expires_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc) + timedelta(minutes=30))

    session = relationship("Session", back_populates="state_data_rel")


class Prompt(Base):
    __tablename__ = "prompts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"))
    title = Column(String)
    original_request = Column(Text)
    final_prompt = Column(Text)
    target_model = Column(String)
    harnesses_used = Column(JSON, default=list)
    complexity_score = Column(Integer)
    scope = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_prompts_created_at", "created_at"),
        Index("ix_prompts_target_model", "target_model"),
    )


class ModelTemplate(Base):
    __tablename__ = "model_templates"
    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String, unique=True, nullable=False)
    model_family = Column(String)
    syntax_rules = Column(Text)
    meta_prompt_template = Column(Text)
    reasoning_style = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class BurmeseGlossary(Base):
    __tablename__ = "burmese_glossary"
    id = Column(Integer, primary_key=True, autoincrement=True)
    burmese_term = Column(String, nullable=False)
    english_term = Column(String, nullable=False)
    domain = Column(String)
    confidence_score = Column(Float, default=1.0)


async_engine = create_async_engine(DATABASE_URL, echo=False)
async_session_factory = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

sync_engine = create_engine(DATABASE_URL.replace("sqlite+aiosqlite", "sqlite"), echo=False)
SyncSession = sessionmaker(sync_engine)


async def init_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_model_templates()
    await seed_burmese_glossary()


async def get_db():
    async with async_session_factory() as session:
        yield session


async def seed_model_templates():
    templates = [
        ("deepseek-chat", "deepseek", "Markdown, clear sections, bullet points, explicit role assignment",
         "You are {role}. {task}\n\n## Context\n{context}\n\n## Requirements\n{requirements}\n\n## Output Format\n{format}", "chain_of_thought"),
        ("deepseek-reasoner", "deepseek", "Structured reasoning, step-by-step, explicit assumptions",
         "Analyze the following problem rigorously. Show your reasoning process clearly before giving the final answer.\n\n{task}\n\n## Constraints\n{constraints}", "tree_of_thought"),
        ("gpt-4o", "openai", "Markdown, system/user roles, concise but complete",
         "You are {role}. {task}\n\nContext: {context}\nRequirements: {requirements}", "direct"),
        ("claude-3-5-sonnet", "anthropic", "XML tags, polite tone, detailed context, <thinking> blocks",
         "<thinking>\nAnalyze: {task}\nConstraints: {constraints}\n</thinking>\n\n<output>\n{format_instructions}\n</output>", "chain_of_thought"),
        ("llama-3.1-8b", "meta", "System prompt strictness, explicit reasoning requests, markdown",
         "System: You are {role}. Provide detailed, accurate responses.\n\nUser: {task}\n\nRequirements: {requirements}\nFormat: {format}", "step_by_step"),
        ("midjourney", "midjourney", "Comma-separated descriptors, no prose, parameter flags",
         "{subject}, {style}, {lighting}, {camera}, {mood} --ar {aspect_ratio} --stylize {stylize} --v 6", "direct"),
        ("stable-diffusion", "stability", "Comma-separated, weighted terms (parentheses), negative prompt section",
         "Positive: {subject}, ({style}:1.2), {lighting}, {quality_tags}\nNegative: {negative_prompt}\nSteps: {steps}, CFG: {cfg}", "direct"),
    ]
    async with async_session_factory() as db:
        for name, family, rules, meta, style in templates:
            result = await db.execute(select(ModelTemplate).where(ModelTemplate.model_name == name))
            if result.scalar_one_or_none() is None:
                db.add(ModelTemplate(model_name=name, model_family=family, syntax_rules=rules, meta_prompt_template=meta, reasoning_style=style))
        await db.commit()


async def seed_burmese_glossary():
    terms = [
        ("ဆော့ဖ်ဝဲ", "software", "technology", 1.0),
        ("ဒေတာ", "data", "technology", 1.0),
        ("ကွန်ပျူတာ", "computer", "technology", 1.0),
        ("အင်တာနက်", "internet", "technology", 1.0),
        ("ပရိုဂရမ်", "program", "technology", 1.0),
        ("အက်ပလီကေးရှင်း", "application", "technology", 1.0),
        ("စနစ်", "system", "technology", 0.95),
        ("ကုဒ်", "code", "technology", 1.0),
        ("ဖိုင်လ်", "file", "technology", 1.0),
        ("လမ်းညွှန်", "directory", "technology", 0.9),
    ]
    async with async_session_factory() as db:
        for bm_term, en_term, domain, conf in terms:
            result = await db.execute(
                select(BurmeseGlossary).where(
                    BurmeseGlossary.burmese_term == bm_term,
                    BurmeseGlossary.english_term == en_term,
                )
            )
            if result.scalar_one_or_none() is None:
                db.add(BurmeseGlossary(burmese_term=bm_term, english_term=en_term, domain=domain, confidence_score=conf))
        await db.commit()
