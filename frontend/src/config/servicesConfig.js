/**
 * Configuration for allowed PagerDuty services and team.
 * These are the only services the application will display and interact with.
 */

export const ALLOWED_SERVICES = {
    "PFDU7FI": {
        id: "PFDU7FI",
        name: "EdgeNode Modelling - Prod",
        url: "https://cba.pagerduty.com/service-directory/PFDU7FI"
    },
    "PBD0TCK": {
        id: "PBD0TCK",
        name: "EdgeNode DP&E Ingestion and controls - Prod",
        url: "https://cba.pagerduty.com/service-directory/PBD0TCK"
    }
};

export const ALLOWED_TEAM = {
    id: "P80ZU3K",
    name: "DPE Prod Ops",
    url: "https://cba.pagerduty.com/teams/P80ZU3K"
};

export const getAllowedServiceIds = () => Object.keys(ALLOWED_SERVICES);

export const getAllowedServiceNames = () =>
    Object.values(ALLOWED_SERVICES).map(svc => svc.name);

export const getTeamName = () => ALLOWED_TEAM.name;

export const isServiceIdAllowed = (serviceId) =>
    serviceId in ALLOWED_SERVICES;

export default {
    ALLOWED_SERVICES,
    ALLOWED_TEAM,
    getAllowedServiceIds,
    getAllowedServiceNames,
    getTeamName,
    isServiceIdAllowed
};
