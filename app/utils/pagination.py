from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20
    no_pagination: bool = False

    @property
    def skip(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool

    class Config:
        from_attributes = True


async def paginate(
    db: AsyncSession,
    query,
    pagination: PaginationParams,
    response_model: type[T]
) -> PaginatedResponse[T] | List[T]:
    """
    Pagine une requête SQLAlchemy.

    Si no_pagination=True, retourne tous les résultats sans pagination.
    Sinon, retourne un objet PaginatedResponse.
    """
    # Compter le total
    count_query = select(func.count()).select_from(query.subquery())
    result = await db.execute(count_query)
    total = result.scalar_one()

    # Si pas de pagination, retourner tous les résultats
    if pagination.no_pagination:
        result = await db.execute(query)
        items = result.scalars().all()
        return items

    # Appliquer la pagination
    paginated_query = query.offset(pagination.skip).limit(pagination.limit)
    result = await db.execute(paginated_query)
    items = result.scalars().all()

    total_pages = (total + pagination.page_size - 1) // pagination.page_size

    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=total_pages,
        has_next=pagination.page < total_pages,
        has_prev=pagination.page > 1
    )
