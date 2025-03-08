// Selection of colors with which to randomly fill assumed coloring page
var colors = [];
var selectedColor;
var pencilSelected = false;
var glassSelected = false;
var eyedropperSelected = false;
var accepted = false;
var pencilRadius = 2;
var zoom = 1.42;
var prevPoint = null;
var image;
var coloredImage;
var hiddenImage;
var ratio;

window.addEventListener("wheel", changeRadius);
window.addEventListener("mousemove", cursorSquare);

timer = window.setInterval(function () {
    handleMovement = true;
}, 40);

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

upload.style.width = (window.screen.availHeight * 0.65) + "px";
upload.style.height = (window.screen.availHeight * 0.65) + "px";

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

        canvas.height = upload.clientHeight;
        canvas.width = upload.clientHeight;
        let vRatio = canvas.height / img.height;
        let hRatio = canvas.width / img.width;
        ratio = img.width >= img.height ? Math.max(hRatio, vRatio) : Math.min(hRatio, vRatio);

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

    canvas.height = window.innerHeight * 0.72;
    canvas.width = window.innerHeight * 0.72;
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
    accepted = false;

    updateHints();

    if (pencilSelected) {
        pencil();
    }

    if (glassSelected) {
        glass();
    }

}

function use() {
    image = coloredImage.clone();
    coloredImage.delete();
    coloredImage = null;

    updateHints();
    updateGlass();
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

function keep() {
    let out = keepColors(image);
    image = out[0];

    if (colors.length == 0) {
        colors = out[1];
        displayColors();
    } else {
        out[1].forEach(c => {
            plusColor(c);
        });
    }

    showImage(image.clone());

    accepted = true;

    updateHints();
}

function detect() {
    image = binaryEdgeDetection(image);

    showImage(image.clone());

    accepted = true;

    updateHints();
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
    let keepButton = document.getElementById("keep");
    let detectButton = document.getElementById("detect");

    if (image) {
        addme.hidden = true;

        if (accepted) {
            downloadButton.hidden = false;
            keepButton.hidden = true;
            detectButton.hidden = true;
        } else {
            keepButton.hidden = false;
            detectButton.hidden = false;
        }

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
        keepButton.hidden = true;
        detectButton.hidden = true;

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

function changeRadius(e) {
    if (pencilSelected) {
        pencilRadius = Math.floor(pencilRadius + e.deltaY / 100);

        if (pencilRadius < 2) {
            pencilRadius = 2;
        }

        cursorSquare(e)
    }
}

function cursorSquare(e) {
    if (pencilSelected) {
        e.preventDefault();
        let square = document.getElementById("cursor-square")

        square.parentElement.getBoundingClientRect();

        square.style.width = ((pencilRadius * (glassSelected ? zoom / ratio : 1)) * 1.4) + "px";
        square.style.height = ((pencilRadius * (glassSelected ? zoom / ratio : 1)) * 1.4) + "px";

        var rect = square.parentElement.getBoundingClientRect();
        square.style.left = (e.clientX - rect.left - ((pencilRadius * (glassSelected ? zoom / ratio : 1)) * 1.4) / 2) + "px";
        square.style.top = (e.clientY - rect.top - ((pencilRadius * (glassSelected ? zoom / ratio : 1)) * 1.4) / 2) + "px";

        point = [(e.clientX - rect.left) / ratio, (e.clientY - rect.top) / ratio]
        if (handleMovement) {
            if (prevPoint == null) {
                prevPoint = point
            }
            drawLine(e, prevPoint, point);
            prevPoint = point
            handleMovement = false;
        }
    }
}

function moveMagnifier(e) {
    let pos, x, y;
    let w, h, bw;
    /* Prevent any other actions that may occur when moving over the image */
    e.preventDefault();
    /* Get the cursor's x and y positions: */
    pos = getCursorPos(e);
    x = pos.x;
    y = pos.y;

    /* Set the position of the magnifier glass: */
    let glass = document.getElementById("glassDiv")
    bw = 3;
    w = glass.offsetWidth / 2;
    h = glass.offsetHeight / 2;
    glass.style.left = (x - w - 7) + "px";
    glass.style.top = (y - h - 7) + "px";
    /* Display what the magnifier glass "sees": */
    glass.style.backgroundPosition = "-" + ((x * zoom) / ratio - w + bw) + "px -" + ((y * zoom) / ratio - h + bw) + "px";
}

function getCursorPos(e) {
    let a, x = 0, y = 0;
    e = e || window.event;
    /* Get the x and y positions of the image: */
    a = document.getElementById("hiddenImage").parentElement.getBoundingClientRect();
    /* Calculate the cursor's x and y coordinates, relative to the image: */
    x = e.pageX - a.left;
    y = e.pageY - a.top;
    /* Consider any page scrolling: */
    x = x - window.pageXOffset;
    y = y - window.pageYOffset;
    return { x: x, y: y };
}

function magnify(img) {
    /* Create magnifier glass: */
    let glass = document.createElement("DIV");
    glass.setAttribute("class", "img-magnifier-glass");
    glass.id = "glassDiv"

    /* Insert magnifier glass: */
    img.parentElement.insertBefore(glass, img);

    /* Set background properties for the magnifier glass: */
    glass.style.backgroundImage = "url('" + img.src + "')";
    glass.style.backgroundRepeat = "no-repeat";
    glass.style.backgroundSize = (image.cols * zoom) + "px " + (image.rows * zoom) + "px";

    /* Execute a function when someone moves the magnifier glass over the image: */
    window.addEventListener("mousemove", moveMagnifier);
    glass.addEventListener('contextmenu', preventDefault, false);
    glass.addEventListener('contextmenu', fillWhite, false);
    glass.addEventListener('click', fill, false)
}

function pencil() {
    pencilSelected = !pencilSelected;
    let pencilImage = document.getElementById("pencil-image");
    let cursorSquare = document.getElementById("cursor-square");

    if (pencilSelected) {
        pencilImage.src = "./assets/pencil-selected.svg";
        cursorSquare.hidden = false;
        selectedColor = -1;
        displayColors();
    } else {
        pencilImage.src = "./assets/pencil-unselected.svg";
        cursorSquare.hidden = true;
    }
}

function glass() {
    glassSelected = !glassSelected

    let glassImage = document.getElementById("glass-image");

    if (glassSelected) {
        let hiddenCanvas = document.createElement("canvas");
        hiddenCanvas.id = "hiddenCanvas";

        hiddenCanvas.hidden = true;
        cv.imshow(hiddenCanvas, image);

        hiddenImage = new Image();
        hiddenImage.id = "hiddenImage";
        hiddenImage.src = hiddenCanvas.toDataURL();
        hiddenImage.style.imageRendering = "pixelated";

        document.getElementById("upload-box").appendChild(hiddenImage)

        magnify(hiddenImage)

        glassImage.src = "./assets/glass-selected.svg";
    } else {
        glassImage.src = "./assets/glass-unselected.svg";
        window.removeEventListener("mousemove", moveMagnifier);
        document.getElementById("hiddenImage").remove()
        document.getElementById("glassDiv").remove()
    }
}

function eyedropper() {
    let eyedropperImage = document.getElementById("eyedropper-image");
    eyedropperImage.src = "./assets/eyedropper-selected.svg";

    const eyedropper = new EyeDropper();

    eyedropper.open().then((result) => {
        selectedColor = colors.findIndex(c => c == result.sRGBHex);
        if (selectedColor == -1) {
            plusColor(result.sRGBHex);
            selectedColor = colors.length - 1;
        }
        displayColors();
        eyedropperImage.src = "./assets/eyedropper-unselected.svg";
    });
}

function drawLine(e, posA, posB) {
    if (image && e.buttons == 1) {
        e.preventDefault();

        line(posA, posB, [0, 0, 0, 255], pencilRadius);

        if (coloredImage) {
            coloredImage.delete();
            coloredImage = null;
        }

        updateGlass();
    }
}

function updateGlass() {
    if (glassSelected) {
        let hiddenCanvas = document.createElement("canvas")
        hiddenCanvas.id = "hiddenCanvas";
        hiddenCanvas.hidden = true;
        cv.imshow(hiddenCanvas, image);

        hiddenImage.src = hiddenCanvas.toDataURL();
        document.getElementById("glassDiv").style.backgroundImage = "url('" + hiddenImage.src + "')";
    }
}

function fillWhite(e) {
    if (image && !pencilSelected) {
        let vRatio = canvas.height / image.rows;
        let hRatio = canvas.width / image.cols;
        let ratio = image.cols >= image.rows ? Math.max(hRatio, vRatio) : Math.min(hRatio, vRatio);

        if (glassSelected) {
            pos = getCursorPos(e);
            x = pos.x;
            y = pos.y;
            fillAt(image, [y / ratio, x / ratio], [255, 255, 255, 255], null, true);

            updateGlass();
        } else {
            fillAt(image, [e.offsetY / ratio, e.offsetX / ratio], [255, 255, 255, 255], null, true);
        }

        showImage(image.clone());

        if (coloredImage) {
            coloredImage.delete();
            coloredImage = null;
        }

        updateHints();
    }
}

function fill(e) {
    if (colors.length > 0 && selectedColor >= 0 && !pencilSelected) {
        let vRatio = canvas.height / image.rows;
        let hRatio = canvas.width / image.cols;
        let ratio = image.cols >= image.rows ? Math.max(hRatio, vRatio) : Math.min(hRatio, vRatio);
        let color = document.getElementById("color" + selectedColor).value

        if (glassSelected) {
            pos = getCursorPos(e);
            x = pos.x;
            y = pos.y;
            fillAt(image, [y / ratio, x / ratio], hexToRgba(color, true), null, true);

            updateGlass();
        } else {
            fillAt(image, [e.offsetY / ratio, e.offsetX / ratio], hexToRgba(color, true), null, true);
        }

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
    colors.push(rgbToHex(getRandomInt(0, 255), getRandomInt(0, 255), getRandomInt(0, 255)));

    displayColors();
}

function plusColor(color = "#ff0000") {
    colors.push(color);

    displayColors();
}

function removeColor(removedId) {
    colors.splice(removedId, 1);

    if (selectedColor >= 0) {
        if (removedId == selectedColor) {
            selectedColor = -1
        } else if (removedId > selectedColor) {
            selectColor(selectedColor)
        } else {
            selectColor(selectedColor - 1)
        }
    }

    displayColors();
}

function changeColor(color) {
    let pos = color.id.split("color")[1];
    colors[pos] = color.value;

    selectColor(pos);
    displayColors();
}

function selectColor(color) {
    if (selectedColor >= 0) {
        let colorInput = document.getElementById("color" + selectedColor)
        colorInput.classList.remove("color-selected");
        colorInput.classList.add("color");
    }

    selectedColor = color
    if (pencilSelected) {
        pencil()
    }

    if (selectedColor >= 0) {
        let colorInput = document.getElementById("color" + selectedColor)
        colorInput.classList.add("color-selected");
        colorInput.classList.remove("color")
    }
}

function displayColors() {
    document.getElementById("colordrop").value = colors.join(",\n")

    let colorDiv = document.getElementById("colors");
    colorDiv.innerHTML = '';
    colors.map(c => {
        colorDiv.insertAdjacentHTML(
            'beforeend',
            `<div class="relative group"><button class="absolute right-0 hidden z-10 group-hover:block" onclick="removeColor(${colorDiv.children.length})"><img src="./assets/remove-color.svg"/></button><input id="color${colorDiv.children.length}" onclick="selectColor(${colorDiv.children.length})" onchange="changeColor(this)" type="color" value="${c}" class="${(selectedColor >= 0) && selectedColor == colorDiv.children.length ? "color-selected" : "color"}"/><div class="pl-6 pr-5 py-3 absolute -right-24 top-0 hidden group-hover:block">${c}</div></div>`
        );
    });

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

    cv.bitwise_not(img, img);

    for (let i = 0; i < 21; i++) {
        cv.morphologyEx(img, img, cv.MORPH_CLOSE, cv.Mat.ones(17, 17, cv.CV_8UC1));
    }

    cv.bitwise_not(img, img);

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

// Do not preprocess anything, keep colors, just remove alpha channel and identify colors
function keepColors(img) {
    let out = new cv.Mat(img.rows, img.cols, cv.CV_8UC3);
    let newColors = []

    for (let i = 0; i < img.rows; i++) {
        for (let j = 0; j < img.cols; j++) {
            let pixelImg = img.ucharPtr(i, j);
            let R = pixelImg[0];
            let G = pixelImg[1];
            let B = pixelImg[2];

            let pixelMax = out.ucharPtr(i, j);
            pixelMax[0] = R;
            pixelMax[1] = G;
            pixelMax[2] = B;

            let color = rgbToHex(R, G, B)
            let idx = newColors.findIndex(c => c == color)

            if (idx == -1 && newColors.length < 36) {
                newColors.push(color)
            }
        }
    }

    img.delete();

    return [out, newColors];
}

// Convenience function executing preprocessing altogether
function binaryEdgeDetection(img) {
    return stack(threshold(max(img)));
}

// Fill connected patch of color on image with another color at position
function fillAt(img, pos, color, mask = null, avoidBlack = false) {
    newMask = false
    if (!mask) {
        mask = new cv.Mat.zeros(img.rows + 2, img.cols + 2, cv.CV_8UC1);
        newMask = true
    }

    if (avoidBlack) {
        let pixel = img.ucharPtr(pos[0], pos[1]);

        if (pixel[0] == 0 && pixel[1] == 0 && pixel[2] == 0) {
            return;
        }
    }

    cv.floodFill(img, mask, { x: pos[1], y: pos[0] }, color);

    if (newMask) {
        mask.delete()
    }
}

// Color in a square of some radius with some color as some position
function colorAt(img, pos, color, radius) {
    for (let i = pos[0] - radius; i < pos[0] + radius; i++) {
        for (let j = pos[1] - radius; j < pos[1] + radius; j++) {
            let pixel = img.ucharPtr(i, j);

            pixel[0] = color[0]
            pixel[1] = color[1]
            pixel[2] = color[2]
            pixel[3] = color[3]
        }
    }
}

// Draw line from point A to B
function line(posA, posB, color, radius) {
    cv.line(image, new cv.Point(posA[0], posA[1]), new cv.Point(posB[0], posB[1]), color, radius);
    showImage(image.clone());
}

// Use floodfill (paint-bucket tool) to fill in all large white connected structures in image with random color
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
        fillAt(img, pos, colors[Math.floor(Math.random() * colors.length)], mask)
        pos = locateWhite(img, pos);
    }

    return img;
}