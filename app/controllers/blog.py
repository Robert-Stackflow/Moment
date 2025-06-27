from typing import List, Optional, Dict, Any, Tuple, Union

from app.core.crud import CRUDBase
from app.models.content import Blog
from app.schemas.blog import BlogCreate, BlogUpdate

from .category import category_controller
from .blog_image import blog_image_controller


class BlogController(CRUDBase[Blog, BlogCreate, BlogUpdate]):
    def __init__(self):
        super().__init__(model=Blog)

blog_controller = BlogController()
