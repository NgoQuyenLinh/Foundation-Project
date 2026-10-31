"""
Seed data trực tiếp vào DB để kiểm tra tính năng sắp xếp theo nhu cầu hoạt động (Trending Sort)
và cơ chế đổi màu nền (Heat Background) theo các mốc lượt xem (5+, 10+, 20+).
"""
import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, delete
from app.core.database import AsyncSessionLocal
from app.models.document import Document
from app.models.document_stats import DocumentStats
from app.models.download_log import DownloadLog
from app.models.user import User


async def seed_activity_heat():
    async with AsyncSessionLocal() as db:
        # Tìm user sv_an (ID=6) hoặc user đầu tiên
        res = await db.execute(select(User).where(User.username == "sv_an"))
        user = res.scalar_one_or_none()
        if not user:
            res = await db.execute(select(User).limit(1))
            user = res.scalar_one_or_none()
            if not user:
                print("❌ Không tìm thấy user nào trong database!")
                return

        print(f"👤 Target user: {user.username} (ID: {user.id})")

        # Lấy danh sách tài liệu cá nhân của user
        docs_res = await db.execute(
            select(Document)
            .where(
                Document.owner_id == user.id,
                Document.workspace_id.is_(None),
                Document.is_deleted == False,
                Document.bundle_parent_id.is_(None),
            )
            .order_by(Document.id.desc())
        )
        docs = docs_res.scalars().all()
        if len(docs) < 4:
            print(f"⚠️ User có {len(docs)} tài liệu, cần tối thiểu 4 tài liệu để seed 4 mức heat.")
            return

        d_tier3, d_tier2, d_tier1, d_tier0 = docs[0], docs[1], docs[2], docs[3]
        target_docs = [
            (d_tier3, 25, 35.5, "Tier 3: >= 20 lượt xem -> Nền Orange, Badge ⚡ Thường dùng (20+)"),
            (d_tier2, 14, 18.2, "Tier 2: 10 - 19 lượt xem -> Nền Amber đậm, Badge 🔥 10+ xem"),
            (d_tier1, 7, 8.0, "Tier 1: 5 - 9 lượt xem -> Nền Amber nhạt, Badge 5+ xem"),
            (d_tier0, 2, 1.5, "Tier 0: < 5 lượt xem -> Nền Trắng mặc định, không badge"),
        ]

        now = datetime.now(timezone.utc)

        for doc, views, score, desc in target_docs:
            # 1. Cập nhật hoặc tạo DocumentStats
            stats_res = await db.execute(
                select(DocumentStats).where(DocumentStats.document_id == doc.id)
            )
            stats = stats_res.scalar_one_or_none()
            if not stats:
                stats = DocumentStats(document_id=doc.id)
                db.add(stats)

            stats.view_count = views
            stats.download_count = max(1, views // 5)
            stats.save_count = max(0, views // 10)
            stats.unique_viewers = max(1, views // 3)
            stats.trending_score = score
            stats.last_activity_at = now - timedelta(minutes=5)

            # 2. Xóa logs cũ và tạo logs mới tương ứng
            await db.execute(
                delete(DownloadLog).where(
                    DownloadLog.document_id == doc.id,
                    DownloadLog.user_id == user.id,
                )
            )
            for i in range(views):
                log = DownloadLog(
                    document_id=doc.id,
                    user_id=user.id,
                    action="view",
                    workspace_context="personal",
                    created_at=now - timedelta(hours=i * 2),
                )
                db.add(log)

            print(f"✅ Doc ID {doc.id:2d} ('{doc.title[:25]}...'): {views} views, score {score} => {desc}")

        await db.commit()
        print("\n🎉 Seed dữ liệu Activity Heat & Trending thành công!")
        print("💡 Truy cập trang /ca-nhan để kiểm tra thứ tự sắp xếp và màu nền tài liệu.")


if __name__ == "__main__":
    asyncio.run(seed_activity_heat())
