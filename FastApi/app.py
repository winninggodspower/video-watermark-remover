import logging
from fastapi import FastAPI, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import cv2
import os
from typing import List, Tuple
import shutil
from pydantic import BaseModel
import uuid
import asyncio

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "outputs"
ALLOWED_VIDEO_EXTENSIONS = {"mp4"}
STATIC_FOLDER = "static" 

# Mask paths
LANDSCAPE_MASK_PATH = "masks/landscape-mask.png"
PORTRAIT_MASK_PATH = "masks/portrait-mask.png"

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
os.makedirs(STATIC_FOLDER, exist_ok=True)

# Serve React build folder
build_path = os.path.join(os.path.dirname(__file__), "../React/build")
if os.path.exists(build_path):
    app.mount("/", StaticFiles(directory=build_path, html=True), name="static")

@app.get("/")
async def read_root():
    return FileResponse(FileResponse(os.path.join(build_path, "index.html")))

class ProcessingStatus(BaseModel):
    job_id: str
    status: str
    progress: float = 0
    output_path: str = None
    error: str = None

# In-memory job status storage
processing_jobs: dict[str, ProcessingStatus] = {}

def is_allowed_video(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

def get_video_dimensions(video_path: str) -> Tuple[int, int]:
    cap = cv2.VideoCapture(video_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    return width, height

def select_mask_path(width: int, height: int) -> str:
    aspect_ratio = width / height
    return LANDSCAPE_MASK_PATH if aspect_ratio > 1 else PORTRAIT_MASK_PATH

async def process_video_task(video_path: str, job_id: str):
    try:
        # Get video dimensions and select appropriate mask
        width, height = get_video_dimensions(video_path)
        mask_path = select_mask_path(width, height)
        
        # Read mask
        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask is None:
            raise ValueError(f"Failed to load mask from {mask_path}")
        logging.debug(f"Mask dimensions: width={mask.shape[1]}, height={mask.shape[0]}")
        
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        
        output_filename = f"{job_id}_output.mp4"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        processed_frames = 0

        print('processs just started \n')
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
            
            logging.debug(f"Frame dimensions: width={frame.shape[1]}, height={frame.shape[0]}")

            mask_video = cv2.inpaint(frame, mask, 3, cv2.INPAINT_TELEA)
            out.write(mask_video)
            
            processed_frames += 1
            progress = (processed_frames / total_frames) * 100
            processing_jobs[job_id].progress = progress

            # Simulate asynchronous progress updates
            await asyncio.sleep(0.01)
        
        cap.release()
        out.release()
        
        processing_jobs[job_id].status = "completed"
        processing_jobs[job_id].output_path = output_path
        
    except Exception as e:
        print(e)
        processing_jobs[job_id].status = "failed"
        processing_jobs[job_id].error = str(e)
    finally:
        # Ensure the video file is properly closed before attempting to delete it
        if cap.isOpened():
            cap.release()
        if os.path.exists(video_path):
            os.remove(video_path)

@app.post("/inpaint")
async def inpaint_video(
    background_tasks: BackgroundTasks,
    video: UploadFile
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
    
    # Create job status
    processing_jobs[job_id] = ProcessingStatus(job_id=job_id, status="processing")
    
    # Start processing in background
    background_tasks.add_task(process_video_task, video_path, job_id)
    
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