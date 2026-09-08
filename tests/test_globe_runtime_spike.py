import hashlib
import json
import subprocess
from pathlib import Path

import pytest

from scripts.build_globe_spike import (
    ACCEPTANCE_PROFILES_PATH,
    ASSET_MANIFEST_PATH,
    CAPABILITY_PATH,
    DEFAULT_DATASET,
    EARTH_CONTEXT_PATH,
    ENGINE_EVALUATION_PATH,
    EXPECTED_ENGINE,
    ROOT,
    WORLD_PATH,
    _build_life_path_time_axis,
    build_spike,
    _validate_acceptance_profiles,
    SpikeBuildError,
)
from scripts.build_leonardo_gate_d_inputs import build_gate_d_inputs
from scripts import build_leonardo_gate_d_inputs as gate_d_inputs


RUNTIME_JS = ROOT / "scripts" / "globe_spike" / "runtime.js"
HTML_TEMPLATE = ROOT / "scripts" / "globe_spike" / "index.html.template"


@pytest.mark.parametrize("public_preview", [False, True])
def test_generated_presentation_and_evidence_truth(tmp_path, public_preview):
    output = tmp_path / "globe"
    metadata = build_spike(output, public_preview=public_preview)
    html = (output / "index.html").read_text()
    readme = (output / "README.txt").read_text()
    profiles = (output / "acceptance-profiles.json").read_text()
    assert "numbered place" not in html.lower()
    assert 'id="scrub-start"' not in html
    assert "No transition connector is rendered" not in readme
    assert "renderer-only time-order presentation" in readme
    assert "route geometry remains null" in readme
    assert "Public promotion still requires explicit Gate D exit" not in profiles
    assert "not Gate E T1–T5 participant evidence" in profiles
    assert metadata == json.loads((output / "build-meta.json").read_text())


def test_m5_chronology_and_localization_behavior() -> None:
    subprocess.run(["node", "tests/m5_ux_behavior.cjs"], cwd=ROOT, check=True)


def test_open_details_removes_popup_without_mutating_selection_or_url() -> None:
    source = RUNTIME_JS.read_text(encoding="utf-8")
    function = "function openDetailsDrawer" + source.split(
        "function openDetailsDrawer", 1
    )[1].split("function showPresencePopup", 1)[0]
    harness = r"""
const assert = require('node:assert/strict');
let removed = 0;
let focused = 0;
let rendered = null;
const presence = {presence_id: 'presence-test'};
const runtime = {
  data: {lifePath: {presences: [presence]}},
  selectedPresenceId: presence.presence_id,
  selectedItemId: 'event-test',
  popupPresenceId: presence.presence_id,
  lifePathPopup: {remove() { removed += 1; }}
};
const stateBefore = JSON.stringify(runtime.data);
const window = {location: {href: 'https://example.test/?presence=presence-test'}};
const urlBefore = window.location.href;
const inspector = {hidden: true};
const document = {documentElement: {dataset: {}}};
function byId(id) {
  return id === 'inspector' ? inspector : {focus() { focused += 1; }};
}
function renderLifePathPresence(value) { rendered = value; }
"""
    assertions = r"""
openDetailsDrawer('missing');
assert.equal(removed, 0);
assert.equal(inspector.hidden, true);
openDetailsDrawer(presence.presence_id);
assert.equal(removed, 1);
assert.equal(runtime.lifePathPopup, null);
assert.equal(runtime.popupPresenceId, null);
assert.equal(inspector.hidden, false);
assert.equal(document.documentElement.dataset.artemisDetailsOpen, 'true');
assert.equal(rendered, presence);
assert.equal(focused, 1);
assert.equal(runtime.selectedPresenceId, presence.presence_id);
assert.equal(runtime.selectedItemId, 'event-test');
assert.equal(JSON.stringify(runtime.data), stateBefore);
assert.equal(window.location.href, urlBefore);
openDetailsDrawer(presence.presence_id, {focus: false});
assert.equal(removed, 1);
assert.equal(focused, 1);
"""
    subprocess.run(["node", "-e", harness + function + assertions], check=True)


def _load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def test_life_path_time_axis_uses_years_for_whole_life_coverage() -> None:
    presences = [
        {"temporal": {"start": "1452", "end": "1452"}},
        {"temporal": {"start": "1519", "end": "1519"}},
    ]

    axis = _build_life_path_time_axis(presences)

    assert axis["axis_kind"] == "year"
    assert axis["values"][0] == "1452"
    assert axis["values"][-1] == "1519"
    assert presences[0]["axis_start_index"] == 0
    assert presences[1]["axis_end_index"] == 67


def test_engine_evaluation_selects_maplibre_with_all_required_criteria_pass() -> None:
    evaluation = _load(ENGINE_EVALUATION_PATH)
    assert evaluation["selected_engine_id"] == EXPECTED_ENGINE
    required = {
        item["id"] for item in evaluation["criteria"] if item["required"] is True
    }
    selected = next(
        candidate
        for candidate in evaluation["candidates"]
        if candidate["engine_id"] == EXPECTED_ENGINE
    )
    assert all(selected["criteria"][criterion] == "pass" for criterion in required)
    assert selected["decision"] == "selected_for_spike"


def test_builder_creates_isolated_static_artifact(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    metadata = build_spike(output)

    expected = {
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
    assert {path.name for path in output.iterdir() if path.is_file()} == expected
    assert metadata["engine_id"] == EXPECTED_ENGINE
    assert metadata["backend_required"] is False
    assert metadata["public_pages_entrypoint"] is False
    assert metadata["deployment_mode"] == "isolated_review_artifact"
    assert metadata["capability_path_is_semantic"] is False
    assert metadata["knowledge_record_count"] == metadata["semantic_item_count"]
    assert metadata["explorer_view_count"] == 96
    assert metadata["temporal_preset_count"] == 6
    assert metadata["life_path_available"] is True
    assert metadata["life_path_presence_count"] == 11
    assert metadata["life_path_transition_count"] == 10
    assert metadata["life_path_view_count"] == 66
    assert metadata["life_path_chronological_connector_enabled"] is True
    assert metadata["browser_acceptance_profile_count"] == 3
    assert metadata["semantic_dataset"] == DEFAULT_DATASET
    assert not (output / "sources").exists()


def test_builder_marks_public_review_preview_without_changing_semantics(tmp_path: Path) -> None:
    output = tmp_path / "public-globe-preview"
    metadata = build_spike(output, public_preview=True)
    index = (output / "index.html").read_text(encoding="utf-8")

    assert metadata["public_pages_entrypoint"] is True
    assert metadata["deployment_mode"] == "public_r_and_d_preview"
    assert metadata["backend_required"] is False
    assert metadata["semantic_dataset"] == DEFAULT_DATASET
    assert "Public research prototype" in index
    assert 'href="../atlas/"' in index
    assert "Architecture Atlas · compatibility" in index
    assert "2D-карта" not in index
    assert "{{PUBLIC_PREVIEW_STATUS}}" not in index
    assert "{{PUBLIC_PREVIEW_NAV}}" not in index


def test_generated_runtime_uses_shared_world_slice_state_and_projection(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    build_spike(output)

    meta = _load(output / "build-meta.json")
    state = _load(output / "explorer-state.json")
    projection = _load(output / "projection.json")
    globe = _load(output / "globe-projection.json")

    assert meta["world_slice_ref"] == state["world_slice_ref"]
    assert meta["explorer_state_ref"] == state["state_id"]
    assert meta["projection_id"] == projection["projection_id"]
    assert globe["projection_id"] == projection["projection_id"]
    assert globe["source"]["explorer_state_ref"] == state["state_id"]
    assert globe["vertical_semantics"] == "not_modeled"


def test_life_path_presentation_is_calendar_scaled_and_route_geometry_free(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    build_spike(output)
    life_path = _load(output / "life-path.json")

    assert life_path["available"] is True
    assert life_path["presentation_only"] is True
    assert life_path["subject_ref"] == "entity-leonardo-da-vinci"
    assert life_path["trajectory_ref"] == "trajectory-leonardo-major-life-v1"
    assert life_path["scope_status"] == "m5_whole_life_runtime_proof_not_canonical_publication"
    assert life_path["coverage"]["complete_life"] is True
    assert life_path["coverage"]["complete_itinerary"] is False
    assert life_path["route_policy"] == {
        "status": "unknown_route",
        "geometry": None,
        "historical_route_geometry_permitted": False,
        "chronological_connector_permitted": True,
        "chronological_connector_is_route": False,
    }
    assert life_path["time_axis"]["axis_kind"] == "year"
    assert life_path["time_axis"]["values"][0] == "1452"
    assert life_path["time_axis"]["values"][-1] == "1519"
    assert len(life_path["time_axis"]["values"]) == 68
    assert [presence["place_ref"] for presence in life_path["presences"]] == [
        "place-vinci",
        "place-florence",
        "place-milan",
        "place-rimini",
        "place-cesena",
        "place-cesenatico",
        "place-imola",
        "place-florence",
        "place-milan",
        "place-vatican-belvedere",
        "place-clos-luce",
    ]
    assert {presence["coordinate_role"] for presence in life_path["presences"]} == {
        "present_day_settlement_reference",
        "present_day_place_reference",
    }
    assert all(presence["historical_location_precision"].endswith("_unknown") for presence in life_path["presences"])
    assert all("short_description" in presence for presence in life_path["presences"])
    assert len(life_path["transitions"]) == 10
    assert all(transition["route_status"] == "unknown_route" for transition in life_path["transitions"])
    assert all(transition["route_geometry"] is None for transition in life_path["transitions"])
    assert all(transition["presentation_connector"] is None for transition in life_path["transitions"])
    assert len(life_path["macro_periods"]) == 6
    assert len(life_path["views"]) == 66
    assert life_path["default_view_id"] == "life-path-0-10"
    assert life_path["manual_exit_decisions"] == ["ITERATE", "NARROW", "STOP"]


def test_precomputed_views_use_source_native_time_and_projection_semantics(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    build_spike(output)
    views = _load(output / "explorer-views.json")
    knowledge = _load(output / "knowledge-index.json")

    assert [preset["preset_id"] for preset in views["temporal_presets"]] == [
        "full-slice",
        "rimini-1502-08-08",
        "cesena-1502-08-10",
        "patent-1502-08-18",
        "cesenatico-1502-09-06",
        "imola-autumn-1502",
    ]
    assert views["temporal_presets"][-1]["temporal_selection"] == {
        "mode": "interval",
        "start": "1502-09",
        "end": "1502-11",
        "precision": "month",
        "calendar": "proleptic_gregorian",
    }
    assert len(views["layer_options"]) == 4
    assert len(views["views"]) == 6 * (2 ** 4)

    knowledge_ids = {record["item_id"] for record in knowledge["records"]}
    for view in views["views"]:
        state = view["state"]
        projection = view["projection"]
        globe = view["globe"]
        assert state["active_layer_refs"] == view["active_layer_refs"]
        assert projection["source"]["explorer_state_ref"] == state["state_id"]
        assert projection["temporal_selection"] == state["temporal_selection"]
        assert globe["source"]["explorer_state_ref"] == state["state_id"]
        assert all(
            geometry["origin_kind"] == "place_reference_anchor"
            and geometry["spatial_precision"] == "named_settlement"
            and geometry["geometry"]["type"] == "Point"
            for geometry in projection["geometries"]
        )
        assert all(
            primitive["primitive_kind"] == "cartographic_point"
            for primitive in globe["primitives"]
        )
        assert {item["item_id"] for item in projection["items"]} <= knowledge_ids
        assert "Relation" in projection["deferred_object_types"]

    empty_layer_views = [view for view in views["views"] if not view["active_layer_refs"]]
    assert len(empty_layer_views) == 6
    assert all(view["projection"]["items"] == [] for view in empty_layer_views)


def test_temporal_views_change_membership_without_invented_intermediate_dates(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    build_spike(output)
    views = _load(output / "explorer-views.json")
    all_layers = {option["layer_ref"] for option in views["layer_options"]}

    def object_refs(preset_id: str) -> set[str]:
        view = next(
            item for item in views["views"]
            if item["temporal_preset_id"] == preset_id
            and set(item["active_layer_refs"]) == all_layers
        )
        return {item["object_ref"] for item in view["projection"]["items"]}

    rimini = object_refs("rimini-1502-08-08")
    cesena = object_refs("cesena-1502-08-10")
    autumn = object_refs("imola-autumn-1502")
    assert "event-leonardo-rimini-note" in rimini
    assert "event-leonardo-rimini-note" not in cesena
    assert "event-leonardo-cesena-survey" in cesena
    assert "event-leonardo-imola-map-context" in autumn
    assert "event-leonardo-imola-map-context" not in rimini
    assert "event-ottoman-turkmen-displacement-1502" in rimini & cesena & autumn


def test_default_adapter_preserves_frozen_gate_c_boundary_with_context_overlay() -> None:
    world, state = build_gate_d_inputs()

    object_ids = {
        item["id"]
        for collection in ("entities", "events", "states", "processes", "trajectories", "regions")
        for item in world[collection]
    }
    assert len(object_ids) == 17
    assert len(world["claims"]) == 26
    assert len(world["evidence_links"]) == 42
    assert len(world["sources"]) == 11
    assert len(world["uncertainties"]) == 12
    assert len(world["place_anchors"]) == 4
    assert world["gate_d_context_overlay_ref"] == "gate-d-leonardo-place-anchors-v1"
    assert {item["review_state"] for item in world["claims"]} == {"draft", "rejected"}
    assert world["relations"] == []
    assert world["derived_observations"] == []
    assert world["corpus_status_label"] == (
        "frozen Gate C candidate package · non-public · draft/rejected Claims"
    )
    assert world["historical_corpus_ready"] is False
    assert world["promotion_allowed"] is False
    assert world["gate_c_decision"]["decision"] == "FREEZE"
    assert world["gate_c_decision"]["promotion_allowed"] is False
    trajectory = next(
        item
        for item in world["trajectories"]
        if item["id"] == "trajectory-leonardo-romagna-1502"
    )
    assert trajectory["subject_ref"] == "entity-leonardo-da-vinci"
    assert state["world_slice_ref"] == "world-slice-leonardo-romagna-1502-v1"
    assert state["dataset_identity"] == world["world_slice"]["dataset_identity"]
    assert state["temporal_selection"] == {
        "mode": "interval",
        "start": "1502-08-08",
        "end": "1502-12-31",
        "precision": "day",
        "calendar": "proleptic_gregorian",
    }


def test_place_anchor_registry_is_fail_closed_and_source_bound(tmp_path: Path, monkeypatch) -> None:
    registry = _load(gate_d_inputs.PLACE_ANCHOR_PATH)
    assert {anchor["place_ref"] for anchor in registry["anchors"]} == {
        "place-rimini",
        "place-cesena",
        "place-cesenatico",
        "place-imola",
    }
    assert registry["coordinate_reference"] == "EPSG:4326"
    assert registry["source"]["rights"]["license"] == "CC0-1.0"
    assert all(
        anchor["spatial_precision"] == "named_settlement"
        and anchor["historical_location_precision"]
        == "exact_position_within_named_settlement_unknown"
        and anchor["semantic_role"] == "present_day_settlement_reference"
        for anchor in registry["anchors"]
    )

    invalid = json.loads(json.dumps(registry))
    invalid["anchors"] = invalid["anchors"][:-1]
    invalid_path = tmp_path / "invalid-place-anchors.json"
    invalid_path.write_text(json.dumps(invalid), encoding="utf-8")
    monkeypatch.setattr(gate_d_inputs, "PLACE_ANCHOR_PATH", invalid_path)
    with pytest.raises(gate_d_inputs.GateDInputError, match="place anchor registry"):
        gate_d_inputs.build_gate_d_inputs()


def test_default_projection_resolves_only_named_settlement_anchors(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    metadata = build_spike(output)
    projection = _load(output / "projection.json")
    globe = _load(output / "globe-projection.json")

    assert metadata["semantic_dataset"] == "leonardo_gate_c"
    assert metadata["semantic_item_count"] == 24
    assert metadata["globe_primitive_count"] == 8
    assert metadata["place_anchor_geometry_count"] == 4
    assert len(projection["geometries"]) == 4
    assert {
        geometry["owner_ref"] for geometry in projection["geometries"]
    } == {"place-rimini", "place-cesena", "place-cesenatico", "place-imola"}
    assert all(
        geometry["origin_kind"] == "place_reference_anchor"
        and geometry["spatial_precision"] == "named_settlement"
        and geometry["geometry"]["type"] == "Point"
        for geometry in projection["geometries"]
    )
    assert all(
        primitive["primitive_kind"] == "cartographic_point"
        for primitive in globe["primitives"]
    )
    leonardo_events = [
        item
        for item in projection["items"]
        if item["object_type"] == "Event"
        and item["object_ref"].startswith("event-leonardo-")
    ]
    assert leonardo_events
    assert all(
        item["spatial_status"] == "unresolved" and item["geometry_refs"] == []
        for item in leonardo_events
    )
    assert any(
        item["object_ref"] == "process-leonardo-romagna-surveying"
        and item["subobject_ref"] is None
        and item["spatial_status"] == "unresolved"
        for item in projection["items"]
    )
    region_items = [
        item for item in projection["items"] if item["object_type"] == "Region"
    ]
    assert {item["subobject_ref"] for item in region_items} == {
        "region-version-borgia-romagna-1502",
        "region-version-documented-place-only-1502",
    }
    assert all(item["spatial_status"] == "unresolved" for item in region_items)


def test_globe_payload_contains_explicit_point_and_region_alternatives(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    build_spike(output, dataset="contract_fixture")
    globe = _load(output / "globe-projection.json")

    primitives = globe["primitives"]
    assert any(
        item["object_ref"] == "event-far-observation"
        and item["primitive_kind"] == "cartographic_point"
        for item in primitives
    )
    assert any(
        item["object_ref"] == "region-fixture-basin"
        and item["subobject_ref"] == "region-geometry-v2"
        and item["geometry_is_primary"] is True
        for item in primitives
    )
    assert any(
        item["object_ref"] == "region-fixture-basin"
        and item["subobject_ref"] == "region-geometry-v2-alternative"
        and item["geometry_is_primary"] is False
        for item in primitives
    )


def test_reviewed_trajectory_gap_remains_unresolved_and_uncertain(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    metadata = build_spike(output)
    projection = _load(output / "projection.json")

    gap = next(
        item
        for item in projection["items"]
        if item["object_ref"] == "trajectory-leonardo-romagna-1502"
        and item["subobject_ref"] == "segment-rimini-cesena-gap"
    )
    assert gap["spatial_status"] == "unresolved"
    assert gap["geometry_refs"] == []
    assert "uncertainty-trajectory-route-gaps" in gap["uncertainty_refs"]
    assert len(metadata["trajectory_gaps"]) == 3
    assert all(item["geometry_refs"] == [] for item in metadata["trajectory_gaps"])


def test_capability_path_cannot_be_mistaken_for_world_model_knowledge() -> None:
    fixture = _load(CAPABILITY_PATH)
    feature = fixture["features"][0]
    properties = feature["properties"]
    assert feature["geometry"]["type"] == "LineString"
    assert properties["capability_only"] is True
    assert properties["semantic_role"] == "renderer_capability_path"
    assert properties["world_model_object_ref"] is None
    assert properties["pick_as_knowledge"] is False
    assert "object_ref" not in properties


def test_spike_source_does_not_read_public_compatibility_data_or_backend() -> None:
    runtime_source = RUNTIME_JS.read_text(encoding="utf-8")
    html_source = HTML_TEMPLATE.read_text(encoding="utf-8")
    combined = runtime_source + "\n" + html_source

    assert "features.geojson" not in combined
    assert "/api/" not in combined
    assert "globe-projection.json" in runtime_source
    assert "explorer-state.json" in runtime_source
    assert "explorer-views.json" in runtime_source
    assert "geospatial-assets.json" in runtime_source
    assert "knowledge-index.json" in runtime_source
    assert "queryRenderedFeatures" in runtime_source
    assert "setProjection({ type: 'globe' })" in runtime_source


def test_knowledge_index_closes_projection_refs_without_fabrication(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    build_spike(output)
    projection = _load(output / "projection.json")
    knowledge = _load(output / "knowledge-index.json")

    assert knowledge["fixture_mode"] == "frozen_gate_c_candidate_package"
    assert knowledge["historical_corpus_ready"] is False
    assert knowledge["promotion_allowed"] is False
    assert "Relation" in knowledge["deferred_object_types"]
    assert {record["item_id"] for record in knowledge["records"]} == {
        item["item_id"] for item in projection["items"]
    }
    assert len({ref for record in knowledge["records"] for ref in record["claim_refs"]}) == 26
    assert len(
        {ref for record in knowledge["records"] for ref in record["evidence_link_refs"]}
    ) == 42

    projected = {item["item_id"]: item for item in projection["items"]}
    for record in knowledge["records"]:
        item = projected[record["item_id"]]
        assert record["object_ref"] == item["object_ref"]
        assert record["subobject_ref"] == item["subobject_ref"]
        assert {claim["id"] for claim in record["claims"]} == set(item["claim_refs"])
        assert {link["id"] for link in record["evidence_links"]} == set(
            item["evidence_link_refs"]
        )
        assert {source["id"] for source in record["sources"]} == set(
            item["source_refs"]
        )
        assert {value["id"] for value in record["uncertainties"]} == set(
            item["uncertainty_refs"]
        )
        for link in record["evidence_links"]:
            assert link["claim_id"] in record["claim_refs"]
            assert link["source_id"] in record["source_refs"]
            assert link["locator"].strip()

    rimini = next(
        record
        for record in knowledge["records"]
        if record["item_id"] == "rp:entity_context:place-rimini"
    )
    assert rimini["spatial_status"] == "resolved"
    assert rimini["geometries"][0]["origin_kind"] == "place_reference_anchor"
    assert rimini["geometries"][0]["spatial_precision"] == "named_settlement"
    assert "claim-rimini-present-day-settlement-anchor" in rimini["claim_refs"]
    assert "source-wikidata-place-anchors" in rimini["source_refs"]
    assert "uncertainty-place-anchor-historical-position" in rimini["uncertainty_refs"]


def test_primary_selection_exposes_claim_source_and_repeatable_locator(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    build_spike(output)
    knowledge = _load(output / "knowledge-index.json")
    record = next(
        item
        for item in knowledge["records"]
        if item["object_ref"] == "event-leonardo-rimini-note"
    )

    assert record["label"] == "Leonardo records the dated Rimini observation"
    assert record["claims"][0]["review_state"] == "draft"
    assert record["claims"][0]["statement"].startswith("Leonardo recorded an observation")
    assert "Manuscript L folio 78r" in record["evidence_links"][0]["locator"]
    assert record["sources"][0]["title"] == "Cronologia vinciana (1502–1503)"
    assert record["sources"][0]["artifact_uri"].startswith("https://press.uniurb.it/")
    assert record["projection_losses"][0]["reason"] == "unknown_spatial_extent"


def test_local_source_artifacts_are_copied_with_reviewed_checksums(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    metadata = build_spike(output, dataset="contract_fixture")
    world = _load(WORLD_PATH)

    expected_checksums = {}
    for source in world["sources"]:
        copied = output / source["uri"]
        assert copied.is_file()
        digest = hashlib.sha256(copied.read_bytes()).hexdigest()
        assert digest == source["sha256"]
        expected_checksums[source["id"]] = digest
    assert metadata["input_sha256"]["source_documents"] == expected_checksums


def test_unresolved_items_are_keyboard_inspectable_through_knowledge_index() -> None:
    runtime_source = RUNTIME_JS.read_text(encoding="utf-8")
    html_source = HTML_TEMPLATE.read_text(encoding="utf-8")

    assert "row.type = 'button'" in runtime_source
    assert "selectKnowledgeItem(item.item_id, { focus: true })" in runtime_source
    assert "renderKnowledgeRecord" in runtime_source
    assert "evidence.locator" in runtime_source
    assert 'id="selection-card"' in html_source
    assert 'tabindex="-1"' in html_source
    assert 'aria-live="polite"' in html_source


def test_gate_d_browser_acceptance_profiles_are_bundled_and_reproducible(tmp_path: Path) -> None:
    profiles = _load(ACCEPTANCE_PROFILES_PATH)
    output = tmp_path / "globe-spike"
    metadata = build_spike(output)

    assert profiles["schema_version"] == "1.1.0"
    assert profiles["evidence_scope"] == "hosted_headless_chromium"
    assert [profile["profile_id"] for profile in profiles["profiles"]] == [
        "desktop",
        "tablet",
        "mobile",
    ]
    assert [profile["browser_window_css_px"] for profile in profiles["profiles"]] == [
        {"width": 1440, "height": 900},
        {"width": 1024, "height": 768},
        {"width": 500, "height": 844},
    ]
    assert profiles["profiles"][-1]["prefers_reduced_motion"] is True
    assert profiles["thresholds"]["min_interactive_target_css_px"] == 24
    assert profiles["thresholds"]["max_unnamed_interactive_controls"] == 0
    assert profiles["thresholds"]["max_overlay_collision_count"] == 0
    assert _load(output / "acceptance-profiles.json") == profiles
    assert metadata["input_sha256"]["acceptance_profiles"]


def test_gate_d_browser_acceptance_contract_fails_closed_on_profile_drift() -> None:
    profiles = _load(ACCEPTANCE_PROFILES_PATH)
    profiles["profiles"][0]["profile_id"] = "wide"

    try:
        _validate_acceptance_profiles(profiles)
    except SpikeBuildError as error:
        assert "ordered desktop/tablet/mobile" in str(error)
    else:
        raise AssertionError("profile identity drift must fail closed")


def test_runtime_exposes_browser_accessibility_layout_and_diagnostic_evidence() -> None:
    runtime_source = RUNTIME_JS.read_text(encoding="utf-8")
    style_source = (ROOT / "scripts" / "globe_spike" / "style.css").read_text(encoding="utf-8")
    workflow_source = (ROOT / ".github" / "workflows" / "globe-runtime-spike.yml").read_text(encoding="utf-8")
    capture_source = (ROOT / "scripts" / "capture_globe_browser_evidence.mjs").read_text(encoding="utf-8")

    assert "collectAcceptanceEvidence" in runtime_source
    assert "artemisRuntimeReady" in runtime_source
    assert "artemisHorizontalOverflow" in runtime_source
    assert "artemisUnnamedControlCount" in runtime_source
    assert "artemisUndersizedTargetCount" in runtime_source
    assert "artemisOverlayCollisionCount" in runtime_source
    assert "artemisStartupRecorded" in runtime_source
    assert "artemisStartupToIdleMs" in runtime_source
    assert "artemisAverageFrameMs" in runtime_source
    assert "button, input, select, a[href], summary" in runtime_source
    assert "node.getClientRects().length > 0" in runtime_source
    assert 'input[type="range"]' in runtime_source
    assert "@media (min-width: 821px) and (max-width: 1100px)" in style_source
    assert 'input[type="range"] { min-height: 30px;' in style_source
    assert ".life-path-marker" in style_source
    assert "verifyEarthContextRender" in runtime_source
    assert "querySourceFeatures('artemis-earth-context')" in runtime_source
    assert "contextRenderedFeatureCount" in runtime_source
    assert 'data-artemis-visual-ready="true"' in workflow_source
    assert "capture_globe_browser_evidence.mjs" in workflow_source
    assert "--virtual-time-budget=15000" not in workflow_source
    assert "Page.captureScreenshot" in capture_source
    assert "waitForVisualReadiness" in capture_source
    assert "artemisContextRenderedFeatureCount" in capture_source
    assert "verifyUrlStateRestoration" in capture_source
    assert "Invalid popstate URL was not canonicalized" in capture_source
    assert "Back navigation did not restore Explorer State" in capture_source
    assert '--verify-url-state "$VERIFY_URL_STATE"' in workflow_source
    assert "/tmp/artemis-globe-browser-*-capture.json" in workflow_source


def test_life_path_timeline_uses_calendar_range_and_scrub() -> None:
    runtime_source = RUNTIME_JS.read_text(encoding="utf-8")
    html_source = HTML_TEMPLATE.read_text(encoding="utf-8")

    assert 'id="range-start" type="range"' in html_source
    assert 'id="range-end" type="range"' in html_source
    assert 'id="timeline-dock"' in html_source
    assert 'id="scrub-start"' not in html_source
    assert 'id="scrub-current" type="range"' in html_source
    assert 'id="mode-range"' in html_source
    assert 'id="mode-scrub"' in html_source
    assert 'id="macro-periods"' in html_source
    assert 'id="layer-controls"' not in html_source
    assert 'role="status" aria-live="polite"' in html_source
    assert 'id="path-sequence"' not in html_source
    assert 'id="inspector" aria-label="Selected place details" hidden' in html_source
    assert "applySemanticView" in runtime_source
    assert "runtime.viewByKey.get" in runtime_source
    assert "semanticSource.setData(globePrimitivesToGeoJson(next.globe))" in runtime_source
    assert "updateCanonicalSelection(projectionItem)" in runtime_source
    assert "function applyLifePathView" in runtime_source
    assert "function selectLifePathPresence" in runtime_source
    assert "function visibleLifePathPresences" in runtime_source
    assert "presence.axis_start_index <= end" in runtime_source
    assert "mode: 'instant'" in runtime_source
    assert "url.searchParams.set('from'" in runtime_source
    assert "url.searchParams.set('at'" in runtime_source
    assert "prefers-reduced-motion: reduce" in runtime_source


def test_marker_selection_uses_popup_drawer_and_double_click_camera_focus() -> None:
    runtime_source = RUNTIME_JS.read_text(encoding="utf-8")
    html_source = HTML_TEMPLATE.read_text(encoding="utf-8")

    assert "function showPresencePopup" in runtime_source
    assert "function openDetailsDrawer" in runtime_source
    assert "function closeDetailsDrawer" in runtime_source
    assert "handlePresenceMarkerClick" in runtime_source
    assert "handlePresenceMarkerDoubleClick" in runtime_source
    assert "markerButton.addEventListener('dblclick'" in runtime_source
    assert "if (options.fly === true && runtime.map)" in runtime_source
    assert 'id="close-details"' in html_source


def test_runtime_removes_noop_controls_and_distinguishes_chronology_from_routes() -> None:
    runtime_source = RUNTIME_JS.read_text(encoding="utf-8")
    html_source = HTML_TEMPLATE.read_text(encoding="utf-8")

    assert 'id="temporal-map-status"' in html_source
    assert "Dashed links and chevrons show time order, not travel routes." in html_source
    assert 'id="toggle-alternatives"' not in html_source
    assert 'id="view-global"' not in html_source
    assert 'id="view-slice"' not in html_source
    assert "addCapabilityPath(map, capabilityPath)" in runtime_source
    assert "else addCapabilityPath(map, capabilityPath)" in runtime_source
    assert "addLifePathMarkers(map)" in runtime_source
    assert "life-path-chronology-line" in runtime_source
    assert "chronological_connector_permitted === true" in runtime_source
    assert "is_historical_route_geometry: false" in runtime_source
    assert "maplibregl.GlobeControl" not in runtime_source


def test_runtime_uses_progressive_disclosure_and_names_its_repository_source() -> None:
    runtime_source = RUNTIME_JS.read_text(encoding="utf-8")
    html_source = HTML_TEMPLATE.read_text(encoding="utf-8")

    assert "Frozen repository review package" in html_source
    assert "does not query Airtable" in html_source
    assert "Sources, limits and prototype status" in html_source
    assert "Sources and uncertainty" in runtime_source
    assert "function renderMacroPeriodControls" in runtime_source
    assert "Reviewed package sources" in runtime_source
    assert "knowledgeDisclosure" in runtime_source
    assert "Claims & evidence" in runtime_source
    assert "Material uncertainty" in runtime_source
    assert "Projection loss" in runtime_source
    assert "Reconstruction alternatives" in runtime_source
    assert "Geometry withheld; not rendered." in runtime_source
    assert "Coverage / corpus limits" in runtime_source
    assert "Missing records or geometry must not be interpreted as historical absence." in runtime_source


def test_runtime_persists_and_restores_explorer_state_in_url() -> None:
    runtime_source = RUNTIME_JS.read_text(encoding="utf-8")

    assert "function syncUrlState()" in runtime_source
    assert "url.searchParams.set('mode'" in runtime_source
    assert "url.searchParams.set('start'" in runtime_source
    assert "url.searchParams.set('end'" in runtime_source
    assert "url.searchParams.set('from'" in runtime_source
    assert "url.searchParams.set('at'" in runtime_source
    assert "url.searchParams.set('presence'" in runtime_source
    assert "dataset.artemisSelectedPresence" in runtime_source
    assert "dataset.artemisSelectedItem" in runtime_source
    assert "url.searchParams.set('time'" in runtime_source
    assert "url.searchParams.set('layers'" in runtime_source
    assert "url.searchParams.set('item'" in runtime_source
    assert "window.history.replaceState" in runtime_source
    assert "function restoreExplorerStateFromUrl()" in runtime_source
    assert "function restoreLifePathStateFromUrl" in runtime_source
    assert "window.addEventListener('popstate', restoreExplorerStateFromUrl)" in runtime_source


def test_maplibre_v5_semantic_layers_use_expression_geometry_type_filters() -> None:
    runtime_source = RUNTIME_JS.read_text(encoding="utf-8")

    assert "'$type'" not in runtime_source
    assert '"$type"' not in runtime_source
    assert runtime_source.count("['geometry-type']") >= 6
    assert "['==', ['geometry-type'], 'Polygon']" in runtime_source
    assert "['==', ['geometry-type'], 'LineString']" in runtime_source
    assert "['==', ['geometry-type'], 'Point']" in runtime_source


def test_spike_pins_maplibre_5_without_upgrading_public_runtime() -> None:
    html_source = HTML_TEMPLATE.read_text(encoding="utf-8")
    public_index = (ROOT / "index.html").read_text(encoding="utf-8")

    assert "maplibre-gl@5.24.0" in html_source
    assert "maplibre-gl@4.7.1" in public_index
    assert "maplibre-gl@5.24.0" not in public_index


def test_runtime_contains_terrain_capability_path_but_no_live_provider_is_selected(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    metadata = build_spike(output)
    runtime_source = RUNTIME_JS.read_text(encoding="utf-8")

    assert "raster-dem" in runtime_source
    assert "map.setTerrain" in runtime_source
    assert metadata["terrain"]["asset_ref"] == "asset-synthetic-present-terrain"
    assert metadata["terrain"]["live_provider_selected"] is False
    assert metadata["terrain"]["status"] == "synthetic_or_nonlive_provider"


def test_real_earth_context_is_bundled_and_remains_nonhistorical(tmp_path: Path) -> None:
    output = tmp_path / "globe-spike"
    metadata = build_spike(output)
    context = _load(output / "earth-context.geojson")
    manifest = _load(output / "geospatial-assets.json")
    context_asset = next(
        asset
        for asset in manifest["assets"]
        if asset["asset_id"] == "asset-natural-earth-110m-land-v4"
    )

    assert ASSET_MANIFEST_PATH.name == "gate_d_runtime.json"
    assert EARTH_CONTEXT_PATH.name == "natural_earth_110m_land.geojson"
    assert manifest["manifest_mode"] == "runtime_configuration"
    assert context["artemis_context"] == {
        "semantic_role": "present_day_context",
        "asset_ref": "asset-natural-earth-110m-land-v4",
        "capability_only": True,
        "historical_validity": None,
        "source_repository": "nvkelso/natural-earth-vector",
        "source_commit_sha": "ca96624a56bd078437bca8184e78163e5039ad19",
        "source_blob_sha": "04811d72fff2701ec67587e30ad8942675b511e3",
        "source_path": "geojson/ne_110m_land.geojson",
        "retrieved_at": "2026-08-14",
    }
    assert len(context["features"]) == 127
    assert all(
        feature["properties"].get("capability_only") is True
        for feature in context["features"]
    )
    assert all(
        feature["properties"].get("semantic_role") == "present_day_context"
        and feature["properties"].get("asset_ref") == context_asset["asset_id"]
        and "object_ref" not in feature["properties"]
        and "world_model_object_ref" not in feature["properties"]
        for feature in context["features"]
    )
    assert context_asset["provenance"]["provenance_kind"] == "open_dataset"
    assert context_asset["temporal_semantics"]["world_model_claim_refs"] == []
    assert context_asset["licensing"]["license_id"] == "PUBLIC-DOMAIN"
    assert context_asset["runtime_policy"]["network_required"] is False
    assert context_asset["runtime_policy"]["secret_required"] is False
    assert metadata["earth_context"] == {
        "asset_ref": "asset-natural-earth-110m-land-v4",
        "provider_id": "provider-natural-earth-bundled-vector",
        "real_dataset_selected": True,
        "status": "bundled_real_vector_context",
        "semantic_role": "present_day_context",
        "network_required": False,
        "secret_required": False,
    }
    assert all(asset["licensing"]["attribution_text"] for asset in manifest["assets"])


def test_build_metadata_is_semantically_reproducible(tmp_path: Path) -> None:
    first = tmp_path / "first"
    second = tmp_path / "second"
    build_spike(first)
    build_spike(second)

    first_meta = _load(first / "build-meta.json")
    second_meta = _load(second / "build-meta.json")
    assert first_meta == second_meta
    assert _load(first / "projection.json") == _load(second / "projection.json")
    assert _load(first / "globe-projection.json") == _load(second / "globe-projection.json")
    assert _load(first / "knowledge-index.json") == _load(second / "knowledge-index.json")
    assert _load(first / "explorer-views.json") == _load(second / "explorer-views.json")
