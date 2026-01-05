import React, { useState, useRef, useEffect } from 'react';
import { Move } from 'lucide-react';

export const WatermarkSelector = ({ videoElement, onBoundsChange }) => {
  // bounds are stored relative to the video element (0,0 = top-left of video)
  const [bounds, setBounds] = useState({ x: 20, y: 20, width: 150, height: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    if (!videoElement || !onBoundsChange) return;

    const rect = videoElement.getBoundingClientRect();
    const scaleX = videoElement.videoWidth / rect.width;
    const scaleY = videoElement.videoHeight / rect.height;

    const realBounds = {
      x: Math.round(bounds.x * scaleX),
      y: Math.round(bounds.y * scaleY),
      width: Math.round(bounds.width * scaleX),
      height: Math.round(bounds.height * scaleY),
    };

    onBoundsChange(realBounds);
  }, [bounds, videoElement, onBoundsChange]);

  const handleMouseDown = (e, action) => {
    e.stopPropagation();
    const containerRect = containerRef.current.getBoundingClientRect();
    const videoRect = videoElement ? videoElement.getBoundingClientRect() : containerRect;
    // video offset inside the container

    if (action === 'drag') {
      setIsDragging(true);
      // store drag start relative to video top-left
      setDragStart({
        x: e.clientX - videoRect.left - bounds.x,
        y: e.clientY - videoRect.top - bounds.y,
      });
    } else if (action === 'resize') {
      setIsResizing(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const handleTouchStart = (e, action) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const containerRect = containerRef.current.getBoundingClientRect();
    const videoRect = videoElement ? videoElement.getBoundingClientRect() : containerRect;

    if (action === 'drag') {
      setIsDragging(true);
      // store drag start relative to video top-left
      setDragStart({
        x: touch.clientX - videoRect.left - bounds.x,
        y: touch.clientY - videoRect.top - bounds.y,
      });
    } else if (action === 'resize') {
      setIsResizing(true);
      setDragStart({
        x: touch.clientX,
        y: touch.clientY,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const videoRect = videoElement ? videoElement.getBoundingClientRect() : containerRect;

    // video position and size relative to container
    const videoWidth = videoRect.width;
    const videoHeight = videoRect.height;

    if (isDragging) {
      // coordinates relative to video
      const relX = e.clientX - videoRect.left - dragStart.x;
      const relY = e.clientY - videoRect.top - dragStart.y;

      const newX = Math.max(0, Math.min(relX, videoWidth - bounds.width));
      const newY = Math.max(0, Math.min(relY, videoHeight - bounds.height));

      setBounds(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      const newWidth = Math.max(50, Math.min(bounds.width + deltaX, videoWidth - bounds.x));
      const newHeight = Math.max(30, Math.min(bounds.height + deltaY, videoHeight - bounds.y));

      setBounds(prev => ({ ...prev, width: newWidth, height: newHeight }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault(); // Prevent scrolling while dragging
    if (!containerRef.current) return;
    const touch = e.touches[0];
    const containerRect = containerRef.current.getBoundingClientRect();
    const videoRect = videoElement ? videoElement.getBoundingClientRect() : containerRect;

    // video position and size relative to container
    const videoWidth = videoRect.width;
    const videoHeight = videoRect.height;

    if (isDragging) {
      // coordinates relative to video
      const relX = touch.clientX - videoRect.left - dragStart.x;
      const relY = touch.clientY - videoRect.top - dragStart.y;

      const newX = Math.max(0, Math.min(relX, videoWidth - bounds.width));
      const newY = Math.max(0, Math.min(relY, videoHeight - bounds.height));

      setBounds(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing) {
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;

      const newWidth = Math.max(50, Math.min(bounds.width + deltaX, videoWidth - bounds.x));
      const newHeight = Math.max(30, Math.min(bounds.height + deltaY, videoHeight - bounds.y));

      setBounds(prev => ({ ...prev, width: newWidth, height: newHeight }));
      setDragStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, isResizing, dragStart, bounds]);

  // When the video element becomes available or changes size, clamp bounds
  useEffect(() => {
    if (!videoElement || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const videoRect = videoElement.getBoundingClientRect();
    const videoWidth = videoRect.width;
    const videoHeight = videoRect.height;

    setBounds(prev => {
      const x = Math.max(0, Math.min(prev.x, videoWidth - prev.width));
      const y = Math.max(0, Math.min(prev.y, videoHeight - prev.height));
      const width = Math.min(prev.width, Math.max(50, videoWidth));
      const height = Math.min(prev.height, Math.max(30, videoHeight));
      return { ...prev, x, y, width, height };
    });
  }, [videoElement]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
    >
      {/**
       * We position the selector relative to the video element by adding
       * the video's offset (videoOffset) to the bounds.
       */}
      <div
        className="absolute border-2 border-blue-500 bg-blue-500/30 pointer-events-auto cursor-move"
        style={{
          // compute video offset; if videoElement not available, fallback to 0
          left: `${(videoElement && containerRef.current)
            ? (videoElement.getBoundingClientRect().left - containerRef.current.getBoundingClientRect().left + bounds.x)
            : bounds.x}px`,
          top: `${(videoElement && containerRef.current)
            ? (videoElement.getBoundingClientRect().top - containerRef.current.getBoundingClientRect().top + bounds.y)
            : bounds.y}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        }}
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
        onTouchStart={(e) => handleTouchStart(e, 'drag')}
      >
        {/* Drag handle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <Move className="w-6 h-6 text-white drop-shadow-lg" />
        </div>
        
        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize"
          onMouseDown={(e) => handleMouseDown(e, 'resize')}
          onTouchStart={(e) => handleTouchStart(e, 'resize')}
        />
        
        {/* Corner indicators */}
        {/* <div className="absolute top-0 left-0 w-2 h-2 bg-red-500 rounded-full" />
        <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
        <div className="absolute bottom-0 left-0 w-2 h-2 bg-red-500 rounded-full" /> */}
      </div>
      
      {/* Info label */}
      <div 
        className="absolute bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none"
        style={{
          left: `${(videoElement && containerRef.current)
            ? (videoElement.getBoundingClientRect().left - containerRef.current.getBoundingClientRect().left + bounds.x)
            : bounds.x}px`,
          top: `${(videoElement && containerRef.current)
            ? (videoElement.getBoundingClientRect().top - containerRef.current.getBoundingClientRect().top + bounds.y - 25)
            : bounds.y - 25}px`,
        }}
      >
        Position watermark area
      </div>
    </div>
  );
};