"""GET /api/map/projects — GeoJSON features for map visualization"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from acqwatch.api.deps import get_repository
from acqwatch.api.schemas import MapFeature, MapResponse, MapFeatureProperties, GeoPoint

router = APIRouter(prefix="/api", tags=["Map"])


@router.get("/map/projects", response_model=MapResponse, summary="GeoJSON project features for map")
def map_projects(
    state: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    risk_category: Optional[str] = Query(None),
    bbox_north: Optional[float] = Query(None, description="Bounding box north latitude"),
    bbox_south: Optional[float] = Query(None, description="Bounding box south latitude"),
    bbox_east: Optional[float] = Query(None, description="Bounding box east longitude"),
    bbox_west: Optional[float] = Query(None, description="Bounding box west longitude"),
):
    """
    Returns a GeoJSON FeatureCollection of project locations.
    Coordinates are state-level administrative centroids — not precise GPS.
    Projects without coordinates are still in the /api/projects inventory.
    Supports state/sector/risk_category filters and bounding-box clipping.
    """
    repo = get_repository()

    bbox = None
    if all(v is not None for v in [bbox_north, bbox_south, bbox_east, bbox_west]):
        bbox = {"north": bbox_north, "south": bbox_south, "east": bbox_east, "west": bbox_west}

    raw_features = repo.get_map_features(
        state=state,
        sector=sector,
        risk_category=risk_category,
        bbox=bbox,
    )

    features = []
    for f in raw_features:
        props = f["properties"]
        geo = f["geometry"]
        features.append(
            MapFeature(
                geometry=GeoPoint(coordinates=geo["coordinates"]),
                properties=MapFeatureProperties(**props),
            )
        )

    return MapResponse(
        features=features,
        total_features=len(features),
    )
