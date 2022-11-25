import numpy as np
from skimage import io
from skimage import filters
from skimage.segmentation import flood
from skimage.color import rgb2hsv, rgba2rgb, hsv2rgb

file = "test.jpg"
colors = [0.1, 0.5, 0.6, 0.9, 0.42, 0.2, 0.95]

def locateWhite(img_hsv):
    x,y = np.where((img_hsv[...,0]==0) & (img_hsv[...,1]==0) & (img_hsv[...,2]==1))
    if len(x) > 0:
        return list(zip(x,y))
    return None

img = io.imread(file)
if file.endswith(".jpg"):
    img_hsv = rgb2hsv(img)
elif file.endswith(".png"):
    img_hsv = rgb2hsv(rgba2rgb(img))
else:
    raise Exception("Unsupported image format")

thresh = filters.threshold_sauvola(img_hsv[..., 2], 31, 0.1)
img_hsv[img_hsv[...,2] > thresh] = [0, 0, 1]
img_hsv[img_hsv[...,2] <= thresh] = [0, 0, 0]

while (pos := locateWhite(img_hsv)):
    print(f"Remaining white pixels: {len(pos)}")

    mask = flood(img_hsv[..., 2], pos[0])
    img_hsv[mask] = [np.random.choice(colors, 1)[0], 1, 1]

io.imsave("out.png", hsv2rgb(img_hsv))