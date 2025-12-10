import cv2
import numpy as np

def generate_mask(
    width: int,
    height: int,
    watermark_x: int,
    watermark_y: int,
    watermark_width: int,
    watermark_height: int
) -> cv2.Mat:
    """
    Generate a black mask with a white rectangle at the watermark location.
    
    Args:
        width: Video frame width
        height: Video frame height
        watermark_x: X coordinate of watermark (top-left corner)
        watermark_y: Y coordinate of watermark (top-left corner)
        watermark_width: Width of watermark area
        watermark_height: Height of watermark area
    
    Returns:
        A grayscale mask image (black with white rectangle)
    """
    # Create a black image
    mask = np.zeros((height, width), dtype=np.uint8)
    
    # Draw white rectangle at watermark location
    x1 = watermark_x
    y1 = watermark_y
    x2 = watermark_x + watermark_width
    y2 = watermark_y + watermark_height
    
    # Ensure coordinates are within bounds
    x1 = max(0, min(x1, width))
    y1 = max(0, min(y1, height))
    x2 = max(0, min(x2, width))
    y2 = max(0, min(y2, height))
    
    # Fill the rectangle with white (255)
    cv2.rectangle(mask, (x1, y1), (x2, y2), 255, -1)
    
    return mask