from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class BaseUser(BaseModel):
    id: int
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    last_login: Optional[datetime]

class UserCreate(BaseModel):
    email: EmailStr = Field(example="admin@qq.com")
    username: str = Field(example="admin")
    password: str = Field(example="123456")
    avatar: str = Field(example="https://avatars.githubusercontent.com/u/54677442?v=4")

    def create_dict(self):
        return self.model_dump(exclude_unset=True)


class UserUpdate(BaseModel):
    id: int
    email: EmailStr
    username: str
    avatar: str

    def update_dict(self):
        return self.model_dump(exclude_unset=True, exclude={"id"})


class UpdatePassword(BaseModel):
    id: int = Field(description="用户ID")
    old_password: str = Field(description="旧密码")
    new_password: str = Field(description="新密码")
