import subprocess
from typing import Annotated
from fastapi import FastAPI, Form, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import shutil
import uuid

from pydantic import BaseModel

from constants import UPLOAD_FOLDER, ProcessingStatus, VideoType, WatermarkLocation
from utils import is_allowed_video, process_video_task

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve React build folder
build_path = os.path.join(os.path.dirname(__file__), "../React/dist")
if os.path.exists(build_path):
    app.mount("/static", StaticFiles(directory=build_path, html=True), name="static")

@app.get("/")
async def read_root():
    return FileResponse(os.path.join(build_path, "index.html"))

# In-memory job status storage
processing_jobs: dict[str, ProcessingStatus] = {}


"""
Endpoint to inpaint a video by removing the watermark.

Parameters:
- video: UploadFile - The video file to be processed.
- video_type: str - The type of video (default: "renderforest").
- watermark_location: str - The location of the watermark (default: "top_left").
"""

@app.post("/inpaint")
async def inpaint_video(
    background_tasks: BackgroundTasks,
    video: UploadFile,
    video_type: Annotated[VideoType, Form()] = VideoType.renderforest,
    watermark_location: Annotated[WatermarkLocation, Form()] = WatermarkLocation.top_left,
):  
    
    if not is_allowed_video(video.filename):
        raise HTTPException(status_code=400, detail="Invalid video file type")
    
    job_id = str(uuid.uuid4())
    
    # Save uploaded video
    video_path = os.path.join(UPLOAD_FOLDER, f"{job_id}_video.mp4")
    
    try:
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded video: {str(e)}")
    
    # Extract audio using FFmpeg
    audio_path = os.path.join(UPLOAD_FOLDER, f"{job_id}_audio.mp3")
    subprocess.run([
        "ffmpeg", "-i", video_path, "-q:a", "0", "-map", "a", audio_path
    ])  
    
    # Create job status
    processing_jobs[job_id] = ProcessingStatus(job_id=job_id, status="processing")
    
    # Start processing in background
    background_tasks.add_task(process_video_task, video_path, audio_path, job_id, video_type, watermark_location, processing_jobs)
    
    return {"job_id": job_id}



@app.get("/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return processing_jobs[job_id]

@app.get("/download/{job_id}")
async def download_video(job_id: str):
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = processing_jobs[job_id]
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Video processing not completed")
    
    if not os.path.exists(job.output_path):
        raise HTTPException(status_code=404, detail="Output file not found")
    
    return FileResponse(
        job.output_path,
        media_type="video/mp4",
        filename=f"inpainted_video.mp4"
    )

@app.delete("/cleanup/{job_id}")
async def cleanup_job(job_id: str):
    if job_id in processing_jobs:
        job = processing_jobs[job_id]
        if job.output_path and os.path.exists(job.output_path):
            os.remove(job.output_path)
        del processing_jobs[job_id]
    return {"status": "cleaned"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)