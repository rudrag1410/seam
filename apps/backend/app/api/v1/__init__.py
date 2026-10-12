from fastapi import APIRouter

from app.api.v1 import activity, auth, health, jobs, me, resumes, tailor, versions

api_router = APIRouter()
for module in (auth, me, resumes, jobs, tailor, versions, activity):
    api_router.include_router(module.router)

health_router = health.router
