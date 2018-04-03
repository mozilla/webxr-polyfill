importScripts('../../dist/webxr-worker.js')

console.log("loaded webxr-worker.js")

var cvStatusTxt = "";
var Module = {
  preRun: [function() {
    Module.FS_createPreloadedFile('/', 'haarcascade_eye.xml', 'haarcascade_eye.xml', true, false);
    Module.FS_createPreloadedFile('/', 'haarcascade_frontalface_default.xml', 'haarcascade_frontalface_default.xml', true, false);
    Module.FS_createPreloadedFile('/', 'haarcascade_profileface.xml', 'haarcascade_profileface.xml', true, false);
  }],
  onRuntimeInitialized: function() {
        postMessage({type: "cvReady"});
  },
  setStatus: function(msg) {
        postMessage({type: "cvStatus", msg: msg});
  }
};

console.log("set up pre-load")

importScripts('opencv.js')

console.log("loaded opencv.js:" + cv);

/**
 * In the video callback,  ev.detail contains:
    {
    "frame": {
        "buffers": [ // Array of base64 encoded string buffers
        {
            "size": {
            "width": 320,
            "height": 180,
            "bytesPerRow": 320,
            "bytesPerPixel": 1
            },
            "buffer": "e3x...d7d"   /// convert to Uint8 ArrayBuffer in code below
        },
        {
            "size": {
            "width": 160,
            "height": 90,
            "bytesPerRow": 320,
            "bytesPerPixel": 2
            },
            "buffer": "ZZF.../fIJ7"  /// convert to Uint8 ArrayBuffer in code below
        }
        ],
        "pixelFormatType": "kCVPixelFormatType_420YpCbCr8BiPlanarFullRange",
        "pixelFormat": "YUV420P",  /// Added in the code below, clients should ignore pixelFormatType
        "timestamp": 337791
    },
    "camera": {
        "cameraIntrinsics": [3x3 matrix],
            fx 0   px
            0  fy  py
            0  0   1
            fx and fy are the focal length in pixels.
            px and py are the coordinates of the principal point in pixels.
            The origin is at the center of the upper-left pixel.

        "cameraImageResolution": {
        "width": 1280,
        "height": 720
        },
        "viewMatrix": [4x4 camera view matrix],
        "interfaceOrientation": 3,
            // 0 UIDeviceOrientationUnknown
            // 1 UIDeviceOrientationPortrait
            // 2 UIDeviceOrientationPortraitUpsideDown
            // 3 UIDeviceOrientationLandscapeRight
            // 4 UIDeviceOrientationLandscapeLeft
        "projectionMatrix": [4x4 camera projection matrix]
    }
    }
*/

var face_cascade;
var eye_cascade;

function loadFaceDetectTrainingSet() {
    if (face_cascade == undefined) {
        face_cascade = new cv.CascadeClassifier();
        let load = face_cascade.load('haarcascade_frontalface_default.xml');
        console.log('load face detection training data', load);
    }
}

function loadEyesDetectTrainingSet() {
    if (eye_cascade == undefined) {
        eye_cascade = new cv.CascadeClassifier();
        let load = eye_cascade.load('haarcascade_eye.xml');
        console.log('load eye detection training data', load);
    }
}

function faceDetect(img_gray) {
    loadFaceDetectTrainingSet();
    
    let w = Math.floor(img_gray.cols /2);
    let h = Math.floor(img_gray.rows /2);
    let roiRect = new cv.Rect(w/2, h/2, w, h);
    let roi_gray = img_gray.roi(roiRect);

    let faces = new cv.RectVector();
    let s1 = new cv.Size(50,50);
    let s2 = new cv.Size();
    face_cascade.detectMultiScale(roi_gray, faces, 1.1, 30, 0, s1, s2);

    let rects = [];

    for (let i = 0; i < faces.size(); i += 1) {
        let faceRect = faces.get(i);
        rects.push({
            x: faceRect.x,
            y: faceRect.y,
            width: faceRect.width,
            height: faceRect.height
        });
    }

    faces.delete();
    return rects;
}

function eyesDetect(img_gray) {	
    loadFaceDetectTrainingSet();
    loadEyesDetectTrainingSet();

    let faces = new cv.RectVector();
    let s1 = new cv.Size();
    let s2 = new cv.Size();
    face_cascade.detectMultiScale(img_gray, faces);//, 1.1, 3, 0);//, s1, s2);

    let rects = [];

    for (let i = 0; i < faces.size(); i += 1) {
        let faceRect = faces.get(i);
        let x = faceRect.x;
        let y = faceRect.y;
        let w = faceRect.width;
        let h = faceRect.height;

        rects.push({
            x: x,
            y: y,
            width: w,
            height: h
        });

        let roiRect = new cv.Rect(x, y, w, h);
        let roi_gray = img_gray.roi(roiRect);

        let eyes = new cv.RectVector();
        eye_cascade.detectMultiScale(roi_gray, eyes);//, 1.1, 3, 0, s1, s2);

        for (let j = 0; j < eyes.size(); j += 1) {

            let eyeRect = eyes.get(j);

            rects.push({
                x: x + eyeRect.x,
                y: y + eyeRect.y,
                width: eyeRect.width,
                height: eyeRect.height
            });
        }

        eyes.delete();
        roi_gray.delete();
    }

    faces.delete();

    return rects
}

var rotatedImage = null;
var lastRotation = -1;

// 0 UIDeviceOrientationUnknown
// 1 UIDeviceOrientationPortrait
// 2 UIDeviceOrientationPortraitUpsideDown
// 3 UIDeviceOrientationLandscapeRight
// 4 UIDeviceOrientationLandscapeLeft     --- normal?
function rotateImage(rotation, buffer) {
    var width = buffer.size.width
    var height = buffer.size.height
    if (!rotatedImage || (lastRotation != rotation)) {
        lastRotation = rotation;

        if(rotation ==1 ||  rotation == 2) {
            rotatedImage = new cv.Mat(width, height, cv.CV_8U)
        } else {
            rotatedImage = new cv.Mat(height, width, cv.CV_8U)
        }
    }
    var src, dest;
    src = dest = 0;

    var i, j;
    var b = new Uint8Array(buffer.buffer);
    var r = rotatedImage.data;

    var rowExtra = buffer.size.bytesPerPixel * buffer.size.bytesPerRow - width;
    switch(rotation) {
    case 1:
        // clockwise
        dest = height - 1;
        for (j = 0; j < height; j++) {
            for (var i = 0; i < width; i++) {
                r[dest] = b[src++]
                dest += height; // up the row
            }
            dest -= width * height;
            dest --;
            src += rowExtra;
        }								
        break;

    case 2:							
        // anticlockwise
        dest = width * (height - 1);
        for (j = 0; j < height; j++) {
            for (var i = 0; i < width; i++) {
                r[dest] = b[src++]
                dest -= height; // down the row
            }
            dest += width * height;
            dest ++;
            src += rowExtra;
        }								
        break;

    case 4:
        // 180
        dest = width * height - 1;
        for (j = 0; j < height; j++) {
            for (var i = 0; i < width; i++) {
                r[dest--] = b[src++]
            }
            src += rowExtra;
        }								
        break;

    case 3:
    default:
        // copy
        for (j = 0; j < height; j++) {
            for (var i = 0; i < width; i++) {
                r[dest++] = b[src++]
            }
            src += rowExtra;
        }								
    }		
}


self.addEventListener('message',  function(event){
    var videoFrame = XRVideoFrame.createFromMessage(event);

    switch (videoFrame.pixelFormat) {
    case XRVideoFrame.IMAGEFORMAT_YUV420P:
        var rotation = camera.interfaceOrientation;
        rotateImage(rotation, videoFrame.buffer(0))
        var faceRects = faceDetect(rotatedImage);

        videoFrame.postReplyMessage({type: "cvFrame", rects: faceRects})
    }
    videoFrame.release();
});
