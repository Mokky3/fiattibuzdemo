from __future__ import annotations

from datetime import date
from typing import List, Optional
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, select

from app.common.models.messaging import Todo

logger = logging.getLogger(__name__)


class CRUDNurseTasks:
    """CRUD operations for nurse tasks using Todo model."""

    def list_tasks(
        self,
        db: Session,
        *,
        nurse_id: str,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        on_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Todo]:
        try:
            # Try to query with all columns including category
            query = db.query(Todo).filter(Todo.assigned_to == nurse_id)
            if status is not None:
                if status in {"pending", "in-progress"}:
                    query = query.filter(Todo.completed.is_(False))
                elif status == "completed":
                    query = query.filter(Todo.completed.is_(True))
            if priority is not None:
                query = query.filter(Todo.priority == priority)
            if on_date is not None:
                query = query.filter(Todo.date == on_date.isoformat())
            return query.order_by(desc(Todo.created_at)).offset(skip).limit(limit).all()
        except Exception as e:
            # If category column doesn't exist, query without it using explicit column selection
            logger.warning(f"Error querying todos (category column may not exist): {e}")
            try:
                # Use explicit column selection excluding category
                # Build query with only columns that exist in the database
                columns = [
                    Todo.id, Todo.description, Todo.priority,
                    Todo.created_by, Todo.assigned_to, Todo.patient_id,
                    Todo.completed, Todo.completed_at, Todo.completed_by,
                    Todo.date, Todo.due_date, Todo.reminder_date,
                    Todo.notes, Todo.created_at, Todo.updated_at
                ]
                stmt = select(*columns).where(Todo.assigned_to == nurse_id)
                
                if status is not None:
                    if status in {"pending", "in-progress"}:
                        stmt = stmt.where(Todo.completed.is_(False))
                    elif status == "completed":
                        stmt = stmt.where(Todo.completed.is_(True))
                if priority is not None:
                    stmt = stmt.where(Todo.priority == priority)
                if on_date is not None:
                    stmt = stmt.where(Todo.date == on_date.isoformat())
                
                stmt = stmt.order_by(desc(Todo.created_at)).offset(skip).limit(limit)
                result = db.execute(stmt).all()
                
                # Convert to Todo objects manually, setting category to None
                tasks = []
                for row in result:
                    todo = Todo()
                    todo.id = row.id
                    todo.description = row.description
                    todo.priority = row.priority
                    todo.created_by = row.created_by
                    todo.assigned_to = row.assigned_to
                    todo.patient_id = row.patient_id
                    todo.completed = row.completed
                    todo.completed_at = row.completed_at
                    todo.completed_by = row.completed_by
                    todo.date = row.date
                    todo.due_date = row.due_date
                    todo.reminder_date = row.reminder_date
                    todo.notes = row.notes
                    todo.created_at = row.created_at
                    todo.updated_at = row.updated_at
                    # category doesn't exist in database, set to None
                    todo.category = None
                    tasks.append(todo)
                return tasks
            except Exception as e2:
                logger.error(f"Error in fallback query: {e2}")
                return []

    def get(self, db: Session, *, task_id: str) -> Optional[Todo]:
        return db.query(Todo).filter(Todo.id == task_id).first()

    def create(
        self,
        db: Session,
        *,
        nurse_id: str,
        description: str,
        priority: str = "medium",
        patient_id: Optional[str] = None,
        category: Optional[str] = None,
        date_str: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Todo:
        obj = Todo(
            id=None,
            description=description,
            category=category,
            priority=priority,
            created_by=nurse_id,
            assigned_to=nurse_id,
            patient_id=patient_id,
            completed=False,
            date=date_str or date.today().isoformat(),
            notes=notes,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update(self, db: Session, *, task_id: str, values: dict) -> Optional[Todo]:
        obj = self.get(db, task_id=task_id)
        if not obj:
            return None
        for k, v in values.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    def toggle_completed(self, db: Session, *, task_id: str, completed: bool) -> Optional[Todo]:
        return self.update(db, task_id=task_id, values={"completed": completed})

    def delete(self, db: Session, *, task_id: str) -> bool:
        obj = self.get(db, task_id=task_id)
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True


nurse_tasks = CRUDNurseTasks()
