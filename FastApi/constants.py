from enum import Enum
from pydantic import BaseModel
import os

# Constants
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
OUTPUT_FOLDER = os.path.join(BASE_DIR, "outputs")

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Mask paths
RENDERFOREST_LANDSCAPE_MASK_PATH = "masks/landscape-mask.png"
RENDERFOREST_PORTRAIT_MASK_PATH = "masks/portrait-mask.png"

CAPCUT_LANDSCAPE_MASK_PATH_FULL = "masks/capcut-landscape-mask.png"
CAPCUT_LANDSCAPE_MASK_PATH_SHORT = "masks/capcut-landscape-mask.png"
CAPCUT_PORTRAIT_MASK_PATH_FULL = "masks/capcut-portrait-mask-full.png"
CAPCUT_PORTRAIT_MASK_PATH_SHORT = "masks/capcut-portrait-mask-short.png"

class ProcessingStatus(BaseModel):
    job_id: str
    status: str
    progress: float = 0
    output_path: str = None
    error: str = None

# Define Enums for choices
class VideoType(str, Enum):
    renderforest = "renderforest"
    capcut = "capcut"

class WatermarkLocation(str, Enum):
    top_left = "top_left"
    top_right = "top_right"
    bottom_left = "bottom_left"
    bottom_right = "bottom_right"
    

ALLOWED_VIDEO_EXTENSIONS = {"mp4"}