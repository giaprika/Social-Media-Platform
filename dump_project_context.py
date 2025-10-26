#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Dump project context:
- Directory tree
- Per-file metadata
- Per-file content (text files; binary gets hexdump header)

Usage:
  python dump_project_context.py [PATH] 
    --output project_context.txt 
    --max-bytes 200000 
    --hexdump-bytes 64
    --include-binary      (nếu muốn hexdump binary)
    --no-default-excludes (bỏ các mặc định exclude)
    --exclude-dirs ".git,.idea,node_modules,dist,build"
    --exclude-globs "*.pyc,*.class,*.o,*.so,*.dll,*.exe,*.png,*.jpg,*.zip,*.tar,*.gz,*.7z,*.pdf,*.mp4,*.mp3"
"""

import os
import sys
import argparse
import datetime as dt
import hashlib
import mimetypes
from pathlib import Path

DEFAULT_EXCLUDE_DIRS = {
    ".git", ".hg", ".svn", ".idea", ".vscode",
    "__pycache__", ".mypy_cache", ".pytest_cache",
    "node_modules", "dist", "build", "target", "out",
    "venv", ".venv", "env", ".gradle", ".DS_Store"
}

DEFAULT_EXCLUDE_GLOBS = {
    "*.pyc","*.pyo","*.class","*.o","*.obj","*.so","*.dll","*.dylib","*.a","*.lib",
    "*.db","*.sqlite","*.sqlite3","*.lock",
    "*.png","*.jpg","*.jpeg","*.gif","*.webp","*.ico","*.bmp","*.psd",
    "*.mp3","*.wav","*.flac","*.mp4","*.mov","*.mkv","*.avi",
    "*.zip","*.tar","*.gz","*.bz2","*.xz","*.7z","*.rar","*.iso",
    "*.pdf","*.ppt","*.pptx","*.doc","*.docx","*.xls","*.xlsx"
}

TREE_BRANCH = "├── "
TREE_LAST   = "└── "
TREE_PIPE   = "│   "
TREE_BLANK  = "    "


def parse_args():
    p = argparse.ArgumentParser(description="Dump project directory structure and file contents.")
    p.add_argument("path", nargs="?", default=".", help="Root path to scan (default: current directory).")
    p.add_argument("--output", default="project_context.txt", help="Output file name/path (default: project_context.txt).")
    p.add_argument("--max-bytes", type=int, default=200_000, help="Max bytes to read per file content (default: 200000).")
    p.add_argument("--hexdump-bytes", type=int, default=64, help="How many bytes to hexdump for binary files (default: 64).")
    p.add_argument("--include-binary", action="store_true", help="If set, includes small hexdump headers for binary files.")
    p.add_argument("--no-default-excludes", action="store_true", help="Disable default exclude dirs/globs.")
    p.add_argument("--exclude-dirs", default="", help="Comma-separated dir names to exclude (exact match).")
    p.add_argument("--exclude-globs", default="", help="Comma-separated glob patterns to exclude.")
    return p.parse_args()


def normalize_excludes(args):
    exclude_dirs = set()
    exclude_globs = set()

    if not args.no_default_excludes:
        exclude_dirs |= DEFAULT_EXCLUDE_DIRS
        exclude_globs |= DEFAULT_EXCLUDE_GLOBS

    if args.exclude_dirs.strip():
        exclude_dirs |= {d.strip() for d in args.exclude_dirs.split(",") if d.strip()}

    if args.exclude_globs.strip():
        exclude_globs |= {g.strip() for g in args.exclude_globs.split(",") if g.strip()}

    return exclude_dirs, exclude_globs


def is_binary_file(path: Path, sample_size: int = 2048) -> bool:
    try:
        with path.open("rb") as f:
            chunk = f.read(sample_size)
        if b"\x00" in chunk:
            return True
        # Heuristic: try decoding as UTF-8; if many replacement chars would occur, treat as binary
        try:
            chunk.decode("utf-8")
            return False
        except UnicodeDecodeError:
            return True
    except Exception:
        # If unreadable, treat as binary to avoid dumping noise
        return True


def matches_any_glob(name: str, patterns: set[str]) -> bool:
    from fnmatch import fnmatch
    return any(fnmatch(name, pat) for pat in patterns)


def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    try:
        with path.open("rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return "(unavailable)"


def fmt_mtime(ts: float) -> str:
    return dt.datetime.fromtimestamp(ts).isoformat(sep=" ", timespec="seconds")


def guess_fence_lang(path: Path) -> str:
    ext = path.suffix.lower()
    mapping = {
        ".py": "python", ".js": "javascript", ".ts": "typescript",
        ".json": "json", ".yml": "yaml", ".yaml": "yaml",
        ".md": "markdown", ".txt": "", ".ini": "ini", ".toml": "toml",
        ".java": "java", ".kt": "kotlin", ".kts": "kotlin",
        ".c": "c", ".h": "c", ".hpp": "cpp", ".hh": "cpp", ".hxx": "cpp",
        ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp",
        ".cs": "csharp", ".go": "go", ".rs": "rust", ".php": "php", ".rb": "ruby",
        ".sh": "bash", ".ps1": "powershell", ".bat": "bat",
        ".sql": "sql", ".tex": "latex",
        ".css": "css", ".scss": "scss", ".html": "html", ".xml": "xml"
    }
    return mapping.get(ext, "")


def render_tree(root: Path, exclude_dirs: set[str], exclude_globs: set[str]) -> tuple[str, list[Path], int, int, int]:
    """
    Returns:
      tree_str, files_list, n_dirs, n_files, total_size
    """
    lines = []
    all_files: list[Path] = []
    n_dirs = 0
    n_files = 0
    total_size = 0

    def list_dir(dir_path: Path, prefix: str = ""):
        nonlocal n_dirs, n_files, total_size
        try:
            entries = list(dir_path.iterdir())
        except Exception:
            lines.append(prefix + TREE_LAST + f"[unreadable dir] {dir_path.name}")
            return

        # filter + sort: directories first then files, both case-insensitive
        entries = sorted(entries, key=lambda p: (not p.is_dir(), p.name.lower()))

        # Apply excludes
        filtered = []
        for e in entries:
            name = e.name
            if e.is_dir():
                if name in exclude_dirs or matches_any_glob(name, exclude_globs):
                    continue
            else:
                if matches_any_glob(name, exclude_globs):
                    continue
            filtered.append(e)

        count = len(filtered)
        for idx, e in enumerate(filtered):
            connector = TREE_LAST if idx == count - 1 else TREE_BRANCH
            line = prefix + connector + e.name
            if e.is_symlink():
                try:
                    target = os.readlink(e)
                    line += f" -> {target}"
                except OSError:
                    line += " -> (unresolved)"
            lines.append(line)

            if e.is_dir():
                n_dirs += 1
                new_prefix = prefix + (TREE_BLANK if idx == count - 1 else TREE_PIPE)
                list_dir(e, new_prefix)
            else:
                n_files += 1
                try:
                    total_size += e.stat().st_size
                except Exception:
                    pass
                all_files.append(e)

    root_line = root.resolve().name
    lines.append(root_line)
    list_dir(root, "")

    return "\n".join(lines), all_files, n_dirs, n_files, total_size


def hexdump(data: bytes, width: int = 16) -> str:
    lines = []
    for i in range(0, len(data), width):
        chunk = data[i:i+width]
        hex_part = " ".join(f"{b:02x}" for b in chunk)
        ascii_part = "".join(chr(b) if 32 <= b < 127 else "." for b in chunk)
        lines.append(f"{i:08x}  {hex_part:<{width*3}}  |{ascii_part}|")
    return "\n".join(lines)


def write_output(
    out_path: Path,
    root: Path,
    tree_str: str,
    files: list[Path],
    exclude_dirs: set[str],
    exclude_globs: set[str],
    max_bytes: int,
    include_binary: bool,
    hexdump_bytes: int
):
    ts = dt.datetime.now().isoformat(sep=" ", timespec="seconds")

    with out_path.open("w", encoding="utf-8", newline="\n") as out:
        out.write(f"# Project Context\n")
        out.write(f"Generated: {ts}\n")
        out.write(f"Root: {root.resolve()}\n")
        out.write(f"Output: {out_path.resolve().name}\n")
        out.write(f"Exclude Dirs: {sorted(exclude_dirs)}\n")
        out.write(f"Exclude Globs: {sorted(exclude_globs)}\n")
        out.write("\n")
        out.write("## Directory Structure\n")
        out.write("```\n")
        out.write(tree_str)
        out.write("\n```\n\n")

        out.write("## Files\n")

        for i, fpath in enumerate(files, start=1):
            # Avoid dumping self
            if fpath.resolve() == out_path.resolve():
                continue

            rel = fpath.relative_to(root)
            try:
                st = fpath.stat()
                size = st.st_size
                mtime = fmt_mtime(st.st_mtime)
                mode = oct(st.st_mode & 0o777)
            except Exception:
                size = -1
                mtime = "(unavailable)"
                mode = "(unavailable)"

            mime, _ = mimetypes.guess_type(str(fpath))
            mime = mime or "(unknown)"
            is_bin = is_binary_file(fpath)

            sha = sha256_of_file(fpath)

            out.write("\n")
            out.write("=" * 80 + "\n")
            out.write(f"BEGIN FILE [{i}/{len(files)}]: {rel}\n")
            out.write(f"Path: {fpath.resolve()}\n")
            out.write(f"Size: {size} bytes | Modified: {mtime} | Mode: {mode}\n")
            out.write(f"SHA256: {sha}\n")
            out.write(f"MIME: {mime} | Type: {'binary' if is_bin else 'text'}\n")

            if not fpath.exists():
                out.write("Status: (file disappeared during scan)\n")
                out.write("=" * 80 + "\n")
                continue

            if is_bin:
                if include_binary:
                    try:
                        with fpath.open("rb") as bf:
                            data = bf.read(hexdump_bytes)
                        out.write(f"\n-- Binary preview (first {len(data)} bytes) --\n")
                        out.write(hexdump(data))
                        if size > len(data):
                            out.write(f"\n-- [truncated: {size - len(data)} more bytes] --\n")
                    except Exception as e:
                        out.write(f"\n[Error reading binary file]: {e}\n")
                else:
                    out.write("\n[Binary file skipped. Use --include-binary to include a short hexdump.]\n")
            else:
                fence = guess_fence_lang(fpath)
                out.write("\n```" + fence + "\n")
                try:
                    # Read at most max_bytes for huge files
                    with fpath.open("rb") as tf:
                        raw = tf.read(max_bytes + 1)
                    text = raw.decode("utf-8", errors="replace")
                    if len(raw) > max_bytes:
                        out.write(text[:max_bytes])
                        out.write("\n```")
                        out.write(f"\n-- [truncated at {max_bytes} bytes; file size {size} bytes] --\n")
                    else:
                        out.write(text)
                        out.write("\n```")
                except Exception as e:
                    out.write("```")
                    out.write(f"\n[Error reading text file]: {e}\n")
                    out.write("```")

            out.write("\n" + "=" * 80 + "\n")

        out.write("\n# End of Project Context\n")


def main():
    args = parse_args()
    root = Path(args.path).resolve()
    if not root.exists():
        print(f"[Error] Path does not exist: {root}", file=sys.stderr)
        sys.exit(1)
    if not root.is_dir():
        print(f"[Error] Path is not a directory: {root}", file=sys.stderr)
        sys.exit(1)

    exclude_dirs, exclude_globs = normalize_excludes(args)

    # Prepare output path: default inside root
    out_path = Path(args.output)
    if not out_path.is_absolute():
        out_path = root / out_path.name

    tree_str, files, n_dirs, n_files, total_size = render_tree(root, exclude_dirs, exclude_globs)

    # Ensure the output file itself won't be included on second pass (already handled in writer too)
    try:
        files = [p for p in files if p.resolve() != out_path.resolve()]
    except Exception:
        pass

    write_output(
        out_path=out_path,
        root=root,
        tree_str=tree_str,
        files=files,
        exclude_dirs=exclude_dirs,
        exclude_globs=exclude_globs,
        max_bytes=args.max_bytes,
        include_binary=args.include_binary,
        hexdump_bytes=args.hexdump_bytes
    )

    print(f"Done. Wrote project context to: {out_path}")


if __name__ == "__main__":
    main()
