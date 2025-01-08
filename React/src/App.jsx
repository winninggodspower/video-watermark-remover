import React, { useState, useRef } from 'react';
import { FaUpload, FaEraser } from 'react-icons/fa';
import { Upload, Loader2, Download, Eraser } from 'lucide-react';
import axiosInstance from './axiosInstance';
import './App.css';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [aspectRatio, setAspectRatio] = useState('16/9');
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState(null);

  const [processedVideoUrl, setProcessedVideoUrl] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      fileInputRef.current.files = event.dataTransfer.files; // Update the file input reference
      handleFile(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFile = (file) => {
    setProcessedVideoUrl(null)
    if (file && file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      setVideoFile(videoUrl);
      const video = document.createElement('video');
      video.src = videoUrl;
      video.onloadedmetadata = () => {
        setAspectRatio(`${video.videoWidth}/${video.videoHeight}`);
      };
    }
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    handleFile(file);
  };

  const handleRemoveWatermark = async () => {
    if (!videoFile) return;
    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();      
      formData.append('video', fileInputRef.current.files[0]);

      const response = await axiosInstance.post('/inpaint', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { job_id } = response.data;
      setJobId(job_id);

      console.log(job_id);
      

      const interval = setInterval(async () => {         
        const statusResponse = await axiosInstance.get(`/status/${job_id}`);
        
        const { progress, status } = statusResponse.data;
        setProgress(progress);

        if (status === 'completed') {
          clearInterval(interval);
          setIsProcessing(false);
          setIsDownloading(true);
          const downloadResponse = await axiosInstance.get(`/download/${job_id}`, {
            responseType: 'blob',
          });

          // Create a Blob URL with the correct MIME type
          const videoBlob = new Blob([downloadResponse.data], { type: 'video/mp4' });
          const url = window.URL.createObjectURL(videoBlob);

          setProcessedVideoUrl(url);
          setIsDownloading(false);
        } else if (status === 'failed') {
          clearInterval(interval);
          setIsProcessing(false);
          alert('Failed to process video');
        }
      }, 1000);
    } catch (error) {
      setIsProcessing(false);
      alert('Error uploading video');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className='text-white font-clashBold mb-4 text-lg'>RenderForest WaterMark Remover</h1>
      <div
        className={`
            relative rounded-lg border-2 border-dashed transition-all duration-300 
            ${isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
          }
            w-[42rem] max-h-[70vh] max-w-full flex flex-col items-center justify-center p-4
          `}
        style={{ aspectRatio }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {videoFile ? (
          <>
            <video src={videoFile} controls className="max-w-full max-h-full" />
            {isProcessing && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                <div
                  className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 pointer-events-none">
             <Upload 
              className={`w-12 h-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
            />
            <p className="text-lg font-medium text-gray-200">
              Drag and drop a video file here
            </p>
            <p className="text-sm text-gray-400">
              or click to select from your computer
            </p>
          </div>
        )}
        <input
          type="file"
          accept="video/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className="mt-8 flex space-x-4">
        <button
          disabled={!videoFile || isProcessing}
          onClick={handleRemoveWatermark}
          className="px-8 py-3 border-2 border-white text-white hover:text-black hover:scale-105 transition-all duration-300 relative overflow-hidden group flex items-center"
        >
          <Eraser className="mr-2 z-10" />
          <span className="absolute inset-0 bg-white transition-all duration-300 transform -translate-x-full group-hover:translate-x-0"></span>
          <span className="relative z-10">Remove Watermark</span>
        </button>
        {processedVideoUrl && !isDownloading && (
          <a
            href={processedVideoUrl}
            download="inpainted_video.mp4"
            className="px-8 py-3 border-2 border-green-500 text-green-500 hover:text-white hover:bg-green-500 hover:scale-105 transition-all duration-300 relative overflow-hidden group flex items-center"
          >
            <Download className="mr-2" />
            <span className="relative z-10">Download Processed Video</span>
          </a>
        )}
        {isDownloading && (
          <div className="px-8 py-3 border-2 border-green-500 text-green-500 flex items-center">
            <span className="relative z-10">Downloading...</span>
          </div>
        )}
      </div>
      {isProcessing && (
        <div className="mt-4 text-white">
          Processing: {progress.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

export default App;
