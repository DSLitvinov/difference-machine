"""
Mesh import/export functionality for Difference Machine.
Contains functions for exporting and importing meshes with materials and textures.
"""

import json
import logging
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple

import bpy

# Use configured logger from logging_config
try:
    from ..utils.logging_config import get_logger
    logger = get_logger(__name__)
except ImportError:
    logger = logging.getLogger(__name__)

# Optional Forester bindings: provide a fallback hasher if bindings are missing.
try:
    from ..forester.core.hashing import compute_file_hash  # type: ignore
except ImportError:
    import hashlib

    def compute_file_hash(path: Path) -> str:
        """Fallback SHA256 hashing if Forester bindings are unavailable."""
        h = hashlib.sha256()
        with path.open("rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()

# Constants
MAX_TEXTURE_SIZE_MB = 50
FILE_READ_CHUNK_SIZE = 8192
DEFAULT_COMPARISON_OFFSET = 2.0

# Node type mapping for special cases where simple conversion doesn't work
NODE_TYPE_MAP = {
    # Common node types that don't follow the simple pattern
    'CURVE_FLOAT': 'ShaderNodeFloatCurve',
    'CURVE_RGB': 'ShaderNodeRGBCurve',
    'CURVE_VEC': 'ShaderNodeVectorCurve',
    'MAP_RANGE': 'ShaderNodeMapRange',
    'RGB': 'ShaderNodeRGB',
    'VALUE': 'ShaderNodeValue',
    'VALTORGB': 'ShaderNodeValToRGB',  # ColorRamp
    'RGBTOBW': 'ShaderNodeRGBToBW',
    # Add more special cases as needed
}


# ========== EXPORT FUNCTIONS ==========

def get_empty_blend_path() -> Path:
    """
    Get path to empty.blend file from addon's empty_files directory.
    
    Returns:
        Path to empty.blend file
        
    Raises:
        FileNotFoundError: If empty.blend file doesn't exist
    """
    # Get addon directory path
    # __file__ will be operators/mesh_io.py, so we go up two levels
    addon_dir = Path(__file__).parent.parent
    empty_blend_path = addon_dir / "empty_files" / "empty.blend"
    
    if not empty_blend_path.exists():
        raise FileNotFoundError(
            f"empty.blend not found at {empty_blend_path}. "
            "Please ensure empty.blend exists in the empty_files directory."
        )
    
    return empty_blend_path


def export_mesh_to_blend(
    obj: bpy.types.Object,
    output_path: Path
) -> Tuple[Path, Dict[str, Any]]:
    """
    Export mesh to .blend file + metadata JSON for diff and textures.
    
    Args:
        obj: Blender mesh object
        output_path: Directory to save mesh files
    
    Returns:
        Tuple of (blend_path, metadata_dict)
    """
    blend_path = output_path / "mesh.blend"
    
    # Save object name for metadata use
    obj_name = obj.name
    
    # Extract JSON for diff (always export all data)
    mesh_json, material_json = export_mesh_to_json(obj)
    
    # Save .blend file in background process (doesn't affect current scene)
    _save_object_to_blend(obj, blend_path)
    
    # IMPORTANT: Use saved obj_name, NOT obj.name (obj is already invalid!)
    # Save metadata
    metadata = {
        'mesh_json': mesh_json,  # For diff
        'material_json': material_json,  # For diff and textures
        'object_name': obj_name,  # Use saved name
    }
    
    metadata_path = output_path / "mesh_metadata.json"
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    return blend_path, metadata


def _save_object_to_blend(
    obj: bpy.types.Object,
    output_path: Path,
    timeout: int = 60
) -> None:
    """
    Save any object type to minimal .blend file using background process.
    
    Uses subprocess to run Blender in background mode with empty.blend template,
    avoiding any impact on the current scene.
    
    Args:
        obj: Blender object of any type (MESH, LIGHT, CAMERA, ARMATURE, etc.)
        output_path: Path to save .blend file
        timeout: Timeout in seconds for subprocess (default: 60)
        
    Raises:
        FileNotFoundError: If empty.blend template is not found
        subprocess.CalledProcessError: If background export fails
        subprocess.TimeoutExpired: If export times out
    """
    import tempfile
    import subprocess
    
    # Validate object type
    SUPPORTED_TYPES = {'MESH', 'LIGHT', 'CAMERA', 'ARMATURE', 'CURVE', 'SURFACE', 
                       'META', 'FONT', 'LATTICE', 'GPENCIL', 'VOLUME'}
    obj_type = obj.type
    if obj_type not in SUPPORTED_TYPES:
        raise ValueError(f"Unsupported object type: {obj_type}. Supported types: {SUPPORTED_TYPES}")
    
    # Save all object data BEFORE any operations
    obj_name = obj.name
    obj_location = tuple(obj.location)
    obj_rotation = tuple(obj.rotation_euler)
    obj_scale = tuple(obj.scale)
    
    # Get path to empty.blend
    empty_blend_path = get_empty_blend_path()
    
    # Use TemporaryDirectory for automatic cleanup
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_lib_path = Path(temp_dir) / "library.blend"
        
        try:
            # Collect all data blocks to save
            data_blocks_to_save = set()
            data_blocks_to_save.add(obj)
            
            # Add data block depending on object type
            if obj.data:
                data_blocks_to_save.add(obj.data)
                
                # For meshes, add materials and their dependencies
                if obj_type == 'MESH' and obj.material_slots:
                    for slot in obj.material_slots:
                        if slot.material:
                            data_blocks_to_save.add(slot.material)
                            if slot.material.use_nodes and slot.material.node_tree:
                                data_blocks_to_save.add(slot.material.node_tree)
                                for node in slot.material.node_tree.nodes:
                                    if node.type == 'TEX_IMAGE' and node.image:
                                        data_blocks_to_save.add(node.image)
            
            # Save data to library (WITHOUT clearing current scene)
            bpy.data.libraries.write(str(temp_lib_path), data_blocks_to_save, fake_user=True)
            
            # Launch Blender in background mode for export
            script_path = Path(__file__).parent / "object_export_background.py"
            
            if not script_path.exists():
                raise FileNotFoundError(
                    f"Background export script not found at {script_path}. "
                    "Please ensure object_export_background.py exists in operators directory."
                )
            
            # Prepare arguments for background process
            cmd = [
                bpy.app.binary_path,
                '--background',
                '--python', str(script_path),
                '--',
                '--empty_blend', str(empty_blend_path),
                '--output_file', str(output_path),
                '--obj_name', obj_name,
                '--obj_type', obj_type,
                '--library_file', str(temp_lib_path),
                '--obj_location', str(obj_location[0]), str(obj_location[1]), str(obj_location[2]),
                '--obj_rotation', str(obj_rotation[0]), str(obj_rotation[1]), str(obj_rotation[2]),
                '--obj_scale', str(obj_scale[0]), str(obj_scale[1]), str(obj_scale[2])
            ]
            
            logger.debug(f"Running background export: {' '.join(cmd)}")
            
            # Execute background export with timeout
            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                    check=False
                )
            except subprocess.TimeoutExpired:
                error_msg = f"Background export timed out after {timeout} seconds"
                logger.error(error_msg)
                raise subprocess.TimeoutExpired(cmd, timeout)
            
            if result.returncode != 0:
                error_msg = result.stderr or result.stdout or "Unknown error"
                logger.error(f"Background export failed with code {result.returncode}: {error_msg}")
                raise subprocess.CalledProcessError(
                    result.returncode,
                    cmd,
                    output=result.stdout,
                    stderr=result.stderr
                )
            
            logger.debug(f"Background export completed successfully: {output_path}")
            
        except Exception as e:
            logger.error(f"Error during background export: {e}", exc_info=True)
            raise


def export_mesh_to_json(
    obj: bpy.types.Object
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Export Blender mesh object to JSON format with texture tracking.
    Always exports all available data.
    
    Args:
        obj: Blender mesh object
        
    Returns:
        Dict with mesh_json and material_json
    """
    mesh = obj.data
    mesh_json = {}
    material_json = {}
    
    # Vertices (always export)
    mesh_json['vertices'] = [[v.co.x, v.co.y, v.co.z] for v in mesh.vertices]
    
    # Faces (always export)
    if mesh.polygons:
        mesh_json['faces'] = [[v for v in face.vertices] for face in mesh.polygons]
    elif mesh.loops:
        # Fallback for older mesh format
        mesh_json['faces'] = []
    
    # UV coordinates (always export if available)
    if mesh.uv_layers.active:
        uv_layer = mesh.uv_layers.active.data
        mesh_json['uv'] = [[uv.uv.x, uv.uv.y] for uv in uv_layer]
    
    # Normals (always export)
    mesh_json['normals'] = [[v.normal.x, v.normal.y, v.normal.z] for v in mesh.vertices]
    
    # Materials with texture tracking (always export if available)
    if obj.material_slots:
        if obj.material_slots[0].material:
            mat = obj.material_slots[0].material
            material_json = {
                'name': mat.name,
                'use_nodes': mat.use_nodes,
                'diffuse_color': list(mat.diffuse_color[:4]),
                'specular_color': list(mat.specular_color[:3]),
                'roughness': float(mat.roughness),
                'metallic': float(mat.metallic),
                'textures': []  # List of textures with paths and hashes
            }
            
            if mat.use_nodes and mat.node_tree:
                # Collect all textures from the node tree
                textures = []
                for node in mat.node_tree.nodes:
                    if node.type == 'TEX_IMAGE' and node.image:
                        # Normalize original_path - convert to absolute and normalize separators
                        original_path = None
                        if node.image.filepath:
                            # Get absolute path
                            abs_path_str = bpy.path.abspath(node.image.filepath)
                            # Normalize path separators - use Path.as_posix() for cross-platform compatibility
                            original_path = Path(abs_path_str).as_posix()
                        
                        texture_info = {
                            'node_name': node.name,
                            'image_name': node.image.name,
                            'original_path': original_path,
                            'file_hash': None,  # Calculated during commit creation
                            'copied': False,  # Set during commit creation
                            'commit_path': None  # Texture path in commit (if copied)
                        }
                        
                        # Compute texture file hash (use available hasher with fallback)
                        if original_path:
                            abs_path = Path(original_path)
                            if abs_path.exists():
                                try:
                                    texture_info['file_hash'] = compute_file_hash(abs_path)
                                except Exception:
                                    # If hashing fails, continue without blocking export
                                    pass  # Failed to compute hash
                        
                        # If the texture is packed into the blend file
                        if node.image.packed_file:
                            texture_info['is_packed'] = True
                            texture_info['packed_size'] = len(node.image.packed_file.data)
                        else:
                            texture_info['is_packed'] = False
                        
                        textures.append(texture_info)
                
                material_json['textures'] = textures
                
                # Export full node tree structure with texture info
                material_json['node_tree'] = export_node_tree_structure(mat.node_tree, textures)
    
    # Metadata
    mesh_json['metadata'] = {
        'object_name': obj.name,
        'vertex_count': len(mesh.vertices),
        'face_count': len(mesh.polygons) if mesh.polygons else 0,
    }
    
    # Ensure mesh_json is never empty - at minimum contains metadata
    if not mesh_json or len(mesh_json) == 0:
        logger.warning(f"export_mesh_to_json: mesh_json is empty for {obj.name}, creating minimal structure")
        mesh_json = {
            'metadata': {
                'object_name': obj.name,
                'vertex_count': len(mesh.vertices),
                'face_count': len(mesh.polygons) if mesh.polygons else 0,
            },
            'vertices': [],
            'faces': []
        }
    # Ensure at least vertices and faces exist (even if empty) for diff compatibility
    if 'vertices' not in mesh_json:
        mesh_json['vertices'] = []
    if 'faces' not in mesh_json:
        mesh_json['faces'] = []
    
    return mesh_json, material_json


def export_node_tree_structure(
    node_tree: bpy.types.NodeTree,
    textures_info: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Экспортирует структуру node tree с информацией о текстурах для TEX_IMAGE узлов.
    Основано на коде из difference_engine для полной совместимости.
    
    Args:
        node_tree: Blender node tree
        textures_info: Список информации о текстурах (опционально)
    """
    nodes_data = []
    links_data = []
    
    # Build texture lookup map by node name
    texture_map = {}
    if textures_info:
        for tex_info in textures_info:
            node_name = tex_info.get('node_name')
            if node_name:
                texture_map[node_name] = tex_info
    
    for node in node_tree.nodes:
        node_data = {
            'name': node.name,
            'type': node.type,
            'location': [float(node.location.x), float(node.location.y)],
            'width': float(node.width),
            'inputs': [],
            'outputs': [],
            'properties': {}
        }
        
        # Export common node properties
        _export_node_properties(node, node_data)
        
        # Export Node Group reference
        if node.type == 'GROUP' and hasattr(node, 'node_tree') and node.node_tree:
            node_data['properties']['node_tree_name'] = node.node_tree.name
        
        # Export ColorRamp (ValToRGB) data
        if node.type == 'VALTORGB' and hasattr(node, 'color_ramp'):
            _export_color_ramp(node, node_data)
        
        # Export Curve data (Float, RGB, Vector curves)
        if node.type in ('CURVE_FLOAT', 'CURVE_RGB', 'CURVE_VEC'):
            _export_curve_data(node, node_data)
        
        # Handle image texture nodes with enhanced validation
        if node.type == 'TEX_IMAGE' and node.image:
            _export_image_texture(node, node_data, texture_map)
        
        # Export input sockets
        _export_input_sockets(node, node_data)
        
        # Export output sockets
        _export_output_sockets(node, node_data)
        
        nodes_data.append(node_data)
    
    # Export node links
    for link in node_tree.links:
        links_data.append({
            'from_node': link.from_node.name,
            'from_socket': link.from_socket.name,
            'to_node': link.to_node.name,
            'to_socket': link.to_socket.name
        })
    
    return {
        'nodes': nodes_data,
        'links': links_data
    }


def _export_node_properties(node, node_data):
    """Export common node properties"""
    try:
        if hasattr(node, 'operation'):  # Math, VectorMath, etc.
            node_data['properties']['operation'] = node.operation
        if hasattr(node, 'blend_type'):  # Mix nodes
            node_data['properties']['blend_type'] = node.blend_type
        if hasattr(node, 'interpolation'):  # Image Texture
            node_data['properties']['interpolation'] = node.interpolation
        if hasattr(node, 'extension'):  # Image Texture
            node_data['properties']['extension'] = node.extension
        if hasattr(node, 'color_space'):  # Image Texture
            node_data['properties']['color_space'] = node.color_space
        if hasattr(node, 'label'):
            node_data['properties']['label'] = node.label
        if hasattr(node, 'hide'):
            node_data['properties']['hide'] = node.hide
        if hasattr(node, 'mute'):
            node_data['properties']['mute'] = node.mute
    except Exception as e:
        logger.warning(f"Failed to export properties for node {node.name}: {e}")


def _export_color_ramp(node, node_data):
    """Export ColorRamp data"""
    try:
        ramp = node.color_ramp
        ramp_data = {
            'color_mode': ramp.color_mode,
            'interpolation': ramp.interpolation,
            'elements': []
        }
        for element in ramp.elements:
            ramp_data['elements'].append({
                'position': float(element.position),
                'color': [float(element.color[0]), float(element.color[1]), 
                         float(element.color[2]), float(element.color[3])]
            })
        node_data['properties']['color_ramp'] = ramp_data
    except Exception as e:
        logger.warning(f"Failed to export color ramp for node {node.name}: {e}")


def _export_curve_data(node, node_data):
    """Export curve data"""
    try:
        if hasattr(node, 'mapping'):
            mapping = node.mapping
            curves_data = {
                'use_clip': mapping.use_clip if hasattr(mapping, 'use_clip') else True,
                'curves': []
            }
            for curve in mapping.curves:
                curve_points = []
                for point in curve.points:
                    curve_points.append({
                        'location': [float(point.location[0]), float(point.location[1])],
                        'handle_type': point.handle_type
                    })
                curves_data['curves'].append(curve_points)
            node_data['properties']['mapping'] = curves_data
    except Exception as e:
        logger.warning(f"Failed to export curve data for node {node.name}: {e}")


def _export_image_texture(node, node_data, texture_map):
    """Export image texture with enhanced validation"""
    try:
        node_data['image'] = node.image.name
        node_data['image_file'] = node.image.filepath
        
        # Add texture info from texture_map (for import compatibility)
        texture_info = texture_map.get(node.name)
        if texture_info:
            # If the texture was copied into the commit, save the path
            if texture_info.get('copied') and texture_info.get('commit_path'):
                # Ensure commit_path is a string, not PosixPath
                commit_path = str(texture_info['commit_path'])
                # Normalize path separators using Path.as_posix()
                commit_path = Path(commit_path).as_posix()
                # Remove "textures/" prefix if present
                if commit_path.startswith('textures/'):
                    commit_path = commit_path.replace('textures/', '', 1)
                node_data['copied_texture'] = commit_path
            # Save original file path
            if texture_info.get('original_path'):
                node_data['image_file'] = texture_info['original_path']
        
        # Handle packed images
        if node.image.packed_file:
            node_data['was_packed'] = True
        else:
            node_data['was_packed'] = False
            
    except Exception as e:
        logger.warning(f"Failed to export image texture for node {node.name}: {e}")


def _export_input_sockets(node, node_data):
    """Export input sockets"""
    try:
        for input_socket in node.inputs:
            # Handle default_value which might be a Blender type (Vector, Color, etc.)
            default_val = getattr(input_socket, 'default_value', None)
            
            # Convert default values safely
            safe_default = None
            if default_val is not None:
                try:
                    # Try to convert to list (works for Vector, Color, etc.)
                    if hasattr(default_val, '__len__') and not isinstance(default_val, str):
                        safe_default = [float(v) for v in default_val]
                    else:
                        # Single value (float, int, bool)
                        safe_default = float(default_val) if isinstance(default_val, (int, float)) else default_val
                except (TypeError, ValueError):
                    safe_default = None
            
            input_data = {
                'name': input_socket.name,
                'type': input_socket.type,
                'default_value': safe_default
            }
            node_data['inputs'].append(input_data)
    except Exception as e:
        logger.warning(f"Failed to export input sockets for node {node.name}: {e}")


def _export_output_sockets(node, node_data):
    """Export output sockets"""
    try:
        for output_socket in node.outputs:
            output_data = {
                'name': output_socket.name,
                'type': output_socket.type
            }
            node_data['outputs'].append(output_data)
    except Exception as e:
        logger.warning(f"Failed to export output sockets for node {node.name}: {e}")


def get_socket_default_value(
    socket: bpy.types.NodeSocket
) -> Optional[Any]:
    """
    Получает значение по умолчанию из сокета, конвертируя в JSON-совместимый формат.
    
    Args:
        socket: Blender node socket
    
    Returns:
        Default value in JSON-compatible format or None
    """
    try:
        default_val = getattr(socket, 'default_value', None)
        if default_val is None:
            return None
        
        # Convert to list for vectors, colors, etc.
        if hasattr(default_val, '__len__') and not isinstance(default_val, str):
            return [float(v) for v in default_val]
        else:
            # Single value (float, int, bool)
            return float(default_val) if isinstance(default_val, (int, float)) else default_val
    except Exception:
        return None


# ========== IMPORT FUNCTIONS ==========

def _find_object_in_blend_file(
    blend_path: Path,
    object_name: str,
    object_type: Optional[str] = None
) -> Optional[str]:
    """
    Find object by name in a .blend file without fully loading it.
    Improved version that checks all objects and supports partial matching.
    
    Args:
        blend_path: Path to .blend file
        object_name: Name of object to find
        object_type: Optional object type filter (MESH, LIGHT, etc.)
    
    Returns:
        Object name if found, None otherwise
    """
    logger.debug(f"_find_object_in_blend_file: Looking for '{object_name}' (type: {object_type}) in {blend_path}")
    
    if not blend_path.exists():
        logger.warning(f"Blend file does not exist: {blend_path}")
        return None
    
    try:
        target_name = _normalize_object_name(object_name)
        exact_name = None
        catalog_objects: list = []
        existing_before: set = set()

        with bpy.data.libraries.load(str(blend_path), link=False) as (data_from, data_to):
            catalog_objects = list(data_from.objects)
            logger.debug(f"File contains {len(catalog_objects)} objects")
            if catalog_objects:
                logger.debug(f"Object names in file: {catalog_objects[:20]}")

            if object_name in data_from.objects:
                exact_name = object_name
            else:
                for candidate_name in data_from.objects:
                    if _normalize_object_name(candidate_name) == target_name:
                        exact_name = candidate_name
                        break

            if exact_name and not object_type:
                logger.debug(f"✓ Exact match found (no type check): '{exact_name}'")
                return exact_name

            if exact_name and object_type:
                logger.debug(f"Found exact match: '{exact_name}'")
            elif catalog_objects:
                existing_before = set(bpy.data.objects.keys())
                data_to.objects = catalog_objects

        if exact_name and object_type:
            existing_before = set(bpy.data.objects.keys())
            with bpy.data.libraries.load(str(blend_path), link=False) as (data_from, data_to):
                if exact_name in data_from.objects:
                    data_to.objects = [exact_name]
            for name in sorted(set(bpy.data.objects.keys()) - existing_before):
                obj = bpy.data.objects.get(name)
                if obj and obj.type == object_type:
                    bpy.data.objects.remove(obj)
                    logger.debug(f"✓ Exact match found and type matches: '{exact_name}'")
                    return exact_name
            logger.debug(f"✓ Exact match found in file catalog: '{exact_name}'")
            return exact_name

        if not exact_name and catalog_objects:
            loaded_objects = []
            for name in sorted(set(bpy.data.objects.keys()) - existing_before):
                obj = bpy.data.objects.get(name)
                if obj:
                    loaded_objects.append(obj)

            logger.debug(f"Loaded {len(loaded_objects)} new objects from file")
            for obj in loaded_objects:
                logger.debug(f"  Checking object: '{obj.name}' (type: {obj.type})")
                obj_norm = _normalize_object_name(obj.name)
                if (obj.name == object_name or
                        obj.name.lower() == object_name.lower() or
                        object_name in obj.name or
                        obj.name in object_name or
                        obj_norm == target_name):
                    if not object_type or obj.type == object_type:
                        obj_name = obj.name
                        logger.debug(f"✓ Found matching object: '{obj_name}' (type: {obj.type})")
                        for loaded_obj in loaded_objects:
                            bpy.data.objects.remove(loaded_obj)
                        return obj_name

            logger.debug(f"No matching object found in {len(loaded_objects)} objects")
            for obj in loaded_objects:
                bpy.data.objects.remove(obj)
    except Exception as e:
        logger.error(f"Failed to check blend file {blend_path}: {e}", exc_info=True)
    
    logger.debug(f"✗ Object '{object_name}' (type: {object_type}) not found in {blend_path}")
    return None


def _resolve_blend_object_name(blend_path: Path, object_name: str) -> Optional[str]:
    """Resolve an object name in a .blend file without loading datablocks into the scene."""
    if not blend_path.exists():
        return None
    try:
        with bpy.data.libraries.load(str(blend_path), link=False) as (data_from, data_to):
            if object_name in data_from.objects:
                return object_name
            target_name = _normalize_object_name(object_name)
            for candidate_name in data_from.objects:
                if _normalize_object_name(candidate_name) == target_name:
                    return candidate_name
    except Exception as e:
        logger.warning("Failed to resolve object '%s' in %s: %s", object_name, blend_path, e)
    return None


def _normalize_object_name(name: str) -> str:
    prefix = "_temp_import_"
    if name.startswith(prefix):
        name = name[len(prefix):]
    if len(name) > 4 and name[-4] == "." and name[-3:].isdigit():
        return name[:-4]
    return name


def import_mesh_from_blend(
    blend_path: Path,
    mesh_name: str,
    context: bpy.types.Context
) -> Optional[bpy.types.Object]:
    """
    Import mesh from .blend file.
    
    Args:
        blend_path: Path to .blend file
        mesh_name: Name of mesh object to import
        context: Blender context
    
    Returns:
        Imported object or None
    """
    if not blend_path.exists():
        logger.error(f"Blend file not found: {blend_path}")
        return None
    
    try:
        with bpy.data.libraries.load(str(blend_path), link=False) as (data_from, data_to):
            if mesh_name in data_from.objects:
                data_to.objects = [mesh_name]
            else:
                # If name not found, use the first mesh object
                mesh_objects = [name for name in data_from.objects 
                              if name in data_from.objects]
                if mesh_objects:
                    data_to.objects = [mesh_objects[0]]
                else:
                    logger.warning(f"Mesh '{mesh_name}' not found in {blend_path}")
                    return None
        
        for obj in data_to.objects:
            context.collection.objects.link(obj)
            obj.select_set(True)
            context.view_layer.objects.active = obj
            return obj
        
        return None
    except Exception as e:
        logger.error(f"Failed to import mesh from blend: {e}", exc_info=True)
        return None


def import_object_from_blend(
    blend_path: Path,
    object_name: str,
    object_type: str,
    context: bpy.types.Context
) -> Optional[bpy.types.Object]:
    """
    Import any object type from .blend file.
    
    Args:
        blend_path: Path to .blend file
        object_name: Name of object to import
        object_type: Object type (MESH, LIGHT, CAMERA, etc.)
        context: Blender context
    
    Returns:
        Imported object or None
    """
    if not blend_path.exists():
        logger.error(f"Blend file not found: {blend_path}")
        return None
    
    try:
        loaded_object_name = None
        with bpy.data.libraries.load(str(blend_path), link=False) as (data_from, data_to):
            # Filter objects by type if specified
            if object_name in data_from.objects:
                data_to.objects = [object_name]
                loaded_object_name = object_name
            else:
                # Try to find object by type
                if object_type:
                    # Load all objects and check type
                    if data_from.objects:
                        # Load first object to check type
                        data_to.objects = [data_from.objects[0]]
                        loaded_object_name = data_from.objects[0]
                        # We'll check type after loading
                    else:
                        return None
                else:
                    # Load first object
                    if data_from.objects:
                        data_to.objects = [data_from.objects[0]]
                        loaded_object_name = data_from.objects[0]
                    else:
                        return None
        
        # After loading, objects are in bpy.data.objects, not in data_to.objects
        # Get the loaded object from bpy.data.objects
        if loaded_object_name and loaded_object_name in bpy.data.objects:
            obj = bpy.data.objects[loaded_object_name]
            
            # Verify type
            if object_type and obj.type != object_type:
                # Wrong type, remove and return None
                bpy.data.objects.remove(obj)
                logger.debug(f"Object type mismatch: expected {object_type}, got {obj.type}")
                return None
            
            # Link to scene (but don't change active object - let caller handle selection)
            context.collection.objects.link(obj)
            # Don't select or activate - let the caller decide
            # obj.select_set(True)
            # context.view_layer.objects.active = obj
            logger.debug(f"Successfully imported object '{obj.name}' (type: {obj.type})")
            return obj
        
        logger.warning(f"Object '{loaded_object_name}' was not loaded into bpy.data.objects")
        return None
    except Exception as e:
        logger.error(f"Failed to import object from blend: {e}", exc_info=True)
        return None


def link_object_from_blend(
    blend_path: Path,
    object_name: str,
    object_type: str,
    context: bpy.types.Context
) -> Optional[bpy.types.Object]:
    """
    Link object from .blend file (creates a reference, not a copy).
    This is ideal for Compare operation - object remains a link to source file.
    Data is not duplicated in the scene.
    
    Args:
        blend_path: Path to .blend file
        object_name: Name of object to link
        object_type: Object type (MESH, LIGHT, CAMERA, etc.)
        context: Blender context
    
    Returns:
        Linked object or None
    """
    if not blend_path.exists():
        logger.error(f"Blend file not found: {blend_path}")
        return None
    
    try:
        # Link object from file (link=True creates a reference)
        linked_obj_name = None
        with bpy.data.libraries.load(str(blend_path), link=True) as (data_from, data_to):
            # Find object by name
            if object_name in data_from.objects:
                data_to.objects = [object_name]
                linked_obj_name = object_name
            else:
                # Try to find by type
                if object_type:
                    # Find first object of matching type
                    for obj_name in data_from.objects:
                        data_to.objects = [obj_name]
                        linked_obj_name = obj_name
                        break
                else:
                    # Link first object
                    if data_from.objects:
                        data_to.objects = [data_from.objects[0]]
                        linked_obj_name = data_from.objects[0]
                    else:
                        return None
        
        # After linking, find the linked object by name and library reference
        linked_obj = None
        if linked_obj_name and linked_obj_name in bpy.data.objects:
            candidate = bpy.data.objects[linked_obj_name]
            # Verify it's actually a linked object (has library attribute)
            if hasattr(candidate, 'library') and candidate.library:
                linked_obj = candidate
        
        # If not found by name, search for any linked object from this file
        if not linked_obj:
            blend_path_str = str(blend_path.resolve())  # Use absolute path for comparison
            for obj in bpy.data.objects:
                if hasattr(obj, 'library') and obj.library:
                    # Compare absolute paths
                    try:
                        lib_path = Path(obj.library.filepath).resolve()
                        if lib_path == Path(blend_path_str).resolve():
                            # Check if this matches our criteria
                            if object_name and obj.name == object_name:
                                linked_obj = obj
                                break
                            elif not object_name and object_type and obj.type == object_type:
                                linked_obj = obj
                                break
                            elif not object_name and not object_type:
                                linked_obj = obj
                                break
                    except Exception:
                        # If path comparison fails, try string comparison
                        if str(obj.library.filepath) == str(blend_path):
                            if object_name and obj.name == object_name:
                                linked_obj = obj
                                break
                            elif not object_name and object_type and obj.type == object_type:
                                linked_obj = obj
                                break
                            elif not object_name and not object_type:
                                linked_obj = obj
                                break
        
        if not linked_obj:
            logger.warning(f"Object '{object_name}' not found after linking from {blend_path}")
            return None
        
        # Verify type
        if object_type and linked_obj.type != object_type:
            # Wrong type, unlink and return None
            bpy.data.objects.remove(linked_obj)
            logger.debug(f"Object type mismatch: expected {object_type}, got {linked_obj.type}")
            return None
        
        # Link to scene collection if not already linked
        if linked_obj.name not in context.collection.objects:
            context.collection.objects.link(linked_obj)
        
        logger.debug(f"Successfully linked object '{linked_obj.name}' (type: {linked_obj.type}) from {blend_path}")
        return linked_obj
    except Exception as e:
        logger.error(f"Failed to link object from blend: {e}", exc_info=True)
        return None


# import_object_from_blend_via_empty - REMOVED (was used only for compare_object)
# import_object_from_blend_background - REMOVED (unused, direct import is safe enough)

def import_mesh_to_blender(
    context: bpy.types.Context,
    mesh_json: Dict[str, Any],
    material_json: Dict[str, Any],
    obj_name: str,
    mode: str = 'NEW',
    mesh_storage_path: Optional[Path] = None,
    material_prefix: Optional[str] = None
) -> bpy.types.Object:
    """
    Import mesh JSON data to Blender with texture loading.
    
    Args:
        context: Blender context
        mesh_json: Mesh JSON data
        material_json: Material JSON data
        obj_name: Object name
        mode: 'NEW' to create new object, 'SELECTED' to replace selected object
        mesh_storage_path: Path to mesh storage directory (for loading textures)
        material_prefix: Optional prefix to add to material name (e.g., "_compare_")
    
    Returns:
        Created or updated mesh object
    """
    if mode == 'NEW':
        # Create new mesh and object
        mesh = bpy.data.meshes.new(obj_name)
        obj = bpy.data.objects.new(obj_name, mesh)
    else:
        # Replace selected object
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            raise ValueError("No mesh object selected")
        mesh = obj.data
        # Clear existing geometry
        mesh.clear_geometry()
    
    # Import vertices
    if 'vertices' in mesh_json:
        vertices = [tuple(v) for v in mesh_json['vertices']]
        
        # Import faces - correct polygon creation
        faces = []
        if 'faces' in mesh_json:
            # Convert vertex indices to proper format for from_pydata
            faces = [tuple(f) for f in mesh_json['faces']]
        
        # Create mesh from vertices and polygons
        mesh.from_pydata(vertices, [], faces)
        
        # Recalculate normals for correct display
        mesh.update()
        
        # Create UV layer if UV data exists
        if 'uv' in mesh_json and mesh_json['uv'] and len(mesh_json['uv']) > 0:
            # Create UV layer if missing
            if not mesh.uv_layers:
                mesh.uv_layers.new(name="UVMap")
            
            uv_layer = mesh.uv_layers.active
            if uv_layer:
                # Ensure UV count matches the number of polygon vertices
                for poly in mesh.polygons:
                    for loop_index in poly.loop_indices:
                        if loop_index < len(uv_layer.data) and loop_index < len(mesh_json['uv']):
                            uv_layer.data[loop_index].uv = tuple(mesh_json['uv'][loop_index])
    
    # Import materials with textures
    if material_json and 'name' in material_json:
        # Clear existing materials
        mesh.materials.clear()
        
        # Create material name with optional prefix
        base_mat_name = material_json['name']
        if material_prefix:
            mat_name = f"{material_prefix}{base_mat_name}"
        else:
            mat_name = base_mat_name
        
        # Create new material if prefix is provided or material doesn't exist
        # If material exists and no prefix, we need to ensure node_tree is cleared
        if material_prefix or mat_name not in bpy.data.materials:
            mat = bpy.data.materials.new(name=mat_name)
        else:
            # Material exists - we need to clear and rebuild node_tree to ensure textures load correctly
            mat = bpy.data.materials[mat_name]
            # Clear existing node tree to avoid conflicts with old texture references
            if mat.node_tree:
                mat.node_tree.nodes.clear()
        
        mat.use_nodes = material_json.get('use_nodes', True)
        
        # Ensure node_tree exists (Blender creates it automatically when use_nodes=True)
        # But we need to make sure it's there before we clear/import
        if mat.use_nodes and not mat.node_tree:
            # Force node_tree creation (shouldn't happen, but just in case)
            mat.use_nodes = False
            mat.use_nodes = True
        
        # Restore basic properties
        if 'diffuse_color' in material_json:
            mat.diffuse_color = material_json['diffuse_color']
        if 'specular_color' in material_json:
            mat.specular_color = material_json['specular_color']
        if 'roughness' in material_json:
            mat.roughness = material_json['roughness']
        if 'metallic' in material_json:
            mat.metallic = material_json['metallic']
        
        # Restore node tree structure with textures loaded during node creation
        if mat.use_nodes and 'node_tree' in material_json and material_json['node_tree']:
            if mat.node_tree:
                textures_info = material_json.get('textures', []) if 'textures' in material_json else None
                import_node_tree_structure(mat.node_tree, material_json['node_tree'], 
                                         textures_info=textures_info, 
                                         mesh_storage_path=mesh_storage_path)
        
        mesh.materials.append(mat)
    
    # Final mesh update
    mesh.update()
    
    if mode == 'NEW':
        # Link to scene
        context.collection.objects.link(obj)
        context.view_layer.objects.active = obj
        obj.select_set(True)
    
    return obj


def import_node_tree_structure(
    node_tree: bpy.types.NodeTree,
    node_tree_data: Dict[str, Any],
    textures_info: Optional[List[Dict[str, Any]]] = None,
    mesh_storage_path: Optional[Path] = None
) -> None:
    """
    Импортирует структуру node tree с загрузкой текстур.
    Основано на коде из difference_engine для полной совместимости.
    
    Args:
        node_tree: Blender node tree
        node_tree_data: Данные node tree из JSON
        textures_info: Список информации о текстурах (опционально)
        mesh_storage_path: Путь к директории меша для загрузки текстур (опционально)
    """
    # Check if node_tree is valid
    if not node_tree:
        logger.error("node_tree is None or invalid")
        return
    
    logger.debug(f"Importing node tree structure. nodes count: {len(node_tree_data.get('nodes', []))}, textures_info: {len(textures_info) if textures_info else 0}, mesh_storage_path: {mesh_storage_path}")
    
    # Clear existing nodes (like in difference_engine)
    node_tree.nodes.clear()
    
    # Track created nodes for linking
    created_nodes = {}
    
    # Build texture lookup map by node name
    # Build it even if mesh_storage_path is missing - we'll still try to load from original paths
    texture_map = {}
    if textures_info:
        for tex_info in textures_info:
            node_name = tex_info.get('node_name')
            if node_name:
                texture_map[node_name] = tex_info
                logger.debug(f"Added texture to map: node_name={node_name}, copied={tex_info.get('copied')}, commit_path={tex_info.get('commit_path')}, original_path={tex_info.get('original_path')}")
    
    # Get textures directory
    textures_dir = None
    if mesh_storage_path:
        textures_dir = mesh_storage_path / "textures"
        logger.debug(f"Textures directory: {textures_dir}, exists: {textures_dir.exists() if textures_dir else False}")
    
    # Create nodes
    for node_data in node_tree_data.get('nodes', []):
        original_type = node_data.get('type', 'BSDF_PRINCIPLED')
        
        # Convert node type from internal format to class name
        if original_type.startswith('ShaderNode'):
            # Already in correct format
            node_type = original_type
        elif original_type in NODE_TYPE_MAP:
            # Use explicit mapping for special cases
            node_type = NODE_TYPE_MAP[original_type]
        else:
            # Convert using simple pattern: BSDF_PRINCIPLED -> ShaderNodeBsdfPrincipled
            # Special case for TEX_IMAGE
            if original_type == 'TEX_IMAGE':
                node_type = 'ShaderNodeTexImage'
            else:
                parts = original_type.split('_')
                formatted_name = ''.join(word.capitalize() for word in parts)
                node_type = f'ShaderNode{formatted_name}'
        
        try:
            node = node_tree.nodes.new(type=node_type)
            logger.debug(f"Created node: {node.name} (type: {node_type}, original: {original_type})")
        except Exception as e:
            logger.error(f"Failed to create node type '{node_type}' (from '{original_type}'): {e}")
            continue
        
        # Set node properties safely
        if 'name' in node_data:
            node.name = node_data['name']
            
        if 'location' in node_data:
            loc = node_data['location']
            if isinstance(loc, (list, tuple)) and len(loc) >= 2:
                node.location = [float(loc[0]), float(loc[1])]  # Only use X, Y
                
        if 'width' in node_data:
            width = node_data['width']
            if isinstance(width, (int, float)):
                node.width = float(width)
        
        # Handle image texture nodes FIRST (before other properties that depend on image being loaded)
        # Note: We create TEX_IMAGE nodes even if textures_dir doesn't exist
        # The function will try to load the texture but won't fail if it can't find it
        if original_type == 'TEX_IMAGE':
            logger.debug(f"Importing image texture node: {node.name}, textures_dir: {textures_dir}")
            _import_image_texture(node, node_data, texture_map, textures_dir)
            logger.debug(f"Finished importing image texture node: {node.name}, has image: {hasattr(node, 'image') and node.image is not None}")
        
        # Restore node properties (AFTER image is loaded for TEX_IMAGE nodes)
        if 'properties' in node_data:
            _import_node_properties(node, node_data['properties'])
        
        # Set input default values
        if 'inputs' in node_data:
            for i, input_data in enumerate(node_data['inputs']):
                if i < len(node.inputs):
                    default_value = input_data.get('default_value')
                    if default_value is not None:
                        try:
                            if isinstance(default_value, list):
                                node.inputs[i].default_value = tuple(default_value)
                            else:
                                node.inputs[i].default_value = default_value
                        except (TypeError, AttributeError, ValueError) as e:
                            # Some sockets might not accept the value or wrong size
                            pass
        
        created_nodes[node_data.get('name', node.name)] = node
    
    # Create node links (connections between nodes)
    for link_data in node_tree_data.get('links', []):
        try:
            from_node = created_nodes.get(link_data['from_node'])
            to_node = created_nodes.get(link_data['to_node'])
            
            if from_node and to_node:
                from_socket = None
                to_socket = None
                
                # Find the output socket
                for output in from_node.outputs:
                    if output.name == link_data['from_socket']:
                        from_socket = output
                        break
                
                # Find the input socket
                for input_socket in to_node.inputs:
                    if input_socket.name == link_data['to_socket']:
                        to_socket = input_socket
                        break
                
                # Create the link
                if from_socket and to_socket:
                    node_tree.links.new(from_socket, to_socket)
        except Exception as e:
            logger.warning(f"Failed to create link: {e}")


def _import_image_texture(
    node: bpy.types.ShaderNodeTexImage,
    node_data: Dict[str, Any],
    texture_map: Dict[str, Dict[str, Any]],
    textures_dir: Optional[Path]
) -> None:
    """Import image texture node with multiple path resolution strategies"""
    # Note: We don't return early if textures_dir doesn't exist
    # The node is already created, we just try to load the image
    # If textures_dir is missing, we'll try alternative paths (original_path, etc.)
    if not textures_dir or not textures_dir.exists():
        logger.debug(f"Textures directory doesn't exist: {textures_dir}, trying alternative paths")
        # Don't return - continue to try alternative paths
        textures_dir = None
    
    # Build candidate paths (like in difference_engine)
    candidate_paths = []
    node_name = node_data.get('name', node.name)
    texture_info = texture_map.get(node_name)
    
    # 1. Try copied_texture from node_data (primary method, like in difference_engine)
    if 'copied_texture' in node_data and textures_dir:
        copied_tex = node_data['copied_texture']
        # Handle both cases: just filename or path with "textures/"
        if copied_tex.startswith('textures/'):
            # Remove "textures/" prefix and use just filename
            copied_tex = copied_tex.replace('textures/', '', 1)
        candidate_paths.append(str(textures_dir / copied_tex))
    
    # 2. Try texture_info from texture_map (for backward compatibility)
    if texture_info:
        if textures_dir:
            if texture_info.get('copied') and texture_info.get('commit_path'):
                # Ensure commit_path is a string, not PosixPath
                commit_path = str(texture_info['commit_path'])
                # Normalize path separators using Path.as_posix()
                commit_path = Path(commit_path).as_posix()
                if commit_path.startswith('textures/'):
                    commit_path = commit_path.replace('textures/', '', 1)
                candidate_paths.append(str(textures_dir / commit_path))
            if texture_info.get('original_path'):
                original_basename = Path(texture_info['original_path']).name
                candidate_paths.append(str(textures_dir / original_basename))
    
    # 3. Try image_file from node_data (like in difference_engine)
    if 'image_file' in node_data:
        image_file = node_data['image_file']
        # Normalize path separators using Path.as_posix()
        normalized_image_file = Path(str(image_file)).as_posix()
        if textures_dir:
            candidate_paths.append(str(textures_dir / Path(normalized_image_file).name))
        # Always try absolute path (works even if textures_dir doesn't exist)
        candidate_paths.append(bpy.path.abspath(normalized_image_file))
    
    # 4. Try original path from texture_info (for backward compatibility)
    if texture_info and texture_info.get('original_path'):
        abs_path = bpy.path.abspath(texture_info['original_path'])
        candidate_paths.append(abs_path)
    
    # Resolve first existing path
    resolved_path = None
    for candidate in candidate_paths:
        if candidate and isinstance(candidate, str):
            candidate_path = Path(candidate)
            if candidate_path.exists() and candidate_path.is_file():
                resolved_path = candidate
                break
    
    if not resolved_path:
        logger.warning(f"Texture not found for node '{node_name}'. Tried: {candidate_paths}")
    else:
        try:
            resolved_path_obj = Path(resolved_path)
            file_size_mb = resolved_path_obj.stat().st_size / (1024 * 1024)
            if file_size_mb > MAX_TEXTURE_SIZE_MB:
                logger.warning(f"Loading large texture: {resolved_path_obj.name} ({file_size_mb:.1f} MB)")
            
            # Reuse cached image by filename when possible (like in difference_engine)
            cached_name = resolved_path_obj.name
            image = bpy.data.images.get(cached_name)
            if image:
                logger.debug(f"Reusing cached texture: {cached_name}")
                image.filepath = resolved_path
                # Force reload to ensure up-to-date display
                image.reload()
            else:
                image = bpy.data.images.load(resolved_path)
                logger.debug(f"Loaded new texture from {resolved_path}")
            
            # Assign image to node
            if hasattr(node, 'image'):
                node.image = image
                logger.debug(f"Assigned texture {cached_name} to node {node.name}")
            else:
                logger.error(f"Node {node.name} doesn't have 'image' attribute!")
        except (OSError, ValueError, PermissionError) as e:
            logger.error(f"Failed to load texture {resolved_path}: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"Unexpected error loading texture {resolved_path}: {e}", exc_info=True)


def _import_node_properties(
    node: bpy.types.ShaderNode,
    props: Dict[str, Any]
) -> None:
    """Import node properties including ColorRamp, Curve, Node Groups"""
    # Common properties
    if 'operation' in props and hasattr(node, 'operation'):
        node.operation = props['operation']
    if 'blend_type' in props and hasattr(node, 'blend_type'):
        node.blend_type = props['blend_type']
    if 'interpolation' in props and hasattr(node, 'interpolation'):
        try:
            node.interpolation = props['interpolation']
        except Exception as e:
            logger.warning(f"Failed to set interpolation: {e}")
    if 'extension' in props and hasattr(node, 'extension'):
        try:
            node.extension = props['extension']
        except Exception as e:
            logger.warning(f"Failed to set extension: {e}")
    if 'color_space' in props and hasattr(node, 'color_space'):
        try:
            node.color_space = props['color_space']
        except Exception as e:
            logger.warning(f"Failed to set color_space: {e}")
    if 'label' in props:
        node.label = props['label']
    if 'hide' in props:
        node.hide = props['hide']
    if 'mute' in props:
        node.mute = props['mute']
    
    # Node Group restoration
    if 'node_tree_name' in props and hasattr(node, 'node_tree'):
        node_tree_name = props['node_tree_name']
        # Try to find the node group in the blend file
        if node_tree_name in bpy.data.node_groups:
            node.node_tree = bpy.data.node_groups[node_tree_name]
            logger.debug(f"Restored Group node reference: {node_tree_name}")
        else:
            logger.warning(f"Node group '{node_tree_name}' not found in blend file - Group node will be empty")
    
    # ColorRamp restoration
    if 'color_ramp' in props and hasattr(node, 'color_ramp'):
        ramp_data = props['color_ramp']
        ramp = node.color_ramp
        
        # Set ramp properties
        if 'color_mode' in ramp_data:
            ramp.color_mode = ramp_data['color_mode']
        if 'interpolation' in ramp_data:
            ramp.interpolation = ramp_data['interpolation']
        
        # Restore color stops
        if 'elements' in ramp_data:
            # Clear existing elements (keep at least 2)
            while len(ramp.elements) > 2:
                ramp.elements.remove(ramp.elements[0])
            
            # Add new elements
            elements_data = ramp_data['elements']
            for i, elem_data in enumerate(elements_data):
                if i < len(ramp.elements):
                    # Update existing
                    elem = ramp.elements[i]
                else:
                    # Create new
                    elem = ramp.elements.new(elem_data['position'])
                
                elem.position = elem_data['position']
                if 'color' in elem_data:
                    elem.color = elem_data['color']
    
    # Curve restoration (Float, RGB, Vector)
    if 'mapping' in props and hasattr(node, 'mapping'):
        curves_data = props['mapping']
        mapping = node.mapping
        
        if 'use_clip' in curves_data and hasattr(mapping, 'use_clip'):
            mapping.use_clip = curves_data['use_clip']
        
        if 'curves' in curves_data:
            for curve_idx, curve_points in enumerate(curves_data['curves']):
                if curve_idx < len(mapping.curves):
                    curve = mapping.curves[curve_idx]
                    
                    # Clear existing points
                    while len(curve.points) > 0:
                        curve.points.remove(curve.points[0])
                    
                    # Add points
                    for point_data in curve_points:
                        point = curve.points.new(point_data['location'][0], 
                                                point_data['location'][1])
                        if 'handle_type' in point_data:
                            point.handle_type = point_data['handle_type']
            
            # Update the mapping
            mapping.update()


def load_textures_to_material(
    material: bpy.types.Material,
    textures_info: List[Dict[str, Any]],
    mesh_storage_path: Path
) -> None:
    """
    Загружает текстуры в материал.
    
    Args:
        material: Blender material
        textures_info: Список информации о текстурах из material_json
        mesh_storage_path: Путь к директории меша (где хранятся текстуры)
    """
    if not material.node_tree:
        logger.warning("Material has no node tree")
        return
    
    logger.debug(f"Loading textures for material: {material.name}")
    logger.debug(f"Mesh storage path: {mesh_storage_path}")
    logger.debug(f"Textures info count: {len(textures_info)}")
    
    # Debug: log all nodes in material
    logger.debug(f"Nodes in material: {[n.name + ' (' + n.type + ')' for n in material.node_tree.nodes]}")
    
    for texture_info in textures_info:
        node_name = texture_info.get('node_name')
        if not node_name:
            logger.warning("Skipping texture: no node_name")
            continue
        
        logger.debug(f"Looking for texture node: {node_name}")
        
        # Find texture node in the node tree
        texture_node = None
        for node in material.node_tree.nodes:
            if node.name == node_name and node.type == 'TEX_IMAGE':
                texture_node = node
                logger.debug(f"Found texture node: {node.name}")
                break
        
        if not texture_node:
            logger.warning(f"Texture node '{node_name}' not found in material node tree")
            continue
        
        # Determine texture path
        texture_path = None
        if texture_info.get('copied') and texture_info.get('commit_path'):
            # Texture copied into commit
            # Ensure commit_path is a string, not PosixPath
            commit_path = str(texture_info['commit_path'])
            # Normalize path separators using Path.as_posix()
            commit_path = Path(commit_path).as_posix()
            # Remove "textures/" prefix if present
            if commit_path.startswith('textures/'):
                commit_path = commit_path.replace('textures/', '', 1)
            # Use Path for cross-platform compatibility
            texture_path = mesh_storage_path / "textures" / commit_path
            logger.debug(f"Using copied texture path: {texture_path}")
        elif texture_info.get('original_path'):
            # Use original path
            original_path = str(texture_info['original_path'])
            # Normalize path separators using Path.as_posix()
            normalized_original = Path(original_path).as_posix()
            # Use bpy.path.abspath to resolve relative paths correctly
            texture_path = Path(bpy.path.abspath(normalized_original))
            logger.debug(f"Using original texture path: {texture_path} (normalized from: {original_path})")
        
        # Load texture
        if texture_path and texture_path.exists() and texture_path.is_file():
            # Check if this texture is already loaded
            image_name = texture_info.get('image_name', texture_path.name)
            image = bpy.data.images.get(image_name)
            
            if not image:
                try:
                    logger.debug(f"Loading texture: {texture_path}")
                    image = bpy.data.images.load(str(texture_path))
                    image.name = image_name
                    logger.debug(f"Texture loaded: {image.name}")
                except (OSError, ValueError, PermissionError) as e:
                    logger.error(f"Failed to load texture {texture_path}: {e}", exc_info=True)
                    continue
                except Exception as e:
                    logger.error(f"Unexpected error loading texture {texture_path}: {e}", exc_info=True)
                    continue
            else:
                # Update path if it changed
                if image.filepath != str(texture_path):
                    image.filepath = str(texture_path)
                    image.reload()
                logger.debug(f"Using existing texture: {image.name}")
            
            # Assign texture to the node
            if hasattr(texture_node, 'image'):
                texture_node.image = image
                logger.debug(f"Assigned texture {image.name} to node {texture_node.name}")
            else:
                logger.error(f"Texture node {texture_node.name} has no 'image' attribute")
        else:
            if texture_path:
                logger.warning(f"Texture path does not exist: {texture_path}")
            else:
                logger.warning(f"No texture path found for node {node_name}")


# ========== MATERIAL UPDATE HOOK FOR FORESTER ==========

def update_blender_node_tree(material_json: Dict[str, Any], textures: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Update Blender node_tree with texture paths.
    
    This function is registered as a hook in Forester to update Blender-specific
    material structures (node_tree) with texture paths after Forester processes textures.
    
    Args:
        material_json: Material JSON dict (may contain node_tree)
        textures: List of processed texture info dicts with commit_path and original_path
        
    Returns:
        Updated material_json with texture paths in node_tree nodes
    """
    # Only process if node_tree exists (Blender-specific structure)
    if 'node_tree' not in material_json or 'nodes' not in material_json['node_tree']:
        return material_json
    
    # Build texture lookup by node_name
    texture_by_node = {}
    for tex_info in textures:
        node_name = tex_info.get('node_name')
        if node_name:
            texture_by_node[node_name] = tex_info
    
    # Update TEX_IMAGE node_data with texture paths
    for node_data in material_json['node_tree']['nodes']:
        if node_data.get('type') == 'TEX_IMAGE':
            node_name = node_data.get('name')
            texture_info = texture_by_node.get(node_name)
            
            if texture_info:
                # Add copied_texture and image_file to node_data
                if texture_info.get('copied') and texture_info.get('commit_path'):
                    # Save only filename (remove "textures/" prefix if present)
                    # Ensure commit_path is a string, not PosixPath
                    commit_path = str(texture_info['commit_path'])
                    commit_path = Path(commit_path).as_posix()
                    if commit_path.startswith('textures/'):
                        commit_path = commit_path.replace('textures/', '', 1)
                    node_data['copied_texture'] = commit_path
                if texture_info.get('original_path'):
                    node_data['image_file'] = texture_info['original_path']
    
    return material_json

