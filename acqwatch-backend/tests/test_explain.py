"""Tests: /api/projects/{id}/explanation and /api/model/explanation"""
import pytest


class TestExplain:
    def test_project_explanation_structure(self, client, first_project_code):
        resp = client.get(f"/api/projects/{first_project_code}/explanation")
        assert resp.status_code == 200
        data = resp.json()
        assert "available" in data
        assert "project_code" in data

    def test_explanation_shap_values_valid(self, client, first_project_code):
        data = client.get(f"/api/projects/{first_project_code}/explanation").json()
        if data["available"]:
            assert len(data["top_risk_drivers"]) > 0
            for d in data["top_risk_drivers"]:
                assert "feature" in d
                assert "shap_value" in d
                assert "direction" in d
                assert d["direction"] in ("ELEVATES_RISK", "MITIGATES_RISK")
                assert "explanation" in d
            assert "disclaimer" in data
            assert "DECISION SUPPORT" in (data["disclaimer"] or "")

    def test_explanation_unavailable_not_fabricated(self, client, first_project_code):
        data = client.get(f"/api/projects/{first_project_code}/explanation").json()
        if not data["available"]:
            assert data.get("unavailable_reason") is not None
            assert data.get("top_risk_drivers") == []

    def test_explanation_404_unknown_project(self, client):
        resp = client.get("/api/projects/NONEXISTENT_XYZ/explanation")
        assert resp.status_code == 404

    def test_global_explanation_structure(self, client):
        resp = client.get("/api/model/explanation")
        assert resp.status_code == 200
        data = resp.json()
        assert "available" in data
        assert "note" in data
        if data["available"]:
            assert len(data["feature_importances"]) > 0
            for item in data["feature_importances"]:
                assert "feature" in item
                assert "mean_abs_shap" in item
                assert item["mean_abs_shap"] >= 0


class TestFiltersAndModelStatus:
    def test_filters_all_keys_present(self, client):
        data = client.get("/api/filters").json()
        for key in ["states", "sectors", "agencies", "risk_categories", "sort_fields"]:
            assert key in data
        assert "MAHARASHTRA" in data["states"]
        assert "POWER" in data["sectors"]

    def test_model_status_structure(self, client):
        data = client.get("/api/model/status").json()
        assert "available" in data
        if data["available"]:
            assert data["model_id"] is not None
            assert data["feature_count"] > 0
            assert data["framework"] == "scikit-learn"
            assert data["input_schema"] is not None
        else:
            assert data["unavailable_reason"] is not None


class TestExport:
    def test_export_returns_csv(self, client):
        resp = client.get("/api/projects/export")
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("content-type", "")
        content = resp.text
        assert "project_code" in content
        assert "risk_category" in content

    def test_export_filtered_by_sector(self, client):
        resp = client.get("/api/projects/export?sector=POWER")
        assert resp.status_code == 200
        lines = resp.text.strip().split("\n")
        # header + at least 1 data row
        assert len(lines) >= 2
        for line in lines[1:]:
            assert "POWER" in line

    def test_export_no_internal_paths(self, client):
        resp = client.get("/api/projects/export")
        content = resp.text
        # Must not expose filesystem paths
        assert "C:\\" not in content
        assert "/home/" not in content
        assert "land_delays.db" not in content
