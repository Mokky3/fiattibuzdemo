# app/crud/clinical.py
"""CRUD operations for Clinical models."""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, date
import uuid
import json

from app.crud.base import CRUDBase
from app.common.models.clinical import (
    Condition, ConditionStage, ConditionEvidence,
    Observation, ObservationComponent,
    AllergyIntolerance, AllergyReaction,
    Immunization, ImmunizationReaction, ImmunizationProtocol,
    FamilyMemberHistory, FamilyMemberCondition,
    ClinicalStatus, VerificationStatus, ObservationStatus,
    AllergyType, AllergyCriticality, ImmunizationStatus
)


class CRUDCondition(CRUDBase[Condition, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for Condition model."""
    
    def create_condition(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        code: Dict[str, Any],
        display_name: str,
        clinical_status: ClinicalStatus,
        verification_status: VerificationStatus,
        category: str,
        recorder_id: uuid.UUID,
        **kwargs
    ) -> Condition:
        """Create a new condition/diagnosis."""
        condition = Condition(
            id=uuid.uuid4(),
            patient_id=patient_id,
            code=code,
            display_name=display_name,
            clinical_status=clinical_status,
            verification_status=verification_status,
            category=category,
            recorded_date=datetime.utcnow(),
            recorder_id=recorder_id,
            **kwargs
        )
        
        db.add(condition)
        db.commit()
        db.refresh(condition)
        return condition
    
    def get_patient_conditions(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        clinical_status: Optional[ClinicalStatus] = None,
        category: Optional[str] = None,
        include_resolved: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[Condition]:
        """Get conditions for a patient."""
        query = db.query(Condition).filter(
            Condition.patient_id == patient_id
        )
        
        if clinical_status:
            query = query.filter(Condition.clinical_status == clinical_status)
        elif not include_resolved:
            query = query.filter(
                Condition.clinical_status.in_([
                    ClinicalStatus.ACTIVE,
                    ClinicalStatus.RECURRENCE,
                    ClinicalStatus.RELAPSE
                ])
            )
        
        if category:
            query = query.filter(Condition.category == category)
        
        return query.order_by(desc(Condition.recorded_date)).offset(skip).limit(limit).all()
    
    def update_condition_status(
        self,
        db: Session,
        *,
        condition_id: uuid.UUID,
        clinical_status: ClinicalStatus,
        verification_status: Optional[VerificationStatus] = None
    ) -> Optional[Condition]:
        """Update condition status."""
        condition = self.get(db, id=condition_id)
        if condition:
            condition.clinical_status = clinical_status
            if verification_status:
                condition.verification_status = verification_status
            
            # Set abatement date if resolved
            if clinical_status == ClinicalStatus.RESOLVED:
                condition.abatement_date = date.today()
            
            condition.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(condition)
        return condition
    
    def add_condition_stage(
        self,
        db: Session,
        *,
        condition_id: uuid.UUID,
        summary: Dict[str, Any],
        assessment: Optional[Dict[str, Any]] = None,
        stage_type: Optional[Dict[str, Any]] = None
    ) -> Optional[ConditionStage]:
        """Add staging information to a condition."""
        condition = self.get(db, id=condition_id)
        if not condition:
            return None
        
        stage = ConditionStage(
            id=uuid.uuid4(),
            condition_id=condition_id,
            summary=summary,
            assessment=assessment,
            type=stage_type
        )
        
        db.add(stage)
        db.commit()
        db.refresh(stage)
        return stage
    
    def search_conditions_by_code(
        self,
        db: Session,
        *,
        code_system: str,
        code_value: str,
        patient_id: Optional[uuid.UUID] = None
    ) -> List[Condition]:
        """Search conditions by diagnostic code."""
        query = db.query(Condition)
        
        # Search in JSON code field
        query = query.filter(
            func.jsonb_path_exists(
                Condition.code,
                f'$.coding[*] ? (@.system == "{code_system}" && @.code == "{code_value}")'
            )
        )
        
        if patient_id:
            query = query.filter(Condition.patient_id == patient_id)
        
        return query.all()


class CRUDObservation(CRUDBase[Observation, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for Observation model."""
    
    def create_observation(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        code: Dict[str, Any],
        display_name: str,
        category: str,
        status: ObservationStatus = ObservationStatus.FINAL,
        value_quantity: Optional[float] = None,
        value_unit: Optional[str] = None,
        value_string: Optional[str] = None,
        **kwargs
    ) -> Observation:
        """Create a new observation."""
        # Determine value type
        value_type = None
        value_data = None
        
        if value_quantity is not None:
            value_type = "quantity"
            value_data = {"value": value_quantity, "unit": value_unit}
        elif value_string is not None:
            value_type = "string"
            value_data = {"value": value_string}
        
        observation = Observation(
            id=uuid.uuid4(),
            patient_id=patient_id,
            code=code,
            display_name=display_name,
            category=category,
            status=status,
            value_type=value_type,
            value_data=value_data,
            value_quantity=value_quantity,
            value_unit=value_unit,
            value_string=value_string,
            effective_date=datetime.utcnow(),
            issued=datetime.utcnow(),
            **kwargs
        )
        
        # Check if value is abnormal based on reference ranges
        if value_quantity and observation.reference_range_low and observation.reference_range_high:
            observation.is_abnormal = (
                value_quantity < observation.reference_range_low or
                value_quantity > observation.reference_range_high
            )
        
        db.add(observation)
        db.commit()
        db.refresh(observation)
        return observation
    
    def get_patient_observations(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        category: Optional[str] = None,
        code_system: Optional[str] = None,
        code_value: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Observation]:
        """Get observations for a patient."""
        query = db.query(Observation).filter(
            Observation.patient_id == patient_id
        )
        
        if category:
            query = query.filter(Observation.category == category)
        
        if code_system and code_value:
            query = query.filter(
                func.jsonb_path_exists(
                    Observation.code,
                    f'$.coding[*] ? (@.system == "{code_system}" && @.code == "{code_value}")'
                )
            )
        
        if date_from:
            query = query.filter(Observation.effective_date >= date_from)
        
        if date_to:
            query = query.filter(Observation.effective_date <= date_to)
        
        return query.order_by(desc(Observation.effective_date)).offset(skip).limit(limit).all()
    
    def get_latest_vital_signs(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Get latest vital signs for a patient."""
        vital_codes = {
            "blood_pressure": ("http://loinc.org", "85354-9"),
            "heart_rate": ("http://loinc.org", "8867-4"),
            "temperature": ("http://loinc.org", "8310-5"),
            "weight": ("http://loinc.org", "29463-7"),
            "height": ("http://loinc.org", "8302-2"),
            "oxygen_saturation": ("http://loinc.org", "2708-6")
        }
        
        latest_vitals = {}
        
        for vital_name, (system, code) in vital_codes.items():
            observation = db.query(Observation).filter(
                and_(
                    Observation.patient_id == patient_id,
                    Observation.category == "vital_signs",
                    func.jsonb_path_exists(
                        Observation.code,
                        f'$.coding[*] ? (@.system == "{system}" && @.code == "{code}")'
                    )
                )
            ).order_by(desc(Observation.effective_date)).first()
            
            if observation:
                latest_vitals[vital_name] = {
                    "value": observation.value_quantity or observation.value_string,
                    "unit": observation.value_unit,
                    "date": observation.effective_date,
                    "is_abnormal": observation.is_abnormal
                }
        
        return latest_vitals
    
    def create_observation_with_components(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        code: Dict[str, Any],
        display_name: str,
        components: List[Dict[str, Any]],
        **kwargs
    ) -> Observation:
        """Create observation with multiple components (e.g., blood pressure)."""
        observation = self.create_observation(
            db,
            patient_id=patient_id,
            code=code,
            display_name=display_name,
            category="vital_signs",
            **kwargs
        )
        
        # Add components
        for comp_data in components:
            component = ObservationComponent(
                id=uuid.uuid4(),
                observation_id=observation.id,
                code=comp_data["code"],
                display_name=comp_data["display_name"],
                value_type=comp_data.get("value_type", "quantity"),
                value_data=comp_data.get("value_data"),
                value_quantity=comp_data.get("value_quantity"),
                value_unit=comp_data.get("value_unit"),
                value_string=comp_data.get("value_string"),
                reference_range_low=comp_data.get("reference_range_low"),
                reference_range_high=comp_data.get("reference_range_high")
            )
            db.add(component)
        
        db.commit()
        db.refresh(observation)
        return observation


class CRUDAllergyIntolerance(CRUDBase[AllergyIntolerance, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for AllergyIntolerance model."""
    
    def create_allergy(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        code: Dict[str, Any],
        display_name: str,
        allergy_type: AllergyType,
        categories: List[str],
        recorder_id: uuid.UUID,
        criticality: Optional[AllergyCriticality] = None,
        **kwargs
    ) -> AllergyIntolerance:
        """Create a new allergy/intolerance record."""
        allergy = AllergyIntolerance(
            id=uuid.uuid4(),
            patient_id=patient_id,
            code=code,
            display_name=display_name,
            type=allergy_type,
            categories=categories,
            criticality=criticality,
            clinical_status=ClinicalStatus.ACTIVE,
            verification_status=VerificationStatus.CONFIRMED,
            recorded_date=datetime.utcnow(),
            recorder_id=recorder_id,
            **kwargs
        )
        
        db.add(allergy)
        db.commit()
        db.refresh(allergy)
        return allergy
    
    def add_reaction(
        self,
        db: Session,
        *,
        allergy_id: uuid.UUID,
        manifestations: List[Dict[str, Any]],
        severity: Optional[str] = None,
        description: Optional[str] = None,
        onset: Optional[datetime] = None
    ) -> Optional[AllergyReaction]:
        """Add reaction details to an allergy."""
        allergy = self.get(db, id=allergy_id)
        if not allergy:
            return None
        
        reaction = AllergyReaction(
            id=uuid.uuid4(),
            allergy_id=allergy_id,
            manifestations=manifestations,
            severity=severity,
            description=description,
            onset=onset
        )
        
        db.add(reaction)
        
        # Update last occurrence on allergy
        if onset:
            allergy.last_occurrence = onset
        
        db.commit()
        db.refresh(reaction)
        return reaction
    
    def get_patient_allergies(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        include_inactive: bool = False,
        category: Optional[str] = None
    ) -> List[AllergyIntolerance]:
        """Get allergies for a patient."""
        query = db.query(AllergyIntolerance).filter(
            AllergyIntolerance.patient_id == patient_id
        )
        
        if not include_inactive:
            query = query.filter(
                AllergyIntolerance.clinical_status == ClinicalStatus.ACTIVE
            )
        
        if category:
            query = query.filter(
                func.jsonb_path_exists(
                    AllergyIntolerance.categories,
                    f'$[*] ? (@ == "{category}")'
                )
            )
        
        return query.order_by(desc(AllergyIntolerance.recorded_date)).all()
    
    def resolve_allergy(
        self,
        db: Session,
        *,
        allergy_id: uuid.UUID,
        resolution_date: Optional[date] = None
    ) -> Optional[AllergyIntolerance]:
        """Mark an allergy as resolved."""
        allergy = self.get(db, id=allergy_id)
        if allergy:
            allergy.clinical_status = ClinicalStatus.RESOLVED
            allergy.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(allergy)
        return allergy


class CRUDImmunization(CRUDBase[Immunization, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for Immunization model."""
    
    def create_immunization(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        vaccine_code: Dict[str, Any],
        vaccine_name: str,
        occurrence_date: datetime,
        performer_id: Optional[uuid.UUID] = None,
        status: ImmunizationStatus = ImmunizationStatus.COMPLETED,
        **kwargs
    ) -> Immunization:
        """Create a new immunization record."""
        immunization = Immunization(
            id=uuid.uuid4(),
            patient_id=patient_id,
            vaccine_code=vaccine_code,
            vaccine_name=vaccine_name,
            occurrence_date=occurrence_date,
            recorded=datetime.utcnow(),
            status=status,
            performer_id=performer_id,
            **kwargs
        )
        
        db.add(immunization)
        db.commit()
        db.refresh(immunization)
        return immunization
    
    def add_immunization_protocol(
        self,
        db: Session,
        *,
        immunization_id: uuid.UUID,
        dose_number: int,
        series_doses: int,
        target_diseases: List[Dict[str, Any]],
        series: Optional[str] = None
    ) -> Optional[ImmunizationProtocol]:
        """Add protocol information to an immunization."""
        immunization = self.get(db, id=immunization_id)
        if not immunization:
            return None
        
        protocol = ImmunizationProtocol(
            id=uuid.uuid4(),
            immunization_id=immunization_id,
            dose_number_positive=dose_number,
            series_doses_positive=series_doses,
            target_diseases=target_diseases,
            series=series
        )
        
        db.add(protocol)
        db.commit()
        db.refresh(protocol)
        return protocol
    
    def get_patient_immunizations(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        vaccine_code: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Immunization]:
        """Get immunizations for a patient."""
        query = db.query(Immunization).filter(
            Immunization.patient_id == patient_id
        )
        
        if vaccine_code:
            query = query.filter(
                func.jsonb_path_exists(
                    Immunization.vaccine_code,
                    f'$.coding[*] ? (@.code == "{vaccine_code}")'
                )
            )
        
        if date_from:
            query = query.filter(Immunization.occurrence_date >= date_from)
        
        if date_to:
            query = query.filter(Immunization.occurrence_date <= date_to)
        
        return query.order_by(desc(Immunization.occurrence_date)).offset(skip).limit(limit).all()
    
    def get_immunization_schedule(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Get immunization schedule and status for a patient."""
        # Get all immunizations
        immunizations = self.get_patient_immunizations(db, patient_id=patient_id, limit=1000)
        
        # Group by vaccine type
        vaccine_history = {}
        for immunization in immunizations:
            vaccine_code = immunization.vaccine_code.get("coding", [{}])[0].get("code", "unknown")
            if vaccine_code not in vaccine_history:
                vaccine_history[vaccine_code] = []
            vaccine_history[vaccine_code].append(immunization)
        
        # TODO: Compare with standard immunization schedules
        # This would require a separate table of standard schedules
        
        return {
            "patient_id": str(patient_id),
            "vaccine_history": vaccine_history,
            "total_immunizations": len(immunizations),
            "last_immunization_date": max([i.occurrence_date for i in immunizations]) if immunizations else None
        }
    
    def record_adverse_reaction(
        self,
        db: Session,
        *,
        immunization_id: uuid.UUID,
        reaction_date: datetime,
        reaction_detail: Optional[Dict[str, Any]] = None
    ) -> Optional[ImmunizationReaction]:
        """Record an adverse reaction to an immunization."""
        immunization = self.get(db, id=immunization_id)
        if not immunization:
            return None
        
        reaction = ImmunizationReaction(
            id=uuid.uuid4(),
            immunization_id=immunization_id,
            date=reaction_date,
            detail=reaction_detail,
            reported=True
        )
        
        db.add(reaction)
        db.commit()
        db.refresh(reaction)
        return reaction


class CRUDFamilyHistory(CRUDBase[FamilyMemberHistory, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for Family History model."""
    
    def create_family_member_history(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        relationship: Dict[str, Any],
        name: Optional[str] = None,
        **kwargs
    ) -> FamilyMemberHistory:
        """Create a family member history record."""
        family_history = FamilyMemberHistory(
            id=uuid.uuid4(),
            patient_id=patient_id,
            relationship=relationship,
            name=name,
            status="completed",
            date=datetime.utcnow(),
            **kwargs
        )
        
        db.add(family_history)
        db.commit()
        db.refresh(family_history)
        return family_history
    
    def add_family_condition(
        self,
        db: Session,
        *,
        family_member_id: uuid.UUID,
        condition_code: Dict[str, Any],
        onset_age: Optional[int] = None,
        contributed_to_death: Optional[bool] = None,
        outcome: Optional[Dict[str, Any]] = None
    ) -> Optional[FamilyMemberCondition]:
        """Add a condition to a family member's history."""
        family_member = self.get(db, id=family_member_id)
        if not family_member:
            return None
        
        condition = FamilyMemberCondition(
            id=uuid.uuid4(),
            family_member_id=family_member_id,
            code=condition_code,
            onset_age=onset_age,
            contributed_to_death=contributed_to_death,
            outcome=outcome
        )
        
        db.add(condition)
        db.commit()
        db.refresh(condition)
        return condition
    
    def get_patient_family_history(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        relationship_type: Optional[str] = None
    ) -> List[FamilyMemberHistory]:
        """Get family history for a patient."""
        query = db.query(FamilyMemberHistory).filter(
            FamilyMemberHistory.patient_id == patient_id
        )
        
        if relationship_type:
            query = query.filter(
                func.jsonb_path_exists(
                    FamilyMemberHistory.relationship,
                    f'$.coding[*] ? (@.code == "{relationship_type}")'
                )
            )
        
        return query.order_by(desc(FamilyMemberHistory.date)).all()
    
    def get_family_risk_factors(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Analyze family history for risk factors."""
        family_members = self.get_patient_family_history(db, patient_id=patient_id)
        
        # Collect all conditions
        condition_counts = {}
        high_risk_conditions = []
        
        for member in family_members:
            for condition in member.conditions:
                condition_code = condition.code.get("coding", [{}])[0].get("code", "unknown")
                condition_name = condition.code.get("text", condition_code)
                
                if condition_code not in condition_counts:
                    condition_counts[condition_code] = {
                        "name": condition_name,
                        "count": 0,
                        "contributed_to_death": 0
                    }
                
                condition_counts[condition_code]["count"] += 1
                if condition.contributed_to_death:
                    condition_counts[condition_code]["contributed_to_death"] += 1
                
                # Check for high-risk conditions (e.g., early onset)
                if condition.onset_age and condition.onset_age < 50:
                    high_risk_conditions.append({
                        "condition": condition_name,
                        "member": member.name or member.relationship.get("text", "Family member"),
                        "onset_age": condition.onset_age
                    })
        
        return {
            "patient_id": str(patient_id),
            "family_conditions": condition_counts,
            "high_risk_conditions": high_risk_conditions,
            "total_family_members": len(family_members)
        }


# Utility functions for clinical data aggregation
class ClinicalDataAggregator:
    """Aggregate clinical data for comprehensive patient view."""
    
    @staticmethod
    def get_patient_clinical_summary(
        db: Session,
        patient_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Get comprehensive clinical summary for a patient."""
        # Get active conditions
        condition_crud = CRUDCondition(Condition)
        active_conditions = condition_crud.get_patient_conditions(
            db,
            patient_id=patient_id,
            clinical_status=ClinicalStatus.ACTIVE
        )
        
        # Get latest vital signs
        observation_crud = CRUDObservation(Observation)
        latest_vitals = observation_crud.get_latest_vital_signs(
            db,
            patient_id=patient_id
        )
        
        # Get active allergies
        allergy_crud = CRUDAllergyIntolerance(AllergyIntolerance)
        active_allergies = allergy_crud.get_patient_allergies(
            db,
            patient_id=patient_id
        )
        
        # Get recent immunizations
        immunization_crud = CRUDImmunization(Immunization)
        recent_immunizations = immunization_crud.get_patient_immunizations(
            db,
            patient_id=patient_id,
            date_from=date.today().replace(year=date.today().year - 1),
            limit=10
        )
        
        # Get family risk factors
        family_crud = CRUDFamilyHistory(FamilyMemberHistory)
        family_risks = family_crud.get_family_risk_factors(
            db,
            patient_id=patient_id
        )
        
        return {
            "patient_id": str(patient_id),
            "summary_date": datetime.utcnow(),
            "active_conditions": [
                {
                    "id": str(c.id),
                    "name": c.display_name,
                    "status": c.clinical_status.value,
                    "onset_date": c.onset_date,
                    "severity": c.severity.value if c.severity else None
                }
                for c in active_conditions
            ],
            "vital_signs": latest_vitals,
            "allergies": [
                {
                    "id": str(a.id),
                    "allergen": a.display_name,
                    "type": a.type.value,
                    "criticality": a.criticality.value if a.criticality else None,
                    "last_occurrence": a.last_occurrence
                }
                for a in active_allergies
            ],
            "recent_immunizations": [
                {
                    "id": str(i.id),
                    "vaccine": i.vaccine_name,
                    "date": i.occurrence_date,
                    "status": i.status.value
                }
                for i in recent_immunizations
            ],
            "family_risk_factors": family_risks.get("high_risk_conditions", []),
            "alerts": []  # Would be populated based on clinical rules
        }
    
    @staticmethod
    def get_clinical_timeline(
        db: Session,
        patient_id: uuid.UUID,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """Get chronological timeline of clinical events."""
        timeline = []
        
        # Add conditions
        condition_crud = CRUDCondition(Condition)
        conditions = condition_crud.get_patient_conditions(
            db,
            patient_id=patient_id,
            include_resolved=True
        )
        
        for condition in conditions:
            timeline.append({
                "date": condition.recorded_date,
                "type": "condition",
                "event": f"Diagnosed with {condition.display_name}",
                "details": {
                    "id": str(condition.id),
                    "status": condition.clinical_status.value,
                    "severity": condition.severity.value if condition.severity else None
                }
            })
        
        # Add observations
        observation_crud = CRUDObservation(Observation)
        observations = observation_crud.get_patient_observations(
            db,
            patient_id=patient_id,
            date_from=date_from,
            date_to=date_to,
            limit=100
        )
        
        for observation in observations:
            timeline.append({
                "date": observation.effective_date,
                "type": "observation",
                "event": observation.display_name,
                "details": {
                    "id": str(observation.id),
                    "value": observation.value_quantity or observation.value_string,
                    "unit": observation.value_unit,
                    "is_abnormal": observation.is_abnormal
                }
            })
        
        # Add immunizations
        immunization_crud = CRUDImmunization(Immunization)
        immunizations = immunization_crud.get_patient_immunizations(
            db,
            patient_id=patient_id,
            date_from=date_from,
            date_to=date_to
        )
        
        for immunization in immunizations:
            timeline.append({
                "date": immunization.occurrence_date,
                "type": "immunization",
                "event": f"Received {immunization.vaccine_name}",
                "details": {
                    "id": str(immunization.id),
                    "status": immunization.status.value
                }
            })
        
        # Sort timeline by date
        timeline.sort(key=lambda x: x["date"], reverse=True)
        
        return timeline


# Create instances
condition = CRUDCondition(Condition)
observation = CRUDObservation(Observation)
allergy_intolerance = CRUDAllergyIntolerance(AllergyIntolerance)
immunization = CRUDImmunization(Immunization)
family_history = CRUDFamilyHistory(FamilyMemberHistory)
clinical_aggregator = ClinicalDataAggregator()