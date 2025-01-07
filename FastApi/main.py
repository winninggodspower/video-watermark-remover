import numpy as np
import cv2

original_video_path = 'test1.mp4'
mask_image = 'video-mask.png'

cap = cv2.VideoCapture(filename=original_video_path)
mask = cv2.imread(mask_image, cv2.IMREAD_GRAYSCALE)

frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = int(cap.get(cv2.CAP_PROP_FPS))

fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # Codec for .mp4 files
out = cv2.VideoWriter(f'{original_video_path.split('.')[0]}-inpaint.mp4', fourcc,  fps, (frame_width, frame_height))

while cap.isOpened(): 
    success, frame = cap.read()
    
    if success:
        mask_video = cv2.inpaint(frame, mask, 3, cv2.INPAINT_TELEA)
        out.write(mask_video)

    else:
        break

cap.release()
out.release()
cv2.destroyAllWindows()