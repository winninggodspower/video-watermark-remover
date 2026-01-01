import React, { useState } from 'react';
import { Eraser, Download } from 'lucide-react';
import { VideoUploadZone } from './components/VideoUploadZone';
import { useJobPolling } from './hooks/useJobPolling';
import { uploadVideoForInpainting } from './services/api';
import './App.css';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoFileObject, setVideoFileObject] = useState(null);
  const [aspectRatio, setAspectRatio] = useState('16/9');
  const [jobId, setJobId] = useState(null);
  const [videoType, setVideoType] = useState('capcut');
  const [watermarkLocation, setWatermarkLocation] = useState('top_left');
  const [watermarkBounds, setWatermarkBounds] = useState(null);

  const [isUploading, setIsUploading] = useState(false);

  const { progress, isProcessing, isDownloading, processedVideoUrl, error } = useJobPolling(jobId);

  const handleReset = () => {
    // revoke object URLs to avoid leaks
    try {
      if (processedVideoUrl) {
        URL.revokeObjectURL(processedVideoUrl);
      }
      if (videoFile) {
        URL.revokeObjectURL(videoFile);
      }
    } catch (e) {
      // ignore revoke errors
    }

    setJobId(null);
    setVideoFile(null);
    setVideoFileObject(null);
    setWatermarkBounds(null);
  };

  const handleFileSelect = (file) => {
    setVideoFileObject(file);
    setJobId(null); // Reset job when new file is selected

    const videoUrl = URL.createObjectURL(file);
    setVideoFile(videoUrl);

    const video = document.createElement('video');
    video.src = videoUrl;
    video.onloadedmetadata = () => {
      setAspectRatio(`${video.videoWidth}/${video.videoHeight}`);
    };
  };

  const handleRemoveWatermark = async () => {
    if (!videoFileObject) return;

    setIsUploading(true); // start upload

    try {
      const newJobId = await uploadVideoForInpainting(
        videoFileObject, 
        videoType, 
        watermarkLocation,
        watermarkBounds
      );
      setJobId(newJobId);
      console.log('Job ID:', newJobId);
    } catch (err) {
      alert('Error uploading video');
    } finally {
      setIsUploading(false); // end upload
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Header Section */}
      <div className="text-center space-y-3 mb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Video Watermark Remover
        </h1>
        <p className="text-gray-400">
          Remove {videoType === 'renderforest' ? 'RenderForest' : 'CapCut'} watermarks from your videos in seconds
        </p>
      </div>

      <div>
        {error && (
          <div className="mb-4 p-3 bg-red-600 text-white rounded">
            Error: {error}
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="flex items-center gap-4 mb-4">
        <select
          value={videoType}
          onChange={(e) => setVideoType(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          <option value="renderforest">RenderForest</option>
          <option value="capcut">CapCut</option>
        </select>
        {videoType === 'capcut' && !videoFile && (
          <select
            value={watermarkLocation}
            onChange={(e) => setWatermarkLocation(e.target.value)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="top_left">Top Left</option>
            <option value="top_right">Top Right</option>
            <option value="bottom_left">Bottom Left</option>
            <option value="bottom_right">Bottom Right</option>
          </select>
        )}
        {videoType === 'capcut' && videoFile && (
          <p className="text-gray-400 text-sm">👆 Position the red box over the watermark</p>
        )}
      </div>

      {/* Video Upload Zone */}
      <VideoUploadZone
        videoFile={videoFile}
        aspectRatio={aspectRatio}
        isProcessing={isProcessing}
        progress={progress}
        onFileSelect={handleFileSelect}
        showWatermarkSelector={videoType === 'capcut' && videoFile}
        onWatermarkBoundsChange={setWatermarkBounds}
        processedVideoUrl={processedVideoUrl}
      />

      {isUploading && (
        <div className="mt-4 text-yellow-300 flex items-center gap-2">
          Uploading video to server... ⏳
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex space-x-4">
        {!processedVideoUrl && (
          <button
            disabled={!videoFile || isProcessing || isUploading}
            onClick={handleRemoveWatermark}
            className="px-8 py-3 border-2 border-white text-white hover:text-black hover:scale-105 transition-all duration-300 relative overflow-hidden group flex items-center"
          >
            <Eraser className="mr-2 z-10" />
            <span className="absolute inset-0 bg-white transition-all duration-300 transform -translate-x-full group-hover:translate-x-0"></span>
            <span className="relative z-10">Remove Watermark 🧽</span>
          </button>
        )}
        {(processedVideoUrl || jobId || error) && (
          <button
            onClick={handleReset}
            className="px-6 py-3 border-2 border-gray-400 text-gray-200 hover:bg-gray-700 rounded-md"
          >
            Reset
          </button>
        )}
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
            <span className="relative z-10">Downloading... ⏳</span>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {isProcessing && (
        <div className="mt-4 text-white">Processing: {progress.toFixed(2)}% ⏳</div>
      )}
    </div>
  );
}

export default App;