import cv2

original_video_path = '../Download.mp4'
mask_image = 'masks/capcut-portrait-mask-full.png'

cap = cv2.VideoCapture(original_video_path)

frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = int(cap.get(cv2.CAP_PROP_FPS))

mask = cv2.imread(mask_image, cv2.IMREAD_GRAYSCALE)

# Resize mask to match video dimensions
mask = cv2.resize(mask, (frame_width, frame_height), interpolation=cv2.INTER_NEAREST)
mask = cv2.flip(mask, 1) 
cv2.imwrite('processed_mask.png', mask)  # Save to a file

print("Mask saved as 'processed_mask.png'")

fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # Codec for .mp4 files
out = cv2.VideoWriter('BULABI-inpaint.mp4', fourcc, fps, (frame_width, frame_height))

# while cap.isOpened(): 
#     success, frame = cap.read()
    
#     if success:
#         mask_video = cv2.inpaint(frame, mask, 3, cv2.INPAINT_TELEA)
#         out.write(mask_video)
#     else:
#         break

cap.release()
out.release()
cv2.destroyAllWindows()
