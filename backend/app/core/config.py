from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    project_name: str = "RBX"
    api_v1_prefix: str = "/api"
    environment: str = "development"
    database_url: str = "sqlite+aiosqlite:///./rbx.db"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()


