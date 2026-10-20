"""Tests: GET /api/overview"""
import pytest


class TestOverview:
    def test_overview_basic(self, client):
        resp = client.get("/api/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_projects_in_inventory"] == 1477
        assert data["matching_projects"] == 1477
        assert data["filters_applied"] is False

    def test_overview_counts_consistent(self, client):
        data = client.get("/api/overview").json()
        # Delayed + on_time = total matching
        assert data["delayed_count"] + data["on_time_count"] == data["matching_projects"]
        # Verified actual distribution
        assert data["delayed_count"] == 962
        assert data["on_time_count"] == 515

    def test_overview_risk_categories_sum(self, client):
        data = client.get("/api/overview").json()
        if data["predictions_available"]:
            total_risk = sum(data["counts_by_risk_category"].values())
            assert total_risk == data["matching_projects"]

    def test_overview_filtered_by_state(self, client):
        resp = client.get("/api/overview?state=MAHARASHTRA")
        data = resp.json()
        assert data["filters_applied"] is True
        assert data["matching_projects"] < data["total_projects_in_inventory"]
        assert data["matching_projects"] > 0

    def test_overview_filtered_consistent_with_projects(self, client):
        # Counts from /api/overview?sector=POWER should match /api/projects?sector=POWER
        overview = client.get("/api/overview?sector=POWER").json()
        projects = client.get("/api/projects?sector=POWER&page_size=1").json()
        assert overview["matching_projects"] == projects["total"]

    def test_overview_sector_distribution(self, client):
        data = client.get("/api/overview").json()
        assert isinstance(data["sector_distribution"], dict)
        assert len(data["sector_distribution"]) > 0

    def test_overview_cost_stats_present(self, client):
        data = client.get("/api/overview").json()
        assert "total_sanctioned_cr" in data["cost_stats"]
        assert data["cost_stats"]["total_sanctioned_cr"] > 0
