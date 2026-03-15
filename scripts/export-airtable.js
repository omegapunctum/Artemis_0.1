const fs = require("fs");
const axios = require("axios");

const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = process.env.AIRTABLE_BASE;

const TABLE = "Features";

const URL = `https://api.airtable.com/v0/${BASE}/${TABLE}`;

async function fetchAll() {

  let records = [];
  let offset = null;

  while (true) {

    const res = await axios.get(URL, {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      },
      params: { offset }
    });

    records = records.concat(res.data.records);

    if (!res.data.offset) break;

    offset = res.data.offset;
  }

  return records;
}

function toGeoJSON(records) {

  const features = [];

  for (const r of records) {

    const f = r.fields;

    if (!f.latitude || !f.longitude) continue;

    features.push({

      type: "Feature",

      geometry: {
        type: "Point",
        coordinates: [
          parseFloat(f.longitude),
          parseFloat(f.latitude)
        ]
      },

      properties: {
        id: r.id,
        layer_id: f.layer_id,
        layer_type: f.layer_type,
        name_ru: f.name_ru,
        name_en: f.name_en,
        title_short: f.title_short,
        description: f.description,
        architect: f.architect,
        style_label: f.style_label,
        date_start: f.date_start,
        date_construction_end: f.date_construction_end,
        date_end: f.date_end,
        influence_radius_km: f.influence_radius_km,
        sequence_order: f.sequence_order,
        image_url: f.image_url,
        source_url: f.source_url,
        tags: f.tags,
        is_active: f.is_active
      }

    });
  }

  return {
    type: "FeatureCollection",
    features
  };
}

async function run() {

  if (!TOKEN) throw new Error("AIRTABLE_TOKEN missing");
  if (!BASE) throw new Error("AIRTABLE_BASE missing");

  const records = await fetchAll();

  const geojson = toGeoJSON(records);

  if (!fs.existsSync("data")) fs.mkdirSync("data");

  fs.writeFileSync(
    "data/features.json",
    JSON.stringify(records, null, 2)
  );

  fs.writeFileSync(
    "data/features.geojson",
    JSON.stringify(geojson, null, 2)
  );

  console.log("Export complete:", records.length);
}

run();
