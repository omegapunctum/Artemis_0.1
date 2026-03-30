"""Legacy compatibility shim for historical `api.main:app` runtime path.

[TODO: legacy shim, remove after migration]
"""

raise RuntimeError(
    "Legacy runtime path disabled: use canonical backend entrypoint app.main:app"
)
