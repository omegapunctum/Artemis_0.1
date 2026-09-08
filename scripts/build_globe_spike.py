#!/usr/bin/env python3
"""Build the isolated ARTEMIS #343 Globe runtime spike as a static artifact."""

from __future__ import annotations

import argparse
import calendar
import copy
import hashlib
import itertools
import json
import re
import shutil
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.build_leonardo_gate_d_inputs import (  # noqa: E402
    SLICE_ROOT as LEONARDO_SLICE_ROOT,
    build_gate_d_inputs,
)
from scripts.build_render_projection_fixtures import build_all  # noqa: E402
from scripts.validate_geospatial_assets import validate_manifest  # noqa: E402


WORLD_PATH = ROOT / "fixtures" / "world_model" / "v1" / "package.json"
STATE_PATH = ROOT / "fixtures" / "explorer_state" / "v1" / "state-1504-local-global.json"
PROJECTION_SCHEMA_PATH = ROOT / "fixtures" / "render_projection" / "v1" / "schema.json"
ASSET_MANIFEST_PATH = ROOT / "fixtures" / "geospatial_assets" / "v1" / "gate_d_runtime.json"
ASSET_SCHEMA_PATH = ROOT / "fixtures" / "geospatial_assets" / "v1" / "schema.json"
ENGINE_EVALUATION_PATH = ROOT / "fixtures" / "globe_runtime" / "v1" / "engine_evaluation.json"
ACCEPTANCE_PROFILES_PATH = ROOT / "fixtures" / "globe_runtime" / "v1" / "gate_d_acceptance_profiles.json"
EARTH_CONTEXT_PATH = ROOT / "fixtures" / "globe_runtime" / "v1" / "natural_earth_110m_land.geojson"
CAPABILITY_PATH = ROOT / "fixtures" / "globe_runtime" / "v1" / "capability_path.geojson"
LIFE_PATH_PRESENTATION_PATH = (
    ROOT / "fixtures" / "globe_runtime" / "v1" / "leonardo_life_path_presentation.json"
)
MAJOR_LIFE_PACKAGE_PATH = (
    ROOT / "fixtures" / "world_slices" / "leonardo_major_life" / "v1" / "package.json"
)
MAJOR_LIFE_RUNTIME_ANCHORS_PATH = (
    ROOT / "fixtures" / "globe_runtime" / "v1" / "leonardo_major_life_runtime_anchors.json"
)
M5_CONTRACT_PATH = (
    ROOT / "fixtures" / "globe_runtime" / "v1" / "temporal_map_m5_contract.json"
)
TEMPLATE_DIR = ROOT / "scripts" / "globe_spike"

SPIKE_ID = "artemis-globe-gate-d-review-v1"
EXPECTED_ENGINE = "maplibre-gl-js-5.24.0"
DEFAULT_DATASET = "leonardo_gate_c"
DATASET_CHOICES = {DEFAULT_DATASET, "contract_fixture"}
REQUIRED_OUTPUT_FILES = {
    "index.html",
    "runtime.js",
    "localization.js",
    "style.css",
    "projection.json",
    "globe-projection.json",
    "explorer-state.json",
    "explorer-views.json",
    "geospatial-assets.json",
    "earth-context.geojson",
    "capability-path.geojson",
    "engine-evaluation.json",
    "acceptance-profiles.json",
    "knowledge-index.json",
    "life-path.json",
    "build-meta.json",
    "README.txt",
}

LEONARDO_TEMPORAL_PRESETS = (
    {
        "preset_id": "full-slice",
        "label": "Full review interval · 8 Aug–31 Dec 1502",
        "temporal_selection": {
            "mode": "interval",
            "start": "1502-08-08",
            "end": "1502-12-31",
            "precision": "day",
            "calendar": "proleptic_gregorian",
        },
    },
    {
        "preset_id": "rimini-1502-08-08",
        "label": "Rimini source date · 8 Aug 1502",
        "temporal_selection": {
            "mode": "instant",
            "start": "1502-08-08",
            "end": "1502-08-08",
            "precision": "day",
            "calendar": "proleptic_gregorian",
        },
    },
    {
        "preset_id": "cesena-1502-08-10",
        "label": "Cesena source date · 10 Aug 1502",
        "temporal_selection": {
            "mode": "instant",
            "start": "1502-08-10",
            "end": "1502-08-10",
            "precision": "day",
            "calendar": "proleptic_gregorian",
        },
    },
    {
        "preset_id": "patent-1502-08-18",
        "label": "Borgia patent source date · 18 Aug 1502",
        "temporal_selection": {
            "mode": "instant",
            "start": "1502-08-18",
            "end": "1502-08-18",
            "precision": "day",
            "calendar": "proleptic_gregorian",
        },
    },
    {
        "preset_id": "cesenatico-1502-09-06",
        "label": "Cesenatico source date · 6 Sep 1502",
        "temporal_selection": {
            "mode": "instant",
            "start": "1502-09-06",
            "end": "1502-09-06",
            "precision": "day",
            "calendar": "proleptic_gregorian",
        },
    },
    {
        "preset_id": "imola-autumn-1502",
        "label": "Imola source interval · Sep–Nov 1502",
        "temporal_selection": {
            "mode": "interval",
            "start": "1502-09",
            "end": "1502-11",
            "precision": "month",
            "calendar": "proleptic_gregorian",
        },
    },
)

class SpikeBuildError(ValueError):
    pass


def _load(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SpikeBuildError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise SpikeBuildError(f"{path} must contain a JSON object")
    return value


def _canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")


def _sha(value: Any) -> str:
    return hashlib.sha256(_canonical_bytes(value)).hexdigest()


def _write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


def _validate_engine_evaluation(evaluation: dict[str, Any]) -> dict[str, Any]:
    selected_id = evaluation.get("selected_engine_id")
    candidates = {
        str(candidate.get("engine_id")): candidate
        for candidate in evaluation.get("candidates", [])
        if candidate.get("engine_id")
    }
    selected = candidates.get(str(selected_id))
    if selected is None:
        raise SpikeBuildError("selected engine does not exist in engine evaluation")
    if selected_id != EXPECTED_ENGINE:
        raise SpikeBuildError(
            f"#343 expected {EXPECTED_ENGINE}, evaluation selected {selected_id!r}"
        )

    required = {
        str(criterion["id"])
        for criterion in evaluation.get("criteria", [])
        if criterion.get("required") is True
    }
    statuses = selected.get("criteria") or {}
    missing = sorted(required - set(statuses))
    if missing:
        raise SpikeBuildError(f"selected engine missing required criteria: {missing}")
    failures = sorted(
        criterion
        for criterion in required
        if statuses.get(criterion) != "pass"
    )
    if failures:
        raise SpikeBuildError(
            f"selected engine has non-pass required criteria: {failures}"
        )
    return selected


def _validate_acceptance_profiles(contract: dict[str, Any]) -> None:
    profiles = contract.get("profiles")
    if not isinstance(profiles, list) or not profiles:
        raise SpikeBuildError("browser acceptance contract must contain profiles")
    profile_ids = [profile.get("profile_id") for profile in profiles]
    if profile_ids != ["desktop", "tablet", "mobile"]:
        raise SpikeBuildError(
            "browser acceptance profiles must remain ordered desktop/tablet/mobile"
        )
    if len(set(profile_ids)) != len(profile_ids):
        raise SpikeBuildError("browser acceptance profile ids must be unique")

    expected_layouts = {"desktop", "tablet", "mobile"}
    for profile in profiles:
        viewport = profile.get("browser_window_css_px") or {}
        if not all(
            isinstance(viewport.get(axis), int) and viewport[axis] > 0
            for axis in ("width", "height")
        ):
            raise SpikeBuildError(
                f"browser profile {profile.get('profile_id')!r} has invalid viewport"
            )
        if profile.get("expected_layout_mode") not in expected_layouts:
            raise SpikeBuildError(
                f"browser profile {profile.get('profile_id')!r} has invalid layout mode"
            )
        if not isinstance(profile.get("prefers_reduced_motion"), bool):
            raise SpikeBuildError(
                f"browser profile {profile.get('profile_id')!r} lacks motion preference"
            )

    thresholds = contract.get("thresholds") or {}
    required_thresholds = {
        "max_horizontal_overflow_css_px",
        "min_interactive_target_css_px",
        "max_unnamed_interactive_controls",
        "max_overlay_collision_count",
        "min_context_source_feature_count",
        "min_context_rendered_feature_count",
        "min_globe_width_css_px",
        "min_globe_height_css_px",
    }
    if set(thresholds) != required_thresholds or any(
        not isinstance(value, int) or value < 0 for value in thresholds.values()
    ):
        raise SpikeBuildError("browser acceptance thresholds are incomplete or invalid")
    if profiles[-1]["prefers_reduced_motion"] is not True:
        raise SpikeBuildError("mobile browser profile must exercise reduced motion")
    if not contract.get("limitations"):
        raise SpikeBuildError("browser acceptance contract must disclose limitations")


def _validate_capability_path(path_fixture: dict[str, Any]) -> None:
    features = path_fixture.get("features")
    if not isinstance(features, list) or len(features) != 1:
        raise SpikeBuildError("capability path must contain exactly one feature")
    feature = features[0]
    if feature.get("geometry", {}).get("type") != "LineString":
        raise SpikeBuildError("capability path must be a LineString")
    properties = feature.get("properties") or {}
    if properties.get("capability_only") is not True:
        raise SpikeBuildError("capability path must be explicitly capability_only")
    if properties.get("semantic_role") != "renderer_capability_path":
        raise SpikeBuildError("capability path semantic_role mismatch")
    if properties.get("world_model_object_ref") is not None:
        raise SpikeBuildError("capability path must not have a World Model object ref")
    if properties.get("pick_as_knowledge") is not False:
        raise SpikeBuildError("capability path must not be pickable as knowledge")
    if "object_ref" in properties:
        raise SpikeBuildError("capability path must not expose canonical object_ref")


def _validate_earth_context(context: dict[str, Any], manifest: dict[str, Any]) -> None:
    assets = {str(asset["asset_id"]): asset for asset in manifest.get("assets", [])}
    context_meta = context.get("artemis_context") or {}
    context_asset_ref = context_meta.get("asset_ref")
    if context_meta.get("capability_only") is not True:
        raise SpikeBuildError("Earth context collection must be capability_only")
    if context_meta.get("semantic_role") != "present_day_context":
        raise SpikeBuildError("Earth context collection must be present_day_context")
    if context_meta.get("historical_validity") is not None:
        raise SpikeBuildError("Earth context cannot declare historical validity")
    if context_asset_ref not in assets:
        raise SpikeBuildError(f"Earth context references unknown asset: {context_asset_ref}")
    context_asset = assets[context_asset_ref]
    if context_asset.get("semantic_role") != "present_day_context":
        raise SpikeBuildError("Earth context asset must remain present_day_context")
    if context_asset.get("provenance", {}).get("provenance_kind") == "synthetic_fixture":
        raise SpikeBuildError("Gate D Earth context must resolve to a real dataset")

    features = context.get("features")
    if not isinstance(features, list) or not features:
        raise SpikeBuildError("Earth context must contain features")
    for feature in features:
        properties = feature.get("properties") or {}
        if properties.get("capability_only") is not True:
            raise SpikeBuildError("all Earth context features must be capability_only")
        if properties.get("semantic_role") != "present_day_context":
            raise SpikeBuildError("all Earth context features must be present_day_context")
        if "object_ref" in properties or "world_model_object_ref" in properties:
            raise SpikeBuildError("Earth context must not carry World Model object identity")
        asset_ref = properties.get("asset_ref")
        if asset_ref != context_asset_ref:
            raise SpikeBuildError("Earth context feature asset_ref must match the collection")
        if asset_ref not in assets:
            raise SpikeBuildError(f"Earth context references unknown asset: {asset_ref}")


def _earth_context_runtime_status(
    context: dict[str, Any], manifest: dict[str, Any]
) -> dict[str, Any]:
    asset_ref = context["artemis_context"]["asset_ref"]
    asset = next(asset for asset in manifest["assets"] if asset["asset_id"] == asset_ref)
    provider = asset["provider"]
    return {
        "asset_ref": asset_ref,
        "provider_id": provider["provider_id"],
        "real_dataset_selected": asset["provenance"]["provenance_kind"]
        != "synthetic_fixture",
        "status": "bundled_real_vector_context",
        "semantic_role": asset["semantic_role"],
        "network_required": asset["runtime_policy"]["network_required"],
        "secret_required": asset["runtime_policy"]["secret_required"],
    }


def _terrain_runtime_status(manifest: dict[str, Any]) -> dict[str, Any]:
    terrain = next(
        (asset for asset in manifest.get("assets", []) if asset.get("asset_kind") == "terrain_elevation"),
        None,
    )
    if terrain is None:
        return {
            "asset_ref": None,
            "live_provider_selected": False,
            "status": "no_terrain_asset",
        }
    provider = terrain["provider"]
    endpoint = str(provider.get("endpoint_template") or "")
    live = provider.get("adapter_kind") == "raster_url_template" and endpoint.startswith(
        ("http://", "https://")
    )
    return {
        "asset_ref": terrain["asset_id"],
        "live_provider_selected": bool(live),
        "status": "live_raster_dem" if live else "synthetic_or_nonlive_provider",
        "vertical_reference": terrain["spatial_reference"]["vertical_reference"],
    }


def _load_semantic_inputs(
    dataset: str,
) -> tuple[dict[str, Any], dict[str, Any], Path]:
    if dataset == DEFAULT_DATASET:
        world, state = build_gate_d_inputs()
        return world, state, LEONARDO_SLICE_ROOT
    if dataset == "contract_fixture":
        return _load(WORLD_PATH), _load(STATE_PATH), WORLD_PATH.parent
    raise SpikeBuildError(f"unknown semantic dataset: {dataset!r}")


def _index_by_id(values: Any, *, label: str) -> dict[str, dict[str, Any]]:
    if not isinstance(values, list):
        raise SpikeBuildError(f"World Model {label} must be a list")
    indexed: dict[str, dict[str, Any]] = {}
    for value in values:
        if not isinstance(value, dict) or not isinstance(value.get("id"), str):
            raise SpikeBuildError(f"World Model {label} must contain objects with string ids")
        item_id = value["id"]
        if item_id in indexed:
            raise SpikeBuildError(f"duplicate World Model {label} id: {item_id}")
        indexed[item_id] = value
    return indexed


def _build_knowledge_index(
    world: dict[str, Any], projection: dict[str, Any]
) -> dict[str, Any]:
    object_collections = {
        "Entity": "entities",
        "Event": "events",
        "State": "states",
        "Process": "processes",
        "Trajectory": "trajectories",
        "Region": "regions",
        "DerivedObservation": "derived_observations",
    }
    objects: dict[str, dict[str, Any]] = {}
    object_types: dict[str, str] = {}
    for object_type, collection in object_collections.items():
        for object_id, value in _index_by_id(
            world.get(collection, []), label=collection
        ).items():
            if object_id in objects:
                raise SpikeBuildError(f"duplicate canonical object id: {object_id}")
            objects[object_id] = value
            object_types[object_id] = object_type

    claims = _index_by_id(world.get("claims", []), label="claims")
    evidence_links = _index_by_id(
        world.get("evidence_links", []), label="evidence_links"
    )
    sources = _index_by_id(world.get("sources", []), label="sources")
    uncertainties = _index_by_id(
        world.get("uncertainties", []), label="uncertainties"
    )
    geometries = {
        str(geometry["geometry_ref"]): geometry
        for geometry in projection.get("geometries", [])
    }
    losses_by_item: dict[str, list[dict[str, Any]]] = {}
    for loss in projection.get("losses", []):
        if not isinstance(loss, dict) or not isinstance(loss.get("item_id"), str):
            raise SpikeBuildError("projection losses must reference item_id")
        losses_by_item.setdefault(loss["item_id"], []).append(loss)

    records: list[dict[str, Any]] = []
    for item in projection.get("items", []):
        item_id = item.get("item_id")
        object_ref = item.get("object_ref")
        object_type = item.get("object_type")
        if not isinstance(item_id, str) or not isinstance(object_ref, str):
            raise SpikeBuildError("projection item lacks canonical item/object identity")
        canonical_object = objects.get(object_ref)
        if canonical_object is None:
            raise SpikeBuildError(f"projection item references unknown object: {object_ref}")
        if object_types[object_ref] != object_type:
            raise SpikeBuildError(
                f"projection object type drift for {object_ref}: "
                f"{object_type!r} != {object_types[object_ref]!r}"
            )

        claim_refs = list(item.get("claim_refs") or [])
        evidence_refs = list(item.get("evidence_link_refs") or [])
        source_refs = list(item.get("source_refs") or [])
        uncertainty_refs = list(item.get("uncertainty_refs") or [])
        geometry_refs = list(item.get("geometry_refs") or [])

        missing_claims = sorted(set(claim_refs) - set(claims))
        missing_evidence = sorted(set(evidence_refs) - set(evidence_links))
        missing_sources = sorted(set(source_refs) - set(sources))
        missing_uncertainties = sorted(set(uncertainty_refs) - set(uncertainties))
        if missing_claims or missing_evidence or missing_sources or missing_uncertainties:
            raise SpikeBuildError(
                f"knowledge closure failed for {item_id}: "
                f"claims={missing_claims}; evidence={missing_evidence}; "
                f"sources={missing_sources}; uncertainties={missing_uncertainties}"
            )
        missing_geometries = sorted(set(geometry_refs) - set(geometries))
        if missing_geometries:
            raise SpikeBuildError(
                f"knowledge closure failed for {item_id}: geometries={missing_geometries}"
            )

        embedded_evidence = [copy.deepcopy(evidence_links[ref]) for ref in evidence_refs]
        for evidence in embedded_evidence:
            if evidence.get("claim_id") not in claim_refs:
                raise SpikeBuildError(
                    f"evidence {evidence['id']} escapes projected claims for {item_id}"
                )
            if evidence.get("source_id") not in source_refs:
                raise SpikeBuildError(
                    f"evidence {evidence['id']} escapes projected sources for {item_id}"
                )
            if not str(evidence.get("locator") or "").strip():
                raise SpikeBuildError(f"evidence {evidence['id']} lacks a locator")

        embedded_sources: list[dict[str, Any]] = []
        for ref in source_refs:
            source = copy.deepcopy(sources[ref])
            uri = str(source.get("uri") or "")
            source["artifact_uri"] = uri if "://" in uri else f"./{uri}"
            embedded_sources.append(source)

        records.append(
            {
                "item_id": item_id,
                "object_ref": object_ref,
                "object_type": object_type,
                "subobject_ref": item.get("subobject_ref"),
                "label": canonical_object.get("label") or object_ref,
                "render_role": item.get("render_role"),
                "spatial_status": item.get("spatial_status"),
                "temporal_membership": item.get("temporal_membership"),
                "semantic_flags": copy.deepcopy(item.get("semantic_flags") or {}),
                "claim_refs": claim_refs,
                "evidence_link_refs": evidence_refs,
                "source_refs": source_refs,
                "uncertainty_refs": uncertainty_refs,
                "claims": [copy.deepcopy(claims[ref]) for ref in claim_refs],
                "evidence_links": embedded_evidence,
                "sources": embedded_sources,
                "uncertainties": [
                    copy.deepcopy(uncertainties[ref]) for ref in uncertainty_refs
                ],
                "geometries": [
                    copy.deepcopy(geometries[ref]) for ref in geometry_refs
                ],
                "projection_losses": copy.deepcopy(losses_by_item.get(item_id, [])),
            }
        )

    projection_item_ids = {item.get("item_id") for item in projection.get("items", [])}
    orphan_losses = sorted(set(losses_by_item) - projection_item_ids)
    if orphan_losses:
        raise SpikeBuildError(f"projection losses reference unknown items: {orphan_losses}")

    return {
        "schema_version": "1.0.0",
        "index_id": f"knowledge-index:{projection['projection_id']}",
        "package_id": world["package_id"],
        "world_slice_ref": world["world_slice"]["id"],
        "projection_id": projection["projection_id"],
        "fixture_mode": world.get("fixture_mode"),
        "historical_corpus_ready": world.get("historical_corpus_ready") is True,
        "corpus_status_label": world.get("corpus_status_label")
        or (
            "synthetic contract fixture · not historical evidence"
            if world.get("fixture_mode") == "synthetic_contract_fixture"
            else "candidate package · historical readiness not established"
        ),
        "promotion_allowed": world.get("promotion_allowed") is True,
        "deferred_object_types": copy.deepcopy(
            projection.get("deferred_object_types", [])
        ),
        "records": records,
    }


def _copy_local_sources(
    world: dict[str, Any], output: Path, *, source_root: Path
) -> dict[str, str]:
    source_root = source_root.resolve()
    copied: dict[str, str] = {}
    for source in world.get("sources", []):
        source_id = str(source.get("id") or "")
        uri = str(source.get("uri") or "")
        if not source_id or not uri or "://" in uri:
            continue
        relative = Path(uri)
        if relative.is_absolute() or ".." in relative.parts:
            raise SpikeBuildError(f"unsafe local source URI: {uri}")
        source_path = (source_root / relative).resolve()
        if source_root not in source_path.parents:
            raise SpikeBuildError(f"local source escapes package root: {uri}")
        try:
            payload = source_path.read_bytes()
        except OSError as exc:
            raise SpikeBuildError(f"cannot read local source {uri}: {exc}") from exc
        digest = hashlib.sha256(payload).hexdigest()
        if digest != source.get("sha256"):
            raise SpikeBuildError(f"local source checksum drift: {source_id}")
        destination = output / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(payload)
        copied[source_id] = digest
    return copied


def _layer_subsets(layer_refs: list[str]) -> list[list[str]]:
    """Return every deterministic visibility combination for precomputed views."""

    return [
        list(combination)
        for size in range(len(layer_refs) + 1)
        for combination in itertools.combinations(layer_refs, size)
    ]


def _build_explorer_views(
    *,
    world: dict[str, Any],
    base_state: dict[str, Any],
    projection_schema: dict[str, Any],
    dataset: str,
) -> dict[str, Any]:
    """Precompute semantic views so the renderer never reinterprets time/layers."""

    layer_options = [
        {"layer_ref": layer["id"], "label": layer.get("label") or layer["id"]}
        for layer in world.get("layers", [])
    ]
    layer_refs = [option["layer_ref"] for option in layer_options]
    temporal_presets = (
        copy.deepcopy(list(LEONARDO_TEMPORAL_PRESETS))
        if dataset == DEFAULT_DATASET
        else [
            {
                "preset_id": "fixture-selection",
                "label": "Contract fixture selection",
                "temporal_selection": copy.deepcopy(
                    base_state["temporal_selection"]
                ),
            }
        ]
    )
    subsets = _layer_subsets(layer_refs)
    all_layers = sorted(layer_refs)
    views: list[dict[str, Any]] = []
    default_view_id: str | None = None

    for preset in temporal_presets:
        for active_layers in subsets:
            state = copy.deepcopy(base_state)
            sorted_layers = sorted(active_layers)
            layer_mask = "".join(
                "1" if layer_ref in sorted_layers else "0"
                for layer_ref in layer_refs
            )
            view_id = f"explorer-view-{preset['preset_id']}-layers-{layer_mask}"
            state["temporal_selection"] = copy.deepcopy(
                preset["temporal_selection"]
            )
            state["active_layer_refs"] = sorted_layers
            if not (
                preset["preset_id"] == temporal_presets[0]["preset_id"]
                and sorted_layers == all_layers
            ):
                state["state_id"] = f"{base_state['state_id']}--{preset['preset_id']}--{layer_mask}"

            projection, _maplibre, globe = build_all(
                world, state, projection_schema
            )
            if dataset == DEFAULT_DATASET:
                _assert_gate_d_place_anchor_projection(projection, globe)
            views.append(
                {
                    "view_id": view_id,
                    "temporal_preset_id": preset["preset_id"],
                    "active_layer_refs": sorted_layers,
                    "state": state,
                    "projection": projection,
                    "globe": globe,
                }
            )
            if (
                preset["preset_id"] == temporal_presets[0]["preset_id"]
                and sorted_layers == all_layers
            ):
                default_view_id = view_id

    if default_view_id is None:
        raise SpikeBuildError("explorer view index has no default view")
    return {
        "schema_version": "1.0.0",
        "index_id": f"explorer-view-index:{base_state['state_id']}",
        "default_view_id": default_view_id,
        "temporal_presets": temporal_presets,
        "layer_options": layer_options,
        "views": sorted(views, key=lambda value: value["view_id"]),
    }


def _expanded_temporal_bound(value: str, *, edge: str) -> date:
    parts = value.split("-")
    try:
        year = int(parts[0])
        month = int(parts[1]) if len(parts) >= 2 else (1 if edge == "start" else 12)
        day = int(parts[2]) if len(parts) >= 3 else (
            1 if edge == "start" else calendar.monthrange(year, month)[1]
        )
        return date(year, month, day)
    except (ValueError, IndexError) as exc:
        raise SpikeBuildError(f"invalid life-path temporal value {value!r}") from exc


def _build_life_path_time_axis(presences: list[dict[str, Any]]) -> dict[str, Any]:
    starts = [
        _expanded_temporal_bound(presence["temporal"]["start"], edge="start")
        for presence in presences
    ]
    ends = [
        _expanded_temporal_bound(presence["temporal"]["end"], edge="end")
        for presence in presences
    ]
    lower = min(starts)
    upper = max(ends)
    if upper.year - lower.year >= 2:
        values = [str(year) for year in range(lower.year, upper.year + 1)]
        axis_kind = "year"
        for presence, start, end in zip(presences, starts, ends, strict=True):
            presence["axis_start_index"] = start.year - lower.year
            presence["axis_end_index"] = end.year - lower.year
    else:
        values = []
        cursor = lower
        while cursor <= upper:
            values.append(cursor.isoformat())
            cursor += timedelta(days=1)
        axis_kind = "day"
        for presence, start, end in zip(presences, starts, ends, strict=True):
            presence["axis_start_index"] = (start - lower).days
            presence["axis_end_index"] = (end - lower).days
    return {
        "axis_kind": axis_kind,
        "calendar": "proleptic_gregorian",
        "values": values,
        "default_start_index": 0,
        "default_end_index": len(values) - 1,
        "future_granularity": ["month", "day"],
    }


def _build_life_path_presentation(
    *,
    world: dict[str, Any],
    base_state: dict[str, Any],
    base_projection: dict[str, Any],
    projection_schema: dict[str, Any],
    presentation: dict[str, Any],
    dataset: str,
) -> dict[str, Any]:
    """Build a deterministic presentation from canonical Trajectory segments."""

    if dataset != DEFAULT_DATASET:
        return {
            "schema_version": "1.0.0",
            "path_id": "life-path-unavailable-for-contract-fixture",
            "available": False,
            "presences": [],
            "transitions": [],
            "views": [],
        }

    events = _index_by_id(world.get("events", []), label="events")
    entities = _index_by_id(world.get("entities", []), label="entities")
    trajectories = _index_by_id(world.get("trajectories", []), label="trajectories")
    subject_ref = str(presentation.get("subject_ref") or "")
    trajectory_ref = str(presentation.get("trajectory_ref") or "")
    trajectory = trajectories.get(trajectory_ref)
    if trajectory is None:
        raise SpikeBuildError("life-path presentation lost its canonical Trajectory")
    if trajectory.get("subject_ref") != subject_ref or subject_ref not in entities:
        raise SpikeBuildError("life-path subject/Trajectory binding drifted")
    segments = {
        str(segment.get("id")): segment
        for segment in trajectory.get("segments", [])
        if segment.get("id")
    }
    geometries = {
        str(geometry.get("owner_ref")): geometry
        for geometry in base_projection.get("geometries", [])
        if geometry.get("owner_ref")
    }
    projection_item_ids = {
        str(item.get("item_id"))
        for item in base_projection.get("items", [])
        if item.get("item_id")
    }

    presences: list[dict[str, Any]] = []
    bindings = presentation.get("presence_bindings") or []
    if not isinstance(bindings, list) or not bindings:
        raise SpikeBuildError("life-path presentation requires presence bindings")
    for index, binding in enumerate(bindings):
        event = events.get(binding["event_ref"])
        place = entities.get(binding["place_ref"])
        segment = segments.get(binding["trajectory_segment_ref"])
        geometry = geometries.get(binding["place_ref"])
        if event is None or place is None or segment is None or geometry is None:
            raise SpikeBuildError(
                f"life-path presence closure failed for {binding['presence_id']}"
            )
        if segment.get("segment_kind") != "presence":
            raise SpikeBuildError("life-path binding must resolve to a presence segment")
        spatial = segment.get("spatial_extent") or {}
        if spatial.get("place_ref") != binding["place_ref"]:
            raise SpikeBuildError("life-path presence segment/place binding drifted")
        if geometry.get("origin_kind") != "place_reference_anchor":
            raise SpikeBuildError("life-path presence escaped place-reference geometry")
        if geometry.get("spatial_precision") != "named_settlement":
            raise SpikeBuildError("life-path presence lost named-settlement precision")
        coordinates = geometry.get("geometry", {}).get("coordinates")
        if geometry.get("geometry", {}).get("type") != "Point" or not coordinates:
            raise SpikeBuildError("life-path presence must resolve to one anchor Point")

        event_item_id = f"rp:event:{binding['event_ref']}"
        presence_item_id = (
            f"rp:trajectory_segment:{trajectory_ref}:"
            f"{binding['trajectory_segment_ref']}"
        )
        if {event_item_id, presence_item_id} - projection_item_ids:
            raise SpikeBuildError("life-path presence escaped the canonical projection")

        temporal = copy.deepcopy(event.get("temporal_extent") or {})
        if not temporal.get("start") or not temporal.get("end"):
            raise SpikeBuildError("life-path presence requires source-bound temporal values")
        presences.append(
            {
                "index": index,
                **copy.deepcopy(binding),
                "place_label": place.get("label") or binding["place_ref"],
                "short_description": event.get("label") or binding["event_ref"],
                "temporal": temporal,
                "coordinates": copy.deepcopy(coordinates),
                "coordinate_role": "present_day_settlement_reference",
                "historical_location_precision": (
                    "exact_position_within_named_settlement_unknown"
                ),
                "duration_status": "not_established_in_current_corpus",
                "event_item_id": event_item_id,
                "presence_item_id": presence_item_id,
            }
        )

    time_axis = _build_life_path_time_axis(presences)
    presence_ids = {presence["presence_id"] for presence in presences}
    transitions: list[dict[str, Any]] = []
    for binding in presentation.get("transition_bindings") or []:
        segment = segments.get(binding["trajectory_segment_ref"])
        if segment is None or segment.get("segment_kind") != "inferred_gap":
            raise SpikeBuildError("life-path transition must bind an inferred gap")
        if {
            binding.get("from_presence_ref"),
            binding.get("to_presence_ref"),
        } - presence_ids:
            raise SpikeBuildError("life-path transition escapes presence sequence")
        if (segment.get("spatial_extent") or {}).get("geometry") is not None:
            raise SpikeBuildError("unknown life-path transition acquired route geometry")
        transitions.append(
            {
                **copy.deepcopy(binding),
                "segment_kind": "inferred_gap",
                "route_status": "unknown_route",
                "route_geometry": None,
                "uncertainty_refs": ["uncertainty-trajectory-route-gaps"],
                "presentation_connector": {
                    "semantic_role": "chronological_connection",
                    "style": "dashed",
                    "derived_from_presence_anchors": True,
                    "is_historical_route_geometry": False,
                },
            }
        )

    all_layers = sorted(layer["id"] for layer in world.get("layers", []))
    views: list[dict[str, Any]] = []
    for start_index in range(len(presences)):
        for end_index in range(start_index, len(presences)):
            first = presences[start_index]
            last = presences[end_index]
            state = copy.deepcopy(base_state)
            state["state_id"] = (
                f"{base_state['state_id']}--life-path-{start_index}-{end_index}"
            )
            state["active_layer_refs"] = all_layers
            state["temporal_selection"] = {
                "mode": (
                    "instant"
                    if first["temporal"]["start"] == last["temporal"]["end"]
                    else "interval"
                ),
                "start": first["temporal"]["start"],
                "end": last["temporal"]["end"],
                "precision": (
                    "month"
                    if start_index == end_index
                    and len(str(first["temporal"]["start"])) == 7
                    else "day"
                    if start_index == end_index
                    else "range"
                ),
                "calendar": "proleptic_gregorian",
            }
            projection, _maplibre, globe = build_all(
                world, state, projection_schema
            )
            _assert_gate_d_place_anchor_projection(projection, globe)
            view_id = f"life-path-{start_index}-{end_index}"
            views.append(
                {
                    "view_id": view_id,
                    "start_index": start_index,
                    "end_index": end_index,
                    "visible_presence_ids": [
                        presence["presence_id"]
                        for presence in presences[start_index : end_index + 1]
                    ],
                    "state": state,
                    "projection": projection,
                    "globe": globe,
                }
            )

    return {
        "schema_version": "1.0.0",
        "path_id": presentation["presentation_id"],
        "available": True,
        "presentation_only": True,
        "scope_status": presentation["scope_status"],
        "subject_ref": subject_ref,
        "subject_label": entities[subject_ref]["label"],
        "trajectory_ref": trajectory_ref,
        "coverage": {
            "start": presences[0]["temporal"]["start"],
            "end": presences[-1]["temporal"]["end"],
            "scope_label": "Selected source-bound Romagna presences · 1502",
            "complete_life": False,
            "step_granularity": "source_native_day_or_month",
        },
        "default_mode": "range",
        "time_axis": time_axis,
        "default_view_id": f"life-path-0-{len(presences) - 1}",
        "route_policy": {
            "status": "unknown_route",
            "geometry": None,
            "historical_route_geometry_permitted": False,
            "chronological_connector_permitted": True,
            "chronological_connector_is_route": False,
        },
        "presences": presences,
        "transitions": transitions,
        "views": views,
    }


def _validate_m5_inputs(
    package: dict[str, Any],
    anchors: dict[str, Any],
    contract: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    """Close the bounded M5 proof over reviewed claims and separate map anchors."""

    if package.get("package_id") != contract.get("source_package", {}).get("package_id"):
        raise SpikeBuildError("M5 contract lost its reviewed major-life package identity")
    if package.get("status") != "CANDIDATE_SOURCE_AUDITED":
        raise SpikeBuildError("M5 requires the source-audited major-life candidate")
    if package.get("audit", {}).get("current_decision") != "FREEZE_FOR_REVIEW":
        raise SpikeBuildError("M5 requires the independent FREEZE_FOR_REVIEW decision")
    if package.get("runtime_authorized") is not False:
        raise SpikeBuildError("M5 must not mutate the source package runtime boundary")
    if contract.get("runtime_authorization", {}).get("scope") != "presentation_only_bounded_m5_proof":
        raise SpikeBuildError("M5 runtime authorization escaped its bounded proof scope")
    if contract.get("manual_exit_decisions") != ["ITERATE", "NARROW", "STOP"]:
        raise SpikeBuildError("M5 manual exit vocabulary drifted")

    places = {str(place["place_id"]): place for place in package.get("places", [])}
    expected_places = {
        "place-vinci",
        "place-florence",
        "place-milan",
        "place-vatican-belvedere",
        "place-clos-luce",
    }
    if set(places) != expected_places or any(place.get("geometry") is not None for place in places.values()):
        raise SpikeBuildError("M5 source places must remain exactly five and geometry-free")

    anchor_rows = anchors.get("anchors") or []
    anchor_by_place = {str(anchor.get("place_ref")): anchor for anchor in anchor_rows}
    if set(anchor_by_place) != expected_places or len(anchor_rows) != len(anchor_by_place):
        raise SpikeBuildError("M5 map anchors must close exactly the five major-life places")
    source_id = anchors.get("source", {}).get("source_id")
    uncertainty_id = anchors.get("uncertainty", {}).get("uncertainty_id")
    for place_ref, anchor in anchor_by_place.items():
        if anchor.get("semantic_role") != "present_day_place_reference":
            raise SpikeBuildError(f"{place_ref}: M5 anchor acquired a historical semantic role")
        if anchor.get("source_id") != source_id or anchor.get("uncertainty_ref") != uncertainty_id:
            raise SpikeBuildError(f"{place_ref}: M5 anchor escaped source/uncertainty closure")
        if not str(anchor.get("source_uri", "")).endswith("/" + str(anchor.get("source_entity_id", ""))):
            raise SpikeBuildError(f"{place_ref}: M5 anchor URI does not close its Wikidata entity")
        geometry = anchor.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []
        if geometry.get("type") != "Point" or len(coordinates) != 2:
            raise SpikeBuildError(f"{place_ref}: M5 reference anchor must be one Point")
        longitude, latitude = coordinates
        if not (-180 <= longitude <= 180 and -90 <= latitude <= 90):
            raise SpikeBuildError(f"{place_ref}: M5 reference anchor is outside EPSG:4326")
    return anchor_by_place


def _macro_period_axis(period: dict[str, Any], *, first_year: int) -> dict[str, Any]:
    years = [int(value) for value in re.findall(r"\d{4}", str(period.get("display_range", "")))]
    if not years:
        raise SpikeBuildError(f"M5 macro period {period.get('period_id')} lost its display years")
    start_year = years[0]
    end_year = years[-1]
    return {
        **copy.deepcopy(period),
        "axis_start_index": start_year - first_year,
        "axis_end_index": end_year - first_year,
    }


def _build_m5_whole_life_path(
    *,
    base_life_path: dict[str, Any],
    base_state: dict[str, Any],
    package: dict[str, Any],
    anchors: dict[str, Any],
    contract: dict[str, Any],
) -> dict[str, Any]:
    if not base_life_path.get("available"):
        return base_life_path
    anchor_by_place = _validate_m5_inputs(package, anchors, contract)
    source_by_id = {str(source["source_id"]): source for source in package.get("sources", [])}
    uncertainty_by_id = {
        str(uncertainty["uncertainty_id"]): uncertainty
        for uncertainty in package.get("uncertainties", [])
    }
    claim_by_id = {str(claim["claim_id"]): claim for claim in package.get("claims", [])}
    evidence_by_claim: dict[str, list[dict[str, Any]]] = {}
    for evidence in package.get("evidence_links", []):
        evidence_by_claim.setdefault(str(evidence["claim_id"]), []).append(evidence)

    major_presences: list[dict[str, Any]] = []
    for row in package.get("presences", []):
        if row.get("geometry") is not None:
            raise SpikeBuildError(f"{row.get('presence_id')}: reviewed Presence gained geometry")
        anchor = anchor_by_place.get(str(row.get("place_ref")))
        if anchor is None:
            raise SpikeBuildError(f"{row.get('presence_id')}: no separate M5 map anchor")
        claims = [claim_by_id[ref] for ref in row.get("claim_refs", []) if ref in claim_by_id]
        evidence = [
            item
            for claim in claims
            for item in evidence_by_claim.get(str(claim["claim_id"]), [])
        ]
        sources = [
            source_by_id[source_ref]
            for source_ref in sorted({str(item["source_id"]) for item in evidence})
            if source_ref in source_by_id
        ]
        temporal = copy.deepcopy(row["temporal"])
        major_presences.append(
            {
                "presence_id": row["presence_id"],
                "period_ref": row["period_ref"],
                "place_ref": row["place_ref"],
                "place_label": row["place_label"],
                "short_description": row["activity_label"],
                "selection_rationale": row["selection_rationale"],
                "temporal": temporal,
                "coordinates": copy.deepcopy(anchor["geometry"]["coordinates"]),
                "coordinate_role": "present_day_place_reference",
                "historical_location_precision": anchor["historical_location_precision"],
                "spatial_precision": row["spatial_precision"],
                "duration_status": (
                    "range_not_continuous_position"
                    if temporal.get("extent_semantics") == "residence_range_not_continuous_position"
                    else "not_established_beyond_source_anchor"
                ),
                "source_package_ref": contract["source_package"]["package_ref"],
                "claim_refs": copy.deepcopy(row.get("claim_refs", [])),
                "claims": copy.deepcopy(claims),
                "evidence_links": copy.deepcopy(evidence),
                "sources": copy.deepcopy(sources),
                "uncertainty_refs": copy.deepcopy(row.get("uncertainty_refs", [])),
                "uncertainties": [
                    copy.deepcopy(uncertainty_by_id[ref])
                    for ref in row.get("uncertainty_refs", [])
                    if ref in uncertainty_by_id
                ],
                "event_item_id": f"m5:event:{row['presence_id']}",
                "presence_item_id": f"m5:presence:{row['presence_id']}",
                "refinement_level": "major_anchor",
            }
        )

    romagna_presences = copy.deepcopy(base_life_path["presences"])
    for presence in romagna_presences:
        presence["detail_segment_ref"] = "trajectory-leonardo-romagna-1502"
        presence["refinement_level"] = "fine_presence"
        presence["source_package_ref"] = "fixtures/world_slices/leonardo_romagna_1502/v1"

    presences = major_presences[:3] + romagna_presences + major_presences[3:]
    for index, presence in enumerate(presences):
        presence["index"] = index
    time_axis = _build_life_path_time_axis(presences)
    if time_axis["axis_kind"] != "year" or time_axis["values"] != [
        str(year) for year in range(1452, 1520)
    ]:
        raise SpikeBuildError("M5 whole-life axis must close exactly 1452–1519 by year")

    transition_by_id = {
        transition["transition_id"]: transition for transition in package.get("transitions", [])
    }
    base_transition_by_id = {
        transition["transition_id"]: transition
        for transition in base_life_path.get("transitions", [])
    }
    transition_sequence = [
        ("transition-vinci-to-florence-unknown", 0, 1, transition_by_id),
        ("transition-florence-to-milan-i-unknown", 1, 2, transition_by_id),
        ("transition-milan-i-to-romagna-unknown", 2, 3, transition_by_id),
        ("transition-rimini-cesena", 3, 4, base_transition_by_id),
        ("transition-cesena-cesenatico", 4, 5, base_transition_by_id),
        ("transition-cesenatico-imola", 5, 6, base_transition_by_id),
        ("transition-romagna-to-florence-ii-unknown", 6, 7, transition_by_id),
        ("transition-florence-ii-to-milan-ii-unknown", 7, 8, transition_by_id),
        ("transition-milan-ii-to-rome-unknown", 8, 9, transition_by_id),
        ("transition-rome-to-amboise-unknown", 9, 10, transition_by_id),
    ]
    transitions: list[dict[str, Any]] = []
    for transition_id, from_index, to_index, source in transition_sequence:
        if transition_id not in source:
            raise SpikeBuildError(f"M5 transition closure lost {transition_id}")
        original = source[transition_id]
        if original.get("route_geometry") is not None or original.get("geometry") is not None:
            raise SpikeBuildError(f"M5 transition {transition_id} acquired route geometry")
        transitions.append(
            {
                "transition_id": transition_id,
                "from_presence_ref": presences[from_index]["presence_id"],
                "to_presence_ref": presences[to_index]["presence_id"],
                "route_status": "unknown_route",
                "route_geometry": None,
                "presentation_connector": None,
            }
        )

    base_view = next(
        view
        for view in base_life_path["views"]
        if view["view_id"] == base_life_path["default_view_id"]
    )
    all_layers = sorted(base_state.get("active_layer_refs") or [])
    views: list[dict[str, Any]] = []
    for start_index in range(len(presences)):
        for end_index in range(start_index, len(presences)):
            first = presences[start_index]
            last = presences[end_index]
            state = copy.deepcopy(base_state)
            state["state_id"] = f"{base_state['state_id']}--m5-life-path-{start_index}-{end_index}"
            state["active_layer_refs"] = all_layers
            state["temporal_selection"] = {
                "mode": "instant" if start_index == end_index else "interval",
                "start": first["temporal"]["start"],
                "end": last["temporal"]["end"],
                "precision": "source_native" if start_index == end_index else "range",
                "calendar": "proleptic_gregorian",
            }
            views.append(
                {
                    "view_id": f"life-path-{start_index}-{end_index}",
                    "start_index": start_index,
                    "end_index": end_index,
                    "visible_presence_ids": [
                        presence["presence_id"]
                        for presence in presences[start_index : end_index + 1]
                    ],
                    "state": state,
                    "projection": copy.deepcopy(base_view["projection"]),
                    "globe": copy.deepcopy(base_view["globe"]),
                }
            )

    macro_periods = [
        _macro_period_axis(period, first_year=1452)
        for period in package.get("macro_periods", [])
    ]
    return {
        "schema_version": "1.0.0",
        "proof_ref": contract["proof_id"],
        "path_id": "leonardo-whole-life-runtime-proof-v1",
        "available": True,
        "presentation_only": True,
        "scope_status": "m5_whole_life_runtime_proof_not_canonical_publication",
        "subject_ref": base_life_path["subject_ref"],
        "subject_label": base_life_path["subject_label"],
        "trajectory_ref": package["trajectory"]["trajectory_id"],
        "source_package_ref": contract["source_package"]["package_ref"],
        "coverage": {
            "start": "1452-04-15",
            "end": "1519-05-02",
            "scope_label": "Whole-life proof · 1452–1519 · 11 reviewed Presence anchors",
            "complete_life": True,
            "complete_itinerary": False,
            "step_granularity": "year",
            "absence_semantics": contract["coverage"]["absence_semantics"],
        },
        "default_mode": "range",
        "time_axis": time_axis,
        "default_view_id": "life-path-0-10",
        "macro_periods": macro_periods,
        "progressive_refinement": {
            "default_level": "major_periods_and_all_reviewed_anchors",
            "fine_segment_ref": "trajectory-leonardo-romagna-1502",
            "fine_presence_count": 4,
        },
        "route_policy": {
            "status": "unknown_route",
            "geometry": None,
            "historical_route_geometry_permitted": False,
            "chronological_connector_permitted": True,
            "chronological_connector_is_route": False,
        },
        "manual_exit_decisions": copy.deepcopy(contract["manual_exit_decisions"]),
        "presences": presences,
        "transitions": transitions,
        "views": views,
    }


def _assert_gate_d_place_anchor_projection(
    projection: dict[str, Any], globe: dict[str, Any]
) -> None:
    geometry_by_ref = {
        str(geometry.get("geometry_ref")): geometry
        for geometry in projection.get("geometries", [])
    }
    for geometry in geometry_by_ref.values():
        if geometry.get("origin_kind") != "place_reference_anchor":
            raise SpikeBuildError(
                "Gate D projection may resolve only present-day place reference anchors"
            )
        if geometry.get("spatial_precision") != "named_settlement":
            raise SpikeBuildError("place reference anchor lost named-settlement precision")
        if geometry.get("geometry", {}).get("type") != "Point":
            raise SpikeBuildError("place reference anchor must remain a Point")

    for primitive in globe.get("primitives", []):
        if primitive.get("geometry_ref") not in geometry_by_ref:
            raise SpikeBuildError("Globe primitive escapes Gate D place anchor geometry")
        if primitive.get("primitive_kind") != "cartographic_point":
            raise SpikeBuildError("Gate D place anchor primitive must remain a point")


def build_spike(
    output: Path,
    *,
    dataset: str = DEFAULT_DATASET,
    public_preview: bool = False,
) -> dict[str, Any]:
    world, state, source_root = _load_semantic_inputs(dataset)
    state = copy.deepcopy(state)
    state["active_layer_refs"] = sorted(state.get("active_layer_refs") or [])
    projection_schema = _load(PROJECTION_SCHEMA_PATH)
    asset_manifest = _load(ASSET_MANIFEST_PATH)
    asset_schema = _load(ASSET_SCHEMA_PATH)
    evaluation = _load(ENGINE_EVALUATION_PATH)
    acceptance_profiles = _load(ACCEPTANCE_PROFILES_PATH)
    earth_context = _load(EARTH_CONTEXT_PATH)
    capability_path = _load(CAPABILITY_PATH)
    life_path_presentation = _load(LIFE_PATH_PRESENTATION_PATH)
    major_life_package = _load(MAJOR_LIFE_PACKAGE_PATH)
    major_life_runtime_anchors = _load(MAJOR_LIFE_RUNTIME_ANCHORS_PATH)
    m5_contract = _load(M5_CONTRACT_PATH)

    asset_errors = validate_manifest(asset_manifest, schema=asset_schema, world=world)
    if asset_errors:
        raise SpikeBuildError("invalid geospatial asset manifest: " + "; ".join(asset_errors))
    selected_engine = _validate_engine_evaluation(evaluation)
    _validate_acceptance_profiles(acceptance_profiles)
    _validate_capability_path(capability_path)
    _validate_earth_context(earth_context, asset_manifest)

    projection, _maplibre_adapter, globe_adapter = build_all(
        world, state, projection_schema
    )
    explorer_views = _build_explorer_views(
        world=world,
        base_state=state,
        projection_schema=projection_schema,
        dataset=dataset,
    )

    if "Relation" not in projection.get("deferred_object_types", []):
        raise SpikeBuildError("runtime spike requires Relation rendering to remain deferred")
    if globe_adapter.get("vertical_semantics") != "not_modeled":
        raise SpikeBuildError("#343 must not introduce World Model vertical history")

    trajectory_gaps = [
        item
        for item in projection.get("items", [])
        if item.get("semantic_flags", {}).get("segment_kind") == "inferred_gap"
    ]
    if not trajectory_gaps:
        raise SpikeBuildError("runtime dataset must expose at least one trajectory gap")
    if any(
        item.get("spatial_status") != "unresolved" or item.get("geometry_refs")
        for item in trajectory_gaps
    ):
        raise SpikeBuildError("trajectory gaps must remain unresolved and geometry-free")

    if dataset == "contract_fixture":
        required_primitives = {
            ("event-far-observation", None),
            ("region-fixture-basin", "region-geometry-v2"),
            ("region-fixture-basin", "region-geometry-v2-alternative"),
        }
        actual_primitives = {
            (item.get("object_ref"), item.get("subobject_ref"))
            for item in globe_adapter.get("primitives", [])
        }
        if not required_primitives.issubset(actual_primitives):
            raise SpikeBuildError("contract fixture lost required renderer primitives")
    else:
        if world.get("historical_corpus_ready") is not False:
            raise SpikeBuildError("Gate D package must remain not historical-ready")
        if world.get("promotion_allowed") is not False:
            raise SpikeBuildError("Gate D package must remain non-promotable")
        _assert_gate_d_place_anchor_projection(projection, globe_adapter)
        resolved_anchor_places = {
            geometry.get("owner_ref") for geometry in projection.get("geometries", [])
        }
        if resolved_anchor_places != {
            "place-rimini",
            "place-cesena",
            "place-cesenatico",
            "place-imola",
        }:
            raise SpikeBuildError("Gate D projection must resolve exactly four place anchors")
        region_items = [
            item for item in projection.get("items", []) if item.get("object_type") == "Region"
        ]
        if {item.get("subobject_ref") for item in region_items} != {
            "region-version-borgia-romagna-1502",
            "region-version-documented-place-only-1502",
        }:
            raise SpikeBuildError("Gate C Region alternatives were not preserved")
        if any(item.get("spatial_status") != "unresolved" for item in region_items):
            raise SpikeBuildError("Gate C Region alternatives must remain unresolved")

    knowledge_index = _build_knowledge_index(world, projection)
    base_life_path = _build_life_path_presentation(
        world=world,
        base_state=state,
        base_projection=projection,
        projection_schema=projection_schema,
        presentation=life_path_presentation,
        dataset=dataset,
    )
    life_path = _build_m5_whole_life_path(
        base_life_path=base_life_path,
        base_state=state,
        package=major_life_package,
        anchors=major_life_runtime_anchors,
        contract=m5_contract,
    )
    knowledge_item_ids = {
        record["item_id"] for record in knowledge_index["records"]
    }
    missing_view_records = sorted(
        {
            item["item_id"]
            for view in explorer_views["views"]
            for item in view["projection"].get("items", [])
        }
        - knowledge_item_ids
    )
    if missing_view_records:
        raise SpikeBuildError(
            f"precomputed views escape master knowledge closure: {missing_view_records}"
        )

    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)

    template = (TEMPLATE_DIR / "index.html.template").read_text(encoding="utf-8")
    preview_status = (
        "Public research prototype · not a validated product"
        if public_preview
        else "Generated review artifact — not a public capability"
    )
    preview_nav = (
        '<a class="preview-nav-link" href="../atlas/">Architecture Atlas · compatibility</a>'
        if public_preview
        else ""
    )
    (output / "index.html").write_text(
        template.replace("{{PUBLIC_PREVIEW_STATUS}}", preview_status).replace(
            "{{PUBLIC_PREVIEW_NAV}}", preview_nav
        ),
        encoding="utf-8",
    )
    shutil.copyfile(TEMPLATE_DIR / "runtime.js", output / "runtime.js")
    shutil.copyfile(TEMPLATE_DIR / "localization.js", output / "localization.js")
    shutil.copyfile(TEMPLATE_DIR / "style.css", output / "style.css")

    _write_json(output / "projection.json", projection)
    _write_json(output / "globe-projection.json", globe_adapter)
    _write_json(output / "explorer-state.json", state)
    _write_json(output / "explorer-views.json", explorer_views)
    _write_json(output / "geospatial-assets.json", asset_manifest)
    _write_json(output / "earth-context.geojson", earth_context)
    _write_json(output / "capability-path.geojson", capability_path)
    _write_json(output / "engine-evaluation.json", evaluation)
    _write_json(output / "acceptance-profiles.json", acceptance_profiles)
    _write_json(output / "knowledge-index.json", knowledge_index)
    _write_json(output / "life-path.json", life_path)
    copied_source_sha256 = _copy_local_sources(
        world, output, source_root=source_root
    )

    metadata = {
        "schema_version": "1.0.0",
        "spike_id": SPIKE_ID,
        "build_contract_date": "2026-08-13",
        "semantic_dataset": dataset,
        "engine_id": selected_engine["engine_id"],
        "engine_family": selected_engine["engine_family"],
        "world_slice_ref": state["world_slice_ref"],
        "explorer_state_ref": state["state_id"],
        "projection_id": projection["projection_id"],
        "semantic_item_count": len(projection.get("items", [])),
        "globe_primitive_count": len(globe_adapter.get("primitives", [])),
        "knowledge_record_count": len(knowledge_index["records"]),
        "life_path_available": life_path.get("available") is True,
        "life_path_presence_count": len(life_path.get("presences", [])),
        "life_path_transition_count": len(life_path.get("transitions", [])),
        "life_path_view_count": len(life_path.get("views", [])),
        "life_path_chronological_connector_enabled": (
            life_path.get("route_policy", {}).get(
                "chronological_connector_permitted"
            )
            is True
        ),
        "explorer_view_count": len(explorer_views["views"]),
        "temporal_preset_count": len(explorer_views["temporal_presets"]),
        "unresolved_item_count": len(
            [item for item in projection.get("items", []) if item.get("spatial_status") == "unresolved"]
        ),
        "place_anchor_geometry_count": len(
            [
                geometry
                for geometry in projection.get("geometries", [])
                if geometry.get("origin_kind") == "place_reference_anchor"
            ]
        ),
        "trajectory_gaps": [
            {
                "object_ref": item["object_ref"],
                "subobject_ref": item["subobject_ref"],
                "spatial_status": item["spatial_status"],
                "geometry_refs": item["geometry_refs"],
                "uncertainty_refs": item["uncertainty_refs"],
            }
            for item in trajectory_gaps
        ],
        "terrain": _terrain_runtime_status(asset_manifest),
        "earth_context": _earth_context_runtime_status(earth_context, asset_manifest),
        "capability_path_is_semantic": False,
        "backend_required": False,
        "public_pages_entrypoint": public_preview,
        "deployment_mode": (
            "public_r_and_d_preview" if public_preview else "isolated_review_artifact"
        ),
        "browser_acceptance_profile_count": len(acceptance_profiles.get("profiles", [])),
        "input_sha256": {
            "world_model": _sha(world),
            "explorer_state": _sha(state),
            "geospatial_assets": _sha(asset_manifest),
            "engine_evaluation": _sha(evaluation),
            "acceptance_profiles": _sha(acceptance_profiles),
            "earth_context": _sha(earth_context),
            "capability_path": _sha(capability_path),
            "life_path_presentation": _sha(life_path_presentation),
            "major_life_package": _sha(major_life_package),
            "major_life_runtime_anchors": _sha(major_life_runtime_anchors),
            "m5_contract": _sha(m5_contract),
            "source_documents": copied_source_sha256,
        },
        "generated_sha256": {
            "neutral_projection": _sha(projection),
            "globe_projection": _sha(globe_adapter),
            "knowledge_index": _sha(knowledge_index),
            "explorer_views": _sha(explorer_views),
            "life_path": _sha(life_path),
        },
    }
    _write_json(output / "build-meta.json", metadata)

    runtime_boundary = (
        "This generated directory is deployed as a public R&D preview. It is not a product-ready ARTEMIS capability.\n"
        if public_preview
        else "This directory is generated. It is not the public ARTEMIS runtime.\n"
    )
    (output / "README.txt").write_text(
        "ARTEMIS source-aware Globe Gate D review artifact (#355)\n\n"
        + runtime_boundary
        + "Serve it with any static HTTP server, for example:\n\n"
        f"  python -m http.server 8080 --directory {output}\n\n"
        "Then open http://127.0.0.1:8080/ in a browser.\n"
        "Network access is required only to load the pinned MapLibre GL JS engine from unpkg.\n"
        "Earth context is the bundled Natural Earth 1:110m Land v4.0.0 present-day reference layer.\n"
        "It is real physical-geography context, not historical reconstruction; terrain remains synthetic/non-live.\n"
        "The default semantic input is the frozen, non-public Leonardo Gate C package.\n"
        "Its historical Claims remain draft/rejected, all historical geometry remains withheld, and promotion is not allowed.\n"
        "Nine CC0 Wikidata points are present-day place references only; exact historical positions remain unknown.\n"
        "M5 composes seven reviewed major-life Presence candidates with the frozen four-Presence Romagna segment.\n"
        "Leonardo Life Path offers year-scaled Range and Scrub views across 1452–1519.\n"
        "Dashed chronology links and directional cues are renderer-only time-order presentation; historical travel routes remain unknown and route geometry remains null.\n"
        "The six macro periods are presentation-only progressive-refinement controls, not continuous residence claims.\n",
        encoding="utf-8",
    )

    present = {path.name for path in output.iterdir() if path.is_file()}
    missing = sorted(REQUIRED_OUTPUT_FILES - present)
    if missing:
        raise SpikeBuildError(f"build missing required files: {missing}")
    return metadata


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "build" / "globe-spike",
        help="generated artifact directory (default: build/globe-spike)",
    )
    parser.add_argument(
        "--dataset",
        choices=sorted(DATASET_CHOICES),
        default=DEFAULT_DATASET,
        help="semantic input package (default: frozen Leonardo Gate C package)",
    )
    parser.add_argument(
        "--public-preview",
        action="store_true",
        help="mark the generated artifact as a public R&D preview entrypoint",
    )
    args = parser.parse_args()

    try:
        metadata = build_spike(
            args.output.resolve(),
            dataset=args.dataset,
            public_preview=args.public_preview,
        )
        print(
            "[PASS] Globe runtime spike build: "
            f"engine={metadata['engine_id']}; "
            f"primitives={metadata['globe_primitive_count']}; "
            f"unresolved={metadata['unresolved_item_count']}; "
            f"output={args.output.resolve()}"
        )
        return 0
    except (SpikeBuildError, KeyError, TypeError, ValueError, OSError) as exc:
        print(f"[FAIL] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
