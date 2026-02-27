"""
Background script for exporting any object type to .blend files.
Runs in separate Blender process to avoid affecting current scene.

This script is called via subprocess from mesh_io.py to export objects
in the background without modifying the user's current project.
"""
import bpy
import sys
import argparse
from pathlib import Path


# Supported object types
SUPPORTED_OBJECT_TYPES = {
    'MESH', 'LIGHT', 'CAMERA', 'ARMATURE', 'CURVE', 'SURFACE',
    'META', 'FONT', 'LATTICE', 'GPENCIL', 'VOLUME'
}


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Export any object to .blend file in background')
    
    parser.add_argument('--empty_blend', required=True,
                       help='Path to empty.blend template file')
    parser.add_argument('--output_file', required=True,
                       help='Path to output .blend file')
    parser.add_argument('--obj_name', required=True,
                       help='Name of object to export')
    parser.add_argument('--obj_type', required=True,
                       choices=list(SUPPORTED_OBJECT_TYPES),
                       help='Type of object (MESH, LIGHT, CAMERA, ARMATURE, etc.)')
    parser.add_argument('--library_file', required=True,
                       help='Path to temporary library file with object data')
    parser.add_argument('--obj_location', nargs=3, type=float, default=[0, 0, 0],
                       help='Object location (x, y, z)')
    parser.add_argument('--obj_rotation', nargs=3, type=float, default=[0, 0, 0],
                       help='Object rotation (x, y, z) in radians')
    parser.add_argument('--obj_scale', nargs=3, type=float, default=[1, 1, 1],
                       help='Object scale (x, y, z)')
    
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:])


def export_object_to_blend(args):
    """
    Export object from library to empty.blend and save.
    
    Args:
        args: Parsed command line arguments
        
    Raises:
        ValueError: If object type is not supported or object creation fails
        FileNotFoundError: If required files are not found
    """
    # Validate object type
    if args.obj_type not in SUPPORTED_OBJECT_TYPES:
        raise ValueError(
            f"Unsupported object type: {args.obj_type}. "
            f"Supported types: {SUPPORTED_OBJECT_TYPES}"
        )
    
    # Validate file paths
    empty_blend_path = Path(args.empty_blend)
    if not empty_blend_path.exists():
        raise FileNotFoundError(f"Empty blend file not found: {empty_blend_path}")
    
    library_path = Path(args.library_file)
    if not library_path.exists():
        raise FileNotFoundError(f"Library file not found: {library_path}")
    
    # Open empty.blend
    bpy.ops.wm.open_mainfile(filepath=str(empty_blend_path))
    
    # Load object from library
    with bpy.data.libraries.load(args.library_file, link=False) as (data_from, data_to):
        # Load object data based on type
        obj_type = args.obj_type
        
        if obj_type == 'MESH':
            if data_from.meshes:
                data_to.meshes = data_from.meshes
        elif obj_type == 'LIGHT':
            if data_from.lights:
                data_to.lights = data_from.lights
        elif obj_type == 'CAMERA':
            if data_from.cameras:
                data_to.cameras = data_from.cameras
        elif obj_type == 'ARMATURE':
            if data_from.armatures:
                data_to.armatures = data_from.armatures
        elif obj_type == 'CURVE':
            if data_from.curves:
                data_to.curves = data_from.curves
        elif obj_type == 'SURFACE':
            if data_from.surfaces:
                data_to.surfaces = data_from.surfaces
        elif obj_type == 'META':
            if data_from.metaballs:
                data_to.metaballs = data_from.metaballs
        elif obj_type == 'FONT':
            # FONT objects are stored as TextCurve in bpy.data.curves, not bpy.data.fonts
            if data_from.curves:
                data_to.curves = data_from.curves
        elif obj_type == 'LATTICE':
            if data_from.lattices:
                data_to.lattices = data_from.lattices
        elif obj_type == 'GPENCIL':
            if data_from.grease_pencils:
                data_to.grease_pencils = data_from.grease_pencils
        elif obj_type == 'VOLUME':
            if data_from.volumes:
                data_to.volumes = data_from.volumes
        
        # Load materials (for objects that can have materials)
        if data_from.materials:
            data_to.materials = data_from.materials
        
        # Load node groups
        if data_from.node_groups:
            data_to.node_groups = data_from.node_groups
        
        # Load images
        if data_from.images:
            data_to.images = data_from.images
    
    # Create object from loaded data
    obj = None
    obj_type = args.obj_type
    
    if obj_type == 'MESH' and data_to.meshes:
        mesh = data_to.meshes[0]
        obj = bpy.data.objects.new(args.obj_name, mesh)
        # Apply materials
        if data_to.materials:
            for mat in data_to.materials:
                mesh.materials.append(mat)
    elif obj_type == 'LIGHT' and data_to.lights:
        light = data_to.lights[0]
        obj = bpy.data.objects.new(args.obj_name, light)
    elif obj_type == 'CAMERA' and data_to.cameras:
        camera = data_to.cameras[0]
        obj = bpy.data.objects.new(args.obj_name, camera)
    elif obj_type == 'ARMATURE' and data_to.armatures:
        armature = data_to.armatures[0]
        obj = bpy.data.objects.new(args.obj_name, armature)
    elif obj_type == 'CURVE' and data_to.curves:
        curve = data_to.curves[0]
        obj = bpy.data.objects.new(args.obj_name, curve)
    elif obj_type == 'SURFACE' and data_to.surfaces:
        surface = data_to.surfaces[0]
        obj = bpy.data.objects.new(args.obj_name, surface)
    elif obj_type == 'META' and data_to.metaballs:
        metaball = data_to.metaballs[0]
        obj = bpy.data.objects.new(args.obj_name, metaball)
    elif obj_type == 'FONT' and data_to.curves:
        # FONT objects use TextCurve from bpy.data.curves
        # Find the TextCurve (curves with type 'FONT')
        text_curve = None
        for curve in data_to.curves:
            if curve.type == 'FONT':
                text_curve = curve
                break
        if text_curve:
            obj = bpy.data.objects.new(args.obj_name, text_curve)
    elif obj_type == 'LATTICE' and data_to.lattices:
        lattice = data_to.lattices[0]
        obj = bpy.data.objects.new(args.obj_name, lattice)
    elif obj_type == 'GPENCIL' and data_to.grease_pencils:
        gpencil = data_to.grease_pencils[0]
        obj = bpy.data.objects.new(args.obj_name, gpencil)
    elif obj_type == 'VOLUME' and data_to.volumes:
        volume = data_to.volumes[0]
        obj = bpy.data.objects.new(args.obj_name, volume)
    
    if obj:
        # Set transform
        obj.location = tuple(args.obj_location)
        obj.rotation_euler = tuple(args.obj_rotation)
        obj.scale = tuple(args.obj_scale)
        
        # Add to scene
        bpy.context.collection.objects.link(obj)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
    else:
        raise ValueError(f"Failed to create object of type {obj_type} from library data")
    
    # Save file
    output_path = Path(args.output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_path), check_existing=False)


if __name__ == "__main__":
    try:
        args = parse_args()
        export_object_to_blend(args)
    except Exception as e:
        import logging
        logging.basicConfig(level=logging.ERROR)
        logger = logging.getLogger(__name__)
        logger.error(f"Error in background export: {e}", exc_info=True)
        print(f"Error in background export: {e}", file=sys.stderr)  # Keep for console visibility
        sys.exit(1)
