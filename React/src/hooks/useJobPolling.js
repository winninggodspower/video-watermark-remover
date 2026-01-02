import { useState, useEffect } from 'react';
import { checkJobStatus, downloadVideo } from '../services/api';

export const useJobPolling = (jobId) => {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) {
      // clear any previous state when jobId is cleared
      setProgress(0);
      setIsProcessing(false);
      setIsDownloading(false);
      setProcessedVideoUrl(null);
      setError(null);
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    const interval = setInterval(async () => {
      try {
        const { progress: currentProgress, status } = await checkJobStatus(jobId);
        setProgress(currentProgress);

        if (status === 'completed') {
          clearInterval(interval);
          setError(null);
          setIsProcessing(false);
          setIsDownloading(true);

          const videoBlob = await downloadVideo(jobId);
          const url = window.URL.createObjectURL(videoBlob);

          setProcessedVideoUrl(url);
          setIsDownloading(false);
        } else if (status === 'failed') {
          clearInterval(interval);
          setIsProcessing(false);
          setError('Failed to process video');
        }
      } catch (err) {
        clearInterval(interval);
        setIsProcessing(false);
        setError('Error checking job status');
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobId]);

  return {
    progress,
    isProcessing,
    isDownloading,
    processedVideoUrl,
    error,
  };
};