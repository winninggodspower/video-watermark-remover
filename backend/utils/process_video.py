import asyncio
import logging
import os
import subprocess
from typing import Optional, Tuple
import cv2
import psutil
import gc

from backend.constants import (
    ALLOWED_VIDEO_EXTENSIONS,
    CAPCUT_LANDSCAPE_MASK_PATH_FULL, 
    CAPCUT_PORTRAIT_MASK_PATH_FULL, 
    OUTPUT_FOLDER,
    RENDERFOREST_LANDSCAPE_MASK_PATH, 
    RENDERFOREST_PORTRAIT_MASK_PATH, 
    ProcessingStatus, 
    VideoType,
    WatermarkBounds, 
    WatermarkLocation,
    MAX_VIDEO_WIDTH,
    MAX_VIDEO_HEIGHT,
    MAX_VIDEO_DURATION_SECONDS,
    MAX_FILE_SIZE_MB
)
from backend.utils.generate_mask import generate_mask


def is_allowed_video(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

def validate_video_properties(video_path: str) -> None:
    """Validate video properties to prevent memory issues."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Could not open video file")
    
    try:
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = cap.get(cv2.CAP_PROP_FRAME_COUNT) / cap.get(cv2.CAP_PROP_FPS)
        file_size = os.path.getsize(video_path) / (1024 * 1024)  # MB
        
        if width > MAX_VIDEO_WIDTH or height > MAX_VIDEO_HEIGHT:
            raise ValueError(f"Video resolution too high: {width}x{height}. Max allowed: {MAX_VIDEO_WIDTH}x{MAX_VIDEO_HEIGHT}")
        
        if duration > MAX_VIDEO_DURATION_SECONDS:
            raise ValueError(f"Video too long: {duration:.1f}s. Max allowed: {MAX_VIDEO_DURATION_SECONDS}s")
        
        if file_size > MAX_FILE_SIZE_MB:
            raise ValueError(f"Video file too large: {file_size:.1f}MB. Max allowed: {MAX_FILE_SIZE_MB}MB")
            
    finally:
        cap.release()

def get_video_dimensions(video_path: str) -> Tuple[int, int]:
    cap = cv2.VideoCapture(video_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    return width, height

def select_renderforest_mask(
    width: int, 
    height: int, 
) -> cv2.Mat:
    aspect_ratio = width / height
    if aspect_ratio > 1: # Landscape
        mask_path = RENDERFOREST_LANDSCAPE_MASK_PATH
    else:
        mask_path = RENDERFOREST_PORTRAIT_MASK_PATH
    return cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    


def process_video_task(
    video_path: str, 
    audio_path: str, 
    job_id: str, 
    video_type: VideoType,
    watermark_bounds: Optional[WatermarkBounds],
    processing_jobs: dict[str, ProcessingStatus]
):
    cap = None  # Initialize cap to None
    output_path = None
    print(video_type)

    try:
        # Get video dimensions first (used by mask generation and video writer)
        width, height = get_video_dimensions(video_path)
        logging.debug(f"Video dimensions: width={width}, height={height}")
        print(f"Video dimensions: width={width}, height={height}")

        # Generate or select mask based on whether custom bounds are provided
        if video_type == VideoType.capcut:
            mask = generate_mask(
                width=width,
                height=height,
                watermark_x=watermark_bounds.x,
                watermark_y=watermark_bounds.y,
                watermark_width=watermark_bounds.width,
                watermark_height=watermark_bounds.height,
            )
        else: # video_type == VideoType.renderforest
            mask = select_renderforest_mask(width, height)
        
        # Resize mask
        mask = cv2.resize(mask, (width, height), interpolation=cv2.INTER_NEAREST)
        logging.debug(f"Mask dimensions: width={mask.shape[1]}, height={mask.shape[0]}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Failed to open video file: {video_path}")
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        
        output_filename = f"{job_id}_output-temp.mp4"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        processed_frames = 0

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
            
            # Apply inpainting with optimized parameters
            mask_video = cv2.inpaint(frame, mask, 2, cv2.INPAINT_TELEA)  # Reduced radius from 3 to 2
            out.write(mask_video)
            
            # Explicitly delete frame to free memory immediately
            del frame
            del mask_video
            
            processed_frames += 1
            progress = (processed_frames / total_frames) * 100
            processing_jobs[job_id].progress = progress

            # Memory management: force garbage collection and monitor memory usage
            if processed_frames % 50 == 0:  # More frequent cleanup
                gc.collect()
                
                # Monitor memory usage
                process = psutil.Process()
                memory_mb = process.memory_info().rss / 1024 / 1024
                logging.debug(f"Memory usage: {memory_mb:.1f}MB, Frame: {processed_frames}/{total_frames}")
                
                # If memory usage gets too high, raise an error
                if memory_mb > 400:  # Leave some buffer below 512MB limit
                    raise MemoryError(f"Memory usage too high: {memory_mb:.1f}MB")
            
            # Simulate asynchronous progress updates
            # await asyncio.sleep(0.01)
        
        cap.release()
        out.release()
        
        # add back the audio        
        final_output_path = os.path.join(OUTPUT_FOLDER, f"{job_id}_output.mp4")
        subprocess.run([
            "ffmpeg",
            "-i", output_path,
            "-i", audio_path,
            "-c:v", "libx264",   # encode video
            "-crf", "18",       # visually lossless
            "-preset", "ultrafast",  # reasonable speed
            "-pix_fmt", "yuv420p",  # ensure browser compatibility
            "-c:a", "aac",       # encode audio
            "-b:a", "192k",
            "-threads", "1",
            "-y",final_output_path
        ], check=True)

        processing_jobs[job_id].status = "completed"
        processing_jobs[job_id].output_path = final_output_path
        
    except Exception as e:
        processing_jobs[job_id].status = "failed"
        processing_jobs[job_id].error = str(e)
    finally:
        # Ensure the video file is properly closed before attempting to delete it
        if cap is not None and cap.isOpened():
            cap.release()
        if os.path.exists(video_path):
            os.remove(video_path)
            
        if os.path.exists(audio_path):
            os.remove(audio_path)
            
        if output_path is not None and os.path.exists(output_path):
            os.remove(output_path)

