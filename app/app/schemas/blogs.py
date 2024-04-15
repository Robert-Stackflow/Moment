from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class BaseBlog(BaseModel):
    id: int
    title: str
    desc: Optional[str]
    image: str
    location: Optional[str]
    is_hidden: Optional[bool] = False
    time: Optional[datetime]
    remark: Optional[dict]
    categories: Optional[list] = []


class BlogQuery(BaseModel):
    page: int
    page_size: int
    title: Optional[str] = None
    desc: Optional[str] = None
    location: Optional[str] = None
    categories: Optional[List[int]] = []
    order_option: Optional[str] = None


class BlogCreate(BaseModel):
    title: str = Field(example="随手拍了一张照片")
    image: str = Field(example="https://example.com/demo.png")
    time: datetime
    desc: Optional[str] = ""
    location: Optional[str] = ""
    remark: Optional[str] = {}
    is_hidden: Optional[bool] = False
    categories: Optional[List[int]] = []

    def create_dict(self):
        return self.model_dump(exclude_unset=True, exclude={"categories"})


class BlogUpdate(BaseModel):
    id: int
    title: str = Field(example="随手拍了一张照片")
    image: str = Field(example="https://example.com/demo.png")
    time: datetime
    desc: Optional[str] = ""
    location: Optional[str] = ""
    remark: Optional[str] = {}
    is_hidden: Optional[bool] = False
    categories: Optional[List[int]] = []

    def update_dict(self):
        return self.model_dump(exclude_unset=True, exclude={"categories", "id"})
