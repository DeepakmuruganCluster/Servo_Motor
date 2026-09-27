#!/usr/bin/env python3
"""One-time offline conversion: Siemens motor STEP files -> Draco-compressed glTF binary
(.glb) for the web 3D viewer in js/servo-app.js (renderSelectedMotorDetails).

Not run by the server — run manually whenever new motor STEP files are added to Step/.

Requires a Python env with cadquery installed (bundles OpenCascade via cadquery-ocp):
    python3 -m venv venv && source venv/bin/activate && pip install cadquery

Also requires Node/npx (for the Draco compression pass via @gltf-transform/cli — OpenCascade's
own Draco writer binding (RWGltf_DracoParameters) is present in cadquery-ocp but its config
fields aren't exposed through the Python wrapper, so it silently no-ops; gltf-transform is the
practical path):
    npx --yes @gltf-transform/cli draco <in>.glb <out>.glb

Usage:
    python3 scripts/convert_motor_cad.py
"""
import glob
import os
import subprocess
import time

from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TDocStd import TDocStd_Document
from OCP.XCAFApp import XCAFApp_Application
from OCP.XCAFDoc import XCAFDoc_DocumentTool
from OCP.TCollection import TCollection_ExtendedString
from OCP.IFSelect import IFSelect_RetDone
from OCP.RWGltf import RWGltf_CafWriter
from OCP.TColStd import TColStd_IndexedDataMapOfStringString
from OCP.Message import Message_ProgressRange
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.TDF import TDF_LabelSequence

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STEP_DIR = os.path.join(REPO_ROOT, "Step")
OUT_DIR = os.path.join(REPO_ROOT, "assets", "motor-models")

# Linear/angular deflection for BRepMesh tessellation (mm / rad). Smaller = smoother curves,
# bigger file. 0.1mm has looked clean on these motor sizes (60-140mm) without excessive size.
MESH_LINEAR_DEFLECTION = 0.1
MESH_ANGULAR_DEFLECTION = 0.5


def step_to_glb(stp_path, glb_path):
    app = XCAFApp_Application.GetApplication_s()
    doc = TDocStd_Document(TCollection_ExtendedString("XmlXCAF"))
    app.InitDocument(doc)

    reader = STEPCAFControl_Reader()
    reader.SetColorMode(True)
    reader.SetNameMode(True)
    reader.SetLayerMode(True)
    if reader.ReadFile(stp_path) != IFSelect_RetDone:
        raise RuntimeError("STEP read failed")
    if not reader.Transfer(doc):
        raise RuntimeError("XDE transfer failed")

    shape_tool = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())
    labels = TDF_LabelSequence()
    shape_tool.GetFreeShapes(labels)
    for i in range(1, labels.Length() + 1):
        shape = shape_tool.GetShape_s(labels.Value(i))
        BRepMesh_IncrementalMesh(shape, MESH_LINEAR_DEFLECTION, False, MESH_ANGULAR_DEFLECTION, True)

    writer = RWGltf_CafWriter(glb_path, True)
    meta = TColStd_IndexedDataMapOfStringString()
    if not writer.Perform(doc, meta, Message_ProgressRange()):
        raise RuntimeError("glTF write failed")


def draco_compress(glb_path):
    tmp_path = glb_path + ".draco.tmp"
    subprocess.run(
        ["npx", "--yes", "@gltf-transform/cli", "draco", glb_path, tmp_path],
        check=True, capture_output=True, text=True,
    )
    os.replace(tmp_path, glb_path)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    stp_files = sorted(glob.glob(os.path.join(STEP_DIR, "*", "*.stp")))
    print(f"found {len(stp_files)} STEP files in {STEP_DIR}")

    ok_count = 0
    for stp_path in stp_files:
        pn = os.path.splitext(os.path.basename(stp_path))[0]
        glb_path = os.path.join(OUT_DIR, f"{pn}.glb")
        t0 = time.time()
        try:
            step_to_glb(stp_path, glb_path)
            uncompressed_kb = os.path.getsize(glb_path) / 1024
            draco_compress(glb_path)
            compressed_kb = os.path.getsize(glb_path) / 1024
            print(f"OK   {pn}  {uncompressed_kb:.0f}KB -> {compressed_kb:.0f}KB  ({time.time()-t0:.2f}s)")
            ok_count += 1
        except Exception as e:
            print(f"FAIL {pn}  {e}")

    print(f"\n{ok_count}/{len(stp_files)} converted successfully")


if __name__ == "__main__":
    main()
