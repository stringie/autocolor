// Selection of colors with which to randomly fill assumed coloring page
var colors = [];
var image;
var upload = document.getElementById("upload");
var uploadBox = document.getElementById("upload-box");

// Create fake input element for uploading images
var fakeInput = document.createElement("input");
fakeInput.type = "file";
fakeInput.accept = "image/*";
fakeInput.multiple = false;
upload.addEventListener('click', function () {
    fakeInput.click();
});

upload.addEventListener('dragenter', preventDefault, false);
upload.addEventListener('dragleave', preventDefault, false);
upload.addEventListener('dragover', preventDefault, false);
upload.addEventListener('drop', preventDefault, false);
upload.addEventListener('drop', handleImage, false);
fakeInput.addEventListener('change', handleImage, false);

function preventDefault(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleImage(e) {
    var files = e.target.files;
    if (!files) {
        files = e.dataTransfer.files;
    }

    var canvas = document.getElementById('canvas');

    var img = new Image;
    img.src = URL.createObjectURL(files[0]);
    img.onload = function () {
        image = cv.imread(img);
        image = binaryEdgeDetection(image);

        canvas.height = 800;
        canvas.width = 800;
        let vRatio = canvas.height / img.height;
        let hRatio = canvas.width / img.width;
        let ratio = Math.min(hRatio, vRatio);

        uploadBox.style.width = img.width * ratio + "px";
        upload.style.width = img.width * ratio + "px";

        let showImage = new cv.Mat();
        cv.resize(image, showImage, new cv.Size(img.width * ratio, img.height * ratio));
        cv.imshow(canvas, showImage);

        showImage.delete()

        pressme();
    }
}

function pressme() {
    let pressme = document.getElementById("pressme");
    if (colors.length > 0 && image) {
        pressme.hidden = false;
    } else {
        pressme.hidden = true;
    }
}

// Assumed input is '#xxxxxx'
function hexToRgba(hex) {
    hex = hex.trim().substring(1);
    var bigint = parseInt(hex, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;

    if (r == 255) {
        r -= 1;
    }

    if (g == 255) {
        g -= 1;
    }

    if (b == 255) {
        b -= 1;
    }

    return [r, g, b, 255]
}

function autocolor() {
    if (image) {
        let colorImage = color(image.clone(), colors.map(hexToRgba));
        cv.resize(colorImage, colorImage, new cv.Size(canvas.width, canvas.height));
        cv.imshow(canvas, colorImage);

        colorImage.delete()
    }
}

function colorDrop() {
    let colorDropTextarea = document.getElementById("colordrop");
    colors = colorDropTextarea.value.split(",").map(s => s.trim());

    displayColors();
}

function plusColor(color = "#ff0000") {
    if (colors.length < 12) {
        colors.push(color);
    }

    displayColors();
}

function minusColor() {
    if (colors.length > 0) {
        colors.pop()
    }

    displayColors();
}

function changeColor(color) {
    let pos = color.id.split("color")[1];
    colors[pos] = color.value;

    displayColors();
}

function displayColors() {
    document.getElementById("colordrop").value = colors.join(",\n")

    let colorDiv = document.getElementById("colors");
    colorDiv.innerHTML = '';
    colors.map(c => {
        colorDiv.insertAdjacentHTML(
            'beforeend',
            `<input id="color${colorDiv.children.length}" onchange="changeColor(this)" type="color" value="${c}" class="color"/>`
        );
    });

    pressme();
}

//////////////////////////////////////////////////////////////////////////
////// autocolor.js but chrome CORS won't let me access it as module /////
//////////////////////////////////////////////////////////////////////////

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

// Use floodfill (paint-bucket tool) to fill in any large white connected structures in image
function color(img, colors) {
    // Move through the image, pixel by pixel, looking for a white pixel
    function locateWhite(img, startpos) {
        let pixel = img.ucharPtr(startpos[0], startpos[1]);

        while (pixel[0] != 255 || pixel[0] != 255 || pixel[0] != 255) {
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

    let pos = locateWhite(img, [0, 0])
    let mask = new cv.Mat.zeros(img.rows + 2, img.cols + 2, cv.CV_8UC1);
    while (pos) {
        cv.floodFill(img, mask, { x: pos[1], y: pos[0] }, colors[Math.floor(Math.random() * colors.length)]);
        pos = locateWhite(img, pos);
    }

    return img;
}