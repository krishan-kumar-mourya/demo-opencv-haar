const utils = new Utils("errorMessage");

let faceCascade = null;
let eyeCascade = null;
let eyePoint1 = null;
let eyePoint2 = null;
let roiEyes = null;
let scale = 1;
let mstream = null;

const detectEyes = function () {
  let tmp = cv.imread("canvas-temp");
  let src = new cv.Mat();

  console.log("image width: " + tmp.cols + "\n" + "image height: " + tmp.rows);
  scale = tmp.cols / 300;

  cv.resize(
    tmp,
    src,
    new cv.Size(tmp.cols / scale, tmp.rows / scale),
    0,
    0,
    cv.INTER_AREA
  );

  console.log("image width: " + src.cols + "\n" + "image height: " + src.rows);

  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  let faces = new cv.RectVector();
  let eyes = new cv.RectVector();

  // detect faces
  let msize = new cv.Size(0, 0);
  faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, msize, msize);

  if (faces.size() >= 1) {
    let i = 0;
    let roiGray = gray.roi(faces.get(i));
    let roiSrc = src.roi(faces.get(i));
    eyeCascade.detectMultiScale(roiGray, eyes);

    let point1 = { x: 0, y: 0 };
    let point2 = { x: 0, y: 0 };
    if (eyes.size() >= 2) {
      let j = 0;
      point1 = new cv.Point(eyes.get(j).x, eyes.get(j).y);

      j = eyes.size() - 1;
      point2 = new cv.Point(
        eyes.get(j).x + eyes.get(j).width,
        eyes.get(j).y + eyes.get(j).height
      );
      cv.rectangle(roiSrc, point1, point2, [0, 255, 255, 255]);

      let rect = new cv.Rect(
        point1.x + 1,
        point1.y + 1,
        point2.x - point1.x - 1,
        point2.y - point1.y - 1
      );

      eyePoint2 = { x: point2.x - point1.x - 1, y: point2.y - point1.y - 1 };
      roiEyes = roiSrc.roi(rect);
      acceptButton.style.display = "block";
    } else {
      utils.printError("Unable to detect eyes, Please try again.");
    }

    let fpoint1 = new cv.Point(faces.get(i).x, faces.get(i).y);
    let fpoint2 = new cv.Point(
      faces.get(i).x + faces.get(i).width,
      faces.get(i).y + faces.get(i).height
    );

    eyePoint1 = { x: point1.x + fpoint1.x, y: point1.y + fpoint1.y };
    // eyePoint2 = { x: point2.x, y: point2.y };
    // cv.rectangle(src, fpoint1, fpoint2, [255, 0, 0, 255]);

    cv.imshow("canvas", roiSrc);
    roiGray.delete();
    roiSrc.delete();
  } else {
    utils.printError("Unable to detect face, Please try again.");
    cv.imshow("canvas", src);
  }
  // cv.imshow("canvas", src);
  src.delete();
  tmp.delete();
  rejectButton.style.display = "block";
};

const setUpCascade = function () {
  let faceCascadeFile = "haarcascade_frontalface_default.xml";
  let eyeCascadeFile = "haarcascade_eye.xml";
  utils.createFileFromUrl(faceCascadeFile, "data/" + faceCascadeFile, () => {
    console.log("face cascade ready");

    utils.createFileFromUrl(eyeCascadeFile, "data/" + eyeCascadeFile, () => {
      console.log("eye cascade ready");

      function loadCascade() {
        try {
          faceCascade = new cv.CascadeClassifier();
          eyeCascade = new cv.CascadeClassifier();

          // load pre-trained classifiers
          faceCascade.load(faceCascadeFile);
          eyeCascade.load(eyeCascadeFile);

          console.log("cascade setup done");

          loader.style.display = "none";
          step1.style.display = "block";

          dummyCam.style.display = "block";
          player.style.display = "none";

          init();
        } catch (e) {
          console.log(e);
          console.log("failed to load, retrying in 1 sec");
          setTimeout(loadCascade, 1000);
          return;
        }
      }

      loadCascade();
    });
  });
};

utils.loadOpenCv(() => {
  console.log("open cv loaded");
  setTimeout(setUpCascade, 1000);
});

const loader = document.getElementById("step-loader");
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");
const step4 = document.getElementById("step4");
const dummyCam = document.getElementById("dummy-cam");
const playerBtns = document.getElementById("player-btns");
const photo = document.getElementById("photo");
const player = document.getElementById("player");
const canvasTemp = document.getElementById("canvas-temp");
const canvas = document.getElementById("canvas");
const contextTemp = canvasTemp.getContext("2d");
const context = canvas.getContext("2d");

const flashButton = document.getElementById("flash");
const captureButton = document.getElementById("capture");
const cameraButton = document.getElementById("camera");
const acceptButton = document.getElementById("accept");
const rejectButton = document.getElementById("reject");

flashButton.addEventListener("click", toggleFlash);
captureButton.addEventListener("click", captureImage);
cameraButton.addEventListener("click", toggleCamera);
acceptButton.addEventListener("click", acceptImage);
rejectButton.addEventListener("click", resetCaptureImage);

// for iphone safari fix
player.setAttribute("autoplay", "");
player.setAttribute("muted", "");
player.setAttribute("playsinline", "");

let cameraMode = "user";
let cameraFlash = false;
let HEIGHT = 0;
let WIDTH = 0;

async function startCamera() {
  const constraints = {
    video: {
      // width: {
      //   min: 1280,
      //   ideal: 1920,
      //   max: 2560,
      // },
      // height: {
      //   min: 720,
      //   ideal: 1080,
      //   max: 1440,
      // },
      facingMode: cameraMode,
    },
  };
  // Attach the video stream to the video element and autoplay.
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    player.srcObject = stream;
    player.play();

    dummyCam.style.display = "none";
    player.style.display = "block";
    playerBtns.style.display = "block";

    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    HEIGHT = settings.height;
    WIDTH = settings.width;

    if (cameraFlash) {
      track.applyConstraints({
        advanced: [{ torch: true }],
      });
    }
  });
}

function stopCamera() {
  // Stop all video streams.
  player.srcObject.getVideoTracks().forEach((track) => track.stop());
  try {
    player.load();
  } catch (e) {
    console.log("player load", e);
  }
}

function toggleFlash() {
  cameraFlash = !cameraFlash;
  stopCamera();
  startCamera();
}

function toggleCamera() {
  if (cameraMode === "user") {
    cameraMode = "environment";
  } else {
    cameraMode = "user";
  }
  stopCamera();
  startCamera();
}

function captureImage() {
  // Draw the video frame to the canvas.
  canvasTemp.width = WIDTH;
  canvasTemp.height = HEIGHT;

  var contextT = canvasTemp.getContext("2d");
  contextT.drawImage(player, 0, 0, WIDTH, HEIGHT);
  stopCamera();

  setTimeout(() => {
    try {
      detectEyes();
    } catch (e) {
      console.log(e);
      utils.printError("Unable to detect face, Please try again.");
      let src = cv.imread("canvas-temp");
      cv.imshow("canvas", src);
      src.delete();
      rejectButton.style.display = "block";
    }
    loader.style.display = "none";
    step2.style.display = "block";
  }, 1000);

  step1.style.display = "none";
  step2.style.display = "none";
  step3.style.display = "none";
  loader.style.display = "block";
}

function resetCaptureImage() {
  // Clear the canvas.
  contextTemp.fillStyle = "#FFF";
  contextTemp.fillRect(0, 0, canvasTemp.width, canvasTemp.height);

  // clear all errors
  utils.printError();
  acceptButton.style.display = "none";
  rejectButton.style.display = "none";

  // Start video streams.
  startCamera();
  step1.style.display = "block";
  step2.style.display = "none";
  step3.style.display = "none";
}

function acceptImage() {
  cv.imshow("canvas", roiEyes);

  console.log(eyePoint1, eyePoint2);
  let imageData = contextTemp.getImageData(
    eyePoint1.x * scale,
    eyePoint1.y * scale,
    eyePoint2.x * scale,
    eyePoint2.y * scale
  );
  canvasTemp.width = eyePoint2.x * scale;
  canvasTemp.height = eyePoint2.y * scale;
  contextTemp.putImageData(imageData, 0, 0);

  const data = canvasTemp.toDataURL("image/png");
  photo.setAttribute("src", data);

  step1.style.display = "none";
  step2.style.display = "none";
  step3.style.display = "block";
}

function init() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    startCamera();
  } else {
    utils.printError("Camera not found or not supported");
  }
}
