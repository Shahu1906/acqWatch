"""Tests: GET /api/health and GET /api/metadata"""
import pytest


class TestHealth:
    def test_health_ok(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert data["status"] in ("ok", "degraded")
        assert "dataset_available" in data
        assert data["dataset_available"] is True
        assert "model_status" in data
        assert "timestamp_utc" in data

    def test_health_dataset_count_present(self, client):
        resp = client.get("/api/health")
        data = resp.json()
        assert data.get("dataset_project_count") is not None
        assert data["dataset_project_count"] > 0

    def test_metadata_returns_correct_count(self, client):
        resp = client.get("/api/metadata")
        assert resp.status_code == 200
        data = resp.json()
        # Verified actual count: 1,477
        assert data["total_projects"] == 1477

    def test_metadata_risk_categories(self, client):
        data = client.get("/api/metadata").json()
        cats = set(data["risk_categories"])
        assert {"LOW", "MEDIUM", "HIGH", "CRITICAL"} == cats

    def test_metadata_sectors_not_empty(self, client):
        data = client.get("/api/metadata").json()
        assert len(data["sectors"]) == 10  # Verified count from audit

    def test_metadata_states_present(self, client):
        data = client.get("/api/metadata").json()
        assert len(data["states"]) >= 29

    def test_metadata_geo_precision_note(self, client):
        data = client.get("/api/metadata").json()
        assert "centroid" in data["geo_precision"].lower()

    def test_root_info(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert "AcqWatch" in data["system"]
        assert "1,477" in data["dataset"]
