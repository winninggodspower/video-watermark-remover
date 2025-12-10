import axiosInstance from '../axiosInstance';

export const uploadVideoForInpainting = async (videoFile, videoType, watermarkLocation, watermarkBounds) => {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('video_type', videoType);

  if (videoType === 'capcut') {
    if (watermarkBounds) {
      // Send custom bounds if provided
      formData.append('watermark_x', Math.round(watermarkBounds.x));
      formData.append('watermark_y', Math.round(watermarkBounds.y));
      formData.append('watermark_width', Math.round(watermarkBounds.width));
      formData.append('watermark_height', Math.round(watermarkBounds.height));
    } else {
      // Fallback to location string if no bounds provided
      formData.append('watermark_location', watermarkLocation);
    }
  }

  const response = await axiosInstance.post('/inpaint', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.job_id;
};

export const checkJobStatus = async (jobId) => {
  const response = await axiosInstance.get(`/status/${jobId}`);
  return response.data;
};

export const downloadVideo = async (jobId) => {
  const response = await axiosInstance.get(`/download/${jobId}`, {
    responseType: 'blob',
  });

  return new Blob([response.data], { type: 'video/mp4' });
};