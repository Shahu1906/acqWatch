"""Tests: /api/projects/{id}/prediction and POST /api/predict"""
import pytest


class TestPrediction:
    def test_prediction_structure(self, client, first_project_code):
        resp = client.get(f"/api/projects/{first_project_code}/prediction")
        assert resp.status_code == 200
        data = resp.json()
        assert "available" in data
        assert "project_code" in data

    def test_prediction_values_valid_when_available(self, client, first_project_code):
        data = client.get(f"/api/projects/{first_project_code}/prediction").json()
        if data["available"]:
            assert 0 <= data["risk_score"] <= 100
            assert data["risk_category"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
            assert 0.0 <= data["probability"] <= 1.0
            assert data["prediction_source"] == "precomputed"
            assert data["model_id"] is not None

    def test_prediction_404_unknown_project(self, client):
        resp = client.get("/api/projects/UNKNOWN_ZZZ_9999/prediction")
        assert resp.status_code == 404

    def test_prediction_unavailable_not_fabricated(self, client, first_project_code):
        data = client.get(f"/api/projects/{first_project_code}/prediction").json()
        if not data["available"]:
            assert data["unavailable_reason"] is not None
            assert data["probability"] is None
            assert data["risk_score"] is None

    def test_adhoc_predict_valid_input(self, client):
        payload = {
            "sector": "ROAD TRANSPORT AND HIGHWAYS",
            "agency": "NHAI",
            "state": "MAHARASHTRA",
            "orig_cost_cr": 500.0,
            "approval_date": "2020-04-01",
            "orig_commissioning_date": "2023-04-01"
        }
        resp = client.post("/api/predict", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "available" in data
        assert "disclaimer" in data
        if data["available"]:
            assert 0 <= data["risk_score"] <= 100
            assert data["risk_category"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
            assert data["prediction_source"] == "fresh"

    def test_adhoc_predict_missing_required_field(self, client):
        payload = {"sector": "POWER"}  # missing required fields
        resp = client.post("/api/predict", json=payload)
        assert resp.status_code == 422

    def test_adhoc_predict_negative_cost_rejected(self, client):
        payload = {
            "sector": "POWER", "agency": "PGCIL", "state": "GUJARAT",
            "orig_cost_cr": -100.0
        }
        resp = client.post("/api/predict", json=payload)
        assert resp.status_code == 422
