"""
Environment-based configuration for AcqWatch backend.
All secrets and paths come from environment variables / .env file.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List

# Resolve paths relative to this file's location (acqwatch-backend/)
_BACKEND_DIR = Path(__file__).parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=()
    )

    # Data / Model paths
    db_path: str = str(_BACKEND_DIR / "data" / "land_delays.db")
    model_path: str = str(_BACKEND_DIR / "models" / "gradient_boosting.joblib")
    existing_src_path: str = str(_BACKEND_DIR)

    # CORS
    allowed_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # Server
    host: str = "127.0.0.1"
    port: int = 8080
    log_level: str = "INFO"

    # Limits
    max_export_rows: int = 5000
    max_page_size: int = 500

    @property
    def origins_list(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def db_path_resolved(self) -> Path:
        p = Path(self.db_path)
        if not p.is_absolute():
            p = _BACKEND_DIR / p
        return p.resolve()

    @property
    def model_path_resolved(self) -> Path:
        p = Path(self.model_path)
        if not p.is_absolute():
            p = _BACKEND_DIR / p
        return p.resolve()

    @property
    def existing_src_path_resolved(self) -> Path:
        p = Path(self.existing_src_path)
        if not p.is_absolute():
            p = _BACKEND_DIR / p
        return p.resolve()


# Singleton
_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
