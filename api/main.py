"""Legacy compatibility shim for historical `api.main:app` runtime path.

[TODO: legacy cleanup reason]
Remove this shim after deployment/runtime configs are migrated to `app.main:app`.
"""

from app.main import app
