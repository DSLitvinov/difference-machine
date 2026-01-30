"""
Viewport capture utilities for Blender.
Provides functions to capture screenshots of the 3D viewport.
"""

import bpy
import logging
from typing import Optional
import tempfile
import os

logger = logging.getLogger(__name__)


def capture_viewport_screenshot(context) -> Optional[bytes]:
    """
    Capture a screenshot of the current 3D viewport.
    
    Uses bpy.ops.screen.screenshot_area() for reliable viewport capture.
    Handles cases where EEVEE or other render engines might not be available.
    
    Args:
        context: Blender context
        
    Returns:
        bytes: PNG image data, or None if capture failed
    """
    try:
        # Check if context is valid
        if not context or not hasattr(context, 'screen') or not context.screen:
            logger.warning("Invalid context for screenshot capture")
            return None
        
        # Find the 3D viewport area
        area_3d = None
        for area in context.screen.areas:
            if area.type == 'VIEW_3D':
                area_3d = area
                break
        
        if not area_3d:
            logger.warning("No 3D viewport found")
            return None
        
        # Find the WINDOW region
        region_3d = None
        for region in area_3d.regions:
            if region.type == 'WINDOW':
                region_3d = region
                break
        
        if not region_3d:
            logger.warning("No WINDOW region found in 3D viewport")
            return None
        
        # Check if space_data is valid
        space_data = None
        if area_3d.spaces:
            space_data = area_3d.spaces[0]
            # Check if render engine is available (handle EEVEE not available warning)
            if hasattr(space_data, 'shading') and hasattr(space_data.shading, 'type'):
                # Try to set a safe shading type if current one is problematic
                try:
                    current_type = space_data.shading.type
                    # If using RENDERED mode and engine is not available, switch to MATERIAL
                    if current_type == 'RENDERED':
                        # Check if render engine is available
                        if hasattr(bpy.context.scene, 'render') and hasattr(bpy.context.scene.render, 'engine'):
                            engine = bpy.context.scene.render.engine
                            # If EEVEE is not available, switch to MATERIAL preview
                            if engine == 'BLENDER_EEVEE':
                                try:
                                    # Try to access EEVEE settings to see if it's available
                                    if not hasattr(bpy.context.scene, 'eevee'):
                                        logger.debug("EEVEE not available, switching to MATERIAL preview")
                                        space_data.shading.type = 'MATERIAL'
                                except:
                                    logger.debug("EEVEE check failed, switching to MATERIAL preview")
                                    space_data.shading.type = 'MATERIAL'
                except Exception as e:
                    logger.debug(f"Could not check/set shading type: {e}")
        
        # Create temporary file for screenshot
        temp_dir = tempfile.gettempdir()
        temp_file = os.path.join(temp_dir, f"blender_screenshot_{os.getpid()}.png")
        
        logger.debug(f"Capturing viewport screenshot to: {temp_file}")
        
        # Use screenshot_area operator with context override
        try:
            # Try with full context override
            override_kwargs = {
                'window': context.window,
                'area': area_3d,
                'region': region_3d,
                'screen': context.window.screen,
            }
            if space_data:
                override_kwargs['space_data'] = space_data
            
            with context.temp_override(**override_kwargs):
                # Use screenshot_area for specific area
                bpy.ops.screen.screenshot_area(filepath=temp_file)
                
                # Check if file was created immediately
                if os.path.exists(temp_file):
                    logger.debug("Screenshot file created immediately")
                else:
                    # Wait a bit for file creation (screenshot might be async)
                    import time
                    time.sleep(0.5)
                    if not os.path.exists(temp_file):
                        logger.warning("Screenshot file not created after wait")
            
            # Check if file was created
            if not os.path.exists(temp_file):
                logger.warning("Screenshot file was not created")
                return None
            
            # Check file size
            file_size = os.path.getsize(temp_file)
            if file_size == 0:
                logger.warning(f"Screenshot file is empty: {temp_file}")
                try:
                    os.remove(temp_file)
                except:
                    pass
                return None
            
            logger.debug(f"Screenshot captured: {temp_file}, size: {file_size} bytes")
            
            # Read the file
            with open(temp_file, 'rb') as f:
                png_data = f.read()
            
            if len(png_data) == 0:
                logger.warning("Screenshot data is empty")
                return None
            
            logger.info(f"Screenshot captured successfully: {len(png_data)} bytes")
            
            # Clean up temporary file
            try:
                os.remove(temp_file)
            except Exception as e:
                logger.warning(f"Failed to remove temp file: {e}")
            
            return png_data
            
        except Exception as e:
            logger.error(f"Failed to capture screenshot: {e}", exc_info=True)
            # Try to clean up
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except:
                pass
            return None
            
    except Exception as e:
        logger.error(f"Failed to capture viewport screenshot: {e}", exc_info=True)
        return None

