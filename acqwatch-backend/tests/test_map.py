"""Tests: GET /api/map/projects"""
import pytest


class TestMap:
    def test_map_geojson_structure(self, client):
        resp = client.get("/api/map/projects")
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "FeatureCollection"
        assert "features" in data
        assert "total_features" in data
        assert "geo_precision_note" in data

    def test_map_all_projects_returned(self, client):
        data = client.get("/api/map/projects").json()
        assert data["total_features"] == 1477

    def test_map_feature_structure(self, client):
        data = client.get("/api/map/projects").json()
        feature = data["features"][0]
        assert feature["type"] == "Feature"
        assert feature["geometry"]["type"] == "Point"
        coords = feature["geometry"]["coordinates"]
        assert len(coords) == 2
        lng, lat = coords
        # Valid Indian geographic bounds
        assert 68.0 <= lng <= 98.0
        assert 8.0 <= lat <= 38.0

    def test_map_no_invalid_coordinates(self, client):
        data = client.get("/api/map/projects").json()
        for f in data["features"]:
            coords = f["geometry"]["coordinates"]
            assert coords[0] is not None and coords[1] is not None
            assert isinstance(coords[0], (int, float))
            assert isinstance(coords[1], (int, float))

    def test_map_feature_has_project_code(self, client):
        data = client.get("/api/map/projects").json()
        for f in data["features"][:10]:
            assert "project_code" in f["properties"]
            assert "geo_precision" in f["properties"]
            assert "centroid" in f["properties"]["geo_precision"].lower()

    def test_map_filter_by_state(self, client):
        data = client.get("/api/map/projects?state=MAHARASHTRA").json()
        assert data["total_features"] > 0
        for f in data["features"]:
            assert f["properties"]["state"] == "MAHARASHTRA"

    def test_map_filter_by_sector(self, client):
        data = client.get("/api/map/projects?sector=RAILWAYS").json()
        assert data["total_features"] > 0
        for f in data["features"]:
            assert f["properties"]["sector"] == "RAILWAYS"

    def test_map_bounding_box_clips_results(self, client):
        # Bounding box around southern India
        params = "bbox_south=8&bbox_north=15&bbox_west=76&bbox_east=82"
        resp = client.get(f"/api/map/projects?{params}")
        assert resp.status_code == 200
        data = resp.json()
        # Fewer features than total
        assert data["total_features"] <= 1477
