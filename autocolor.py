from tqdm import tqdm
import numpy as np
import random
import cv2

# Input file
file = "in.jpg"

# Selection of colors with which to randomly fill assumed coloring page
colors = [[150, 20, 30], [220, 110, 60], [10, 70, 210], [110, 220, 220], [42, 232, 111], [1, 34, 111], [111, 1, 1]]

# Move through the image, pixel by pixel, looking for a white pixel
def locateWhite(img: np.ndarray, startpos: list):
    shape = img.shape

    while not np.array_equal(img[tuple(startpos)], [255, 255, 255]):
        startpos[0] = (startpos[0] + 1) % shape[0]
        if startpos[0] == 0:
            startpos[1] += 1
        
        if startpos[0] == shape[0] - 1 and startpos[1] == shape[1] - 1:
            return None

    return startpos

# Read input image
img = cv2.imread(file)

# Identify edges under varied lighting conditions (assuming input image is a coloring page photo)
img = cv2.adaptiveThreshold(np.max(img, axis=2), 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 43, 20)

# Create RGB image from threshold mask
img = np.dstack([img]*3)

# Progress bar
with tqdm(total=int(img.size/3)) as pbar:
    pos = [0, 0]
    # Loop over every white pixel and flood fill (paint bucket tool) every neighbor
    while (pos := locateWhite(img, pos)):
        pbar.update((int(pos[0] + pos[1] * img.shape[1]) - pbar.n))
        cv2.floodFill(img, None, (pos[1], pos[0]), colors[random.randint(0, len(colors)-1)])
    
    pbar.update(pbar.total - pbar.n)

# Write output autocolored image
cv2.imwrite("out.png", img)