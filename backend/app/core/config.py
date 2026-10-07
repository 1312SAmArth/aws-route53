from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./route53.db"
    cors_origins: str = "http://localhost:3000"
    session_ttl_hours: int = 12
    cookie_secure: bool = False
    demo_username: str = "admin"
    demo_password: str = "Route53Demo!"
    seed_on_startup: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
