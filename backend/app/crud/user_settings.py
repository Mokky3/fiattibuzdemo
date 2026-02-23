from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.common.models.user import User, UserProfile, UserSettings


class CRUDUserSettings:
    def get_settings(self, db: Session, *, user_id: str) -> Optional[UserSettings]:
        return db.query(UserSettings).filter(UserSettings.user_id == user_id).first()

    def upsert_settings(self, db: Session, *, user_id: str, settings_data: Dict[str, Any]) -> UserSettings:
        settings = self.get_settings(db, user_id=user_id)
        if settings is None:
            settings = UserSettings(user_id=user_id)
            db.add(settings)
        for key, value in settings_data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        db.commit()
        db.refresh(settings)
        return settings


class CRUDUserProfile:
    def get_profile(self, db: Session, *, user_id: str) -> Optional[UserProfile]:
        return db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

    def upsert_profile(self, db: Session, *, user_id: str, profile_data: Dict[str, Any]) -> UserProfile:
        profile = self.get_profile(db, user_id=user_id)
        if profile is None:
            profile = UserProfile(user_id=user_id)
            db.add(profile)
        for key, value in profile_data.items():
            if hasattr(profile, key):
                try:
                    setattr(profile, key, value)
                except Exception:
                    # Skip fields that don't exist in the database yet (e.g., organization column)
                    # This allows the code to work before migrations are run
                    pass
        db.commit()
        db.refresh(profile)
        return profile

    def update_user_core(self, db: Session, *, user_id: str, user_data: Dict[str, Any]) -> Optional[User]:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        for key, value in user_data.items():
            if hasattr(user, key):
                setattr(user, key, value)
        db.commit()
        db.refresh(user)
        return user


user_settings = CRUDUserSettings()
user_profile = CRUDUserProfile()
