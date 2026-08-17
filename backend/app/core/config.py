from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FLOWHUNTER_")

    algorithm_version: str = "0.1.0"
    database_url: str = f"sqlite:///{DATA_DIR / 'flowhunter.db'}"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    lookback_calendar_days: int = 120
    forward_calendar_days: int = 120

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


settings = Settings()
