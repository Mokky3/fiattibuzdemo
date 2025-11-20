from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import uuid

from app.db.session import get_db
from app.common.auth.auth_service import (
	AuthenticatedUser, require_admin_access, require_permission, Permission
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id
from app.common.schemas.responses_enhanced import (
	SuccessResponse, ProblemDetail, ErrorType, create_problem_detail
)
from app.common.schemas.user_enhanced import (
	AdminProfileResponse,
	SecuritySettings as SecuritySettingsSchema,
	PasswordChange as PasswordChangeSchema,
	UserUpdate as UserUpdateSchema,
)
from app.crud.user import user as user_crud
from app.common.models.user import User, UserProfile, UserSettings, UserActivity

router = APIRouter()


def _compose_admin_profile_response(user: User) -> AdminProfileResponse:
	return AdminProfileResponse(
		first_name=user.first_name,
		last_name=user.last_name,
		email=user.email,
		phone=user.phone,
		role=user.role.value if hasattr(user.role, 'value') else str(user.role),
		status=user.status.value if hasattr(user.status, 'value') else str(user.status),
		created_at=user.created_at.isoformat() if user.created_at else datetime.utcnow().isoformat(),
		updated_at=user.updated_at.isoformat() if user.updated_at else datetime.utcnow().isoformat(),
		organization_id=str(user.organization_id) if user.organization_id else None,
		profile_image_url=user.profile_image_url,
	)


@router.get("/profile", response_model=SuccessResponse[AdminProfileResponse])
@audit_pii_access("read", "admin", "profile")
async def get_admin_profile(
	request: Request,
	current_user: AuthenticatedUser = Depends(require_admin_access()),
	_: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
	db: Session = Depends(get_db)
):
	"""
	Get current admin profile from database.
	"""
	try:
		user = user_crud.get(db=db, id=current_user.user_id)
		if not user:
			problem = create_problem_detail(
				error_type=ErrorType.NOT_FOUND_ERROR,
				title="Admin Not Found",
				status=404,
				detail="Current admin user not found",
				trace_id=get_trace_id(),
			)
			raise HTTPException(status_code=404, detail=problem.dict())
		return SuccessResponse(data=_compose_admin_profile_response(user), message="Admin profile retrieved successfully")
	except HTTPException:
		raise
	except Exception as e:
		problem = create_problem_detail(
			error_type=ErrorType.INTERNAL_ERROR,
			title="Profile Retrieval Failed",
			status=500,
			detail=f"Failed to retrieve admin profile: {str(e)}",
			trace_id=get_trace_id(),
		)
		raise HTTPException(status_code=500, detail=problem.dict())


@router.put("/profile", response_model=SuccessResponse[AdminProfileResponse])
async def update_admin_profile(
	profile_update: UserUpdateSchema,
	db: Session = Depends(get_db),
	current_user: AuthenticatedUser = Depends(require_admin_access()),
	_: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_WRITE)),
):
	"""
	Update admin profile in database.
	"""
	try:
		user = user_crud.get(db=db, id=current_user.user_id)
		if not user:
			problem = create_problem_detail(
				error_type=ErrorType.NOT_FOUND_ERROR,
				title="Admin Not Found",
				status=404,
				detail="Current admin user not found",
				trace_id=get_trace_id(),
			)
			raise HTTPException(status_code=404, detail=problem.dict())
		
		update_data = {}
		# Check each field and add to update_data if it has a value
		if hasattr(profile_update, 'first_name') and profile_update.first_name:
			update_data["first_name"] = str(profile_update.first_name).strip()
		if hasattr(profile_update, 'last_name') and profile_update.last_name:
			update_data["last_name"] = str(profile_update.last_name).strip()
		if hasattr(profile_update, 'email') and profile_update.email:
			update_data["email"] = str(profile_update.email).strip()
		if hasattr(profile_update, 'phone') and profile_update.phone:
			update_data["phone"] = str(profile_update.phone).strip()
		
		# Check if we have anything to update
		if not update_data:
			problem = create_problem_detail(
				error_type=ErrorType.VALIDATION_ERROR,
				title="No Updates Provided",
				status=400,
				detail="No valid fields provided for update",
				trace_id=get_trace_id(),
			)
			raise HTTPException(status_code=400, detail=problem.dict())
		
		# Persist user core updates
		user = user_crud.update(db=db, db_obj=user, obj_in=update_data)
		# Upsert profile address/bio if present
		profile: UserProfile | None = getattr(user, "profile", None)
		address = getattr(profile_update, "address", None)
		bio = getattr(profile_update, "bio", None)
		if address is not None or bio is not None:
			if not profile:
				profile = UserProfile(user_id=user.id)
				db.add(profile)
			if address is not None:
				profile.address = address  # type: ignore[assignment]
			if bio is not None:
				profile.bio = bio  # type: ignore[assignment]
			db.commit()
			db.refresh(profile)
		return SuccessResponse(data=_compose_admin_profile_response(user), message="Admin profile updated successfully")
	except HTTPException:
		raise
	except Exception as e:
		problem = create_problem_detail(
			error_type=ErrorType.INTERNAL_ERROR,
			title="Profile Update Failed",
			status=500,
			detail=f"Failed to update admin profile: {str(e)}",
			trace_id=get_trace_id(),
		)
		raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/profile/image")
async def upload_profile_image(
	profile_image: UploadFile = File(...),
	db: Session = Depends(get_db),
	current_user: AuthenticatedUser = Depends(require_admin_access()),
):
	"""
	Upload admin profile image. Persist reference URL on the user.
	"""
	# Persisting files is out of scope; store a generated URL reference
	try:
		user = user_crud.get(db=db, id=current_user.user_id)
		if not user:
			raise HTTPException(status_code=404, detail={"message": "Admin not found"})
		image_url = f"/static/profile_images/{uuid.uuid4()}.jpg"
		user_crud.update(db=db, db_obj=user, obj_in={"profile_image_url": image_url})
		return {"imageUrl": image_url}
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail={"message": f"Failed to upload image: {str(e)}"})


@router.get("/activity-stats")
async def get_admin_activity_stats(
	db: Session = Depends(get_db),
	current_user: AuthenticatedUser = Depends(require_admin_access()),
):
	"""
	Get admin activity statistics (derived from user activities).
	"""
	try:
		# Last 30 days window
		window_start = datetime.utcnow() - timedelta(days=30)
		q = db.query(UserActivity).filter(
			UserActivity.user_id == current_user.user_id,
			UserActivity.created_at >= window_start,
		)
		total_logins = q.filter(UserActivity.activity_type == "login").count()
		config_changes = q.filter(UserActivity.activity_type == "config_change").count()
		security_events = q.filter(UserActivity.activity_type == "security_event").count()
		system_alerts = 0
		
		# Device tracking - get unique devices from user_agent and ip_address
		# Get all activities for this user in the last 30 days
		all_activities = db.query(UserActivity).filter(
			UserActivity.user_id == current_user.user_id,
			UserActivity.created_at >= window_start,
		).all()
		
		# Extract unique devices based on user_agent and ip_address combinations
		device_fingerprints = set()
		for activity in all_activities:
			if activity.user_agent and activity.ip_address:
				# Create a device fingerprint from user_agent and ip
				device_fingerprint = f"{activity.user_agent[:100]}_{activity.ip_address}"
				device_fingerprints.add(device_fingerprint)
		
		# Count active devices (devices that have been used in last 7 days)
		week_start = datetime.utcnow() - timedelta(days=7)
		recent_activities = db.query(UserActivity).filter(
			UserActivity.user_id == current_user.user_id,
			UserActivity.created_at >= week_start,
		).all()
		
		recent_device_fingerprints = set()
		for activity in recent_activities:
			if activity.user_agent and activity.ip_address:
				device_fingerprint = f"{activity.user_agent[:100]}_{activity.ip_address}"
				recent_device_fingerprints.add(device_fingerprint)
		
		# Get currently logged in devices (devices with recent login activities)
		recent_logins = db.query(UserActivity).filter(
			UserActivity.user_id == current_user.user_id,
			UserActivity.activity_type == "login",
			UserActivity.created_at >= week_start,
		).all()
		
		logged_in_devices = set()
		for login in recent_logins:
			if login.user_agent and login.ip_address:
				device_fingerprint = f"{login.user_agent[:100]}_{login.ip_address}"
				logged_in_devices.add(device_fingerprint)
		
		return {
			"totalLogins": total_logins,
			"configChanges": config_changes,
			"userManagementActions": 0,
			"systemAlerts": system_alerts,
			"activeDevices": len(recent_device_fingerprints),
			"devicesLoggedIn": len(logged_in_devices),
			"totalDevices": len(device_fingerprints),
		}
	except Exception as e:
		raise HTTPException(status_code=500, detail={"message": f"Failed to get activity stats: {str(e)}"})


@router.get("/recent-activities")
async def get_recent_activities(
	db: Session = Depends(get_db),
	current_user: AuthenticatedUser = Depends(require_admin_access()),
):
	"""
	Get admin's recent activities from user activity table.
	"""
	try:
		activities = (
			db.query(UserActivity)
			.filter(UserActivity.user_id == current_user.user_id)
			.order_by(UserActivity.created_at.desc())
			.limit(20)
			.all()
		)
		return [
			{
				"id": str(a.id),
				"action": a.description,
				"timestamp": (a.created_at.isoformat() if a.created_at else datetime.utcnow().isoformat()),
				"type": a.activity_type,
			}
			for a in activities
		]
	except Exception as e:
		raise HTTPException(status_code=500, detail={"message": f"Failed to get recent activities: {str(e)}"})


@router.get("/permissions")
async def get_admin_permissions(
	current_user: AuthenticatedUser = Depends(require_admin_access()),
):
	"""
	Return real permissions based on user role and actual system capabilities.
	"""
	role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
	
	# Define permissions based on role
	permissions = []
	
	# User Management
	if role == "SUPER_ADMIN":
		permissions.append({
			"permission": "User Management", 
			"access_level": "Full Access", 
			"granted": True,
			"description": "Create, read, update, delete users and manage roles"
		})
	elif role == "CLINIC_ADMIN":
		permissions.append({
			"permission": "User Management", 
			"access_level": "Full Access", 
			"granted": True,
			"description": "Manage clinic users and staff roles"
		})
	else:
		permissions.append({
			"permission": "User Management", 
			"access_level": "Read Only", 
			"granted": True,
			"description": "View user information only"
		})
	
	# System Configuration
	if role == "SUPER_ADMIN":
		permissions.append({
			"permission": "System Configuration", 
			"access_level": "Full Access", 
			"granted": True,
			"description": "Configure global system settings, security, and integrations"
		})
	else:
		permissions.append({
			"permission": "System Configuration", 
			"access_level": "Read Only", 
			"granted": True,
			"description": "View system configuration only"
		})
	
	# Audit Logs
	if role == "SUPER_ADMIN":
		permissions.append({
			"permission": "Audit Logs", 
			"access_level": "Full Access", 
			"granted": True,
			"description": "View all audit logs and system activities"
		})
	elif role == "CLINIC_ADMIN":
		permissions.append({
			"permission": "Audit Logs", 
			"access_level": "Clinic Scope", 
			"granted": True,
			"description": "View clinic-specific audit logs"
		})
	else:
		permissions.append({
			"permission": "Audit Logs", 
			"access_level": "No Access", 
			"granted": False,
			"description": "Audit logs not accessible"
		})
	
	# Data Export
	if role == "SUPER_ADMIN":
		permissions.append({
			"permission": "Data Export", 
			"access_level": "Full Access", 
			"granted": True,
			"description": "Export all system data and reports"
		})
	elif role == "CLINIC_ADMIN":
		permissions.append({
			"permission": "Data Export", 
			"access_level": "Clinic Scope", 
			"granted": True,
			"description": "Export clinic-specific data and reports"
		})
	else:
		permissions.append({
			"permission": "Data Export", 
			"access_level": "No Access", 
			"granted": False,
			"description": "Data export not accessible"
		})
	
	# Patient Records
	if role in ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "NURSE"]:
		permissions.append({
			"permission": "Patient Records", 
			"access_level": "Full Access", 
			"granted": True,
			"description": "Full access to patient medical records"
		})
	elif role in ["RECEPTIONIST", "LAB_TECHNICIAN", "RADIOLOGIST"]:
		permissions.append({
			"permission": "Patient Records", 
			"access_level": "Limited Access", 
			"granted": True,
			"description": "Access to relevant patient information for role"
		})
	else:
		permissions.append({
			"permission": "Patient Records", 
			"access_level": "No Access", 
			"granted": False,
			"description": "Patient records not accessible"
		})
	
	# Billing Management (not implemented yet)
	permissions.append({
		"permission": "Billing Management", 
		"access_level": "No Access", 
		"granted": False,
		"description": "Billing system not yet implemented"
	})
	
	# Hospital/Clinic Management
	if role == "SUPER_ADMIN":
		permissions.append({
			"permission": "Hospital Management", 
			"access_level": "Full Access", 
			"granted": True,
			"description": "Manage all hospitals and clinics"
		})
	elif role == "CLINIC_ADMIN":
		permissions.append({
			"permission": "Hospital Management", 
			"access_level": "Clinic Scope", 
			"granted": True,
			"description": "Manage assigned clinic settings"
		})
	else:
		permissions.append({
			"permission": "Hospital Management", 
			"access_level": "No Access", 
			"granted": False,
			"description": "Hospital management not accessible"
		})
	
	# Financial Management
	if role == "SUPER_ADMIN":
		permissions.append({
			"permission": "Financial Management", 
			"access_level": "Full Access", 
			"granted": True,
			"description": "Full access to financial data and reports"
		})
	elif role == "CLINIC_ADMIN":
		permissions.append({
			"permission": "Financial Management", 
			"access_level": "Clinic Scope", 
			"granted": True,
			"description": "Access to clinic financial data"
		})
	else:
		permissions.append({
			"permission": "Financial Management", 
			"access_level": "No Access", 
			"granted": False,
			"description": "Financial management not accessible"
		})
	
	return permissions


@router.post("/change-password", response_model=SuccessResponse[dict])
async def change_admin_password(
	password_data: PasswordChangeSchema,
	db: Session = Depends(get_db),
	current_user: AuthenticatedUser = Depends(require_admin_access()),
):
	"""
	Change admin password via user CRUD.
	"""
	try:
		user = user_crud.get(db=db, id=current_user.user_id)
		if not user:
			raise HTTPException(status_code=404, detail={"message": "Admin not found"})
		
		# Validate that new password is different from current password
		if password_data.currentPassword == password_data.newPassword:
			raise HTTPException(status_code=400, detail={"message": "New password must be different from current password"})
		
		updated = user_crud.change_password(
			db=db,
			user=user,
			current_password=password_data.currentPassword,
			new_password=password_data.newPassword,
		)
		if not updated:
			raise HTTPException(status_code=400, detail={"message": "Current password is incorrect"})
		return SuccessResponse(data={"status": "ok"}, message="Password changed successfully")
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail={"message": f"Failed to change password: {str(e)}"})


@router.get("/security-settings", response_model=SuccessResponse[SecuritySettingsSchema])
@audit_pii_access("read", "admin", "security_settings")
async def get_security_settings(
	request: Request,
	current_user: AuthenticatedUser = Depends(require_admin_access()),
	_: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
	db: Session = Depends(get_db)
):
	"""
	Get admin security settings from UserSettings.
	"""
	try:
		user = user_crud.get(db=db, id=current_user.user_id)
		if not user:
			raise HTTPException(status_code=404, detail={"message": "Admin not found"})
		settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
		if not settings:
			settings = UserSettings(user_id=user.id)
			db.add(settings)
			db.commit()
			db.refresh(settings)
		security_settings = SecuritySettingsSchema(
			currentPassword="",
			newPassword="",
			confirmPassword="",
			twoFactorEnabled=bool(user.two_factor_enabled),
			loginAlerts=bool(settings.login_alerts),
			sessionTimeout=str(settings.session_timeout),
			passwordExpiryDays=int(settings.require_password_change),
			maxFailedAttempts=max(int(user.failed_login_attempts or 0), 3),  # Ensure minimum value of 3
			lockoutDurationMinutes=15,
			requireStrongPassword=True,
			sessionConcurrencyLimit=3,
		)
		return SuccessResponse(data=security_settings, message="Security settings retrieved successfully")
	except HTTPException:
		raise
	except Exception as e:
		problem = create_problem_detail(
			error_type=ErrorType.INTERNAL_ERROR,
			title="Security Settings Retrieval Failed",
			status=500,
			detail=f"Failed to retrieve security settings: {str(e)}",
			trace_id=get_trace_id(),
		)
		raise HTTPException(status_code=500, detail=problem.dict())


@router.put("/security-settings", response_model=SuccessResponse[SecuritySettingsSchema])
async def update_security_settings(
	settings: SecuritySettingsSchema,
	db: Session = Depends(get_db),
	current_user: AuthenticatedUser = Depends(require_admin_access()),
):
	"""
	Update admin security settings into User and UserSettings.
	"""
	try:
		user = user_crud.get(db=db, id=current_user.user_id)
		if not user:
			raise HTTPException(status_code=404, detail={"message": "Admin not found"})
		# Update User fields
		user_update_data = {"two_factor_enabled": bool(settings.twoFactorEnabled)}
		if settings.maxFailedAttempts is not None:
			user_update_data["failed_login_attempts"] = int(settings.maxFailedAttempts)
		user = user_crud.update(db=db, db_obj=user, obj_in=user_update_data)
		# Upsert UserSettings
		db_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
		if not db_settings:
			db_settings = UserSettings(user_id=user.id)
			db.add(db_settings)
		if settings.loginAlerts is not None:
			db_settings.login_alerts = bool(settings.loginAlerts)
		if settings.sessionTimeout is not None:
			try:
				db_settings.session_timeout = int(settings.sessionTimeout)
			except Exception:
				pass
		if settings.passwordExpiryDays is not None:
			db_settings.require_password_change = int(settings.passwordExpiryDays)
		db.commit()
		db.refresh(db_settings)
		return SuccessResponse(data=settings, message="Security settings updated successfully")
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail={"message": f"Failed to update security settings: {str(e)}"})


@router.get("/activity-log", response_model=SuccessResponse[dict])
@audit_pii_access("read", "admin", "activity_log")
async def get_activity_log(
	request: Request,
	skip: int = 0,
	limit: int = 100,
	current_user: AuthenticatedUser = Depends(require_admin_access()),
	_: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
	db: Session = Depends(get_db)
):
	"""
	Get detailed activity log for admin from user activity table.
	"""
	try:
		q = db.query(UserActivity).filter(UserActivity.user_id == current_user.user_id)
		total = q.count()
		items = (
			q.order_by(UserActivity.created_at.desc())
			.offset(skip)
			.limit(limit)
			.all()
		)
		return SuccessResponse(
			data={
				"total": total,
				"skip": skip,
				"limit": limit,
				"activities": [
					{
						"id": str(a.id),
						"action": a.description,
						"timestamp": (a.created_at.isoformat() if a.created_at else datetime.utcnow().isoformat()),
						"type": a.activity_type,
						"ip_address": a.ip_address,
						"user_agent": a.user_agent,
					}
					for a in items
				],
			},
			message="Activity log retrieved successfully",
		)
	except Exception as e:
		problem = create_problem_detail(
			error_type=ErrorType.INTERNAL_ERROR,
			title="Activity Log Retrieval Failed",
			status=500,
			detail=f"Failed to retrieve activity log: {str(e)}",
			trace_id=get_trace_id(),
		)
		raise HTTPException(status_code=500, detail=problem.dict())