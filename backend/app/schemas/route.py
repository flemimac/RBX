from pydantic import BaseModel


class RouteBase(BaseModel):
    name: str
    description: str | None = None


class RouteCreate(RouteBase):
    pass


class RouteRead(RouteBase):
    id: str
    user_id: str
    files: list[str] = []

    class Config:
        from_attributes = True

