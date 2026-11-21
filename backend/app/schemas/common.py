from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel, Field

from app.core.config import settings

T = TypeVar("T")


class PaginationParams:
    """Reusable query parameters for collection endpoints."""

    def __init__(
        self,
        page: int = Query(1, ge=1),
        page_size: int = Query(20, ge=1, le=settings.MAX_PAGE_SIZE),
    ) -> None:
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        """Return the row offset for this one-based page number."""
        return (self.page - 1) * self.page_size


class Pagination(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)


class DataResponse(BaseModel, Generic[T]):
    data: T


class ListResponse(BaseModel, Generic[T]):
    data: list[T]
    pagination: Pagination


class MessageResponse(BaseModel):
    message: str


class ErrorDetail(BaseModel):
    field: str
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] | None = None
    request_id: str


class ErrorResponse(BaseModel):
    error: ErrorBody
