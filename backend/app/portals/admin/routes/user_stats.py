"""Admin portal - user statistics router
User analytics and reporting connected to models and CRUD
"""
from datetime import datetime, timezone, timedelta, date
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.models.user import User, UserRole, UserStatus
from app.common.models.admin import AdminActivity, ActivityType
from app.crud.user import user as user_crud
from app.crud.admin import admin as admin_crud
from app.common.schemas.responses_enhanced import (
    SuccessResponse, ProblemDetail, ErrorType,
    create_problem_detail
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id

router = APIRouter(tags=["Admin · User Statistics"])

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

class UserStatsSummary(BaseModel):
    total_users: int = Field(..., description="Total number of users")
    active_users: int = Field(..., description="Number of active users")
    inactive_users: int = Field(..., description="Number of inactive users")
    users_by_role: Dict[str, int] = Field(..., description="Users count by role")
    users_by_status: Dict[str, int] = Field(..., description="Users count by status")
    recent_registrations: int = Field(..., description="Recent registrations (last 30 days)")
    recent_logins: int = Field(..., description="Recent logins (last 7 days)")

class UserActivityStats(BaseModel):
    date: str = Field(..., description="Date")
    registrations: int = Field(..., description="New registrations")
    logins: int = Field(..., description="User logins")
    active_users: int = Field(..., description="Active users")

class UserGrowthStats(BaseModel):
    period: str = Field(..., description="Time period")
    total_growth: int = Field(..., description="Total growth")
    growth_rate: float = Field(..., description="Growth rate percentage")
    monthly_growth: List[Dict[str, Any]] = Field(..., description="Monthly growth data")

class UserEngagementStats(BaseModel):
    total_sessions: int = Field(..., description="Total user sessions")
    average_session_duration: float = Field(..., description="Average session duration in minutes")
    most_active_hours: List[int] = Field(..., description="Most active hours of day")
    most_active_days: List[str] = Field(..., description="Most active days of week")
    user_retention_rate: float = Field(..., description="User retention rate percentage")

class RoleDistributionStats(BaseModel):
    role: str = Field(..., description="User role")
    count: int = Field(..., description="Number of users")
    percentage: float = Field(..., description="Percentage of total users")
    growth_trend: str = Field(..., description="Growth trend: up, down, stable")

class OrganizationStats(BaseModel):
    organization_id: str = Field(..., description="Organization ID")
    organization_name: str = Field(..., description="Organization name")
    user_count: int = Field(..., description="Number of users")
    active_users: int = Field(..., description="Number of active users")
    last_activity: Optional[str] = Field(None, description="Last activity timestamp")

# ──────────────────────────────────────────────────────────────────────────────
# User Statistics Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=SuccessResponse[UserStatsSummary])
@audit_pii_access("read", "user_stats", "stats_summary")
async def get_user_stats_summary(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get comprehensive user statistics summary."""
    try:
        # Get user statistics using CRUD
        stats = user_crud.get_user_stats(db=db)
        
        # Get additional metrics
        recent_registrations = user_crud.count_users_by_date_range(
            db=db,
            start_date=datetime.now(timezone.utc) - timedelta(days=30),
            end_date=datetime.now(timezone.utc)
        )
        
        recent_logins = user_crud.count_recent_logins(
            db=db,
            days=7
        )
        
        stats_summary = UserStatsSummary(
            total_users=stats.get("total_users", 0),
            active_users=stats.get("active_users", 0),
            inactive_users=stats.get("inactive_users", 0),
            users_by_role=stats.get("users_by_role", {}),
            users_by_status=stats.get("users_by_status", {}),
            recent_registrations=recent_registrations,
            recent_logins=recent_logins
        )
        
        return SuccessResponse(
            data=stats_summary,
            message="User statistics summary retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="User Stats Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve user statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/activity", response_model=SuccessResponse[List[UserActivityStats]])
@audit_pii_access("read", "user_activity", "activity_stats")
async def get_user_activity_stats(
    request: Request,
    days: int = Query(30, ge=1, le=365, description="Number of days"),
    db: Session = Depends(get_db)
):
    """Get user activity statistics over time."""
    try:
        # Get activity statistics using CRUD
        activity_data = user_crud.get_user_activity_stats(
            db=db,
            days=days
        )
        
        # Transform to response format
        activity_stats = []
        for data in activity_data:
            activity_stats.append(UserActivityStats(
                date=data["date"].isoformat(),
                registrations=data["registrations"],
                logins=data["logins"],
                active_users=data["active_users"]
            ))
        
        return SuccessResponse(
            data=activity_stats,
            message="User activity statistics retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="User Activity Stats Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve user activity statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/growth", response_model=SuccessResponse[UserGrowthStats])
@audit_pii_access("read", "user_growth", "growth_stats")
async def get_user_growth_stats(
    request: Request,
    period: str = Query("12m", description="Time period: 3m, 6m, 12m, 24m"),
    db: Session = Depends(get_db)
):
    """Get user growth statistics."""
    try:
        # Parse period
        months = int(period.replace("m", ""))
        
        # Get growth statistics using CRUD
        growth_data = user_crud.get_user_growth_stats(
            db=db,
            months=months
        )
        
        growth_stats = UserGrowthStats(
            period=period,
            total_growth=growth_data["total_growth"],
            growth_rate=growth_data["growth_rate"],
            monthly_growth=growth_data["monthly_growth"]
        )
        
        return SuccessResponse(
            data=growth_stats,
            message="User growth statistics retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="User Growth Stats Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve user growth statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/engagement", response_model=SuccessResponse[UserEngagementStats])
@audit_pii_access("read", "user_engagement", "engagement_stats")
async def get_user_engagement_stats(
    request: Request,
    days: int = Query(30, ge=1, le=90, description="Number of days"),
    db: Session = Depends(get_db)
):
    """Get user engagement statistics."""
    try:
        # Get engagement statistics using CRUD
        engagement_data = user_crud.get_user_engagement_stats(
            db=db,
            days=days
        )
        
        engagement_stats = UserEngagementStats(
            total_sessions=engagement_data["total_sessions"],
            average_session_duration=engagement_data["average_session_duration"],
            most_active_hours=engagement_data["most_active_hours"],
            most_active_days=engagement_data["most_active_days"],
            user_retention_rate=engagement_data["user_retention_rate"]
        )
        
        return SuccessResponse(
            data=engagement_stats,
            message="User engagement statistics retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="User Engagement Stats Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve user engagement statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/role-distribution", response_model=SuccessResponse[List[RoleDistributionStats]])
@audit_pii_access("read", "role_distribution", "role_stats")
async def get_role_distribution_stats(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get user role distribution statistics."""
    try:
        # Get role distribution using CRUD
        role_data = user_crud.get_role_distribution_stats(db=db)
        
        # Transform to response format
        role_stats = []
        for role, data in role_data.items():
            role_stats.append(RoleDistributionStats(
                role=role,
                count=data["count"],
                percentage=data["percentage"],
                growth_trend=data["growth_trend"]
            ))
        
        return SuccessResponse(
            data=role_stats,
            message="Role distribution statistics retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Role Distribution Stats Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve role distribution statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/organizations", response_model=SuccessResponse[List[OrganizationStats]])
@audit_pii_access("read", "organization_stats", "org_stats")
async def get_organization_stats(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get organization statistics."""
    try:
        # Get organization statistics using CRUD
        org_data = user_crud.get_organization_stats(db=db)
        
        # Transform to response format
        org_stats = []
        for org in org_data:
            org_stats.append(OrganizationStats(
                organization_id=str(org["organization_id"]),
                organization_name=org["organization_name"],
                user_count=org["user_count"],
                active_users=org["active_users"],
                last_activity=org["last_activity"].isoformat() if org["last_activity"] else None
            ))
        
        return SuccessResponse(
            data=org_stats,
            message="Organization statistics retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Organization Stats Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve organization statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Advanced Analytics Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/trends", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("read", "user_trends", "trends_analysis")
async def get_user_trends(
    request: Request,
    metric: str = Query("registrations", description="Metric to analyze"),
    period: str = Query("30d", description="Time period"),
    db: Session = Depends(get_db)
):
    """Get user trends analysis."""
    try:
        # Get trends analysis using CRUD
        trends_data = user_crud.get_user_trends(
            db=db,
            metric=metric,
            period=period
        )
        
        return SuccessResponse(
            data=trends_data,
            message="User trends analysis retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="User Trends Analysis Failed",
            status=500,
            detail=f"Failed to retrieve user trends: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/predictions", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("read", "user_predictions", "predictions_analysis")
async def get_user_predictions(
    request: Request,
    prediction_type: str = Query("growth", description="Type of prediction"),
    horizon: int = Query(30, ge=7, le=365, description="Prediction horizon in days"),
    db: Session = Depends(get_db)
):
    """Get user growth predictions."""
    try:
        # Get predictions using CRUD
        predictions_data = user_crud.get_user_predictions(
            db=db,
            prediction_type=prediction_type,
            horizon=horizon
        )
        
        return SuccessResponse(
            data=predictions_data,
            message="User predictions retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="User Predictions Failed",
            status=500,
            detail=f"Failed to retrieve user predictions: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/comparison", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("read", "user_comparison", "comparison_analysis")
async def get_user_comparison(
    request: Request,
    compare_by: str = Query("role", description="Comparison dimension"),
    period: str = Query("30d", description="Time period"),
    db: Session = Depends(get_db)
):
    """Get user comparison analysis."""
    try:
        # Get comparison analysis using CRUD
        comparison_data = user_crud.get_user_comparison(
            db=db,
            compare_by=compare_by,
            period=period
        )
        
        return SuccessResponse(
            data=comparison_data,
            message="User comparison analysis retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="User Comparison Analysis Failed",
            status=500,
            detail=f"Failed to retrieve user comparison: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Reporting Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/report", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("read", "user_report", "report_generation")
async def generate_user_report(
    request: Request,
    report_type: str = Query("summary", description="Report type"),
    format: str = Query("pdf", description="Report format"),
    period: str = Query("30d", description="Report period"),
    db: Session = Depends(get_db)
):
    """Generate user statistics report."""
    try:
        # Generate report using CRUD
        report_data = user_crud.generate_user_report(
            db=db,
            report_type=report_type,
            format=format,
            period=period
        )
        
        # Log admin activity
        admin_crud.log_admin_activity(
            db=db,
            admin_id=uuid4(),  # TODO: Get from auth context
            activity_type=ActivityType.REPORT_GENERATED,
            description=f"Generated user {report_type} report in {format.upper()} format",
            affected_resource_id=None
        )
        
        return SuccessResponse(
            data=report_data,
            message="User report generated successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="User Report Generation Failed",
            status=500,
            detail=f"Failed to generate user report: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
