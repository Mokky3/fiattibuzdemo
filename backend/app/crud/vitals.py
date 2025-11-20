from __future__ import annotations

from datetime import datetime, date
from typing import List, Optional, Dict, Any
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, text, select

from app.common.models.medical import VitalSign

logger = logging.getLogger(__name__)


class CRUDVitals:
    """CRUD operations for patient vital signs using VitalSign model."""

    def list_by_patient(
        self,
        db: Session,
        *,
        patient_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[VitalSign]:
        query = db.query(VitalSign).filter(VitalSign.patient_id == patient_id)
        if date_from:
            query = query.filter(VitalSign.measured_at >= datetime.combine(date_from, datetime.min.time()))
        if date_to:
            query = query.filter(VitalSign.measured_at <= datetime.combine(date_to, datetime.max.time()))
        return query.order_by(desc(VitalSign.measured_at)).offset(skip).limit(limit).all()

    def get(self, db: Session, *, vital_id: str) -> Optional[VitalSign]:
        return db.query(VitalSign).filter(VitalSign.id == vital_id).first()

    def create(
        self,
        db: Session,
        *,
        patient_id: str,
        measured_by: str,
        values: Dict[str, Any],
        measured_at: Optional[datetime] = None
    ) -> VitalSign:
        try:
            # Use raw SQL insert to exclude columns that don't exist in the database
            # Build insert statement with only columns that exist in the database
            # The database table doesn't have measured_at, measured_by, or medical_record_id columns
            
            # Build column list and values, excluding columns that don't exist
            columns = ["patient_id"]
            placeholders = [":patient_id"]
            params = {
                "patient_id": patient_id,
            }
            
            # Map API column names to actual database column names
            # Actual database columns: id, patient_id, recorded_by, systolic_bp, diastolic_bp, 
            # heart_rate, temperature, respiratory_rate, oxygen_saturation, weight, height, bmi, 
            # recorded_at, created_at
            # Note: pain_scale does NOT exist in the database
            column_mapping = {
                "blood_pressure_systolic": "systolic_bp",
                "blood_pressure_diastolic": "diastolic_bp",
                "measured_by": "recorded_by",
                "measured_at": "recorded_at",
            }
            
            # Columns that don't exist in the database
            excluded_columns = [
                "medical_record_id", 
                "blood_pressure_position",
                "notes",  # notes column doesn't exist in vital_signs table
            ]
            
            # Build columns to insert with correct database column names
            columns_to_try = ["patient_id"]
            params_to_try = {"patient_id": patient_id}
            
            # Add recorded_by and recorded_at if provided
            if measured_by:
                columns_to_try.append("recorded_by")
                params_to_try["recorded_by"] = measured_by
            
            if measured_at:
                columns_to_try.append("recorded_at")
                params_to_try["recorded_at"] = measured_at
            
            # Map and add values from the values dict
            height_value = None
            weight_value = None
            for api_col, value in values.items():
                if api_col in excluded_columns:
                    continue
                if value is None:
                    continue
                
                # Map to database column name
                db_col = column_mapping.get(api_col, api_col)
                columns_to_try.append(db_col)
                params_to_try[db_col] = value
                
                # Store height and weight for BMI calculation
                if api_col == "height":
                    height_value = value
                elif api_col == "weight":
                    weight_value = value
            
            # Calculate BMI if both height and weight are provided
            if height_value is not None and weight_value is not None:
                try:
                    # BMI = weight (kg) / (height (m))^2
                    # Height is in cm, so convert to meters: height / 100
                    height_m = float(height_value) / 100.0
                    weight_kg = float(weight_value)
                    if height_m > 0:
                        bmi_value = weight_kg / (height_m * height_m)
                        # Round to 1 decimal place
                        bmi_value = round(bmi_value, 1)
                        columns_to_try.append("bmi")
                        params_to_try["bmi"] = bmi_value
                        logger.info(f"Calculated BMI: {bmi_value} (height={height_value}cm, weight={weight_value}kg)")
                except (ValueError, TypeError, ZeroDivisionError) as e:
                    logger.warning(f"Could not calculate BMI: {e}")
                    # Don't add BMI if calculation fails
            
            # Log what we're trying to insert
            logger.info(f"Attempting to insert vital sign with columns: {columns_to_try}")
            logger.info(f"Values: {params_to_try}")
            logger.info(f"Excluded columns: {excluded_columns}")
            logger.info(f"Values dict keys: {list(values.keys())}")
            
            # Insert with all mapped columns
            columns_str = ", ".join(columns_to_try)
            placeholders_str = ", ".join([f":{col}" for col in columns_to_try])
            
            insert_sql = text(f"""
                INSERT INTO ehr.vital_signs ({columns_str})
                VALUES ({placeholders_str})
                RETURNING id
            """)
            
            result = db.execute(insert_sql, params_to_try)
            db.commit()
            row = result.fetchone()
            vital_id = row[0]
            logger.info(f"Successfully created vital sign with id={vital_id} for patient_id={patient_id} using columns: {columns_to_try}")
            logger.info(f"Inserted values: {params_to_try}")
            
            # Query the object back using raw SQL to avoid selecting non-existent columns
            # Only select columns that definitely exist (id and patient_id)
            # Other columns may or may not exist, so we'll set them to None if not found
            try:
                # Try with only id and patient_id first (these definitely exist)
                select_sql = text("""
                    SELECT id, patient_id
                    FROM ehr.vital_signs
                    WHERE id = :vital_id
                """)
                result = db.execute(select_sql, {"vital_id": vital_id}).first()
                
                if not result:
                    raise Exception("Failed to retrieve created vital sign")
                
                # Create a VitalSign object manually with minimal data
                obj = VitalSign()
                obj.id = result[0]
                obj.patient_id = result[1]
                
                # Try to get additional columns if they exist (with separate queries to avoid errors)
                try:
                    temp_sql = text("SELECT temperature FROM ehr.vital_signs WHERE id = :vital_id")
                    temp_result = db.execute(temp_sql, {"vital_id": vital_id}).first()
                    obj.temperature = temp_result[0] if temp_result else None
                except Exception:
                    obj.temperature = None
                
                try:
                    hr_sql = text("SELECT heart_rate FROM ehr.vital_signs WHERE id = :vital_id")
                    hr_result = db.execute(hr_sql, {"vital_id": vital_id}).first()
                    obj.heart_rate = hr_result[0] if hr_result else None
                except Exception:
                    obj.heart_rate = None
                
                # Notes column doesn't exist, so set it to None
                obj.notes = None
                
                # Query all columns at once using correct database column names
                full_select_sql = text("""
                    SELECT id, patient_id, recorded_by, systolic_bp, diastolic_bp, 
                           heart_rate, temperature, respiratory_rate, oxygen_saturation, 
                           weight, height, bmi, recorded_at, created_at
                    FROM ehr.vital_signs
                    WHERE id = :vital_id
                """)
                full_result = db.execute(full_select_sql, {"vital_id": vital_id}).first()
                
                if full_result:
                    obj.temperature = full_result[6] if len(full_result) > 6 else None
                    obj.heart_rate = full_result[5] if len(full_result) > 5 else None
                    obj.respiratory_rate = full_result[7] if len(full_result) > 7 else None
                    obj.oxygen_saturation = full_result[8] if len(full_result) > 8 else None
                    
                    # Map database columns to model attributes
                    try:
                        obj.blood_pressure_systolic = full_result[3] if len(full_result) > 3 else None
                        obj.blood_pressure_diastolic = full_result[4] if len(full_result) > 4 else None
                    except AttributeError:
                        pass
                    
                    # Map height and weight
                    try:
                        obj.weight = full_result[9] if len(full_result) > 9 else None
                        obj.height = full_result[10] if len(full_result) > 10 else None
                    except AttributeError:
                        pass
                    
                    # Map recorded_by to measured_by for model compatibility
                    try:
                        obj.measured_by = full_result[2] if len(full_result) > 2 else measured_by
                    except AttributeError:
                        pass
                    
                    # Map recorded_at to measured_at for model compatibility
                    try:
                        obj.measured_at = full_result[12] if len(full_result) > 12 else (measured_at or datetime.utcnow())
                    except AttributeError:
                        obj.measured_at = measured_at or datetime.utcnow()
                    
                    try:
                        obj.created_at = full_result[13] if len(full_result) > 13 else None
                    except AttributeError:
                        pass
                    
                    logger.info(f"Retrieved vital {vital_id}: temp={obj.temperature}, hr={obj.heart_rate}, rr={obj.respiratory_rate}, spo2={obj.oxygen_saturation}, bp={obj.blood_pressure_systolic}/{obj.blood_pressure_diastolic}, height={obj.height}, weight={obj.weight}")
                
                # Set columns that don't exist in database
                obj.medical_record_id = None
                obj.notes = None  # notes doesn't exist in database
                obj.updated_at = None
                
                # Get pain_scale if it exists
                try:
                    pain_sql = text("SELECT pain_scale FROM ehr.vital_signs WHERE id = :vital_id")
                    pain_result = db.execute(pain_sql, {"vital_id": vital_id}).first()
                    obj.pain_scale = pain_result[0] if pain_result and pain_result[0] is not None else None
                except Exception:
                    obj.pain_scale = None
            except Exception as raw_error:
                logger.error(f"Error querying with raw SQL: {raw_error}")
                # Rollback if transaction is aborted
                try:
                    db.rollback()
                except Exception:
                    pass
                raise Exception(f"Failed to retrieve created vital sign: {raw_error}")
            
            return obj
        except Exception as e:
            logger.error(f"Error creating vital sign: {e}", exc_info=True)
            db.rollback()
            raise

    def update(
        self,
        db: Session,
        *,
        vital_id: str,
        values: Dict[str, Any]
    ) -> Optional[VitalSign]:
        obj = self.get(db, vital_id=vital_id)
        if not obj:
            return None
        for k, v in values.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, *, vital_id: str) -> bool:
        obj = self.get(db, vital_id=vital_id)
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True


vitals = CRUDVitals()
