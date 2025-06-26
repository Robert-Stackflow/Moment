from typing import Optional

from app.core.crud import CRUDBase
from app.models.admin import Setting
from app.schemas.setting import SettingCreate, SettingUpdate


class SettingController(CRUDBase[Setting, SettingCreate, SettingUpdate]):
    def __init__(self):
        super().__init__(model=Setting)

    async def create(self, obj_in: SettingCreate) -> Setting:
        obj = await super().create(obj_in.create_dict())
        return obj

setting_controller = SettingController()
