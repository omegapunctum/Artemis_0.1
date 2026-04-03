from urllib.parse import urlparse


def is_safe_url(url: str | None) -> bool:
    if not isinstance(url, str):
        return False
    value = url.strip()
    if not value:
        return False
    try:
        parsed = urlparse(value)
        return parsed.scheme in ("http", "https") and parsed.netloc != ""
    except Exception:
        return False
