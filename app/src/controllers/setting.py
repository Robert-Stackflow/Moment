from typing import Optional

from src.core.crud import CRUDBase
from src.models.admin import Setting
from src.schemas.settings import SettingCreate, SettingUpdate


class SettingController(CRUDBase[Setting, SettingCreate, SettingUpdate]):
    def __init__(self):
        super().__init__(model=Setting)

    async def create(self, obj_in: SettingCreate) -> Setting:
        obj = await super().create(obj_in.create_dict())
        return obj

setting_controller = SettingController()
