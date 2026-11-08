"""
Config module initialization
"""
from .services_config import (
    ALLOWED_SERVICES,
    ALLOWED_TEAM,
    get_allowed_service_ids,
    get_allowed_service_names,
    get_team_id,
    get_team_name,
    is_service_allowed,
    is_service_id_allowed
)

__all__ = [
    'ALLOWED_SERVICES',
    'ALLOWED_TEAM',
    'get_allowed_service_ids',
    'get_allowed_service_names',
    'get_team_id',
    'get_team_name',
    'is_service_allowed',
    'is_service_id_allowed'
]
