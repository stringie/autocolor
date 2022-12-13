// Selection of colors with which to randomly fill assumed coloring page
var colors = [];
var selectedColor;
var image;
var coloredImage;

// Create fake input element for uploading images
var fakeInput = document.createElement("input");
fakeInput.type = "file";
fakeInput.accept = "image/*";
fakeInput.multiple = false;
fakeInput.addEventListener('change', handleImage, false);

var upload = document.getElementById("upload");
var uploadBox = document.getElementById("upload-box");
upload.addEventListener('click', handleClick, false);
upload.addEventListener('dragenter', preventDefault, false);
upload.addEventListener('dragleave', preventDefault, false);
upload.addEventListener('dragover', preventDefault, false);
upload.addEventListener('drop', preventDefault, false);
upload.addEventListener('drop', handleImage, false);

function handleClick() {
    fakeInput.click();
}

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
    upload.removeEventListener('click', handleClick, false);
    canvas.addEventListener('click', fill, false)

    canvas.addEventListener('contextmenu', preventDefault, false);
    canvas.addEventListener('contextmenu', fillWhite, false);

    var img = new Image;
    img.src = URL.createObjectURL(files[0]);
    img.onload = function () {
        image = cv.imread(img);
        image = binaryEdgeDetection(image);

        canvas.height = window.innerHeight * 0.78;
        canvas.width = window.innerHeight * 0.78;
        let vRatio = canvas.height / img.height;
        let hRatio = canvas.width / img.width;
        let ratio = Math.min(hRatio, vRatio);

        uploadBox.style.width = img.width * ratio + "px";
        upload.style.width = img.width * ratio + "px";
        canvas.width = img.width * ratio;

        showImage(image.clone());
        updateHints();
    }
}

function remove() {
    var canvas = document.getElementById('canvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    canvas.removeEventListener('click', fill, false)

    canvas.height = window.innerHeight * 0.78;
    canvas.width = window.innerHeight * 0.78;
    uploadBox.style.width = canvas.width + "px";
    upload.style.width = canvas.width + "px";

    upload.addEventListener('click', handleClick, false);

    fakeInput.value = '';
    
    if (coloredImage) {
        coloredImage.delete();
    }
    
    image.delete();

    image = null;
    coloredImage = null;

    updateHints();
}

function use() {
    image = coloredImage.clone();
    coloredImage.delete();
    coloredImage = null;

    updateHints();
}

function download() {
    var c = document.createElement('canvas');
    var link = document.createElement('a');

    c.hidden = true;

    cv.imshow(c, image);

    link.download = 'autocolor.png';
    link.href = c.toDataURL();
    link.click();

    link.remove();
    c.remove();
}

function updateHints() {
    let pressme = document.getElementById("pressme");
    let chooseme = document.getElementById("chooseme");
    let addme = document.getElementById("addme");
    let fillme = document.getElementById("fillme");
    let whiteme = document.getElementById("whiteme");
    let downloadButton = document.getElementById("download");
    let removeButton = document.getElementById("remove");
    let useButton = document.getElementById("use");

    if (image) {
        addme.hidden = true;

        downloadButton.hidden = false;
        removeButton.hidden = false;

        if (coloredImage) {
            useButton.hidden = false;
            whiteme.hidden = false;
        } else {
            useButton.hidden = true;
        }

        if (colors.length > 0) {
            pressme.hidden = false;
            chooseme.hidden = true;
            fillme.hidden = false;
        } else {
            chooseme.hidden = false;
            pressme.hidden = true;
            fillme.hidden = true;
        }
    } else {
        pressme.hidden = true;
        addme.hidden = false;
        fillme.hidden = true;
        whiteme.hidden = true;

        downloadButton.hidden = true;
        removeButton.hidden = true;
    }
}

// Assumed input is '#xxxxxx'; allowWhite is a measure to prevent
// infinite loop when searching for white pixels when autocoloring
function hexToRgba(hex, allowWhite = false) {
    hex = hex.trim().substring(1);
    var bigint = parseInt(hex, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;

    if (r == 255 && g == 255 && b == 255 && allowWhite) {
        return [r, g, b, 255]
    }

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

function rgbToHex(r, g, b) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fillWhite(e) {
    if (image) {
        let vRatio = canvas.height / image.rows;
        let hRatio = canvas.width / image.cols;
        let ratio = Math.min(hRatio, vRatio);

        colorAt(image, [e.offsetY / ratio, e.offsetX / ratio], [255, 255, 255, 255], null, true);
        showImage(image.clone());

        if (coloredImage) {
            coloredImage.delete();
            coloredImage = null;

        }

        updateHints();
    }
}

function fill(e) {
    if (colors.length > 0 && selectedColor) {
        let vRatio = canvas.height / image.rows;
        let hRatio = canvas.width / image.cols;
        let ratio = Math.min(hRatio, vRatio);

        colorAt(image, [e.offsetY / ratio, e.offsetX / ratio], hexToRgba(selectedColor.value, true), null, true);
        showImage(image.clone());

        if (coloredImage) {
            coloredImage.delete();
            coloredImage = null;

        }

        updateHints();
    }
}

function autocolor() {
    if (image) {
        coloredImage = colorAll(image.clone(), colors.map(c => hexToRgba(c)));
        showImage(coloredImage.clone());
    }

    updateHints();
}

function showImage(img) {
    cv.resize(img, img, new cv.Size(canvas.width, canvas.height));
    cv.imshow(canvas, img);

    img.delete();
}

function colorDrop() {
    let colorDropTextarea = document.getElementById("colordrop");
    colors = colorDropTextarea.value.split(",").map(s => s.trim());

    displayColors();
}

function randomColor() {
    if (colors.length < 12) {
        colors.push(rgbToHex(getRandomInt(0, 255), getRandomInt(0, 255), getRandomInt(0, 255)));
    }

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

    selectColor(color);
    displayColors();
}

function selectColor(color) {
    if (selectedColor) {
        selectedColor.classList.remove("color-selected");
        selectedColor.classList.add("color");
    }

    selectedColor = color;

    selectedColor.classList.add("color-selected");
    selectedColor.classList.remove("color")
}

function displayColors() {
    document.getElementById("colordrop").value = colors.join(",\n")

    let selectedId;
    if (selectedColor) {
        selectedId = selectedColor.id.split("color")[1];
    }

    let colorDiv = document.getElementById("colors");
    colorDiv.innerHTML = '';
    colors.map(c => {
        colorDiv.insertAdjacentHTML(
            'beforeend',
            `<input id="color${colorDiv.children.length}" onclick="selectColor(this)" onchange="changeColor(this)" type="color" value="${c}" class="${selectedId && selectedId == colorDiv.children.length ? "color-selected" : "color"}"/>`
        );
    });

    if (selectedId) {
        selectedColor = colorDiv.children[selectedId];
    }

    updateHints();
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