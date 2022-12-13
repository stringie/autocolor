// Get 'Value' in HSV color space from RGB image (used for better thresholding)
function max(img) {
    let out = new cv.Mat(img.rows, img.cols, cv.CV_8UC1);

    for (let i = 0; i < img.rows; i++) {
        for (let j = 0; j < img.cols; j++) {
            let pixelImg = img.ucharPtr(i, j);
            let R = pixelImg[0];
            let G = pixelImg[1];
            let B = pixelImg[2];

            let m = Math.max(R, G, B);
            let pixelMax = out.ucharPtr(i, j);
            pixelMax[0] = m;
        }
    }

    img.delete();

    return out;
}

// Make all clearly black pixels based on threshold 0, else 255
function threshold(img) {
    cv.adaptiveThreshold(img, img, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 43, 20)

    return img;
}

// Stack 3 threshold matrices ontop to make a single 3 channel RGB placeholder image for filling in colors
function stack(img) {
    let out = new cv.Mat();
    let planes = new cv.MatVector();

    planes.push_back(img);
    planes.push_back(img);
    planes.push_back(img);

    cv.merge(planes, out);

    planes.delete();
    img.delete();

    return out;
}

// Convenience function executing preprocessing altogether
function binaryEdgeDetection(img) {
    return stack(threshold(max(img)));
}

function colorAt(img, pos, color, mask = null, avoidBlack = false) {
    if (!mask) {
        mask = new cv.Mat.zeros(img.rows + 2, img.cols + 2, cv.CV_8UC1);
    }

    if (avoidBlack) {
        let pixel = img.ucharPtr(pos[0], pos[1]);

        if (pixel[0] == 0 && pixel[1] == 0 && pixel[2] == 0) {
            return;
        }
    }
    
    cv.floodFill(img, mask, { x: pos[1], y: pos[0] }, color);

    if (!mask) {
        mask.delete();
    }
}

// Use floodfill (paint-bucket tool) to fill in any large white connected structures in image
function colorAll(img, colors) {
    // Move through the image, pixel by pixel, looking for a white pixel
    function locateWhite(img, startpos) {
        let pixel = img.ucharPtr(startpos[0], startpos[1]);

        while (!(pixel[0] == 255 && pixel[0] == 255 && pixel[0] == 255)) {
            startpos[1] = (startpos[1] + 1) % img.cols
            if (startpos[1] == 0) {
                startpos[0] += 1;
            }

            if (startpos[0] == img.rows - 1 && startpos[1] == img.cols - 1) {
                return null;
            }

            pixel = img.ucharPtr(startpos[0], startpos[1]);
        }

        return startpos;
    };

    // Make sure colors doesn't contain pure white (255, 255, 255, 255) or it will cause infinite loop

    let pos = locateWhite(img, [0, 0])
    let mask = new cv.Mat.zeros(img.rows + 2, img.cols + 2, cv.CV_8UC1);
    while (pos) {
        colorAt(img, pos, colors[Math.floor(Math.random() * colors.length)], mask)
        pos = locateWhite(img, pos);
    }

    return img;
}

export { max, threshold, stack, binaryEdgeDetection, colorAll }