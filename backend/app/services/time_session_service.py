"""CRUD operations for time sessions."""

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.time_session import TimeSession
from app.schemas.time_session import TimeSessionCreate


async def list_sessions(
    db: AsyncSession, user_id: uuid.UUID, client_id: uuid.UUID
) -> list[TimeSession]:
    result = await db.execute(
        select(TimeSession)
        .where(TimeSession.client_id == client_id, TimeSession.user_id == user_id)
        .order_by(TimeSession.session_date.desc(), TimeSession.created_at.desc())
    )
    return list(result.scalars().all())


async def create_session(
    db: AsyncSession, user_id: uuid.UUID, client_id: uuid.UUID, data: TimeSessionCreate
) -> TimeSession:
    session = TimeSession(
        client_id=client_id,
        user_id=user_id,
        session_date=data.session_date,
        hours=data.hours,
        description=data.description,
        project_id=data.project_id,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(
    db: AsyncSession, user_id: uuid.UUID, session_id: uuid.UUID
) -> Optional[TimeSession]:
    result = await db.execute(
        select(TimeSession).where(
            TimeSession.id == session_id, TimeSession.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


async def delete_session(
    db: AsyncSession, user_id: uuid.UUID, session_id: uuid.UUID
) -> bool:
    session = await get_session(db, user_id, session_id)
    if not session:
        return False
    await db.delete(session)
    await db.commit()
    return True
