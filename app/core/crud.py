from typing import (
    Any,
    Dict,
    Generic,
    List,
    NewType,
    Optional,
    Tuple,
    Type,
    TypeVar,
    Union,
)

from pydantic import BaseModel
from tortoise.expressions import Q
from tortoise.models import Model
from tortoise.query_utils import Prefetch

Total = NewType("Total", int)
ModelType = TypeVar("ModelType", bound=Model)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(
        self, id: int, prefetch_fields: Optional[List[Union[str, Prefetch]]] = None
    ) -> ModelType:
        query = self.model.get(id=id)
        if prefetch_fields:
            query = query.prefetch_related(*prefetch_fields)
        return await query

    async def list(
        self,
        page: int,
        page_size: int,
        search: Q = Q(),
        order: list = [],
        prefetch_fields: Optional[List[Union[str, Prefetch]]] = None,
    ) -> Tuple[Total, List[ModelType]]:
        query = self.model.filter(search)
        if prefetch_fields:
            query = query.prefetch_related(*prefetch_fields)
        return (
            await query.count(),
            await query.offset((page - 1) * page_size)
            .limit(page_size)
            .order_by(*order)
            .all(),
        )

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        if isinstance(obj_in, Dict):
            obj_dict = obj_in
        else:
            obj_dict = obj_in.model_dump()
        obj = self.model(**obj_dict)
        await obj.save()
        return obj

    async def update(
        self, id: int, obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        if isinstance(obj_in, Dict):
            obj_dict = obj_in
        else:
            obj_dict = obj_in.model_dump(exclude_unset=True)
        obj = await self.get(id=id)
        obj = obj.update_from_dict(obj_dict)
        await obj.save()
        return obj

    async def remove(self, id: int) -> None:
        obj = await self.get(id=id)
        await obj.delete()
