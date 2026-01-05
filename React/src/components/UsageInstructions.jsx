import React from 'react';

const UsageInstructions = () => {
  const steps = [
    {
      id: 1,
      description: "Select your video type from the dropdown (RenderForest, CapCut, or Others)",
      image: "step-1.png"
    },
    {
      id: 2,
      description: "Upload your video by dragging and dropping or clicking to browse files",
      image: "step-2.png"
    },
    {
      id: 3,
      description: "If using CapCut or Others, choose the watermark location from the second dropdown, or manually position the blue box over the watermark after uploading",
      image: "step-3.png"
    },
    {
      id: 4,
      description: "Click the 'Remove Watermark' button to start processing",
      image: "step-4.png",
      className: "object-bottom"
    },
    {
      id: 5,
      description: "Wait for the processing to complete (you'll see progress updates)",
      image: "step-5.jpg"
    },
    {
      id: 6,
      description: "Download your watermark-free video using the download button",
      image: "step-6.png"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto mt-6 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
      <h1 className="text-2xl font-bold text-white mb-6 text-center">Remove Watermarks from Your Videos with Ease</h1>
      <div className="mb-10 text-center">
        <p className="text-gray-300 text-lg leading-relaxed">
          Our AI-powered Video Watermark Remover is designed to effortlessly eliminate watermarks from videos created with popular tools like RenderForest, CapCut, or other video editing software. Whether you're a content creator, marketer, or just need clean videos for personal use, this tool uses advanced inpainting technology to seamlessly remove unwanted logos and text overlays while preserving the original video quality.
        </p>
      </div>
      <h2 className="text-xl font-semibold text-white mb-6 text-center uppercase">How to Use</h2>
      <div className="space-y-8">
        {steps.map((step, index) => (
          <div key={step.id} className={`flex ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'} gap-6 items-start`}>
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {step.id}
                </div>
                <p className="text-gray-300">{step.description}</p>
              </div>
            </div>
            <div className="flex-1">
              <img src={step.image} alt={`Step ${step.id}`} className={`w-full h-48 object-cover rounded-lg shadow-lg border border-gray-600 ${step.className || ''}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 p-3 bg-blue-900/30 rounded border border-blue-500/30">
        <p className="text-blue-300 text-sm">
          <strong>Tip:</strong> For CapCut or other videos, make sure the blue selection box covers the entire watermark area before processing.
        </p>
      </div>
    </div>
  );
};

export default UsageInstructions;