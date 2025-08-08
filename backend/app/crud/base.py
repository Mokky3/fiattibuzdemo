# app/crud/base.py
"""Base CRUD operations for all models."""
from typing import Generic, TypeVar, Type, Optional, List, Union, Dict, Any
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from sqlalchemy.sql.expression import BinaryExpression
from datetime import datetime
import uuid

from app.db.session import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Base class for CRUD operations."""
    
    def __init__(self, model: Type[ModelType]):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).
        
        Args:
            model: A SQLAlchemy model class
        """
        self.model = model
    
    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        """
        Get a single record by ID.
        
        Args:
            db: Database session
            id: Record ID (can be UUID or int)
            
        Returns:
            Model instance or None
        """
        return db.query(self.model).filter(self.model.id == id).first()
    
    def get_by_field(
        self,
        db: Session,
        field_name: str,
        field_value: Any
    ) -> Optional[ModelType]:
        """
        Get a single record by any field.
        
        Args:
            db: Database session
            field_name: Field name to filter by
            field_value: Field value to match
            
        Returns:
            Model instance or None
        """
        return db.query(self.model).filter(
            getattr(self.model, field_name) == field_value
        ).first()
    
    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List[BinaryExpression]] = None,
        order_by: Optional[Any] = None
    ) -> List[ModelType]:
        """
        Get multiple records with pagination and filtering.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: List of SQLAlchemy filter expressions
            order_by: Column to order by
            
        Returns:
            List of model instances
        """
        query = db.query(self.model)
        
        if filters:
            query = query.filter(and_(*filters))
        
        if order_by is not None:
            query = query.order_by(order_by)
        
        return query.offset(skip).limit(limit).all()
    
    def get_multi_by_field(
        self,
        db: Session,
        field_name: str,
        field_value: Any,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> List[ModelType]:
        """
        Get multiple records by field value.
        
        Args:
            db: Database session
            field_name: Field name to filter by
            field_value: Field value to match
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of model instances
        """
        return db.query(self.model).filter(
            getattr(self.model, field_name) == field_value
        ).offset(skip).limit(limit).all()
    
    def search(
        self,
        db: Session,
        *,
        search_fields: List[str],
        search_term: str,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List[BinaryExpression]] = None
    ) -> List[ModelType]:
        """
        Search records by multiple fields.
        
        Args:
            db: Database session
            search_fields: List of field names to search in
            search_term: Search term
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: Additional filters to apply
            
        Returns:
            List of model instances
        """
        query = db.query(self.model)
        
        # Build search conditions
        search_conditions = []
        for field in search_fields:
            search_conditions.append(
                func.lower(getattr(self.model, field)).contains(search_term.lower())
            )
        
        query = query.filter(or_(*search_conditions))
        
        if filters:
            query = query.filter(and_(*filters))
        
        return query.offset(skip).limit(limit).all()
    
    def count(
        self,
        db: Session,
        *,
        filters: Optional[List[BinaryExpression]] = None
    ) -> int:
        """
        Count records with optional filtering.
        
        Args:
            db: Database session
            filters: List of SQLAlchemy filter expressions
            
        Returns:
            Number of records
        """
        query = db.query(self.model)
        
        if filters:
            query = query.filter(and_(*filters))
        
        return query.count()
    
    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        """
        Create a new record.
        
        Args:
            db: Database session
            obj_in: Pydantic schema with data to create
            
        Returns:
            Created model instance
        """
        obj_in_data = jsonable_encoder(obj_in)
        
        # Handle UUID generation if needed
        if hasattr(self.model, 'id') and 'id' not in obj_in_data:
            obj_in_data['id'] = uuid.uuid4()
        
        # Set created_at if exists and not provided
        if hasattr(self.model, 'created_at') and 'created_at' not in obj_in_data:
            obj_in_data['created_at'] = datetime.utcnow()
        
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """
        Update a record.
        
        Args:
            db: Database session
            db_obj: Database object to update
            obj_in: Pydantic schema or dict with update data
            
        Returns:
            Updated model instance
        """
        obj_data = jsonable_encoder(db_obj)
        
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        # Update fields
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        
        # Set updated_at if exists
        if hasattr(db_obj, 'updated_at'):
            setattr(db_obj, 'updated_at', datetime.utcnow())
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def remove(self, db: Session, *, id: Any) -> ModelType:
        """
        Delete a record.
        
        Args:
            db: Database session
            id: Record ID to delete
            
        Returns:
            Deleted model instance
        """
        obj = db.query(self.model).get(id)
        db.delete(obj)
        db.commit()
        return obj
    
    def soft_delete(self, db: Session, *, id: Any) -> Optional[ModelType]:
        """
        Soft delete a record (set is_active=False).
        
        Args:
            db: Database session
            id: Record ID to soft delete
            
        Returns:
            Updated model instance or None
        """
        obj = db.query(self.model).get(id)
        if obj and hasattr(obj, 'is_active'):
            setattr(obj, 'is_active', False)
            if hasattr(obj, 'updated_at'):
                setattr(obj, 'updated_at', datetime.utcnow())
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj
    
    def bulk_create(
        self,
        db: Session,
        *,
        objs_in: List[CreateSchemaType]
    ) -> List[ModelType]:
        """
        Create multiple records at once.
        
        Args:
            db: Database session
            objs_in: List of Pydantic schemas with data to create
            
        Returns:
            List of created model instances
        """
        db_objs = []
        
        for obj_in in objs_in:
            obj_in_data = jsonable_encoder(obj_in)
            
            # Handle UUID generation if needed
            if hasattr(self.model, 'id') and 'id' not in obj_in_data:
                obj_in_data['id'] = uuid.uuid4()
            
            # Set created_at if exists and not provided
            if hasattr(self.model, 'created_at') and 'created_at' not in obj_in_data:
                obj_in_data['created_at'] = datetime.utcnow()
            
            db_obj = self.model(**obj_in_data)
            db_objs.append(db_obj)
        
        db.add_all(db_objs)
        db.commit()
        
        # Refresh all objects
        for db_obj in db_objs:
            db.refresh(db_obj)
        
        return db_objs
    
    def exists(self, db: Session, *, id: Any) -> bool:
        """
        Check if a record exists.
        
        Args:
            db: Database session
            id: Record ID to check
            
        Returns:
            True if exists, False otherwise
        """
        return db.query(
            db.query(self.model).filter(self.model.id == id).exists()
        ).scalar()
    
    def get_or_create(
        self,
        db: Session,
        defaults: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> tuple[ModelType, bool]:
        """
        Get a record or create it if it doesn't exist.
        
        Args:
            db: Database session
            defaults: Default values to use when creating
            **kwargs: Fields to filter by
            
        Returns:
            Tuple of (model instance, created boolean)
        """
        instance = db.query(self.model).filter_by(**kwargs).first()
        if instance:
            return instance, False
        else:
            params = dict(kwargs)
            if defaults:
                params.update(defaults)
            instance = self.model(**params)
            db.add(instance)
            db.commit()
            db.refresh(instance)
            return instance, True