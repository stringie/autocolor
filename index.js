// Selection of colors with which to randomly fill assumed coloring page
var colors = [];
var selectedColor;
var pencilSelected = false;
var glassSelected = false;
var pencilRadius = 2;
var zoom = 2;
var image;
var coloredImage;
var hiddenImage;
var ratio;

window.addEventListener("wheel", changeRadius);
window.addEventListener("mousemove", cursorCircle);

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

upload.style.width = (window.screen.availHeight * 0.7) + "px";
upload.style.height = (window.screen.availHeight * 0.7) + "px";

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

function changeRadius(e) {
    if (pencilSelected) {
        pencilRadius = Math.floor(pencilRadius + e.deltaY / 100);

        if (pencilRadius < 2) {
            pencilRadius = 2;
        }

        cursorCircle(e)
    }
}

function cursorCircle(e) {
    if (pencilSelected) {
        let circle = document.getElementById("cursor-circle")

        circle.parentElement.getBoundingClientRect();

        circle.style.width = (pencilRadius * (glassSelected ? zoom/ratio : 1)) + "px";
        circle.style.height = (pencilRadius * (glassSelected ? zoom/ratio : 1)) + "px";

        var rect = circle.parentElement.getBoundingClientRect();
        circle.style.left = (e.clientX - rect.left - (pencilRadius * (glassSelected ? zoom/ratio : 1))/2) + "px";
        circle.style.top = (e.clientY - rect.top - (pencilRadius * (glassSelected ? zoom/ratio : 1))/2) + "px";

        draw(e, e.clientX - rect.left, e.clientY - rect.top);
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
    glass.style.backgroundPosition = "-" + ((x * zoom)/ratio - w + bw) + "px -" + ((y * zoom)/ratio - h + bw) + "px";
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
    return {x : x, y : y};
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
    let cursorCircle = document.getElementById("cursor-circle");

    if (pencilSelected) {
        pencilImage.src = "./assets/pencil-selected.svg";
        cursorCircle.hidden = false;
        selectedColor = null;
        displayColors();
    } else {
        pencilImage.src = "./assets/pencil-unselected.svg";
        cursorCircle.hidden = true;
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
        document.getElementById("hiddenCanvas").remove();
    }
}

function draw(e, x, y) {
    if (image && e.buttons == 1) {
        e.preventDefault();

        let vRatio = canvas.height / image.rows;
        let hRatio = canvas.width / image.cols;
        let ratio = image.cols >= image.rows ? Math.max(hRatio, vRatio) : Math.min(hRatio, vRatio);

        colorAt(image, [y / ratio, x / ratio], [0, 0, 0, 0], pencilRadius);
        showImage(image.clone());

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
            fillAt(image, [y/ratio, x/ratio], [255, 255, 255, 255], null, true);

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
    if (colors.length > 0 && selectedColor && !pencilSelected) {
        let vRatio = canvas.height / image.rows;
        let hRatio = canvas.width / image.cols;
        let ratio = image.cols >= image.rows ? Math.max(hRatio, vRatio) : Math.min(hRatio, vRatio);

        if (glassSelected) {
            pos = getCursorPos(e);
            x = pos.x;
            y = pos.y;
            fillAt(image, [y/ratio, x/ratio], hexToRgba(selectedColor.value, true), null, true);

            updateGlass();
        } else {
            fillAt(image, [e.offsetY / ratio, e.offsetX / ratio], hexToRgba(selectedColor.value, true), null, true);
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

function removeColor(color) {
    let pos = color.id.split("color")[1];
    colors.splice(pos, 1);

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
    if (pencilSelected) {
        pencil()
    }

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
            `<div class="relative group"><button id="color${colorDiv.children.length}" class="absolute right-0 hidden group-hover:block" onclick="removeColor(this)"><img src="./assets/remove-color.svg"/></button><input id="color${colorDiv.children.length}" onclick="selectColor(this)" onchange="changeColor(this)" type="color" value="${c}" class="${selectedId && selectedId == colorDiv.children.length ? "color-selected" : "color"}"/></div>`
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

function fillAt(img, pos, color, mask = null, avoidBlack = false) {
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

function colorAt(img, pos, color, radius) {
    for (let i = pos[0] - radius; i < pos[0] + radius; i++) {
        for (let j = pos[1] - radius; j < pos[1] + radius; j++) {

            if ((i - pos[0]) ** 2 + (j - pos[1]) ** 2 <= radius ** 2) {
                let pixel = img.ucharPtr(i, j);

                pixel[0] = color[0]
                pixel[1] = color[1]
                pixel[2] = color[2]
                pixel[3] = color[3]
            }
        }
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
        fillAt(img, pos, colors[Math.floor(Math.random() * colors.length)], mask)
        pos = locateWhite(img, pos);
    }

    return img;
}