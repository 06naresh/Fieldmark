from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_inspections: int
    assigned_inspections: int
    in_progress_inspections: int
    submitted_inspections: int
    reviewed_inspections: int
    total_users: int | None = None
    active_inspectors: int | None = None
    total_sites: int | None = None
    pending_operations: int
    failed_operations: int
    open_conflicts: int
