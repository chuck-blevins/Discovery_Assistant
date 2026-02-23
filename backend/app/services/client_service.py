"""Business logic for client management."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.project import Project
from app.schemas.client import ClientCreate, ClientUpdate


async def create_client(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: ClientCreate,
) -> Client:
    """Create and persist a new client. Raises IntegrityError on duplicate name."""
    client = Client(
        id=uuid.uuid4(),
        user_id=user_id,
        name=data.name,
        description=data.description,
        market_type=data.market_type,
        assumed_problem=data.assumed_problem,
        assumed_solution=data.assumed_solution,
        assumed_market=data.assumed_market,
        initial_notes=data.initial_notes,
        status="active",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


async def list_clients(
    db: AsyncSession,
    user_id: uuid.UUID,
    include_archived: bool = False,
) -> list[Client]:
    """Return clients for user. Excludes archived unless include_archived=True."""
    stmt = select(Client).where(Client.user_id == user_id)
    if not include_archived:
        stmt = stmt.where(Client.status == "active")
    stmt = stmt.order_by(Client.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_client(
    db: AsyncSession,
    client_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Client | None:
    """Return client if it exists and belongs to user, else None."""
    stmt = select(Client).where(Client.id == client_id, Client.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_client(
    db: AsyncSession,
    client: Client,
    data: ClientUpdate,
) -> Client:
    """Apply non-None fields from data to client, commit, and return refreshed."""
    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    client.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(client)
    return client


async def toggle_archive(
    db: AsyncSession,
    client: Client,
) -> Client:
    """Toggle archive status. active→archived or archived→active."""
    if client.status == "active":
        client.status = "archived"
        client.archived_at = datetime.now(timezone.utc)
    else:
        client.status = "active"
        client.archived_at = None
    client.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(client)
    return client


async def delete_client(
    db: AsyncSession,
    client: Client,
) -> None:
    """Hard-delete client. Raises ValueError if client has existing projects."""
    result = await db.execute(
        select(Project).where(Project.client_id == client.id).limit(1)
    )
    if result.scalar_one_or_none() is not None:
        raise ValueError("Cannot delete client with existing projects")
    await db.delete(client)
    await db.commit()
