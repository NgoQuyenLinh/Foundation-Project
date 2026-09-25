import asyncio
import hashlib
import sys
from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy import select, insert, text, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.security import hash_password


from app.core.database import AsyncSessionLocal

# Import các models
from app.models.faculty import Faculty
from app.models.academic_class import Class
from app.models.user import User
from app.models.category import Category
from app.models.tag import Tag
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.workspace_invitation import WorkspaceInvitation
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.document_tag import document_tags
from app.models.note import Note
from app.models.trash_batch import TrashBatch
from app.models.document_share import DocumentShare
from app.models.notification import Notification
from app.models.favorite import Favorite
from app.models.download_log import DownloadLog
from app.models.processing_job import ProcessingJob


# =========================================================
# HELPER FUNCTIONS
# =========================================================
def generate_checksum(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

async def get_or_create(session: AsyncSession, model, defaults=None, **kwargs):
    """Lấy hoặc tạo mới record, trả về (instance, created)"""
    # Tạo query với các điều kiện từ kwargs
    stmt = select(model).filter_by(**kwargs)
    result = await session.execute(stmt)
    instance = result.scalar_one_or_none()
    
    if instance:
        # Nếu tồn tại, update các field khác nếu có
        if defaults:
            for key, value in defaults.items():
                if hasattr(instance, key):
                    setattr(instance, key, value)
            await session.commit()
            await session.refresh(instance)
        return instance, False
    else:
        # Tạo mới
        instance = model(**kwargs, **(defaults or {}))
        session.add(instance)
        await session.commit()
        await session.refresh(instance)
        return instance, True

async def create_if_not_exists(session: AsyncSession, model, check_fields: dict, create_data: dict):
    """Tạo mới nếu chưa tồn tại dựa trên check_fields"""
    # Kiểm tra tồn tại
    stmt = select(model).filter_by(**check_fields)
    result = await session.execute(stmt)
    instance = result.scalar_one_or_none()
    
    if instance:
        # Update các field khác (trừ password)
        for key, value in create_data.items():
            if key not in check_fields and hasattr(instance, key):
                setattr(instance, key, value)
        await session.commit()
        await session.refresh(instance)
        return instance, False
    else:
        # Tạo mới với merge của check_fields và create_data
        data = {**check_fields, **create_data}
        instance = model(**data)
        session.add(instance)
        await session.commit()
        await session.refresh(instance)
        return instance, True

async def create_users_if_not_exists(session: AsyncSession, users_data: list):
    """Tạo user nếu chưa tồn tại, bỏ qua kiểm tra password"""
    created_users = {}
    for data in users_data:
        # Tạo bản copy để tránh ảnh hưởng dữ liệu gốc
        check_data = {k: v for k, v in data.items() if k != 'password_hash'}
        create_data = data.copy()
        
        # Kiểm tra tồn tại dựa trên username và email
        stmt = select(User).where(
            or_(
                User.username == data['username'],
                User.email == data['email']
            )
        )
        result = await session.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            # Cập nhật các field khác trừ password_hash và id
            for key, value in data.items():
                if key not in ['password_hash', 'id', 'created_at', 'updated_at']:
                    if hasattr(existing_user, key):
                        setattr(existing_user, key, value)
            await session.commit()
            await session.refresh(existing_user)
            created_users[data['username']] = existing_user
            print(f"  ⏭️  User {data['username']} already exists, updated other fields")
        else:
            # Tạo mới
            user = User(**data)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            created_users[data['username']] = user
            print(f"  ✅ Created user: {data['username']}")
    
    return created_users


# =========================================================
# 1. CLEAR OLD DATA (OPTIONAL - CÓ THỂ BỎ QUA)
# =========================================================
async def clear_data(session: AsyncSession):
    """Xóa toàn bộ dữ liệu cũ - CẨN THẬN KHI SỬ DỤNG"""
    print("⚠️  Skipping data clear to preserve existing data...")
    # Nếu muốn xóa, bỏ comment đoạn dưới
    # tables = [
    #     "processing_jobs", "download_logs", "favorites", "notes", 
    #     "document_versions", "document_tags", "documents", "trash_batches",
    #     "workspace_invitations", "workspace_members", "workspaces", 
    #     "tags", "categories", "users", "classes", "faculties", 
    #     "document_shares", "notifications"
    # ]
    # tables_str = ", ".join(tables)
    # await session.execute(text(f"TRUNCATE TABLE {tables_str} RESTART IDENTITY CASCADE;"))
    # await session.commit()
    # print("Old data cleared successfully.")
    pass


# =========================================================
# 2. SEED FACULTIES & CLASSES (Kiểm tra trùng)
# =========================================================
async def seed_academics(session: AsyncSession):
    print("1. Seeding Faculties and Classes...")
    
    faculties_data = [
        {"code": "CNTT", "name": "Khoa Công nghệ Thông tin"},
        {"code": "KT", "name": "Khoa Kinh tế"},
        {"code": "NN", "name": "Khoa Ngoại ngữ"}
    ]
    
    faculties = []
    for f_data in faculties_data:
        faculty, created = await get_or_create(
            session, 
            Faculty, 
            code=f_data['code'],
            name=f_data['name']
        )
        faculties.append(faculty)
        print(f"  {'✅ Created' if created else '⏭️  Already exists'} Faculty: {f_data['code']}")
    
    classes_data = [
        {"faculty_id": faculties[0].id, "code": "K65-CNTT1", "name": "Lớp K65 CNTT 1"},
        {"faculty_id": faculties[0].id, "code": "K65-CNTT2", "name": "Lớp K65 CNTT 2"},
        {"faculty_id": faculties[1].id, "code": "K65-KT1", "name": "Lớp K65 Kinh tế 1"},
    ]
    
    classes = []
    for c_data in classes_data:
        class_obj, created = await get_or_create(
            session,
            Class,
            code=c_data['code'],
            faculty_id=c_data['faculty_id'],
            name=c_data['name']
        )
        classes.append(class_obj)
        print(f"  {'✅ Created' if created else '⏭️  Already exists'} Class: {c_data['code']}")
    
    return faculties, classes


# =========================================================
# 3. SEED USERS (Kiểm tra trùng, bỏ qua password)
# =========================================================
async def seed_users(session: AsyncSession, faculties, classes):
    print("2. Seeding Users (Admins, Teachers, Students)...")
    f_cntt, f_kt, _ = faculties
    c_cntt1, c_cntt2, c_kt1 = classes

    users_data = [
        {"username": "sysadmin", "email": "sysadmin@school.edu.vn", "password_hash": hash_password("hash123"), "full_name": "System Admin", "role": "system_admin"},
        {"username": "schooladmin", "email": "admin@school.edu.vn", "password_hash": hash_password("hash123"), "full_name": "School Admin", "role": "school_admin"},
        {"username": "admin_cntt", "email": "cntt@school.edu.vn", "password_hash": hash_password("hash123"), "full_name": "Quản trị Khoa CNTT", "role": "faculty_admin", "faculty_id": f_cntt.id},
        {"username": "gv_tuan", "email": "tuan.gv@school.edu.vn", "password_hash": hash_password("hash123"), "full_name": "GV. Nguyễn Anh Tuấn", "role": "teacher", "faculty_id": f_cntt.id},
        {"username": "gv_mai", "email": "mai.gv@school.edu.vn", "password_hash": hash_password("hash123"), "full_name": "GV. Trần Thị Mai", "role": "teacher", "faculty_id": f_kt.id},
        {"username": "sv_an", "email": "an.sv@student.edu.vn", "password_hash": hash_password("hash123"), "full_name": "Nguyễn Văn An", "role": "student", "student_code": "SV001", "faculty_id": f_cntt.id, "class_id": c_cntt1.id},
        {"username": "sv_binh", "email": "binh.sv@student.edu.vn", "password_hash": hash_password("hash123"), "full_name": "Trần Thanh Bình", "role": "student", "student_code": "SV002", "faculty_id": f_cntt.id, "class_id": c_cntt1.id},
        {"username": "sv_cuong", "email": "cuong.sv@student.edu.vn", "password_hash": hash_password("hash123"), "full_name": "Lê Hùng Cường", "role": "student", "student_code": "SV003", "faculty_id": f_cntt.id, "class_id": c_cntt2.id},
        {"username": "sv_dung", "email": "dung.sv@student.edu.vn", "password_hash": hash_password("hash123"), "full_name": "Phạm Mỹ Dung", "role": "student", "student_code": "SV004", "faculty_id": f_kt.id, "class_id": c_kt1.id},
        {"username": "nguyen", "email": "nguyen@dlu.edu.vn", "password_hash": hash_password("hash123"), "full_name": "nguyen", "role": "student", "student_code": "SV005", "faculty_id": f_kt.id, "class_id": c_kt1.id},
    ]

    # Sử dụng hàm đặc biệt cho user
    users = await create_users_if_not_exists(session, users_data)
    return users


# =========================================================
# 4. SEED WORKSPACES, MEMBERS, INVITATIONS (Kiểm tra trùng)
# =========================================================
async def seed_workspaces_and_members(session: AsyncSession, users, faculties, classes):
    print("3. Seeding Workspaces, Members, and Invitations...")
    f_cntt = faculties[0]
    c_cntt1 = classes[0]

    workspaces_data = [
        {
            "type": "faculty", 
            "name": "Không gian Khoa CNTT", 
            "description": "Tài liệu chung", 
            "owner_id": users["admin_cntt"].id, 
            "ref_faculty_id": f_cntt.id, 
            "default_member_permission": "view"
        },
        {
            "type": "class", 
            "name": "Lớp K65 CNTT 1", 
            "description": "Học tập lớp CNTT 1", 
            "owner_id": users["gv_tuan"].id, 
            "ref_class_id": c_cntt1.id, 
            "default_member_permission": "view"
        },
        {
            "type": "group", 
            "name": "Nhóm Đồ án Web", 
            "description": "Làm đồ án", 
            "owner_id": users["sv_an"].id, 
            "default_member_permission": "full"
        }
    ]
    
    created_workspaces = {}
    for ws_data in workspaces_data:
        # Tạo dict check fields (unique)
        check_fields = {}
        if ws_data.get('type') == 'faculty' and ws_data.get('ref_faculty_id'):
            check_fields = {'type': 'faculty', 'ref_faculty_id': ws_data['ref_faculty_id']}
        elif ws_data.get('type') == 'class' and ws_data.get('ref_class_id'):
            check_fields = {'type': 'class', 'ref_class_id': ws_data['ref_class_id']}
        else:
            check_fields = {'type': 'group', 'name': ws_data['name']}
        
        ws, created = await get_or_create(
            session,
            Workspace,
            **check_fields,
            defaults=ws_data
        )
        created_workspaces[ws_data['name']] = ws
        print(f"  {'✅ Created' if created else '⏭️  Already exists'} Workspace: {ws_data['name']}")

    # Members
    members_data = [
        {"workspace_id": created_workspaces["Không gian Khoa CNTT"].id, "user_id": users["admin_cntt"].id, "permission_level": "full"},
        {"workspace_id": created_workspaces["Không gian Khoa CNTT"].id, "user_id": users["gv_tuan"].id, "permission_level": "full"},
        {"workspace_id": created_workspaces["Không gian Khoa CNTT"].id, "user_id": users["sv_an"].id, "permission_level": "view"},
        {"workspace_id": created_workspaces["Lớp K65 CNTT 1"].id, "user_id": users["gv_tuan"].id, "permission_level": "full"},
        {"workspace_id": created_workspaces["Lớp K65 CNTT 1"].id, "user_id": users["sv_an"].id, "permission_level": "view"},
        {"workspace_id": created_workspaces["Lớp K65 CNTT 1"].id, "user_id": users["sv_binh"].id, "permission_level": "view"},
        {"workspace_id": created_workspaces["Nhóm Đồ án Web"].id, "user_id": users["sv_an"].id, "permission_level": "full"},
        {"workspace_id": created_workspaces["Nhóm Đồ án Web"].id, "user_id": users["sv_binh"].id, "permission_level": "full"},
    ]
    
    for m_data in members_data:
        await get_or_create(
            session,
            WorkspaceMember,
            workspace_id=m_data['workspace_id'],
            user_id=m_data['user_id'],
            defaults={'permission_level': m_data['permission_level']}
        )
    
    # Invitations
    await get_or_create(
        session,
        WorkspaceInvitation,
        workspace_id=created_workspaces["Nhóm Đồ án Web"].id,
        invited_user_id=users["sv_cuong"].id,
        defaults={
            'invited_by': users["sv_an"].id,
            'status': 'pending'
        }
    )
    
    return created_workspaces


# =========================================================
# 5. SEED CATEGORIES & TAGS (Kiểm tra trùng)
# =========================================================
async def seed_classifications(session: AsyncSession, users):
    print("4. Seeding Categories and Tags...")
    u_admin = users["admin_cntt"]
    u_an = users["sv_an"]

    # Category
    cat_root, created = await get_or_create(
        session,
        Category,
        owner_id=u_admin.id,
        name="Giáo trình CNTT",
        defaults={'parent_id': None}
    )
    print(f"  {'✅ Created' if created else '⏭️  Already exists'} Category: Giáo trình CNTT")
    
    cat_sub1, created = await get_or_create(
        session,
        Category,
        owner_id=u_admin.id,
        name="Lập trình",
        defaults={'parent_id': cat_root.id}
    )
    print(f"  {'✅ Created' if created else '⏭️  Already exists'} Category: Lập trình")

    # Tag
    tag_root, created = await get_or_create(
        session,
        Tag,
        owner_id=u_admin.id,
        name="Đại cương",
        defaults={'color': '#000000'}
    )
    print(f"  {'✅ Created' if created else '⏭️  Already exists'} Tag: Đại cương")
    
    tag_sub, created = await get_or_create(
        session,
        Tag,
        owner_id=u_admin.id,
        name="Toán cao cấp",
        defaults={'color': '#FF5733', 'parent_id': tag_root.id}
    )
    print(f"  {'✅ Created' if created else '⏭️  Already exists'} Tag: Toán cao cấp")
    
    tag_personal, created = await get_or_create(
        session,
        Tag,
        owner_id=u_an.id,
        name="Cần ôn tập",
        defaults={'color': '#FF0000'}
    )
    print(f"  {'✅ Created' if created else '⏭️  Already exists'} Tag: Cần ôn tập")
    
    return {"cat_sub1": cat_sub1, "tag_sub": tag_sub, "tag_personal": tag_personal}


# =========================================================
# 6. SEED TRASH BATCHES (Kiểm tra trùng)
# =========================================================
async def seed_trash_batches(session: AsyncSession, users, workspaces):
    print("5. Seeding Trash Batches...")
    batch, created = await get_or_create(
        session,
        TrashBatch,
        workspace_id=workspaces["Nhóm Đồ án Web"].id,
        name="Nhóm BTL cũ (đã giải tán)",
        defaults={
            'deleted_by': users["sv_an"].id,
            'deleted_at': datetime.now(),
            'purge_at': datetime.now() + timedelta(days=30)
        }
    )
    print(f"  {'✅ Created' if created else '⏭️  Already exists'} TrashBatch: Nhóm BTL cũ")
    return batch


# =========================================================
# 7. SEED DOCUMENTS & METADATA (Kiểm tra trùng)
# =========================================================
async def seed_documents(session: AsyncSession, users, workspaces, classifications, trash_batch):
    print("6. Seeding Documents, Tags, Versions, Notes...")
    u_an = users["sv_an"]
    u_tuan = users["gv_tuan"]

    documents_data = [
        {
            "owner_id": u_an.id, 
            "workspace_id": None, 
            "category_id": classifications["cat_sub1"].id, 
            "title": "Ghi chú Python", 
            "description": "Tự học", 
            "file_path": "/docs/py.pdf", 
            "file_type": "application/pdf", 
            "file_size": 1024, 
            "checksum": generate_checksum("py"), 
            "is_important": True,
            "check_fields": {"checksum": generate_checksum("py")}
        },
        {
            "owner_id": u_an.id, 
            "workspace_id": workspaces["Nhóm Đồ án Web"].id, 
            "title": "Báo cáo Web", 
            "description": "Bản draft", 
            "file_path": "/docs/web.docx", 
            "file_type": "application/msword", 
            "file_size": 2048, 
            "checksum": generate_checksum("web"),
            "check_fields": {"checksum": generate_checksum("web")}
        },
        {
            "owner_id": u_tuan.id, 
            "workspace_id": workspaces["Lớp K65 CNTT 1"].id, 
            "title": "Bài tập lớn Lập trình", 
            "description": "Đề bài", 
            "file_path": "/docs/btl.pdf", 
            "file_type": "application/pdf", 
            "file_size": 5120, 
            "checksum": generate_checksum("btl"),
            "check_fields": {"checksum": generate_checksum("btl")}
        },
        {
            "owner_id": u_an.id, 
            "workspace_id": workspaces["Nhóm Đồ án Web"].id, 
            "title": "Tài liệu rác", 
            "file_path": "/docs/trash.pdf", 
            "checksum": generate_checksum("trash"), 
            "is_deleted": True, 
            "deleted_at": datetime.now(), 
            "trash_batch_id": trash_batch.id,
            "check_fields": {"checksum": generate_checksum("trash")}
        }
    ]
    
    docs = []
    for doc_data in documents_data:
        check_fields = doc_data.pop('check_fields', {})
        # Nếu không có check_fields cụ thể, dùng title và workspace_id
        if not check_fields:
            check_fields = {
                'title': doc_data['title'],
                'workspace_id': doc_data.get('workspace_id')
            }
        
        doc, created = await get_or_create(
            session,
            Document,
            **check_fields,
            defaults=doc_data
        )
        docs.append(doc)
        print(f"  {'✅ Created' if created else '⏭️  Already exists'} Document: {doc_data['title']}")

    # Document-Tags (Many-to-Many)
    tag_relations = [
        {"document_id": docs[0].id, "tag_id": classifications["tag_personal"].id},
        {"document_id": docs[2].id, "tag_id": classifications["tag_sub"].id},
    ]
    
    for rel in tag_relations:
        # Kiểm tra xem relation đã tồn tại chưa
        stmt = select(document_tags).where(
            and_(
                document_tags.c.document_id == rel['document_id'],
                document_tags.c.tag_id == rel['tag_id']
            )
        )
        result = await session.execute(stmt)
        existing = result.first()
        if not existing:
            await session.execute(
                insert(document_tags).values(**rel)
            )
            print(f"  ✅ Added tag relation: doc {rel['document_id']} - tag {rel['tag_id']}")
        else:
            print(f"  ⏭️  Tag relation already exists: doc {rel['document_id']} - tag {rel['tag_id']}")
    
    # Document Version
    version, created = await get_or_create(
        session,
        DocumentVersion,
        document_id=docs[1].id,
        version_no=1,
        defaults={
            'file_path': "/docs/web_v1.docx",
            'checksum': generate_checksum("v1"),
            'uploaded_by': u_an.id,
            'note': "Bản thảo đầu"
        }
    )
    print(f"  {'✅ Created' if created else '⏭️  Already exists'} DocumentVersion for doc {docs[1].id}")
    
    # Note
    note, created = await get_or_create(
        session,
        Note,
        document_id=docs[2].id,
        user_id=u_an.id,
        defaults={'note': "Cần nộp trước thứ 6"}
    )
    print(f"  {'✅ Created' if created else '⏭️  Already exists'} Note for doc {docs[2].id}")

    await session.commit()
    return docs


# =========================================================
# 8. SEED SHARES, NOTIFICATIONS, LOGS, JOBS (Kiểm tra trùng)
# =========================================================
async def seed_interactions(session: AsyncSession, users, workspaces, docs):
    print("7. Seeding Shares, Notifications, Favorites, Logs, and Jobs...")
    u_an = users["sv_an"]
    u_binh = users["sv_binh"]
    u_cuong = users["sv_cuong"]

    # 1. Share
    share, created = await get_or_create(
        session,
        DocumentShare,
        document_id=docs[0].id,
        to_user_id=u_cuong.id,
        defaults={
            'source_document_id': docs[0].id,
            'from_user_id': u_an.id,
            'share_type': "personal_send"
        }
    )
    print(f"  {'✅ Created' if created else '⏭️  Already exists'} Share for doc {docs[0].id}")

    # 2. Notifications
    notifications_data = [
        {
            "user_id": u_cuong.id, 
            "type": "invite", 
            "workspace_id": workspaces["Nhóm Đồ án Web"].id, 
            "message": "An đã mời bạn vào Nhóm"
        },
        {
            "user_id": u_binh.id, 
            "type": "new_document", 
            "workspace_id": workspaces["Lớp K65 CNTT 1"].id, 
            "document_id": docs[2].id, 
            "message": "Thầy Tuấn đã tải lên BTL"
        },
    ]
    
    for n_data in notifications_data:
        # Xác định check fields
        check_fields = {}
        if n_data.get('document_id'):
            check_fields = {
                'user_id': n_data['user_id'],
                'document_id': n_data['document_id'],
                'type': n_data['type']
            }
        else:
            check_fields = {
                'user_id': n_data['user_id'],
                'workspace_id': n_data['workspace_id'],
                'type': n_data['type']
            }
        
        await get_or_create(
            session,
            Notification,
            **check_fields,
            defaults=n_data
        )

    # 3. Favorites
    favorites_data = [
        {"user_id": u_an.id, "document_id": docs[2].id},
        {"user_id": u_binh.id, "document_id": docs[2].id},
    ]
    
    for fav_data in favorites_data:
        await get_or_create(
            session,
            Favorite,
            user_id=fav_data['user_id'],
            document_id=fav_data['document_id']
        )
        print(f"  {'✅ Created' if created else '⏭️  Already exists'} Favorite for user {fav_data['user_id']}")

    # 4. Logs
    log, created = await get_or_create(
        session,
        DownloadLog,
        document_id=docs[2].id,
        user_id=u_an.id,
        defaults={'action': "view"}
    )
    print(f"  {'✅ Created' if created else '⏭️  Already exists'} DownloadLog")

    # 5. Jobs
    job, created = await get_or_create(
        session,
        ProcessingJob,
        document_id=docs[0].id,
        job_type="virus_scan",
        defaults={
            'status': "done",
            'result': {"safe": True}
        }
    )
    print(f"  {'✅ Created' if created else '⏭️  Already exists'} ProcessingJob")

    await session.commit()


# =========================================================
# MAIN FUNCTION
# =========================================================
async def seed_database():
    print("=" * 60)
    print("STARTING DATABASE SEEDING (WITH DUPLICATE CHECK)")
    print("=" * 60)

    async with AsyncSessionLocal() as session:
        try:
            # 1. Bỏ qua xóa dữ liệu (hoặc có thể xóa nếu muốn reset)
            await clear_data(session)

            # 2. Khởi tạo dữ liệu theo đúng thứ tự logic
            faculties, classes = await seed_academics(session)
            users = await seed_users(session, faculties, classes)
            workspaces = await seed_workspaces_and_members(session, users, faculties, classes)
            classifications = await seed_classifications(session, users)
            trash_batch = await seed_trash_batches(session, users, workspaces)
            docs = await seed_documents(session, users, workspaces, classifications, trash_batch)
            await seed_interactions(session, users, workspaces, docs)
            
            print("=" * 60)
            print("DATABASE SEEDED SUCCESSFULLY!")
            print("=" * 60)
        except Exception as error:
            await session.rollback()
            print("SEEDING FAILED!")
            print(error)
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(seed_database())