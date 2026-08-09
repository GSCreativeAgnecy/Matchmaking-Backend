from datetime import UTC
from uuid import UUID

from sqlalchemy import func, select

from app.db.models import Conversation, ConversationParticipant, Message
from app.repositories.base import BaseRepository


class MessageRepository(BaseRepository[Message]):
    model = Message

    async def get_conversation(self, conversation_id: UUID) -> Conversation | None:
        return await self.session.get(Conversation, conversation_id)

    async def get_conversation_with_participant(self, conversation_id: UUID, user_id: UUID) -> Conversation | None:
        stmt = (
            select(Conversation)
            .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
            .where(Conversation.id == conversation_id, ConversationParticipant.user_id == user_id)
        )
        return (await self.session.execute(stmt)).scalars().first()

    async def get_direct_conversation(self, a: UUID, b: UUID) -> Conversation | None:
        conv_ids_a = (
            select(ConversationParticipant.conversation_id)
            .where(ConversationParticipant.user_id == a)
            .scalar_subquery()
        )
        stmt = (
            select(ConversationParticipant.conversation_id)
            .where(
                ConversationParticipant.user_id == b,
                ConversationParticipant.conversation_id.in_(conv_ids_a),
            )
            .limit(1)
        )
        conv_id = (await self.session.execute(stmt)).scalar_one_or_none()
        return await self.session.get(Conversation, conv_id) if conv_id else None

    async def create_conversation(self, a: UUID, b: UUID) -> Conversation:
        conv = Conversation()
        self.session.add(conv)
        await self.session.flush()
        self.session.add_all(
            [
                ConversationParticipant(conversation_id=conv.id, user_id=a),
                ConversationParticipant(conversation_id=conv.id, user_id=b),
            ]
        )
        await self.session.flush()
        return conv

    async def conversations_for(self, user_id: UUID) -> list[Conversation]:
        stmt = (
            select(Conversation)
            .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
            .where(ConversationParticipant.user_id == user_id)
            .order_by(Conversation.last_message_at.desc().nullslast())
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def messages_for(
        self, conversation_id: UUID, *, before: UUID | None = None, limit: int = 50
    ) -> list[Message]:
        stmt = select(Message).where(Message.conversation_id == conversation_id, Message.deleted_at.is_(None))
        if before:
            stmt = stmt.where(Message.id < before)
        stmt = stmt.order_by(Message.created_at.desc()).limit(limit)
        return list((await self.session.execute(stmt)).scalars().all())

    async def unread_count(self, conversation_id: UUID, user_id: UUID) -> int:
        stmt = select(func.count(Message.id)).where(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
            Message.read_at.is_(None),
            Message.deleted_at.is_(None),
        )
        return (await self.session.execute(stmt)).scalar_one() or 0

    async def mark_conversation_read(self, conversation_id: UUID, user_id: UUID) -> None:
        from datetime import datetime

        stmt = (
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                Message.read_at.is_(None),
            )
            .limit(500)
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        now = datetime.now(UTC)
        for m in rows:
            m.read_at = now
