import asyncio
import logging
import os
import subprocess
from typing import Optional, Tuple
import cv2

from FastApi.constants import (
    ALLOWED_VIDEO_EXTENSIONS,
    CAPCUT_LANDSCAPE_MASK_PATH_FULL, 
    CAPCUT_PORTRAIT_MASK_PATH_FULL, 
    OUTPUT_FOLDER,
    RENDERFOREST_LANDSCAPE_MASK_PATH, 
    RENDERFOREST_PORTRAIT_MASK_PATH, 
    ProcessingStatus, 
    VideoType,
    WatermarkBounds, 
    WatermarkLocation
)
from FastApi.utils.generate_mask import generate_mask


def is_allowed_video(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

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
    


async def process_video_task(
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
            mask = select_renderforest_mask(video_type, width, height)
        
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
            
            mask_video = cv2.inpaint(frame, mask, 3, cv2.INPAINT_TELEA)
            out.write(mask_video)
            
            processed_frames += 1
            progress = (processed_frames / total_frames) * 100
            processing_jobs[job_id].progress = progress

            # Simulate asynchronous progress updates
            await asyncio.sleep(0.01)
        
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
            "-preset", "fast",  # reasonable speed
            "-pix_fmt", "yuv420p",  # ensure browser compatibility
            "-c:a", "aac",       # encode audio
            "-b:a", "192k",
            "-threads", "0",
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

