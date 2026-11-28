#!/usr/bin/env python3
"""Comprime las texturas de un modelo .vrm/.glb sin tocar huesos, visemas ni metadatos VRM.

Las texturas RGB pasan de PNG a JPEG (formato estándar de glTF); las que tienen
transparencia se quedan en PNG optimizado. Uso:

    python3 scripts/comprimir-modelo.py entrada.vrm salida.vrm [--max 1024]
"""
import io
import json
import struct
import sys

from PIL import Image


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    entrada, salida = args[0], args[1]
    maximo = int(args[args.index("--max") + 1]) if "--max" in args else 1024

    d = open(entrada, "rb").read()
    assert d[:4] == b"glTF", "no es un archivo GLB/VRM"
    largo_json = struct.unpack("<I", d[12:16])[0]
    gltf = json.loads(d[20 : 20 + largo_json])
    inicio_bin = 20 + largo_json + 8
    bin_original = d[inicio_bin:]

    vistas = gltf["bufferViews"]
    datos = [bin_original[v.get("byteOffset", 0) : v.get("byteOffset", 0) + v["byteLength"]] for v in vistas]

    for img in gltf.get("images", []):
        i = img["bufferView"]
        im = Image.open(io.BytesIO(datos[i]))
        nombre = (img.get("name") or "").lower()
        if max(im.size) > maximo:
            im.thumbnail((maximo, maximo), Image.LANCZOS)
        if "thumbnail" in nombre:
            im.thumbnail((256, 256), Image.LANCZOS)
        buf = io.BytesIO()
        if im.mode == "P":
            im = im.convert("RGBA")
        # VRoid exporta todo en RGBA aunque sea opaco: si el alfa es 255 en todo, se trata como RGB
        if im.mode in ("RGBA", "LA") and im.getchannel("A").getextrema()[0] == 255:
            im = im.convert("RGB")
        if im.mode in ("RGBA", "LA"):
            im.save(buf, "PNG", optimize=True)
            tipo = "image/png"
        else:
            calidad = 92 if nombre.startswith("nm_") or "_nml" in nombre else 85  # mapas de normales con más calidad
            im.convert("RGB").save(buf, "JPEG", quality=calidad, optimize=True)
            tipo = "image/jpeg"
        if len(buf.getvalue()) < len(datos[i]):  # solo se reemplaza si de verdad pesa menos
            datos[i] = buf.getvalue()
            img["mimeType"] = tipo

    # reconstruye el buffer binario con alineación de 4 bytes
    nuevo = bytearray()
    for v, b in zip(vistas, datos):
        while len(nuevo) % 4:
            nuevo.append(0)
        v["byteOffset"] = len(nuevo)
        v["byteLength"] = len(b)
        nuevo.extend(b)
    while len(nuevo) % 4:
        nuevo.append(0)
    gltf["buffers"][0]["byteLength"] = len(nuevo)

    js = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    while len(js) % 4:
        js += b" "
    total = 12 + 8 + len(js) + 8 + len(nuevo)
    with open(salida, "wb") as f:
        f.write(b"glTF" + struct.pack("<II", 2, total))
        f.write(struct.pack("<I", len(js)) + b"JSON" + js)
        f.write(struct.pack("<I", len(nuevo)) + b"BIN\x00" + bytes(nuevo))
    print(f"{entrada}: {len(d)/1e6:.1f} MB -> {salida}: {total/1e6:.1f} MB")


if __name__ == "__main__":
    main()
