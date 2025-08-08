from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date, time
from enum import Enum
from decimal import Decimal

# ================================
# Dashboard Overview Schemas
# ================================

class DashboardMetrics(BaseModel):
    """Key metrics for doctor dashboard"""
    # Today's metrics
    appointments_today: int = Field(default=0, ge=0)
    appointments_completed_today: int = Field(default=0, ge=0)
    appointments_remaining_today: int = Field(default=0, ge=0)
    patients_seen_today: int = Field(default=0, ge=0)
    
    # This week metrics
    appointments_this_week: int = Field(default=0, ge=0)
    new_patients_this_week: int = Field(default=0, ge=0)
    prescriptions_written_this_week: int = Field(default=0, ge=0)
    lab_orders_this_week: int = Field(default=0, ge=0)
    
    # This month metrics
    appointments_this_month: int = Field(default=0, ge=0)
    total_patients_this_month: int = Field(default=0, ge=0)
    revenue_this_month: Optional[Decimal] = Field(None, ge=0)
    
    # Overall statistics
    total_patients: int = Field(default=0, ge=0)
    total_appointments: int = Field(default=0, ge=0)
    average_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    total_reviews: int = Field(default=0, ge=0)
    
    # Trends (percentage change from previous period)
    appointments_trend: Optional[float] = None
    patients_trend: Optional[float] = None
    revenue_trend: Optional[float] = None
    
    # Last updated
    last_updated: datetime = Field(default_factory=datetime.now)

class UpcomingAppointment(BaseModel):
    """Upcoming appointment summary for dashboard"""
    id: str
    appointment_time: datetime
    patient_id: str
    patient_name: str
    patient_age: int
    appointment_type: str
    reason: str
    duration_minutes: int
    
    # Patient details
    is_new_patient: bool = Field(default=False)
    last_visit: Optional[date] = None
    
    # Status
    status: str
    is_confirmed: bool = Field(default=False)
    
    # Additional info
    notes: Optional[str] = Field(None, max_length=200)
    priority: str = Field(default="normal")

class RecentActivity(BaseModel):
    """Recent activity item for dashboard"""
    id: str
    activity_type: str  # appointment, prescription, lab_order, etc.
    description: str = Field(..., min_length=5, max_length=200)
    timestamp: datetime
    
    # Related entities
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    
    # Activity details
    status: Optional[str] = None
    priority: Optional[str] = None
    
    # Actions available
    action_required: bool = Field(default=False)
    action_url: Optional[str] = None

class PendingTask(BaseModel):
    """Pending task for doctor"""
    id: str
    task_type: str  # review_lab_results, sign_prescription, follow_up_call, etc.
    title: str = Field(..., min_length=5, max_length=100)
    description: str = Field(..., min_length=10, max_length=300)
    
    # Priority and timing
    priority: str = Field(..., regex=r'^(low|normal|high|urgent)$')
    due_date: Optional[datetime] = None
    created_at: datetime
    
    # Related entities
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    related_entity_type: Optional[str] = None  # appointment, prescription, lab_order
    related_entity_id: Optional[str] = None
    
    # Task details
    estimated_duration_minutes: Optional[int] = Field(None, ge=1, le=120)
    can_be_delegated: bool = Field(default=False)
    
    # Actions
    action_url: str = Field(..., min_length=5, max_length=500)

class DashboardOverview(BaseModel):
    """Complete dashboard overview"""
    doctor_id: str
    
    # Key metrics
    metrics: DashboardMetrics
    
    # Today's schedule
    upcoming_appointments: List[UpcomingAppointment] = Field(default_factory=list, max_items=10)
    
    # Recent activity
    recent_activities: List[RecentActivity] = Field(default_factory=list, max_items=15)
    
    # Pending tasks
    pending_tasks: List[PendingTask] = Field(default_factory=list, max_items=20)
    
    # Quick stats
    critical_lab_results: int = Field(default=0, ge=0)
    unsigned_prescriptions: int = Field(default=0, ge=0)
    overdue_notes: int = Field(default=0, ge=0)
    unread_messages: int = Field(default=0, ge=0)
    
    # System notifications
    system_alerts: List[str] = Field(default_factory=list)
    
    # Generated timestamp
    generated_at: datetime = Field(default_factory=datetime.now)

# ================================
# Analytics & Reporting Schemas
# ================================

class TimeSeriesDataPoint(BaseModel):
    """Single data point in time series"""
    date: date
    value: Union[int, float, Decimal]
    label: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ChartData(BaseModel):
    """Chart data for dashboard widgets"""
    chart_type: str = Field(..., regex=r'^(line|bar|pie|area|donut)$')
    title: str = Field(..., min_length=3, max_length=100)
    
    # Data series
    series: List[Dict[str, Any]] = Field(..., min_items=1)
    labels: Optional[List[str]] = None
    
    # Chart configuration
    x_axis_label: Optional[str] = Field(None, max_length=50)
    y_axis_label: Optional[str] = Field(None, max_length=50)
    color_scheme: Optional[List[str]] = None
    
    # Data period
    period_start: date
    period_end: date
    
    # Last updated
    last_updated: datetime = Field(default_factory=datetime.now)

class PatientDemographics(BaseModel):
    """Patient demographics analysis"""
    total_patients: int
    
    # Age distribution
    age_groups: Dict[str, int] = Field(default_factory=dict)  # "0-18": 50, "19-35": 120, etc.
    average_age: float
    
    # Gender distribution
    gender_distribution: Dict[str, int] = Field(default_factory=dict)
    
    # Geographic distribution
    city_distribution: Dict[str, int] = Field(default_factory=dict)
    
    # Insurance status
    insurance_distribution: Dict[str, int] = Field(default_factory=dict)
    
    # New vs returning patients
    new_patients_percentage: float
    returning_patients_percentage: float
    
    # Analysis period
    analysis_period: str = Field(..., max_length=50)
    generated_at: datetime = Field(default_factory=datetime.now)

class AppointmentAnalytics(BaseModel):
    """Appointment analytics for doctor"""
    # Total counts
    total_appointments: int
    completed_appointments: int
    cancelled_appointments: int
    no_show_appointments: int
    
    # Rates
    completion_rate: float = Field(..., ge=0, le=100)
    cancellation_rate: float = Field(..., ge=0, le=100)
    no_show_rate: float = Field(..., ge=0, le=100)
    
    # Timing analysis
    average_appointment_duration: float
    on_time_percentage: float
    average_wait_time_minutes: float
    
    # Appointment types
    appointment_types_breakdown: Dict[str, int] = Field(default_factory=dict)
    
    # Time patterns
    busiest_days: Dict[str, int] = Field(default_factory=dict)
    busiest_hours: Dict[str, int] = Field(default_factory=dict)
    
    # Revenue
    total_revenue: Optional[Decimal] = Field(None, ge=0)
    average_revenue_per_appointment: Optional[Decimal] = Field(None, ge=0)
    
    # Trends over time
    monthly_trends: List[TimeSeriesDataPoint] = Field(default_factory=list)
    
    # Analysis period
    period_start: date
    period_end: date
    generated_at: datetime = Field(default_factory=datetime.now)

class PrescriptionAnalytics(BaseModel):
    """Prescription analytics for doctor"""
    # Total counts
    total_prescriptions: int
    total_medications_prescribed: int
    unique_medications: int
    
    # Most prescribed medications
    most_prescribed_drugs: List[Dict[str, Any]] = Field(default_factory=list, max_items=20)
    
    # Drug categories
    drug_categories_breakdown: Dict[str, int] = Field(default_factory=dict)
    
    # Safety metrics
    drug_interactions_detected: int
    allergy_alerts: int
    contraindication_warnings: int
    
    # Electronic prescribing
    electronic_prescriptions_percentage: float
    
    # Compliance tracking
    prescription_compliance_rate: Optional[float] = Field(None, ge=0, le=100)
    
    # Trends
    prescriptions_per_month: List[TimeSeriesDataPoint] = Field(default_factory=list)
    
    # Analysis period
    period_start: date
    period_end: date
    generated_at: datetime = Field(default_factory=datetime.now)

class LabOrderAnalytics(BaseModel):
    """Lab order analytics for doctor"""
    # Total counts
    total_lab_orders: int
    total_tests_ordered: int
    completed_orders: int
    pending_orders: int
    
    # Most ordered tests
    most_ordered_tests: List[Dict[str, Any]] = Field(default_factory=list, max_items=20)
    
    # Test categories
    test_categories_breakdown: Dict[str, int] = Field(default_factory=dict)
    
    # Results analysis
    normal_results_percentage: float
    abnormal_results_percentage: float
    critical_results_count: int
    
    # Turnaround times
    average_turnaround_hours: float
    orders_by_urgency: Dict[str, int] = Field(default_factory=dict)
    
    # Cost analysis
    total_lab_costs: Optional[Decimal] = Field(None, ge=0)
    average_cost_per_order: Optional[Decimal] = Field(None, ge=0)
    
    # Trends
    orders_per_month: List[TimeSeriesDataPoint] = Field(default_factory=list)
    
    # Analysis period
    period_start: date
    period_end: date
    generated_at: datetime = Field(default_factory=datetime.now)

# ================================
# Performance Metrics Schemas
# ================================

class QualityMetrics(BaseModel):
    """Quality of care metrics"""
    doctor_id: str
    
    # Patient satisfaction
    average_patient_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    total_patient_reviews: int = Field(default=0, ge=0)
    patient_complaints: int = Field(default=0, ge=0)
    
    # Clinical quality indicators
    diagnosis_accuracy_rate: Optional[float] = Field(None, ge=0, le=100)
    treatment_success_rate: Optional[float] = Field(None, ge=0, le=100)
    readmission_rate: Optional[float] = Field(None, ge=0, le=100)
    
    # Efficiency metrics
    average_consultation_time: float
    on_time_percentage: float = Field(..., ge=0, le=100)
    patient_wait_time_minutes: float
    
    # Documentation quality
    notes_completion_rate: float = Field(..., ge=0, le=100)
    timely_documentation_rate: float = Field(..., ge=0, le=100)
    
    # Safety metrics
    medication_error_rate: Optional[float] = Field(None, ge=0, le=100)
    adverse_event_rate: Optional[float] = Field(None, ge=0, le=100)
    
    # Analysis period
    period_start: date
    period_end: date
    generated_at: datetime = Field(default_factory=datetime.now)

class ProductivityMetrics(BaseModel):
    """Doctor productivity metrics"""
    doctor_id: str
    
    # Appointment metrics
    total_appointments: int
    appointments_per_day: float
    appointment_completion_rate: float = Field(..., ge=0, le=100)
    
    # Time utilization
    total_working_hours: float
    patient_contact_hours: float
    administrative_hours: float
    utilization_rate: float = Field(..., ge=0, le=100)
    
    # Revenue metrics
    total_revenue: Optional[Decimal] = Field(None, ge=0)
    revenue_per_hour: Optional[Decimal] = Field(None, ge=0)
    revenue_per_patient: Optional[Decimal] = Field(None, ge=0)
    
    # Workload distribution
    new_patients_percentage: float = Field(..., ge=0, le=100)
    follow_up_percentage: float = Field(..., ge=0, le=100)
    
    # Efficiency indicators
    average_time_per_patient: float
    documentation_time_per_patient: float
    
    # Comparative metrics
    percentile_ranking: Optional[int] = Field(None, ge=1, le=100)
    department_average_comparison: Optional[float] = None
    
    # Analysis period
    period_start: date
    period_end: date
    generated_at: datetime = Field(default_factory=datetime.now)

# ================================
# Schedule & Availability Schemas
# ================================

class ScheduleOverview(BaseModel):
    """Doctor's schedule overview"""
    doctor_id: str
    date: date
    
    # Day summary
    total_slots: int
    booked_slots: int
    available_slots: int
    blocked_slots: int
    
    # Time breakdown
    working_hours_start: time
    working_hours_end: time
    total_working_hours: float
    
    # Appointments
    appointments: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Break times
    lunch_break: Optional[Dict[str, time]] = None  # {"start": time, "end": time}
    other_breaks: List[Dict[str, time]] = Field(default_factory=list)
    
    # Utilization
    utilization_percentage: float = Field(..., ge=0, le=100)
    
    # Revenue for the day
    estimated_revenue: Optional[Decimal] = Field(None, ge=0)
    
    # Notes
    schedule_notes: Optional[str] = Field(None, max_length=500)

class WeeklyScheduleOverview(BaseModel):
    """Weekly schedule overview"""
    doctor_id: str
    week_start: date
    week_end: date
    
    # Weekly summary
    total_appointments: int
    total_working_hours: float
    average_utilization: float = Field(..., ge=0, le=100)
    
    # Daily breakdown
    daily_schedules: List[ScheduleOverview] = Field(..., min_items=7, max_items=7)
    
    # Weekly patterns
    busiest_day: str
    lightest_day: str
    most_productive_time: str
    
    # Revenue
    weekly_revenue: Optional[Decimal] = Field(None, ge=0)
    
    generated_at: datetime = Field(default_factory=datetime.now)

class AvailabilitySlot(BaseModel):
    """Available time slot for appointments"""
    start_time: time
    end_time: time
    duration_minutes: int = Field(..., ge=15, le=240)
    slot_type: str = Field(default="standard")  # standard, urgent, follow_up
    is_available: bool = Field(default=True)
    
    # Booking constraints
    max_appointments: int = Field(default=1, ge=1, le=5)
    current_bookings: int = Field(default=0, ge=0)
    
    # Preferences
    preferred_appointment_types: List[str] = Field(default_factory=list)
    
class DailyAvailability(BaseModel):
    """Doctor's availability for a specific day"""
    doctor_id: str
    date: date
    is_working_day: bool = Field(default=True)
    
    # Available slots
    available_slots: List[AvailabilitySlot] = Field(default_factory=list)
    
    # Day configuration
    working_hours_start: Optional[time] = None
    working_hours_end: Optional[time] = None
    
    # Breaks and unavailable periods
    unavailable_periods: List[Dict[str, time]] = Field(default_factory=list)
    
    # Special notes
    notes: Optional[str] = Field(None, max_length=300)
    
    # Override settings
    is_override: bool = Field(default=False)  # Manual override of regular schedule
    override_reason: Optional[str] = Field(None, max_length=200)

# ================================
# Patient Management Schemas
# ================================

class PatientSummary(BaseModel):
    """Patient summary for dashboard"""
    patient_id: str
    patient_name: str
    age: int
    gender: str
    
    # Medical summary
    primary_diagnosis: Optional[str] = Field(None, max_length=200)
    active_conditions: List[str] = Field(default_factory=list, max_items=5)
    current_medications: int = Field(default=0, ge=0)
    
    # Visit history
    total_visits: int = Field(default=0, ge=0)
    last_visit: Optional[date] = None
    next_appointment: Optional[datetime] = None
    
    # Alerts and flags
    has_allergies: bool = Field(default=False)
    has_critical_results: bool = Field(default=False)
    requires_follow_up: bool = Field(default=False)
    
    # Risk factors
    risk_level: str = Field(default="low", regex=r'^(low|medium|high)$')
    risk_factors: List[str] = Field(default_factory=list)
    
    # Communication preferences
    preferred_contact_method: str = Field(default="phone")
    language_preference: str = Field(default="en")

class MyPatientsList(BaseModel):
    """Doctor's patient list with summary"""
    doctor_id: str
    
    # Patients breakdown
    total_patients: int
    active_patients: int
    new_patients_this_month: int
    
    # Recent patients
    recently_seen: List[PatientSummary] = Field(default_factory=list, max_items=10)
    
    # Patients requiring attention
    critical_patients: List[PatientSummary] = Field(default_factory=list, max_items=10)
    follow_up_required: List[PatientSummary] = Field(default_factory=list, max_items=10)
    
    # Search and filter capabilities
    searchable_fields: List[str] = Field(default_factory=list)
    available_filters: Dict[str, List[str]] = Field(default_factory=dict)
    
    last_updated: datetime = Field(default_factory=datetime.now)

# ================================
# Clinical Decision Support Schemas
# ================================

class ClinicalAlert(BaseModel):
    """Clinical decision support alert"""
    id: str
    alert_type: str = Field(..., regex=r'^(drug_interaction|allergy|contraindication|guideline|reminder)$')
    severity: str = Field(..., regex=r'^(info|warning|critical)$')
    
    # Alert content
    title: str = Field(..., min_length=5, max_length=100)
    message: str = Field(..., min_length=10, max_length=500)
    
    # Context
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    related_medication: Optional[str] = None
    related_condition: Optional[str] = None
    
    # Actions
    recommended_action: Optional[str] = Field(None, max_length=300)
    alternative_suggestions: List[str] = Field(default_factory=list)
    
    # Evidence
    evidence_level: Optional[str] = Field(None, regex=r'^(A|B|C|D)$')
    source: Optional[str] = Field(None, max_length=200)
    
    # Status
    is_acknowledged: bool = Field(default=False)
    acknowledged_at: Optional[datetime] = None
    
    # Timing
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None

class ClinicalGuideline(BaseModel):
    """Clinical practice guideline suggestion"""
    id: str
    guideline_name: str = Field(..., min_length=5, max_length=200)
    category: str = Field(..., max_length=100)
    
    # Applicability
    applicable_conditions: List[str] = Field(default_factory=list)
    patient_criteria: Dict[str, Any] = Field(default_factory=dict)
    
    # Recommendation
    recommendation: str = Field(..., min_length=20, max_length=1000)
    strength_of_recommendation: str = Field(..., regex=r'^(strong|weak|conditional)$')
    quality_of_evidence: str = Field(..., regex=r'^(high|moderate|low|very_low)$')
    
    # Supporting information
    rationale: Optional[str] = Field(None, max_length=1000)
    references: List[str] = Field(default_factory=list)
    
    # Implementation
    implementation_steps: List[str] = Field(default_factory=list)
    monitoring_requirements: Optional[str] = Field(None, max_length=500)
    
    # Metadata
    last_updated: date
    version: str = Field(..., max_length=20)
    source_organization: str = Field(..., max_length=200)

class DiagnosticSuggestion(BaseModel):
    """AI-powered diagnostic suggestion"""
    id: str
    patient_id: str
    
    # Input data used
    symptoms: List[str] = Field(..., min_items=1)
    clinical_findings: List[str] = Field(default_factory=list)
    lab_results: List[str] = Field(default_factory=list)
    
    # Suggestions
    suggested_diagnoses: List[Dict[str, Any]] = Field(..., min_items=1, max_items=10)
    # Format: [{"diagnosis": "...", "probability": 0.85, "icd_code": "...", "reasoning": "..."}]
    
    # Recommended tests
    recommended_tests: List[str] = Field(default_factory=list)
    
    # Treatment suggestions
    treatment_options: List[Dict[str, str]] = Field(default_factory=list)
    
    # Confidence and limitations
    overall_confidence: float = Field(..., ge=0.0, le=1.0)
    limitations: List[str] = Field(default_factory=list)
    
    # AI model information
    model_version: str = Field(..., max_length=50)
    generated_at: datetime = Field(default_factory=datetime.now)
    
    # Doctor interaction
    is_reviewed: bool = Field(default=False)
    doctor_feedback: Optional[str] = Field(None, max_length=500)

# ================================
# Communication & Messages Schemas
# ================================

class MessageTypeEnum(str, Enum):
    PATIENT_INQUIRY = "patient_inquiry"
    COLLEAGUE_CONSULTATION = "colleague_consultation"
    LAB_RESULT_NOTIFICATION = "lab_result_notification"
    PRESCRIPTION_QUERY = "prescription_query"
    APPOINTMENT_REQUEST = "appointment_request"
    REFERRAL_REQUEST = "referral_request"
    SYSTEM_NOTIFICATION = "system_notification"
    EMERGENCY_ALERT = "emergency_alert"

class MessagePriorityEnum(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class Message(BaseModel):
    """Message in doctor's inbox"""
    id: str
    message_type: MessageTypeEnum
    priority: MessagePriorityEnum
    
    # Sender information
    sender_id: str
    sender_name: str
    sender_role: str
    
    # Recipient information
    recipient_id: str
    recipient_name: str
    
    # Message content
    subject: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10, max_length=5000)
    
    # Attachments
    attachments: List[Dict[str, str]] = Field(default_factory=list)
    # Format: [{"filename": "...", "url": "...", "file_type": "..."}]
    
    # Context
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    related_appointment_id: Optional[str] = None
    related_prescription_id: Optional[str] = None
    
    # Status
    is_read: bool = Field(default=False)
    is_starred: bool = Field(default=False)
    is_archived: bool = Field(default=False)
    
    # Response tracking
    requires_response: bool = Field(default=False)
    response_deadline: Optional[datetime] = None
    has_been_responded: bool = Field(default=False)
    
    # Threading
    thread_id: Optional[str] = None
    is_reply: bool = Field(default=False)
    reply_to_message_id: Optional[str] = None
    
    # Timestamps
    sent_at: datetime
    read_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)

class MessageThread(BaseModel):
    """Message thread/conversation"""
    thread_id: str
    subject: str
    
    # Participants
    participants: List[Dict[str, str]] = Field(..., min_items=2)
    # Format: [{"user_id": "...", "name": "...", "role": "..."}]
    
    # Messages in thread
    messages: List[Message] = Field(..., min_items=1)
    
    # Thread metadata
    total_messages: int
    unread_count: int
    last_message_at: datetime
    
    # Context
    patient_id: Optional[str] = None
    related_case_id: Optional[str] = None
    
    # Status
    is_active: bool = Field(default=True)
    is_archived: bool = Field(default=False)

class InboxSummary(BaseModel):
    """Doctor's inbox summary"""
    doctor_id: str
    
    # Message counts
    total_messages: int = Field(default=0, ge=0)
    unread_messages: int = Field(default=0, ge=0)
    starred_messages: int = Field(default=0, ge=0)
    urgent_messages: int = Field(default=0, ge=0)
    
    # By type
    message_type_counts: Dict[str, int] = Field(default_factory=dict)
    
    # Recent messages
    recent_messages: List[Message] = Field(default_factory=list, max_items=10)
    
    # Requiring attention
    messages_requiring_response: List[Message] = Field(default_factory=list, max_items=10)
    urgent_messages: List[Message] = Field(default_factory=list, max_items=5)
    
    # Statistics
    average_response_time_hours: Optional[float] = None
    response_rate_percentage: Optional[float] = Field(None, ge=0, le=100)
    
    last_updated: datetime = Field(default_factory=datetime.now)

# ================================
# Reports & Export Schemas
# ================================

class ReportType(str, Enum):
    PATIENT_LIST = "patient_list"
    APPOINTMENT_SUMMARY = "appointment_summary"
    PRESCRIPTION_REPORT = "prescription_report"
    LAB_ORDERS_REPORT = "lab_orders_report"
    REVENUE_REPORT = "revenue_report"
    PRODUCTIVITY_REPORT = "productivity_report"
    QUALITY_METRICS = "quality_metrics"

class ReportFormat(str, Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"

class ReportRequest(BaseModel):
    """Request to generate a report"""
    report_type: ReportType
    format: ReportFormat = Field(default=ReportFormat.PDF)
    
    # Date range
    start_date: date
    end_date: date
    
    # Filters
    patient_ids: Optional[List[str]] = None
    appointment_types: Optional[List[str]] = None
    include_cancelled: bool = Field(default=False)
    
    # Report options
    include_charts: bool = Field(default=True)
    include_patient_details: bool = Field(default=True)
    include_financial_data: bool = Field(default=False)
    
    # Grouping options
    group_by: Optional[str] = Field(None, regex=r'^(day|week|month|patient|type)$')
    
    # Custom fields
    additional_fields: List[str] = Field(default_factory=list)
    
    # Delivery
    email_report: bool = Field(default=False)
    email_recipients: List[str] = Field(default_factory=list)

class ReportResponse(BaseModel):
    """Response for report generation"""
    report_id: str
    status: str = Field(..., regex=r'^(generating|completed|failed)$')
    
    # Report details
    report_type: ReportType
    format: ReportFormat
    
    # Generation info
    requested_at: datetime
    completed_at: Optional[datetime] = None
    
    # File info
    file_size_bytes: Optional[int] = None
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    
    # Statistics
    total_records: Optional[int] = None
    
    # Error handling
    error_message: Optional[str] = Field(None, max_length=500)

# ================================
# Widget Configuration Schemas
# ================================

class WidgetType(str, Enum):
    METRICS_CARD = "metrics_card"
    CHART = "chart"
    TABLE = "table"
    CALENDAR = "calendar"
    TASK_LIST = "task_list"
    PATIENT_LIST = "patient_list"
    MESSAGE_PREVIEW = "message_preview"
    QUICK_ACTIONS = "quick_actions"

class DashboardWidget(BaseModel):
    """Dashboard widget configuration"""
    id: str
    widget_type: WidgetType
    title: str = Field(..., min_length=3, max_length=100)
    
    # Position and size
    position_x: int = Field(..., ge=0, le=12)
    position_y: int = Field(..., ge=0)
    width: int = Field(..., ge=1, le=12)
    height: int = Field(..., ge=1, le=20)
    
    # Configuration
    config: Dict[str, Any] = Field(default_factory=dict)
    
    # Data source
    data_source: str = Field(..., max_length=100)
    refresh_interval_minutes: int = Field(default=15, ge=1, le=60)
    
    # Visibility
    is_visible: bool = Field(default=True)
    is_minimized: bool = Field(default=False)
    
    # Permissions
    required_permissions: List[str] = Field(default_factory=list)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    last_updated: datetime = Field(default_factory=datetime.now)

class DashboardLayout(BaseModel):
    """Doctor's dashboard layout configuration"""
    doctor_id: str
    layout_name: str = Field(default="default", max_length=100)
    
    # Widgets
    widgets: List[DashboardWidget] = Field(default_factory=list, max_items=20)
    
    # Layout settings
    grid_columns: int = Field(default=12, ge=6, le=24)
    compact_mode: bool = Field(default=False)
    auto_refresh: bool = Field(default=True)
    
    # Theme
    theme: str = Field(default="light", regex=r'^(light|dark|auto)$')
    color_scheme: str = Field(default="default", max_length=50)
    
    # Metadata
    is_default: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# ================================
# Search & Filter Schemas
# ================================

class DashboardDataFilter(BaseModel):
    """Filter for dashboard data"""
    # Time range
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    time_period: Optional[str] = Field(None, regex=r'^(today|week|month|quarter|year|custom)$')
    
    # Entity filters
    patient_ids: Optional[List[str]] = None
    appointment_types: Optional[List[str]] = None
    diagnoses: Optional[List[str]] = None
    
    # Status filters
    include_cancelled: bool = Field(default=False)
    include_completed: bool = Field(default=True)
    include_pending: bool = Field(default=True)
    
    # Grouping
    group_by: Optional[str] = Field(None, regex=r'^(day|week|month|type|status)$')
    
    # Sorting
    sort_by: Optional[str] = None
    sort_order: str = Field(default="desc", regex=r'^(asc|desc)$')

# ================================
# Validators
# ================================

@validator('end_date')
def validate_date_range(cls, v, values):
    """Validate that end date is after start date"""
    if v and 'start_date' in values and values['start_date']:
        if v < values['start_date']:
            raise ValueError('End date must be after start date')
    return v

@validator('position_x')
def validate_widget_position(cls, v, values):
    """Validate widget position doesn't exceed grid"""
    if 'width' in values and v + values['width'] > 12:
        raise ValueError('Widget position plus width cannot exceed grid columns')
    return v

# Apply validators to relevant classes
ChartData.__validators__['validate_date_range'] = validator('period_end', allow_reuse=True)(validate_date_range)
DashboardWidget.__validators__['validate_widget_position'] = validator('position_x', allow_reuse=True)(validate_widget_position)