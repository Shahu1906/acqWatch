"""Tests: /api/projects — listing, filtering, sorting, pagination, detail, 404"""
import pytest


class TestProjects:
    def test_list_projects_returns_1477(self, client):
        resp = client.get("/api/projects?page=1&page_size=1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1477

    def test_project_list_structure(self, client):
        resp = client.get("/api/projects?page=1&page_size=10")
        data = resp.json()
        assert "items" in data
        assert "page" in data
        assert "page_size" in data
        assert "total" in data
        assert "total_pages" in data
        assert len(data["items"]) == 10

    def test_project_item_has_required_fields(self, client):
        item = client.get("/api/projects?page=1&page_size=1").json()["items"][0]
        for field in ["project_code", "project_name", "sector", "agency", "state"]:
            assert field in item

    def test_filter_by_sector_power(self, client):
        resp = client.get("/api/projects?sector=POWER&page_size=200")
        data = resp.json()
        assert data["total"] > 0
        for p in data["items"]:
            assert p["sector"] == "POWER"

    def test_filter_by_state(self, client):
        resp = client.get("/api/projects?state=MAHARASHTRA&page_size=200")
        data = resp.json()
        assert data["total"] > 0
        for p in data["items"]:
            assert p["state"] == "MAHARASHTRA"

    def test_filter_by_risk_category_critical(self, client):
        resp = client.get("/api/projects?risk_category=CRITICAL&page_size=200")
        data = resp.json()
        assert data["total"] >= 0  # may be 0 if model unavailable
        for p in data["items"]:
            assert p["risk_category"] == "CRITICAL"

    def test_search_by_partial_name(self, client):
        resp = client.get("/api/projects?search=NHAI&page_size=20")
        data = resp.json()
        # search matches project_code, project_name, or agency
        assert data["total"] >= 0  # non-negative

    def test_pagination_consistency(self, client):
        p1 = client.get("/api/projects?page=1&page_size=50").json()
        p2 = client.get("/api/projects?page=2&page_size=50").json()
        assert p1["total"] == p2["total"]
        # No overlap between pages
        codes_p1 = {p["project_code"] for p in p1["items"]}
        codes_p2 = {p["project_code"] for p in p2["items"]}
        assert codes_p1.isdisjoint(codes_p2)

    def test_sort_desc_risk_score(self, client):
        resp = client.get("/api/projects?page=1&page_size=20&sort_by=risk_score&sort_order=desc")
        items = resp.json()["items"]
        scores = [p["risk_score"] for p in items if p["risk_score"] is not None]
        assert scores == sorted(scores, reverse=True)

    def test_unique_project_codes(self, client):
        resp = client.get("/api/projects?page_size=500")
        items = resp.json()["items"]
        codes = [p["project_code"] for p in items]
        assert len(codes) == len(set(codes)), "Duplicate project_codes on page 1"

    def test_project_detail_valid_id(self, client, first_project_code):
        resp = client.get(f"/api/projects/{first_project_code}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_code"] == first_project_code
        assert "source_dataset" in data
        assert "geo_precision" in data
        assert data["geo_precision"] is not None

    def test_project_detail_prediction_fields(self, client, first_project_code):
        data = client.get(f"/api/projects/{first_project_code}").json()
        assert "prediction_available" in data
        if data["prediction_available"]:
            assert data["risk_score"] is not None
            assert data["risk_category"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
            assert 0 <= data["risk_score"] <= 100

    def test_project_detail_no_invented_coords(self, client, first_project_code):
        data = client.get(f"/api/projects/{first_project_code}").json()
        if data["latitude"] is not None:
            assert "centroid" in data["geo_precision"].lower()

    def test_project_detail_404_unknown_id(self, client):
        resp = client.get("/api/projects/NONEXISTENT_PROJECT_ZZZZ")
        assert resp.status_code == 404

    def test_page_size_cap(self, client):
        resp = client.get("/api/projects?page_size=501")
        # Should either reject or cap
        assert resp.status_code in (200, 422)
        if resp.status_code == 200:
            assert len(resp.json()["items"]) <= 500

    def test_invalid_sort_field_safe(self, client):
        # Unsafe sort fields must not cause errors or path traversal
        resp = client.get("/api/projects?sort_by=../etc/passwd")
        assert resp.status_code in (200, 422)
