from typing import Optional

from pydantic import BaseModel, Field

class BaseCategory(BaseModel):
    id: int
    name: str
    alias: str
    desc: str
    order: Optional[str]
    remark: Optional[dict]
    parent_id: int
    children: Optional[list["BaseCategory"]]

class CategoryCreate(BaseModel):
    name: str = Field(example="生活")
    alias: str = Field(example="life")
    desc: Optional[str] = ""
    order: Optional[int] = Field(example=1)
    parent_id: Optional[int] = Field(example=0, default=0)

class CategoryUpdate(BaseModel):
    id: int
    name: Optional[str] = Field(example="生活")
    alias: Optional[str] = Field(example="life")
    desc: Optional[str] = Field(example="我的生活")
    order: Optional[int] = Field(example=1)
    parent_id: Optional[int] = Field(example=0)

    def update_dict(self):
        return self.model_dump(exclude_unset=True, exclude={"id"})
