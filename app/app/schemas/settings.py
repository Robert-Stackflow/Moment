from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

class BaseMenu(BaseModel):
    general: Optional[dict]
    content:Optional[dict]
    meta:Optional[dict]
    storage:Optional[dict]

class SettingCreate(BaseModel):
    general: Optional[dict]= Field(example={})
    content: Optional[dict]= Field(example={})
    meta: Optional[dict]= Field(example={})
    storage: Optional[dict]= Field(example={})
    def create_dict(self):
        return self.model_dump(exclude_unset=True)

class SettingUpdate(BaseModel):
    general: Optional[dict]= Field(example={})
    content: Optional[dict]= Field(example={})
    meta: Optional[dict]= Field(example={})
    storage: Optional[dict]= Field(example={})

    def update_dict(self):
        return self.model_dump(exclude_unset=True, exclude={"id"})

class SettingUpdateGeneral(BaseModel):
    general: Optional[dict]= Field(example={})

    def update_dict(self):
        return self.model_dump(exclude_unset=True, exclude={"id"})

class SettingUpdateMeta(BaseModel):
    meta: Optional[dict]= Field(example={})

    def update_dict(self):
        return self.model_dump(exclude_unset=True, exclude={"id"})
    
class SettingUpdateContent(BaseModel):
    content: Optional[dict]= Field(example={})

    def update_dict(self):
        return self.model_dump(exclude_unset=True, exclude={"id"})
    
class SettingUpdateStorage(BaseModel):
    storage: Optional[dict]= Field(example={})

    def update_dict(self):
        return self.model_dump(exclude_unset=True, exclude={"id"})