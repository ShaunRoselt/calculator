"""Package a standalone Source 2 map VPK with inline data and checksums."""

from collections import defaultdict
from hashlib import md5
from pathlib import PurePosixPath
from struct import pack, unpack_from
from zlib import crc32


def read_vpk(source):
    data = source.read_bytes()
    magic, version, tree_size = unpack_from("<III", data)
    if magic != 0x55AA1234 or version not in (1, 2):
        raise ValueError(f"Unsupported VPK {source}")
    offset = 12 if version == 1 else 28
    data_start = offset + tree_size
    files = {}

    def string():
        nonlocal offset
        end = data.index(b"\0", offset, data_start)
        result = data[offset:end].decode("utf-8")
        offset = end + 1
        return result

    while extension := string():
        while directory := string():
            while name := string():
                crc, preload, archive, position, size, terminator = unpack_from("<IHHIIH", data, offset)
                offset += 18
                if archive != 0x7FFF or terminator != 0xFFFF:
                    raise ValueError(f"Unsupported VPK entry {directory}/{name}.{extension}")
                content = data[offset:offset + preload] + data[data_start + position:data_start + position + size]
                offset += preload
                if len(content) != preload + size or crc32(content) != crc:
                    raise ValueError(f"Invalid VPK entry {directory}/{name}.{extension}")
                path = PurePosixPath("" if directory == " " else directory, name + "." + extension)
                files[str(path)] = content
    return files


def create_vpk(files):
    groups = defaultdict(lambda: defaultdict(dict))
    for name, content in files.items():
        path = PurePosixPath(name)
        groups[path.suffix[1:]][str(path.parent) if str(path.parent) != "." else " "][path.stem] = content
    tree = bytearray()
    payload = bytearray()

    def append_string(value):
        tree.extend(value.encode("utf-8") + b"\0")

    for extension, directories in sorted(groups.items()):
        append_string(extension)
        for directory, entries in sorted(directories.items()):
            append_string(directory)
            for name, content in sorted(entries.items()):
                append_string(name)
                tree.extend(pack("<IHHIIH", crc32(content), 0, 0x7FFF, len(payload), len(content), 0xFFFF))
                payload.extend(content)
            append_string("")
        append_string("")
    append_string("")
    output = pack("<7I", 0x55AA1234, 2, len(tree), len(payload), 0, 48, 0)
    output += tree + payload + md5(tree).digest() + md5(b"").digest()
    return output + md5(output).digest()
