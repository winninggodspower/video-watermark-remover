import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { WatermarkSelector } from './WatermarkSelector';

export const VideoUploadZone = ({ 
  videoFile, 
  aspectRatio, 
  isProcessing, 
  progress, 
  onFileSelect,
  showWatermarkSelector,
  onWatermarkBoundsChange,
  processedVideoUrl
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      onFileSelect(file);
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

  const handleClick = (e) => {
    // Don't trigger file input if clicking on watermark selector
    if (showWatermarkSelector && videoFile) return;
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      onFileSelect(file);
    }
  };

  return (
    <div
      className={`
        relative rounded-lg border-2 border-dashed transition-all duration-300 
        w-[42rem] max-h-[70vh] max-w-full flex flex-col items-center justify-center p-4
        ${isDragging ? "border-blue-500 bg-blue-500/10" : "border-gray-600 hover:border-gray-500 bg-gray-800/50"}
      `}
      style={{ aspectRatio }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      {/* If we have a processed video, show it; otherwise show the current uploaded video */}
      {processedVideoUrl || videoFile ? (
        <>
          <video 
            ref={videoRef}
            src={processedVideoUrl || videoFile} 
            controls 
            className="max-w-full max-h-full" 
          />
          
          {/* Watermark Selector Overlay */}
          {showWatermarkSelector && !isProcessing && !processedVideoUrl && (
            <WatermarkSelector 
              videoElement={videoRef.current}
              onBoundsChange={onWatermarkBoundsChange}
            />
          )}
          
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm rounded-lg">
              <div className="w-full max-w-md space-y-4 p-4">
                <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-white font-medium">Processing: {progress.toFixed(0)}%</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 pointer-events-none">
          <Upload className={`w-12 h-12 ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
          <p className="text-lg font-medium text-gray-200">Drag and drop a video file here</p>
          <p className="text-sm text-gray-400">or click to select from your computer</p>
        </div>
      )}
      <input
        type="file"
        accept="video/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
};