from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    project_name: str = "RBX"
    api_v1_prefix: str = "/api"
    environment: str = "development"
    database_url: str = "sqlite+aiosqlite:///./rbx.db"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60
    upload_dir: Path = Path("./uploads")
    processed_dir: Path = Path("./uploads/processed")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Создаем директории при инициализации
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.processed_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()


