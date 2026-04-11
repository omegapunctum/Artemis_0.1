from app.main import app


def test_runtime_api_exposes_no_direct_publish_route() -> None:
    route_paths = [getattr(route, "path", "") for route in app.routes]
    publish_routes = [path for path in route_paths if "publish" in path.lower()]
    assert publish_routes == []
