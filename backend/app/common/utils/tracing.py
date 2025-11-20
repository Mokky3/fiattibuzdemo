"""Tracing utilities for request tracking."""
import uuid
from typing import Optional
from contextvars import ContextVar

# Context variable to store trace ID
trace_id_var: ContextVar[Optional[str]] = ContextVar('trace_id', default=None)

def get_trace_id() -> str:
    """Get the current trace ID or generate a new one."""
    trace_id = trace_id_var.get()
    if trace_id is None:
        trace_id = str(uuid.uuid4())
        trace_id_var.set(trace_id)
    return trace_id

def set_trace_id(trace_id: str) -> None:
    """Set the trace ID for the current context."""
    trace_id_var.set(trace_id)

def clear_trace_id() -> None:
    """Clear the trace ID for the current context."""
    trace_id_var.set(None)
