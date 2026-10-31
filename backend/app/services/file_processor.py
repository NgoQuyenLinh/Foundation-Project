# app/services/file_processor.py
from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

STORAGE_DIR = Path("storage")
THUMBNAIL_DIR = STORAGE_DIR / "thumbnails"
MARKDOWN_DIR = STORAGE_DIR / "markdowns"
THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)
MARKDOWN_DIR.mkdir(parents=True, exist_ok=True)


def generate_markdown(file_path: str, doc_id: int) -> Optional[str]:
    """
    Convert file sang Markdown. Với file text/code thì bọc trong block code.
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return None

        import mimetypes
        mime_type, _ = mimetypes.guess_type(file_path)
        group = get_file_group(mime_type or "", file_path)

        if group == "text":
            content = path.read_text(encoding="utf-8", errors="replace")
            from pygments.lexers import guess_lexer_for_filename, guess_lexer
            from pygments.util import ClassNotFound
            try:
                lexer = guess_lexer_for_filename(path.name, content)
            except ClassNotFound:
                try:
                    lexer = guess_lexer(content)
                except ClassNotFound:
                    lexer = None
            lang = lexer.aliases[0] if lexer and lexer.aliases else "text"
            markdown_content = f"```{lang}\n{content}\n```"
        else:
            import anydoc
            markdown_content = anydoc.to_markdown(str(path))

        if not markdown_content or not markdown_content.strip():
            return None

        out_path = MARKDOWN_DIR / f"{doc_id}.md"
        out_path.write_text(markdown_content, encoding="utf-8")
        return f"storage/markdowns/{doc_id}.md"

    except Exception as e:
        logger.warning(f"generate_markdown skip doc_id={doc_id}: {e}")
        return None


def extract_first_image_from_markdown(markdown_path: str, doc_id: Optional[int] = None) -> Optional[str]:
    """
    Tìm ảnh đầu tiên trong file Markdown (nếu có).
    Hỗ trợ cả cú pháp Markdown ![alt](url) và thẻ HTML <img src="url">.
    Nếu ảnh là file local, cố gắng convert sang storage/thumbnails/{doc_id}.jpg.
    """
    try:
        path = Path(markdown_path)
        if not path.exists():
            return None

        content = path.read_text(encoding="utf-8", errors="replace")

        img_url = None
        # 1. Tìm cú pháp Markdown: ![alt](url)
        match_md = re.search(r'!\[.*?\]\(([^)\s]+)(?:\s+["\'].*?["\'])?\)', content)
        if match_md:
            img_url = match_md.group(1).strip()

        # 2. Tìm thẻ HTML: <img src="url" ...>
        if not img_url:
            match_html = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', content, re.IGNORECASE)
            if match_html:
                img_url = match_html.group(1).strip()

        if not img_url:
            return None

        # Nếu là local path và tồn tại trên disk
        local_candidate = Path(img_url)
        if not local_candidate.is_absolute():
            candidate_relative = path.parent / img_url
            if candidate_relative.exists():
                local_candidate = candidate_relative

        if local_candidate.exists() and local_candidate.is_file() and doc_id:
            try:
                from PIL import Image
                out_path = THUMBNAIL_DIR / f"{doc_id}.jpg"
                img = Image.open(local_candidate).convert("RGB")
                img.thumbnail((800, 800))
                img.save(str(out_path), "JPEG", quality=85)
                return f"storage/thumbnails/{doc_id}.jpg"
            except Exception as e:
                logger.warning(f"Không thể convert local image sang thumbnail: {e}")

        return img_url
    except Exception as e:
        logger.error(f"extract_first_image_from_markdown lỗi [{markdown_path}]: {e}")
        return None


# Map MIME type → extension nhóm
MIME_TO_GROUP = {
    "application/pdf": "pdf",
    "application/msword": "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-powerpoint": "pptx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.ms-excel": "xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
    "image/gif": "image",
    "text/plain": "text",
}


def get_file_group(mime_type: str, file_path: str = "") -> str:
    group = MIME_TO_GROUP.get(mime_type)
    if group:
        return group
        
    if mime_type.startswith("text/") or mime_type in ["application/json", "application/xml"]:
        return "text"
        
    ext = Path(file_path).suffix.lower()
    code_exts = {
        ".py", ".js", ".ts", ".jsx", ".tsx", ".cpp", ".c", ".h", ".java", ".cs", ".go",
        ".rs", ".php", ".rb", ".swift", ".kt", ".scala", ".r", ".m", ".sql", ".yaml",
        ".yml", ".toml", ".csv", ".html", ".css", ".scss", ".sass", ".less", ".svelte",
        ".vue", ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd", ".md", ".mdx",
        ".rst", ".tex", ".env", ".gitignore", ".dockerignore", ".mk"
    }
    if ext in code_exts:
        return "text"
        
    return "other"


def extract_text(file_path: str, mime_type: str) -> str:
    """
    Extract text từ file.
    """
    path = Path(file_path)
    if not path.exists():
        logger.warning(f"File không tồn tại: {file_path}")
        return ""

    group = get_file_group(mime_type, file_path)

    try:
        if group == "pdf":
            import pdfplumber
            with pdfplumber.open(path) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            if not text.strip():
                logger.info(f"PDF không có text layer, chuyển sang OCR: {file_path}")
                text = _ocr_pdf(path)
            return text[:100_000]

        elif group == "docx":
            from docx import Document as DocxDocument
            doc = DocxDocument(path)
            return "\n".join(p.text for p in doc.paragraphs)[:100_000]

        elif group == "pptx":
            from pptx import Presentation
            prs = Presentation(path)
            texts = []
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        texts.append(shape.text)
            return "\n".join(texts)[:100_000]

        elif group == "image":
            return _ocr_image(path)

        elif group == "text":
            return path.read_text(encoding="utf-8", errors="replace")[:2_000_000]

    except Exception as e:
        logger.error(f"extract_text lỗi [{file_path}]: {e}")

    return ""


def create_thumbnail(file_path: str, mime_type: str, doc_id: int, page_number: int = 1) -> Optional[str]:
    """
    Tạo thumbnail JPG. Trả về đường dẫn tương đối hoặc None nếu không hỗ trợ.
    - PDF: render trang chỉ định
    - Image: resize giữ tỉ lệ
    - DOCX/PPTX/khác: trả None (FE dùng icon mặc định theo loại file)
    """
    path = Path(file_path)
    if not path.exists():
        return None

    out_path = THUMBNAIL_DIR / f"{doc_id}.jpg"
    group = get_file_group(mime_type, file_path)

    try:
        if group == "pdf":
            from pdf2image import convert_from_path
            images = convert_from_path(str(path), first_page=page_number, last_page=page_number, dpi=150)
            if images:
                images[0].convert("RGB").save(str(out_path), "JPEG", quality=85)
                return f"storage/thumbnails/{doc_id}.jpg"

        elif group == "image":
            from PIL import Image
            img = Image.open(path).convert("RGB")
            img.thumbnail((800, 800))
            img.save(str(out_path), "JPEG", quality=85)
            return f"storage/thumbnails/{doc_id}.jpg"

    except Exception as e:
        logger.error(f"create_thumbnail lỗi [{file_path}]: {e}")

    return None


def _ocr_pdf(path: Path) -> str:
    """OCR tối đa 5 trang đầu của PDF scan"""
    try:
        import pytesseract
        from pdf2image import convert_from_path
        images = convert_from_path(str(path), first_page=1, last_page=5, dpi=200)
        return "\n".join(
            pytesseract.image_to_string(img, lang="vie+eng") for img in images
        )
    except Exception as e:
        logger.error(f"OCR PDF lỗi: {e}")
        return ""


def _ocr_image(path: Path) -> str:
    try:
        import pytesseract
        from PIL import Image
        return pytesseract.image_to_string(Image.open(path), lang="vie+eng")
    except Exception as e:
        logger.error(f"OCR image lỗi: {e}")
        return ""