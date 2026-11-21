from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


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
