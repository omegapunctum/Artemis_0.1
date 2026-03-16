import requests
import json
import os

BASE_ID = os.environ["AIRTABLE_BASE"]
TABLE_ID = os.environ["AIRTABLE_TABLE"]
TOKEN = os.environ["AIRTABLE_TOKEN"]

url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}"

headers = {
    "Authorization": f"Bearer {TOKEN}"
}

records = []
offset = None

while True:
    params = {}
    if offset:
        params["offset"] = offset

    r = requests.get(url, headers=headers, params=params)
    data = r.json()

    records.extend(data["records"])
    offset = data.get("offset")

    if not offset:
        break

features = []

for r in records:
    f = r["fields"]

    if str(f.get("is_active", "")).lower() != "true":
        continue

    lon = f.get("longitude")
    lat = f.get("latitude")

    if lon is None or lat is None:
        continue

    features.append({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat]
        },
        "properties": {
            "id": r["id"],
            "name": f.get("name_ru"),
            "layer": f.get("layer_id"),
            "start": f.get("date_start"),
            "end": f.get("date_end"),
            "radius": f.get("influence_radius_km"),
            "desc": f.get("title_short"),
            "architect": f.get("architect"),
            "img": f.get("image_url"),
            "src": f.get("source_url"),
            "tags": f.get("tags")
        }
    })

geojson = {
    "type": "FeatureCollection",
    "features": features
}

os.makedirs("data", exist_ok=True)

with open("data/features.geojson", "w", encoding="utf-8") as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)
