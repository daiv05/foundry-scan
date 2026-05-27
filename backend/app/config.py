from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    backend_host: str = "127.0.0.1"
    backend_port: int = 7120
    pocketbase_url: str = "http://127.0.0.1:7130"
    frontend_origin: str = "http://localhost:7110"
    pb_admin_email: str = "admin@alcsaas.dev"
    pb_admin_password: str = "changeme"

    # Collector - rate-limit polite delay
    collector_request_delay_ms: int = 2000
    reddit_fetch_comments: bool = False

    # Trends (PyTrends primary, Playwright fallback - no API keys needed)
    trends_geo: str = ""
    trends_timeframe: str = "today 3-m"

    # Product Hunt
    producthunt_token: str = ""


settings = Settings()
