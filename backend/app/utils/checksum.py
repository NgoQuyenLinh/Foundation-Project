# backend/app/utils/checksum.py
from __future__ import annotations

import hashlib
from typing import BinaryIO, Union
from pathlib import Path

def compute_file_checksum(file_input: Union[str, Path, BinaryIO]) -> str:
    sha256 = hashlib.sha256()
    
    # Nếu file_input là chuỗi hoặc Path (đối với các file local cũ)
    if isinstance(file_input, (str, Path)):
        with open(file_input, "rb") as file_obj:
            for chunk in iter(lambda: file_obj.read(8192), b""):
                sha256.update(chunk)
    else:
        # Nếu file_input là BytesIO / BinaryIO từ memory
        file_input.seek(0)
        for chunk in iter(lambda: file_input.read(8192), b""):
            sha256.update(chunk)
        file_input.seek(0)  # Reset con trỏ về đầu sau khi tính xong
        
    return sha256.hexdigest()