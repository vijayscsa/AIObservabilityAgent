"""
Configuration for allowed PagerDuty services and team.
Only incidents and details from these services will be processed.
"""

# Allowed PagerDuty services with their IDs
# These are the only services the application will connect to
ALLOWED_SERVICES = {
    "PFDU7FI": {
        "id": "PFDU7FI",
        "name": "EdgeNode Modelling - Prod",
        "url": "https://cba.pagerduty.com/service-directory/PFDU7FI"
    },
    "PBD0TCK": {
        "id": "PBD0TCK",
        "name": "EdgeNode DP&E Ingestion and controls - Prod",
        "url": "https://cba.pagerduty.com/service-directory/PBD0TCK"
    }
}

# Allowed PagerDuty team
ALLOWED_TEAM = {
    "id": "P80ZU3K",
    "name": "DPE Prod Ops",
    "url": "https://cba.pagerduty.com/teams/P80ZU3K"
}


def get_allowed_service_ids() -> list:
    """Return the list of allowed service IDs."""
    return list(ALLOWED_SERVICES.keys())


def get_allowed_service_names() -> list:
    """Return the list of allowed service names."""
    return [svc["name"] for svc in ALLOWED_SERVICES.values()]


def get_team_id() -> str:
    """Return the allowed team ID."""
    return ALLOWED_TEAM["id"]


def get_team_name() -> str:
    """Return the allowed team name."""
    return ALLOWED_TEAM["name"]


def is_service_allowed(service_name: str) -> bool:
    """Check if a service name is in the allowed list."""
    allowed_names = get_allowed_service_names()
    return service_name in allowed_names


def is_service_id_allowed(service_id: str) -> bool:
    """Check if a service ID is in the allowed list."""
    return service_id in ALLOWED_SERVICES
