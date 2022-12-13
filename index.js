import { binaryEdgeDetection, color } from "./autocolor.js";

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