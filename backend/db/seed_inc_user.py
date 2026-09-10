# app/db/seed_inc_user.py
"""
Seed tăng cường (incremental): Faculties + Classes + Users.
- Idempotent: chạy nhiều lần không tạo trùng.
- Chạy:  python -m app.db.seed_inc_user

Quy ước MSSV: YYFFCXXX (8 chữ số)
    YY  = Khoá (24 = 2024, 25 = 2025, ...)
    FF  = Mã khoa (01 = KT, 02 = CNTT, 03 = NN)
    C   = Số lớp trong khoa (1 = A, 2 = B, ...)
    XXX = STT sinh viên (001-999)

Ví dụ: 24021098 → K24, CNTT (02), lớp A (1), SV #098
"""

import asyncio
from typing import Optional

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.faculty import Faculty
from app.models.academic_class import Class




# =========================================================
# CẤU HÌNH
# =========================================================
DEFAULT_PASSWORD = "hash123"

FACULTY_CODES = {
    "CNTT": "02",
    "KT":   "01",
    "NN":   "03",
}


# =========================================================
# HELPERS
# =========================================================
async def get_by(session: AsyncSession, model, **filters) -> Optional[object]:
    stmt = select(model)
    for k, v in filters.items():
        stmt = stmt.where(getattr(model, k) == v)
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_or_create(
    session: AsyncSession,
    model,
    unique_filters: dict,
    defaults: Optional[dict] = None,
):
    obj = await get_by(session, model, **unique_filters)
    if obj:
        return obj, False
    obj = model(**{**unique_filters, **(defaults or {})})
    session.add(obj)
    await session.flush()
    return obj, True


async def user_exists(session: AsyncSession, username: str, email: str) -> bool:
    """Kiểm tra user đã tồn tại theo username HOẶC email."""
    stmt = select(User.id).where(
        or_(User.username == username, User.email == email)
    )
    return (await session.execute(stmt)).scalar_one_or_none() is not None


def make_student_code(year: str, faculty_code: str, class_no: int, stt: int) -> str:
    """Sinh MSSV theo quy ước YYFFCXXX."""
    return f"{year}{FACULTY_CODES[faculty_code]}{class_no}{stt:03d}"


# =========================================================
# 1. FACULTIES & CLASSES
# =========================================================
async def seed_academics(session: AsyncSession):
    print("=" * 62)
    print("1. SEEDING FACULTIES & CLASSES")
    print("=" * 62)

    faculties_data = [
        {"code": "CNTT", "name": "Khoa Công nghệ Thông tin"},
        {"code": "KT",   "name": "Khoa Kinh tế"},
        {"code": "NN",   "name": "Khoa Ngoại ngữ"},
    ]

    faculties: dict[str, Faculty] = {}
    for fd in faculties_data:
        f, created = await get_or_create(
            session, Faculty,
            unique_filters={"code": fd["code"]},
            defaults={"name": fd["name"]},
        )
        faculties[fd["code"]] = f
        flag = "✅ Created" if created else "⏭️  Exists "
        print(f"  {flag} Faculty: {fd['code']} - {f.name}")

    # code dạng K{year}-{facultyShort}{classNo}
    classes_data = [
        {"code": "K24-CNTT1", "name": "Lớp K24 CNTT 1",     "faculty_code": "CNTT"},
        {"code": "K24-CNTT2", "name": "Lớp K24 CNTT 2",     "faculty_code": "CNTT"},
        {"code": "K24-CNTT3", "name": "Lớp K24 CNTT 3",     "faculty_code": "CNTT"},
        {"code": "K24-KT1",   "name": "Lớp K24 Kinh tế 1",  "faculty_code": "KT"},
        {"code": "K24-KT2",   "name": "Lớp K24 Kinh tế 2",  "faculty_code": "KT"},
        {"code": "K24-NN1",   "name": "Lớp K24 Ngoại ngữ 1","faculty_code": "NN"},
        {"code": "K25-CNTT1", "name": "Lớp K25 CNTT 1",     "faculty_code": "CNTT"},
        {"code": "K25-KT1",   "name": "Lớp K25 Kinh tế 1",  "faculty_code": "KT"},
    ]

    classes: dict[str, Class] = {}
    for cd in classes_data:
        f = faculties[cd["faculty_code"]]
        c, created = await get_or_create(
            session, Class,
            unique_filters={"code": cd["code"]},
            defaults={"name": cd["name"], "faculty_id": f.id},
        )
        classes[cd["code"]] = c
        flag = "✅ Created" if created else "⏭️  Exists "
        print(f"  {flag} Class:   {cd['code']} - {c.name}")

    return faculties, classes


# =========================================================
# 2. USERS
# =========================================================
async def seed_users(session: AsyncSession, faculties, classes):
    print()
    print("=" * 62)
    print("2. SEEDING USERS")
    print("=" * 62)

    f_cntt = faculties["CNTT"]
    f_kt   = faculties["KT"]
    f_nn   = faculties["NN"]

    c_cntt1 = classes["K24-CNTT1"]
    c_cntt2 = classes["K24-CNTT2"]
    c_cntt3 = classes["K24-CNTT3"]
    c_kt1   = classes["K24-KT1"]
    c_kt2   = classes["K24-KT2"]
    c_nn1   = classes["K24-NN1"]
    c_25cntt1 = classes["K25-CNTT1"]
    c_25kt1   = classes["K25-KT1"]

    HASH = hash_password(DEFAULT_PASSWORD)

    # -------------------------------------------------
    # Admins + Teachers
    # -------------------------------------------------
    staff_users = [
        # ===== SYSTEM & SCHOOL ADMIN =====
        {"username": "sysadmin", "email": "sysadmin@school.edu.vn",
         "full_name": "System Admin", "role": "system_admin"},
        {"username": "schooladmin", "email": "admin@school.edu.vn",
         "full_name": "School Admin", "role": "school_admin"},

        # ===== FACULTY ADMINS =====
        {"username": "admin_cntt", "email": "cntt@school.edu.vn",
         "full_name": "Quản trị Khoa CNTT", "role": "faculty_admin",
         "faculty_id": f_cntt.id},
        {"username": "admin_kt", "email": "kt@school.edu.vn",
         "full_name": "Quản trị Khoa Kinh tế", "role": "faculty_admin",
         "faculty_id": f_kt.id},
        {"username": "admin_nn", "email": "nn@school.edu.vn",
         "full_name": "Quản trị Khoa Ngoại ngữ", "role": "faculty_admin",
         "faculty_id": f_nn.id},

        # ===== TEACHERS =====
        {"username": "gv_tuan", "email": "tuan.gv@school.edu.vn",
         "full_name": "GV. Nguyễn Anh Tuấn", "role": "teacher",
         "faculty_id": f_cntt.id},
        {"username": "gv_huong", "email": "huong.gv@school.edu.vn",
         "full_name": "GV. Lê Thu Hương", "role": "teacher",
         "faculty_id": f_cntt.id},
        {"username": "gv_nam", "email": "nam.gv@school.edu.vn",
         "full_name": "GV. Trần Hoài Nam", "role": "teacher",
         "faculty_id": f_cntt.id},
        {"username": "gv_quang", "email": "quang.gv@school.edu.vn",
         "full_name": "GV. Bùi Nhật Quang", "role": "teacher",
         "faculty_id": f_cntt.id},
        {"username": "gv_mai", "email": "mai.gv@school.edu.vn",
         "full_name": "GV. Trần Thị Mai", "role": "teacher",
         "faculty_id": f_kt.id},
        {"username": "gv_linh", "email": "linh.gv@school.edu.vn",
         "full_name": "GV. Phạm Mỹ Linh", "role": "teacher",
         "faculty_id": f_kt.id},
        {"username": "gv_phong", "email": "phong.gv@school.edu.vn",
         "full_name": "GV. Đỗ Thanh Phong", "role": "teacher",
         "faculty_id": f_nn.id},
    ]

    # -------------------------------------------------
    # Students
    # spec = (username, email_local, full_name, faculty_code, class_obj,
    #         enroll_year, class_no, stt)
    # -------------------------------------------------
    students_spec = [
        # ===== K24 - CNTT Lớp 1 (24-02-1-XXX) =====
        ("sv_an",    "an",    "Nguyễn Văn An",     "CNTT", c_cntt1, "24", 1, 1),
        ("sv_binh",  "binh",  "Trần Thanh Bình",   "CNTT", c_cntt1, "24", 1, 2),
        ("sv_chau",  "chau",  "Lê Hoàng Châu",     "CNTT", c_cntt1, "24", 1, 3),
        ("sv_duc",   "duc",   "Phạm Minh Đức",     "CNTT", c_cntt1, "24", 1, 4),
        ("sv_hang",  "hang",  "Võ Thị Hằng",       "CNTT", c_cntt1, "24", 1, 5),
        ("sv_khanh", "khanh", "Đinh Gia Khánh",    "CNTT", c_cntt1, "24", 1, 6),
        ("sv_lam",   "lam",   "Trịnh Ngọc Lâm",    "CNTT", c_cntt1, "24", 1, 7),
        ("sv_minh",  "minh",  "Nguyễn Nhật Minh",  "CNTT", c_cntt1, "24", 1, 8),

        # ===== K24 - CNTT Lớp 2 (24-02-2-XXX) =====
        ("sv_cuong", "cuong", "Lê Hùng Cường",     "CNTT", c_cntt2, "24", 2, 1),
        ("sv_dungq", "dungq", "Đặng Quốc Dũng",    "CNTT", c_cntt2, "24", 2, 2),
        ("sv_em",    "em",    "Bùi Thị Em",        "CNTT", c_cntt2, "24", 2, 3),
        ("sv_giang", "giang", "Hoàng Văn Giang",   "CNTT", c_cntt2, "24", 2, 4),
        ("sv_hoa",   "hoa",   "Ngô Thị Hoa",       "CNTT", c_cntt2, "24", 2, 5),
        ("sv_khang", "khang", "Lý Tuấn Khang",     "CNTT", c_cntt2, "24", 2, 6),
        ("sv_long",  "long",  "Dương Bảo Long",    "CNTT", c_cntt2, "24", 2, 7),
        ("sv_nhi",   "nhi",   "Trần Ý Nhi",        "CNTT", c_cntt2, "24", 2, 8),

        # ===== K24 - CNTT Lớp 3 (24-02-3-XXX) =====
        ("sv_oanh",  "oanh",  "Phan Kim Oanh",     "CNTT", c_cntt3, "24", 3, 1),
        ("sv_phuc",  "phuc",  "Nguyễn Hồng Phúc",  "CNTT", c_cntt3, "24", 3, 2),
        ("sv_quynh", "quynh", "Lê Như Quỳnh",      "CNTT", c_cntt3, "24", 3, 3),
        ("sv_son",   "son",   "Trương Hoàng Sơn",  "CNTT", c_cntt3, "24", 3, 4),
        ("sv_trang", "trang", "Vũ Thu Trang",      "CNTT", c_cntt3, "24", 3, 5),

        # ===== K24 - KT Lớp 1 (24-01-1-XXX) =====
        ("sv_dung",  "dung",  "Phạm Mỹ Dung",      "KT",   c_kt1,   "24", 1, 1),
        ("sv_hai",   "hai",   "Trương Văn Hải",    "KT",   c_kt1,   "24", 1, 2),
        ("sv_lan",   "lan",   "Đỗ Thị Lan",        "KT",   c_kt1,   "24", 1, 3),
        ("sv_khoi",  "khoi",  "Vũ Minh Khôi",      "KT",   c_kt1,   "24", 1, 4),
        ("sv_uyen",  "uyen",  "Nguyễn Phương Uyên","KT",   c_kt1,   "24", 1, 5),
        ("sv_vu",    "vu",    "Hoàng Anh Vũ",      "KT",   c_kt1,   "24", 1, 6),
        ("sv_xuan",  "xuan",  "Lê Thanh Xuân",     "KT",   c_kt1,   "24", 1, 7),
        ("sv_yen",   "yen",   "Bùi Hải Yến",       "KT",   c_kt1,   "24", 1, 8),

        # ===== K24 - KT Lớp 2 (24-01-2-XXX) =====
        ("sv_anh",   "anh",   "Ngô Tuấn Anh",      "KT",   c_kt2,   "24", 2, 1),
        ("sv_bich",  "bich",  "Đinh Ngọc Bích",    "KT",   c_kt2,   "24", 2, 2),
        ("sv_cam",   "cam",   "Trần Thị Cẩm",      "KT",   c_kt2,   "24", 2, 3),
        ("sv_dao",   "dao",   "Phan Thùy Đào",     "KT",   c_kt2,   "24", 2, 4),
        ("sv_giang2","giang2","Võ Hương Giang",    "KT",   c_kt2,   "24", 2, 5),

        # ===== K24 - NN Lớp 1 (24-03-1-XXX) =====
        ("sv_ha",    "ha",    "Nguyễn Thu Hà",     "NN",   c_nn1,   "24", 1, 1),
        ("sv_huong", "huong", "Trần Mai Hương",    "NN",   c_nn1,   "24", 1, 2),
        ("sv_linh",  "linh",  "Đỗ Khánh Linh",     "NN",   c_nn1,   "24", 1, 3),
        ("sv_nga",   "nga",   "Lê Thanh Nga",      "NN",   c_nn1,   "24", 1, 4),
        ("sv_phuong","phuong","Bùi Minh Phương",   "NN",   c_nn1,   "24", 1, 5),
        ("sv_quyen", "quyen", "Hoàng Ngọc Quyên",  "NN",   c_nn1,   "24", 1, 6),

        # ===== K25 - CNTT Lớp 1 (25-02-1-XXX) =====
        ("sv_an2",   "an2",   "Lê Gia An",         "CNTT", c_25cntt1, "25", 1, 1),
        ("sv_binh2", "binh2", "Nguyễn Đức Bình",   "CNTT", c_25cntt1, "25", 1, 2),
        ("sv_chau2", "chau2", "Trần Minh Châu",    "CNTT", c_25cntt1, "25", 1, 3),
        ("sv_duc2",  "duc2",  "Phạm Trung Đức",    "CNTT", c_25cntt1, "25", 1, 4),
        ("sv_hoa2",  "hoa2",  "Lý Thanh Hoa",      "CNTT", c_25cntt1, "25", 1, 5),
        ("sv_khang2","khang2","Đặng Duy Khang",    "CNTT", c_25cntt1, "25", 1, 6),

        # ===== K25 - KT Lớp 1 (25-01-1-XXX) =====
        ("sv_lam2",  "lam2",  "Nguyễn Bảo Lâm",    "KT",   c_25kt1,   "25", 1, 1),
        ("sv_mai2",  "mai2",  "Trần Ngọc Mai",     "KT",   c_25kt1,   "25", 1, 2),
        ("sv_nam2",  "nam2",  "Phan Hoài Nam",     "KT",   c_25kt1,   "25", 1, 3),
        ("sv_oanh2", "oanh2", "Võ Thị Oanh",       "KT",   c_25kt1,   "25", 1, 4),
        ("sv_phuc2", "phuc2", "Đinh Hồng Phúc",    "KT",   c_25kt1,   "25", 1, 5),
    ]

    student_users = []
    for username, email_local, full_name, fcode, cls, yy, cno, stt in students_spec:
        fobj = faculties[fcode]
        student_users.append({
            "username": username,
            "email": f"{email_local}.sv@student.edu.vn",
            "full_name": full_name,
            "role": "student",
            "faculty_id": fobj.id,
            "class_id": cls.id,
            "student_code": make_student_code(yy, fcode, cno, stt),
        })

    all_users = staff_users + student_users

    created_count = 0
    skipped_count = 0
    for ud in all_users:
        username = ud["username"]
        email = ud["email"]

        # Kiểm tra trùng theo username HOẶC email
        if await user_exists(session, username, email):
            print(f"  ⏭️  Exists  user: {username:<12} ({email})")
            skipped_count += 1
            continue

        session.add(User(
            username=username,
            email=email,
            password_hash=HASH,
            full_name=ud.get("full_name"),
            role=ud.get("role", "student"),
            student_code=ud.get("student_code"),
            class_id=ud.get("class_id"),
            faculty_id=ud.get("faculty_id"),
        ))
        await session.flush()
        created_count += 1
        print(f"  ✅ Created user: {username:<12} ({ud.get('role')})")

    print()
    print(f"→ Tổng: tạo mới {created_count}, bỏ qua {skipped_count}.")


# =========================================================
# MAIN
# =========================================================
async def main():
    print()
    print("🌱 BẮT ĐẦU SEED DỮ LIỆU USER...")
    print()

    async with AsyncSessionLocal() as session:
        try:
            faculties, classes = await seed_academics(session)
            await seed_users(session, faculties, classes)
            await session.commit()
            print()
            print("🎉 Seed hoàn tất thành công.")
        except Exception as e:
            await session.rollback()
            print()
            print(f"❌ Lỗi khi seed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())