#!/usr/bin/env python3
"""
Base64 编解码工具 - 优化版
支持：文件↔Base64、文本↔Base64、自动文件类型检测
跨平台兼容，无外部依赖
"""

import base64
import mimetypes
import os
import sys
import time
import argparse
from pathlib import Path


class Base64Tool:
    """Base64 编解码工具类"""

    # 常见文本文件扩展名
    TEXT_EXTENSIONS = {
        '.txt', '.csv', '.json', '.xml', '.html', '.htm', '.css',
        '.js', '.ts', '.py', '.java', '.c', '.cpp', '.h', '.md',
        '.yaml', '.yml', '.ini', '.cfg', '.conf', '.log', '.sql',
        '.sh', '.bat', '.ps1', '.rb', '.go', '.rs', '.swift',
    }

    def __init__(self):
        self.start_time = time.time()

    @staticmethod
    def is_binary_file(file_path: str) -> bool:
        """通过字节模式分析判断文件是否为二进制文件"""
        try:
            with open(file_path, 'rb') as f:
                chunk = f.read(8192)
            if not chunk:
                return False
            # 检查空字节和其他二进制标志
            binary_markers = [0x00, 0xEF, 0xBB, 0xBF]
            return any(b in chunk for b in binary_markers) and not Base64Tool._is_valid_text(chunk)
        except Exception:
            return True

    @staticmethod
    def _is_valid_text(data: bytes) -> bool:
        """尝试多种编码解码，判断是否为文本"""
        encodings = ['utf-8', 'utf-16', 'latin-1', 'gbk', 'gb2312', 'big5']
        for enc in encodings:
            try:
                text = data.decode(enc)
                # 允许常见可打印字符（含中文）和空白符
                if all(c.isprintable() or c in '\r\n\t' for c in text[:256]):
                    return True
            except (UnicodeDecodeError, Exception):
                continue
        return False

    @staticmethod
    def is_text_file(file_path: str) -> bool:
        """综合判断文件是否为文本文件"""
        # 1. 先看扩展名
        ext = Path(file_path).suffix.lower()
        if ext in Base64Tool.TEXT_EXTENSIONS:
            return True
        # 2. 再看字节内容
        try:
            with open(file_path, 'rb') as f:
                chunk = f.read(8192)
            return Base64Tool._is_valid_text(chunk)
        except Exception:
            return False

    @staticmethod
    def get_file_format(file_path: str) -> str:
        """检测文件格式，返回扩展名（不含点）"""
        # 优先使用 mimetypes
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type:
            ext = mimetypes.guess_extension(mime_type)
            if ext:
                return ext.lstrip('.')
        # 根据内容判断
        if Base64Tool.is_text_file(file_path):
            return 'txt'
        return 'bin'

    @staticmethod
    def file_to_base64(input_path: str, output_path: str = None) -> str:
        """将文件编码为 Base64 字符串"""
        input_path = Path(input_path)
        if not input_path.exists():
            raise FileNotFoundError(f"文件不存在: {input_path}")

        with open(input_path, 'rb') as f:
            data = f.read()
        encoded = base64.b64encode(data).decode('utf-8')

        if output_path:
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(encoded)

        return encoded

    @staticmethod
    def base64_to_file(base64_string: bytes | str, output_path: str) -> str:
        """将 Base64 数据解码并保存为文件"""
        if isinstance(base64_string, bytes):
            base64_string = base64_string.decode('utf-8')

        # 去除可能的换行和空白
        base64_string = base64_string.strip().replace('\n', '').replace('\r', '')

        try:
            decoded = base64.b64decode(base64_string)
        except Exception as e:
            raise ValueError(f"Base64 解码失败: {e}")

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(decoded)

        # 检测文件类型并重命名
        file_format = Base64Tool.get_file_format(str(output_path))
        final_path = output_path.with_suffix(f'.{file_format}')

        if output_path != final_path:
            output_path.rename(final_path)

        return str(final_path)

    @staticmethod
    def text_to_base64(text: str) -> str:
        """文本编码为 Base64"""
        return base64.b64encode(text.encode('utf-8')).decode('utf-8')

    @staticmethod
    def base64_to_text(b64_str: str) -> str:
        """Base64 解码为文本"""
        try:
            return base64.b64decode(b64_str.strip()).decode('utf-8')
        except UnicodeDecodeError:
            # 可能不是 UTF-8 文本
            return base64.b64decode(b64_str.strip()).decode('latin-1')
        except Exception as e:
            raise ValueError(f"解码失败: {e}")

    def print_elapsed(self):
        """打印耗时"""
        elapsed = round(time.time() - self.start_time, 2)
        print(f"耗时 {elapsed}s")


def interactive_mode():
    """交互式模式"""
    tool = Base64Tool()

    print("=" * 40)
    print("  Base64 编解码工具")
    print("=" * 40)

    input_path = input("输入源文件路径: ").strip().strip('"').strip("'")
    if not os.path.exists(input_path):
        print(f"错误：文件 {input_path} 不存在")
        return

    choice = input("Base64 转文件? (Y/n): ").strip()
    decode_mode = choice.lower() in ('y', '')

    output_dir = Path(input_path).parent / "output"
    output_dir.mkdir(exist_ok=True)

    if decode_mode:
        # Base64 → 文件
        output_path = str(output_dir / "decoded_file")
        try:
            with open(input_path, 'rb') as f:
                b64_data = f.read()
            final_path = tool.base64_to_file(b64_data, output_path)
            print(f"解码成功，文件已保存: {final_path}")
        except Exception as e:
            print(f"错误: {e}")
    else:
        # 文件 → Base64
        output_path = str(output_dir / "encoded_base64.txt")
        try:
            encoded = tool.file_to_base64(input_path, output_path)
            print(f"编码成功，Base64 已保存: {output_path}")
            print(f"前 100 字符: {encoded[:100]}...")
        except Exception as e:
            print(f"错误: {e}")

    tool.print_elapsed()


def main():
    """主入口：支持命令行参数和交互模式"""
    parser = argparse.ArgumentParser(description='Base64 编解码工具')
    parser.add_argument('-f', '--file', help='输入文件路径')
    parser.add_argument('-o', '--output', help='输出文件路径')
    parser.add_argument('-d', '--decode', action='store_true', help='解码模式（Base64→文件）')
    parser.add_argument('-t', '--text', help='编码文本字符串')
    parser.add_argument('-i', '--interactive', action='store_true', help='交互模式')

    args = parser.parse_args()

    # 无参数时进入交互模式
    if len(sys.argv) == 1 or args.interactive:
        interactive_mode()
        return

    tool = Base64Tool()

    # 文本编码模式
    if args.text:
        if args.decode:
            result = tool.base64_to_text(args.text)
            print(f"解码结果: {result}")
        else:
            result = tool.text_to_base64(args.text)
            print(f"编码结果: {result}")
        tool.print_elapsed()
        return

    # 文件模式
    if args.file:
        if args.decode:
            output = args.output or str(Path(args.file).parent / "output" / "decoded_file")
            try:
                with open(args.file, 'rb') as f:
                    b64_data = f.read()
                final_path = tool.base64_to_file(b64_data, output)
                print(f"解码成功: {final_path}")
            except Exception as e:
                print(f"错误: {e}")
        else:
            output = args.output or str(Path(args.file).parent / "output" / "encoded_base64.txt")
            try:
                encoded = tool.file_to_base64(args.file, output)
                print(f"编码成功: {output}")
                print(f"前 100 字符: {encoded[:100]}...")
            except Exception as e:
                print(f"错误: {e}")
        tool.print_elapsed()
        return

    parser.print_help()


if __name__ == '__main__':
    main()
