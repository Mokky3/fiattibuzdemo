# app/crud/user.py
"""CRUD operations for User model."""
from typing import Optional, List, Dict, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta
import uuid
from passlib.context import CryptContext

from app.crud.base import CRUDBase
from app.common.models.user import User, UserRole, UserStatus, UserActivity

# Password hashing - must match AuthService schemes for compatibility
# Support long passwords safely by preferring bcrypt_sha256 (pre-hashes with SHA-256 before bcrypt),
# while still accepting legacy bcrypt hashes for existing users. Also disable truncate_error for bcrypt.
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt_sha256", "bcrypt"],
    deprecated="auto",
    bcrypt__truncate_error=False,
    bcrypt_sha256__truncate_error=False,
)


class CRUDUser(CRUDBase[User, Any, Any]):
    """CRUD operations for User model with authentication and analytics support."""
    
    # ───────────────
    # Lookups
    # ───────────────
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(func.lower(User.email) == func.lower(email)).first()
    
    def get_by_username(self, db: Session, *, username: str) -> Optional[User]:
        return db.query(User).filter(func.lower(User.username) == func.lower(username)).first()
    
    def get_by_username_or_email(self, db: Session, *, username_or_email: str) -> Optional[User]:
        """Get user by username, email, or phone number."""
        identifier = username_or_email.strip()
        return db.query(User).filter(
            or_(
                func.lower(User.username) == func.lower(identifier),
                func.lower(User.email) == func.lower(identifier),
                User.phone == identifier
            )
        ).first()

    # ───────────────
    # Create/Update/Auth
    # ───────────────
    def create(self, db: Session, *, obj_in: Union[Dict[str, Any], Any]) -> User:
        """Create new user; accept dict or pydantic; hash password if provided."""
        if hasattr(obj_in, "dict"):
            data: Dict[str, Any] = obj_in.dict(exclude_unset=True)
        else:
            data = dict(obj_in)
        password = data.pop("password", None)
        if password:
            # Use pbkdf2_sha256 to match AuthService.get_password_hash() scheme
            data["password_hash"] = pwd_context.hash(password, scheme="pbkdf2_sha256")
            data["password_changed_at"] = datetime.utcnow()
        if "username" not in data and "email" in data and data["email"]:
            data["username"] = data["email"].split("@")[0]
        # Defaults
        if "status" not in data:
            data["status"] = UserStatus.ACTIVE
        now = datetime.utcnow()
        if "created_at" not in data:
            data["created_at"] = now
        if "updated_at" not in data:
            data["updated_at"] = now
        db_obj = User(**data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def authenticate(self, db: Session, *, username_or_email: str, password: str) -> Optional[User]:
        user = self.get_by_username_or_email(db, username_or_email=username_or_email)
        if not user:
            return None
        if not pwd_context.verify(password, user.password_hash):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.utcnow() + timedelta(minutes=15)
                user.status = UserStatus.SUSPENDED
            db.commit()
            return None
        if user.locked_until and user.locked_until > datetime.utcnow():
            return None
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login = datetime.utcnow()
        if user.status == UserStatus.SUSPENDED:
            user.status = UserStatus.ACTIVE
        db.commit()
        return user

    def change_password(self, db: Session, *, user: User, current_password: str, new_password: str) -> Optional[User]:
        if not pwd_context.verify(current_password, user.password_hash):
            return None
        # Use pbkdf2_sha256 to match AuthService.get_password_hash() scheme
        user.password_hash = pwd_context.hash(new_password, scheme="pbkdf2_sha256")
        user.password_changed_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user

    def reset_password(self, db: Session, *, user: User, new_password: str) -> User:
        # Use pbkdf2_sha256 to match AuthService.get_password_hash() scheme
        user.password_hash = pwd_context.hash(new_password, scheme="pbkdf2_sha256")
        user.password_changed_at = datetime.utcnow()
        user.failed_login_attempts = 0
        user.locked_until = None
        if user.status == UserStatus.SUSPENDED:
            user.status = UserStatus.ACTIVE
        db.commit()
        db.refresh(user)
        return user

    def update_status(self, db: Session, *, user: User, status: UserStatus) -> User:
        user.status = status
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user

    def verify_email(self, db: Session, *, user: User) -> User:
        user.email_verified = True
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user

    def verify_phone(self, db: Session, *, user: User) -> User:
        user.phone_verified = True
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user

    def toggle_two_factor(self, db: Session, *, user: User, enabled: bool) -> User:
        user.two_factor_enabled = enabled
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user

    # ───────────────
    # Queries
    # ───────────────
    def get_by_organization(self, db: Session, *, organization_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[User]:
        return db.query(User).filter(User.organization_id == organization_id).offset(skip).limit(limit).all()

    def get_by_department(self, db: Session, *, department_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[User]:
        return db.query(User).filter(User.department_id == department_id).offset(skip).limit(limit).all()

    def search_users(self, db: Session, *, search_term: str, skip: int = 0, limit: int = 100, filters: Optional[Dict[str, Any]] = None) -> List[User]:
        query = db.query(User)
        if search_term:
            query = query.filter(
                or_(
                    func.lower(User.first_name).contains(search_term.lower()),
                    func.lower(User.last_name).contains(search_term.lower()),
                    func.lower(User.email).contains(search_term.lower()),
                    func.lower(User.username).contains(search_term.lower()),
                    User.phone.contains(search_term),
                )
            )
        if filters:
            if filters.get("role"):
                query = query.filter(User.role == filters["role"])
            if filters.get("status"):
                query = query.filter(User.status == filters["status"])
            if filters.get("organization_id"):
                query = query.filter(User.organization_id == filters["organization_id"])
            if filters.get("department_id"):
                query = query.filter(User.department_id == filters["department_id"])
        return query.offset(skip).limit(limit).all()

    # ───────────────
    # Analytics for admin portal
    # ───────────────
    def get_user_stats(self, db: Session) -> Dict[str, Any]:
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.status == UserStatus.ACTIVE).count()
        inactive_users = db.query(User).filter(User.status == UserStatus.INACTIVE).count()
        users_by_role: Dict[str, int] = {role.value: db.query(User).filter(User.role == role).count() for role in UserRole}
        users_by_status: Dict[str, int] = {
            UserStatus.ACTIVE.value: active_users,
            UserStatus.INACTIVE.value: inactive_users,
            UserStatus.SUSPENDED.value: db.query(User).filter(User.status == UserStatus.SUSPENDED).count(),
            UserStatus.PENDING.value: db.query(User).filter(User.status == UserStatus.PENDING).count(),
        }
        recent_registrations = self.count_users_by_date_range(
            db=db,
            start_date=datetime.utcnow() - timedelta(days=30),
            end_date=datetime.utcnow(),
        )
        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": inactive_users,
            "users_by_role": users_by_role,
            "users_by_status": users_by_status,
            "recent_registrations": recent_registrations,
        }

    def count_users_by_date_range(self, db: Session, *, start_date: datetime, end_date: datetime) -> int:
        return db.query(User).filter(User.created_at >= start_date, User.created_at <= end_date).count()

    def count_recent_logins(self, db: Session, *, days: int = 7) -> int:
        since = datetime.utcnow() - timedelta(days=days)
        return db.query(User).filter(User.last_login != None, User.last_login >= since).count()

    def get_user_activity_stats(self, db: Session, *, days: int = 30) -> List[Dict[str, Any]]:
        data: List[Dict[str, Any]] = []
        today = datetime.utcnow().date()
        for i in range(days):
            d = today - timedelta(days=i)
            start = datetime(d.year, d.month, d.day)
            end = start + timedelta(days=1)
            registrations = db.query(User).filter(User.created_at >= start, User.created_at < end).count()
            logins = db.query(UserActivity).filter(UserActivity.activity_type == "login", UserActivity.created_at >= start, UserActivity.created_at < end).count()
            active_users = db.query(User).filter(User.last_activity != None, User.last_activity >= start, User.last_activity < end).count()
            data.append({"date": d, "registrations": registrations, "logins": logins, "active_users": active_users})
        return list(reversed(data))

    def get_user_growth_stats(self, db: Session, *, months: int = 12) -> Dict[str, Any]:
        monthly_growth: List[Dict[str, Any]] = []
        total_growth = 0
        today = datetime.utcnow()
        for i in range(months):
            dt = (today.replace(day=1) - timedelta(days=30 * (months - 1 - i)))
            start = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
            count = db.query(User).filter(User.created_at >= start, User.created_at < end_month).count()
            total_growth += count
            monthly_growth.append({"month": start.strftime("%Y-%m"), "count": count})
        growth_rate = (monthly_growth[-1]["count"] - monthly_growth[0]["count"]) / max(monthly_growth[0]["count"], 1) * 100.0 if monthly_growth else 0.0
        return {"total_growth": total_growth, "growth_rate": round(growth_rate, 2), "monthly_growth": monthly_growth}

    def get_user_engagement_stats(self, db: Session, *, days: int = 30) -> Dict[str, Any]:
        since = datetime.utcnow() - timedelta(days=days)
        total_sessions = db.query(UserActivity).filter(UserActivity.activity_type == "login", UserActivity.created_at >= since).count()
        return {
            "total_sessions": total_sessions,
            "average_session_duration": 0.0,
            "most_active_hours": [],
            "most_active_days": [],
            "user_retention_rate": 0.0,
        }

    def get_role_distribution_stats(self, db: Session) -> Dict[str, Dict[str, Any]]:
        total = db.query(User).count()
        data: Dict[str, Dict[str, Any]] = {}
        for role in UserRole:
            count = db.query(User).filter(User.role == role).count()
            data[role.value] = {
                "count": count,
                "percentage": round((count / total * 100.0), 2) if total else 0.0,
                "growth_trend": "stable",
            }
        return data

    def get_organization_stats(self, db: Session) -> List[Dict[str, Any]]:
        rows = db.query(User.organization_id, func.count(User.id)).group_by(User.organization_id).all()
        result: List[Dict[str, Any]] = []
        for org_id, cnt in rows:
            if not org_id:
                continue
            active = db.query(User).filter(User.organization_id == org_id, User.status == UserStatus.ACTIVE).count()
            last_activity = db.query(func.max(User.last_activity)).filter(User.organization_id == org_id).scalar()
            result.append({
                "organization_id": org_id,
                "organization_name": str(org_id),
                "user_count": cnt,
                "active_users": active,
                "last_activity": last_activity,
            })
        return result

    def get_user_trends(self, db: Session, *, metric: str, period: str) -> Dict[str, Any]:
        days = int(period.replace("d", "")) if period.endswith("d") else 30
        data = self.get_user_activity_stats(db=db, days=days)
        return {"metric": metric, "period": period, "series": data}

    def get_user_predictions(self, db: Session, *, prediction_type: str, horizon: int) -> Dict[str, Any]:
        recent = self.get_user_activity_stats(db=db, days=7)
        last = recent[-1]["registrations"] if recent else 0
        return {"type": prediction_type, "horizon": horizon, "predicted": [last for _ in range(horizon)]}

    def get_user_comparison(self, db: Session, *, compare_by: str, period: str) -> Dict[str, Any]:
        if compare_by == "role":
            return self.get_role_distribution_stats(db=db)
        return {}

    def generate_user_report(self, db: Session, *, report_type: str, format: str, period: str) -> Dict[str, str]:
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return {"file_url": f"/exports/user_{report_type}_{timestamp}.{format}"}


# Create instance
user = CRUDUser(User)