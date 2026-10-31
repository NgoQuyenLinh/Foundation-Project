# backend/app/main.py

import logging
import os
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.routers import workspace_tags
from app.routers.academic import router as academic_router
from app.routers.auth import router as auth_router
from app.routers.categories import router as categories_router
from app.routers.document_versions import router as document_versions_router
from app.routers.documents import router as documents_router
from app.routers.download_logs import router as download_logs_router
from app.routers.favorites import router as favorites_router
from app.routers.folders import router as folders_router
from app.routers.groups import router as groups_router
from app.jobs.scheduler import register_jobs, scheduler
from app.routers.notes import router as notes_router
from app.routers.notifications import router as notifications_router
from app.routers.search import router as search_router
from app.routers.tags import router as tags_router
from app.routers.trash import router as trash_router
from app.routers.users import router as users_router
from app.routers.workspaces import router as workspaces_router
from app.routers.library import router as library_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Thư Viện Số - Quản Lí Tài Liệu",
    description="Hệ thống quản tài liệu số của thư viện",
    version="0.1.0",
)

# ✅ FIX: CORS middleware phải được add TRƯỚC khi mount static files
# Starlette xử lý middleware theo thứ tự ngược lại (LIFO), nên middleware
# được add trước sẽ wrap toàn bộ app — bao gồm cả StaticFiles.
# Nếu mount static files trước rồi mới add middleware, các request tới
# /storage/* sẽ không có CORS headers và preflight OPTIONS sẽ bị từ chối.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://macbook-pro-2.taile4a1e8.ts.net",
        "https://foundation-project-murex.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ FIX: Global exception handler — đảm bảo lỗi 500 vẫn trả về JSON có CORS headers
# Nếu không có handler này, FastAPI trả về PlainText response không qua CORS middleware
# → browser thấy CORS error thay vì lỗi thực sự từ backend
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception on %s %s: %s\n%s",
        request.method,
        request.url.path,
        exc,
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc),
            "type": type(exc).__name__,
        },
    )

# Đảm bảo thư mục lưu trữ thumbnail tồn tại và mount static path
os.makedirs("storage/thumbnails", exist_ok=True)
os.makedirs("storage/personal", exist_ok=True)
os.makedirs("storage/groups", exist_ok=True)
os.makedirs("storage/orphaned", exist_ok=True)
os.makedirs("storage/community", exist_ok=True)
os.makedirs("storage/markdowns", exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# Đăng ký tất cả các router
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(categories_router)
app.include_router(tags_router)
app.include_router(documents_router)
app.include_router(document_versions_router)
app.include_router(notes_router)
app.include_router(favorites_router)
app.include_router(download_logs_router)
app.include_router(search_router)
app.include_router(workspaces_router)
app.include_router(trash_router)
app.include_router(academic_router)
app.include_router(notifications_router)
app.include_router(folders_router)
app.include_router(groups_router)
app.include_router(workspace_tags.router)
app.include_router(library_router)


@app.on_event("startup")
async def startup():
    if not scheduler.running:
        register_jobs()
        scheduler.start()


@app.on_event("shutdown")
async def shutdown():
    if scheduler.running:
        scheduler.shutdown()


@app.get("/health")
def health_check():
    return {"status": "ok"}
