from typing import Optional

from app.core.crud import CRUDBase
from app.models.content import Category
from app.schemas.categories import CategoryCreate,CategoryUpdate

class CategoryController(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    def __init__(self):
        super().__init__(model=Category)

category_controller = CategoryController()
