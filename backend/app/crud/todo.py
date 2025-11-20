"""Todo CRUD operations
Connected to todo models and database operations
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Union
from uuid import UUID, uuid4

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc

from app.common.models.messaging import Todo
from app.common.models.user import User, UserRole
from app.crud.base import CRUDBase
from pydantic import BaseModel
from enum import Enum

# Simple TodoPriority enum
class TodoPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

# Simple TodoStatus enum
class TodoStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# ──────────────────────────────────────────────────────────────────────────────
# Todo CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDTodo(CRUDBase[Todo, BaseModel, BaseModel]):
    def get_todos_by_user(
        self,
        db: Session,
        user_id: str,
        completed: Optional[bool] = None,
        priority: Optional[TodoPriority] = None,
        category: Optional[str] = None,
        due_date_from: Optional[datetime] = None,
        due_date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Todo]:
        """Get todos for a specific user."""
        query = db.query(Todo).filter(
            or_(
                Todo.assigned_to == user_id,
                Todo.created_by == user_id
            )
        )
        
        if completed is not None:
            query = query.filter(Todo.completed == completed)
        if priority:
            query = query.filter(Todo.priority == priority.value if hasattr(priority, 'value') else priority)
        if category:
            query = query.filter(Todo.category == category)
        if due_date_from:
            query = query.filter(Todo.due_date >= due_date_from)
        if due_date_to:
            query = query.filter(Todo.due_date <= due_date_to)
        
        return query.order_by(asc(Todo.due_date), desc(Todo.created_at)).offset(skip).limit(limit).all()
    
    def get_todos_by_date(
        self,
        db: Session,
        date: str,  # ISO date string (YYYY-MM-DD)
        user_id: str,
        completed: Optional[bool] = None
    ) -> List[Todo]:
        """Get todos for a specific date."""
        query = db.query(Todo).filter(
            and_(
                Todo.date == date,
                or_(
                    Todo.assigned_to == user_id,
                    Todo.created_by == user_id
                )
            )
        )
        
        if completed is not None:
            query = query.filter(Todo.completed == completed)
        
        return query.order_by(asc(Todo.due_date), desc(Todo.created_at)).all()
    
    def get_pending_todos(
        self,
        db: Session,
        user_id: str,
        overdue_only: bool = False
    ) -> List[Todo]:
        """Get pending todos for a user."""
        query = db.query(Todo).filter(
            and_(
                or_(
                    Todo.assigned_to == user_id,
                    Todo.created_by == user_id
                ),
                Todo.completed == False
            )
        )
        
        
        if overdue_only:
            now = datetime.now(timezone.utc)
            query = query.filter(Todo.due_date < now)
        
        return query.order_by(asc(Todo.due_date), desc(Todo.created_at)).all()
    
    def create_todo(
        self,
        db: Session,
        description: str,
        created_by: str,
        assigned_to: Optional[str] = None,
        priority: str = "medium",
        category: Optional[str] = None,
        due_date: Optional[datetime] = None,
        patient_id: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Todo:
        """Create a new todo."""
        todo_data = {
            "description": description,
            "created_by": created_by,
            "assigned_to": assigned_to or created_by,
            "priority": priority,
            "category": category,
            "due_date": due_date,
            "patient_id": patient_id,
            "notes": notes,
            "completed": False,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        }
        
        return self.create(db=db, obj_in=todo_data)
    
    def toggle_todo(
        self,
        db: Session,
        todo_id: str,
        user_id: str,
        completed: Optional[bool] = None,
        completion_notes: Optional[str] = None,
        actual_duration: Optional[int] = None
    ) -> Optional[Todo]:
        """Toggle todo completion status."""
        todo = db.query(Todo).filter(
            and_(
                Todo.id == todo_id,
                or_(
                    Todo.assigned_to == user_id,
                    Todo.created_by == user_id
                )
            )
        ).first()
        
        if not todo:
            return None
        
        # If completed is not specified, toggle the current status
        if completed is None:
            completed = not todo.completed
        
        update_data = {
            "completed": completed,
            "completed_at": datetime.now(timezone.utc) if completed else None,
            "completed_by": user_id if completed else None
        }
        
        if completion_notes:
            update_data["notes"] = completion_notes
        
        return self.update(db=db, db_obj=todo, obj_in=update_data)
    
    
    def get_todo_statistics(
        self,
        db: Session,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get todo statistics for a user."""
        query = db.query(Todo).filter(
            or_(
                Todo.assigned_to == user_id,
                Todo.created_by == user_id
            )
        )
        
        if start_date:
            query = query.filter(Todo.created_at >= start_date)
        if end_date:
            query = query.filter(Todo.created_at <= end_date)
        
        total_todos = query.count()
        completed_todos = query.filter(Todo.completed == True).count()
        pending_todos = query.filter(Todo.completed == False).count()
        overdue_todos = query.filter(
            and_(
                Todo.completed == False,
                Todo.due_date < datetime.now(timezone.utc)
            )
        ).count()
        
        # Count by priority
        priority_counts = {}
        for priority in TodoPriority:
            count = query.filter(Todo.priority == priority).count()
            priority_counts[priority.value] = count
        
        # Count by category
        category_counts = {}
        categories = db.query(Todo.category).filter(
            and_(
                or_(
                    Todo.assigned_to == user_id,
                    Todo.created_by == user_id
                ),
                Todo.category.isnot(None)
            )
        ).distinct().all()
        
        for category_tuple in categories:
            category = category_tuple[0]
            if category:
                count = query.filter(Todo.category == category).count()
                category_counts[category] = count
        
        return {
            "total_todos": total_todos,
            "completed_todos": completed_todos,
            "pending_todos": pending_todos,
            "overdue_todos": overdue_todos,
            "completion_rate": (completed_todos / total_todos * 100) if total_todos > 0 else 0,
            "priority_counts": priority_counts,
            "category_counts": category_counts,
            "period": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None
            }
        }
    
    def get_overdue_todos(
        self,
        db: Session,
        user_id: str,
    ) -> List[Todo]:
        """Get overdue todos for a user."""
        now = datetime.now(timezone.utc)
        query = db.query(Todo).filter(
            and_(
                or_(
                    Todo.assigned_to == user_id,
                    Todo.created_by == user_id
                ),
                Todo.completed == False,
                Todo.due_date < now
            )
        )
        
        
        return query.order_by(asc(Todo.due_date)).all()
    
    def get_todos_due_soon(
        self,
        db: Session,
        user_id: str,
        hours_ahead: int = 24,
    ) -> List[Todo]:
        """Get todos due within the next N hours."""
        now = datetime.now(timezone.utc)
        future_time = now + timedelta(hours=hours_ahead)
        
        query = db.query(Todo).filter(
            and_(
                or_(
                    Todo.assigned_to == user_id,
                    Todo.created_by == user_id
                ),
                Todo.completed == False,
                Todo.due_date >= now,
                Todo.due_date <= future_time
            )
        )
        
        
        return query.order_by(asc(Todo.due_date)).all()
    
    def update_todo_dependencies(
        self,
        db: Session,
        todo_id: str,
        user_id: str,
        completed_dependencies: List[str]
    ) -> Optional[Todo]:
        """Update completed dependencies for a todo."""
        todo = db.query(Todo).filter(
            and_(
                Todo.id == todo_id,
                or_(
                    Todo.assigned_to == user_id,
                    Todo.created_by == user_id
                )
            )
        ).first()
        
        if not todo:
            return None
        
        return self.update(db=db, db_obj=todo, obj_in={
            "notes": f"Dependencies completed: {', '.join(completed_dependencies)}"
        })
    
    def get_todos_by_patient(
        self,
        db: Session,
        patient_id: str,
        completed: Optional[bool] = None
    ) -> List[Todo]:
        """Get todos related to a specific patient."""
        query = db.query(Todo).filter(Todo.patient_id == patient_id)
        
        if completed is not None:
            query = query.filter(Todo.completed == completed)
        
        return query.order_by(asc(Todo.due_date), desc(Todo.created_at)).all()
    
    def get_todos_by_appointment(
        self,
        db: Session,
        appointment_id: str,
    ) -> List[Todo]:
        """Get todos related to a specific appointment."""
        # Note: appointment_id field doesn't exist in Todo model
        # This method is kept for compatibility but will return empty results
        query = db.query(Todo).filter(Todo.id == "nonexistent")
        
        
        return query.order_by(asc(Todo.due_date), desc(Todo.created_at)).all()
    
    def search_todos(
        self,
        db: Session,
        user_id: str,
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Todo]:
        """Search todos by description."""
        query = db.query(Todo).filter(
            and_(
                or_(
                    Todo.assigned_to == user_id,
                    Todo.created_by == user_id
                ),
                Todo.description.ilike(f"%{search_term}%")
            )
        )
        
        
        return query.order_by(desc(Todo.created_at)).offset(skip).limit(limit).all()
    
    def delete_todo(
        self,
        db: Session,
        todo_id: str,
        user_id: str
    ) -> bool:
        """Delete a todo."""
        todo = db.query(Todo).filter(
            and_(
                Todo.id == todo_id,
                or_(
                    Todo.assigned_to == user_id,
                    Todo.created_by == user_id
                )
            )
        ).first()
        
        if not todo:
            return False
        
        self.remove(db=db, id=todo_id)
        return True

# ──────────────────────────────────────────────────────────────────────────────
# Create CRUD instance
# ──────────────────────────────────────────────────────────────────────────────

todo = CRUDTodo(Todo)
