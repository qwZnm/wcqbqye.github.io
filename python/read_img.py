#!/usr/bin/env python3
"""
图片信息读取工具 - 优化版

功能：
- 读取图片基础信息：文件名、大小、格式、MIME、修改时间
- 读取图片尺寸：优先使用 Pillow，未安装时自动降级
- 读取 EXIF 信息：优先使用 exifread，未安装时尝试 Pillow
- GPS 经纬度自动转换为十进制度
- 支持命令行输出文本或 JSON

依赖（可选）：
pip install exifread pillow
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional


def _safe_import_exifread():
    try:
        import exifread  # type: ignore
        return exifread
    except Exception:
        return None


def _safe_import_pillow():
    try:
        from PIL import Image, ExifTags  # type: ignore
        return Image, ExifTags
    except Exception:
        return None, None


def format_size(size: int) -> str:
    """格式化文件大小"""
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.2f} KB"
    if size < 1024 * 1024 * 1024:
        return f"{size / 1024 / 1024:.2f} MB"
    return f"{size / 1024 / 1024 / 1024:.2f} GB"


def rational_to_float(value: Any) -> float:
    """将 EXIF rational 值转换为浮点数"""
    try:
        if hasattr(value, "num") and hasattr(value, "den"):
            return float(value.num) / float(value.den)
        if isinstance(value, tuple) and len(value) == 2:
            return float(value[0]) / float(value[1])
        text = str(value)
        if "/" in text:
            a, b = text.split("/", 1)
            return float(a) / float(b)
        return float(text)
    except Exception:
        return 0.0


def gps_to_decimal(values: Any, ref: str) -> Optional[float]:
    """GPS 度分秒转十进制度"""
    try:
        parts = list(values.values) if hasattr(values, "values") else list(values)
        if len(parts) < 3:
            return None
        degrees = rational_to_float(parts[0])
        minutes = rational_to_float(parts[1])
        seconds = rational_to_float(parts[2])
        decimal = degrees + minutes / 60 + seconds / 3600
        if str(ref).upper() in ("S", "W"):
            decimal = -decimal
        return round(decimal, 8)
    except Exception:
        return None


def read_with_exifread(file_path: Path) -> Dict[str, Any]:
    """使用 exifread 读取 EXIF"""
    exifread = _safe_import_exifread()
    if exifread is None:
        return {"available": False, "reason": "未安装 exifread"}

    with file_path.open("rb") as f:
        tags = exifread.process_file(f, details=False)

    result: Dict[str, Any] = {
        "available": bool(tags),
        "raw_count": len(tags),
        "fields": {},
    }

    field_map = {
        "拍摄时间": "EXIF DateTimeOriginal",
        "相机制造商": "Image Make",
        "相机型号": "Image Model",
        "图片宽度": "EXIF ExifImageWidth",
        "图片高度": "EXIF ExifImageLength",
        "光圈": "EXIF FNumber",
        "快门速度": "EXIF ExposureTime",
        "ISO": "EXIF ISOSpeedRatings",
        "焦距": "EXIF FocalLength",
        "白平衡": "EXIF WhiteBalance",
        "曝光补偿": "EXIF ExposureBiasValue",
        "软件": "Image Software",
    }

    for label, key in field_map.items():
        if key in tags:
            result["fields"][label] = str(tags.get(key))

    lat = None
    lng = None
    if "GPS GPSLatitude" in tags and "GPS GPSLatitudeRef" in tags:
        lat = gps_to_decimal(tags["GPS GPSLatitude"], str(tags["GPS GPSLatitudeRef"]))
    if "GPS GPSLongitude" in tags and "GPS GPSLongitudeRef" in tags:
        lng = gps_to_decimal(tags["GPS GPSLongitude"], str(tags["GPS GPSLongitudeRef"]))
    if lat is not None and lng is not None:
        result["gps"] = {"latitude": lat, "longitude": lng}

    return result


def read_with_pillow(file_path: Path) -> Dict[str, Any]:
    """使用 Pillow 读取图片尺寸和 EXIF"""
    Image, ExifTags = _safe_import_pillow()
    if Image is None:
        return {"available": False, "reason": "未安装 Pillow"}

    result: Dict[str, Any] = {"available": True}
    with Image.open(file_path) as img:
        result["format"] = img.format
        result["mode"] = img.mode
        result["width"] = img.width
        result["height"] = img.height

        exif_data = {}
        try:
            raw_exif = img.getexif()
            tag_names = ExifTags.TAGS if ExifTags else {}
            for tag_id, value in raw_exif.items():
                name = tag_names.get(tag_id, str(tag_id))
                if isinstance(value, bytes):
                    value = value.decode(errors="ignore")
                exif_data[name] = str(value)
        except Exception:
            exif_data = {}

        result["exif"] = exif_data
    return result


def get_image_info(file_path: str) -> Dict[str, Any]:
    """读取图片信息并返回结构化结果"""
    path = Path(file_path).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"文件不存在：{path}")
    if not path.is_file():
        raise ValueError(f"不是有效文件：{path}")

    stat = path.stat()
    mime, _ = mimetypes.guess_type(path.name)

    info: Dict[str, Any] = {
        "file": {
            "name": path.name,
            "path": str(path),
            "size": stat.st_size,
            "size_human": format_size(stat.st_size),
            "extension": path.suffix.lower(),
            "mime": mime or "未知",
            "modified_time": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
        },
        "pillow": read_with_pillow(path),
        "exifread": read_with_exifread(path),
    }
    return info


def print_text(info: Dict[str, Any]) -> None:
    """以文本形式输出"""
    file_info = info["file"]
    print("=== 文件信息 ===")
    print(f"文件名：{file_info['name']}")
    print(f"文件路径：{file_info['path']}")
    print(f"文件大小：{file_info['size_human']}")
    print(f"扩展名：{file_info['extension'] or '无'}")
    print(f"MIME：{file_info['mime']}")
    print(f"修改时间：{file_info['modified_time']}")

    pillow = info.get("pillow", {})
    print("\n=== 图片信息 ===")
    if pillow.get("available"):
        print(f"格式：{pillow.get('format')}")
        print(f"色彩模式：{pillow.get('mode')}")
        print(f"尺寸：{pillow.get('width')} × {pillow.get('height')}")
    else:
        print(f"Pillow 不可用：{pillow.get('reason')}")

    exif = info.get("exifread", {})
    print("\n=== EXIF 信息 ===")
    if exif.get("available"):
        fields = exif.get("fields", {})
        if fields:
            for key, value in fields.items():
                print(f"{key}：{value}")
        else:
            print("未读取到常用 EXIF 字段")
        if "gps" in exif:
            gps = exif["gps"]
            print(f"GPS：{gps['latitude']}, {gps['longitude']}")
    else:
        print(f"EXIF 不可用：{exif.get('reason', '未读取到 EXIF')}")


def main() -> None:
    parser = argparse.ArgumentParser(description="读取图片基础信息和 EXIF 元数据")
    parser.add_argument("file", nargs="?", help="图片文件路径")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    args = parser.parse_args()

    file_path = args.file or input("文件路径：").strip().strip('"').strip("'")
    try:
        info = get_image_info(file_path)
        if args.json:
            print(json.dumps(info, ensure_ascii=False, indent=2))
        else:
            print_text(info)
    except Exception as exc:
        print(f"错误：{exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
