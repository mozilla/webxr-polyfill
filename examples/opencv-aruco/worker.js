importScripts('../../dist/webxr-worker.js')
importScripts("../../polyfill/fill/gl-matrix.js")
console.log("loaded webxr-worker.js")

var openCVready = false;

// need to load up the files for tracking the face and eyes
var Module = {
  onRuntimeInitialized: function() {
        openCVready = true;
        postMessage({type: "cvReady"});
  },
  setStatus: function(msg) {
        postMessage({type: "cvStatus", msg: msg});
  }
};
console.log("set up pre-load")

importScripts('opencv.js')
console.log("loaded opencv.js:" + cv);

// Edge doesn't support Array.from.  
// This is a VERY SIMPLIFIED version (from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from)
// that only works if the input is a typed array buffer
if (!Array.from) {
  Array.from = (function (arrayLike) {
    var normalArray = Array.prototype.slice.call(arrayLike);
    normalArray.length === 4;
    normalArray.constructor === Array;
    return normalArray
  })
}

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
        "buffer": "e3x...d7d"   /// convert to Uint8 buffer in code below
      },
      {
        "size": {
          "width": 160,
          "height": 90,
          "bytesPerRow": 320,
          "bytesPerPixel": 2
        },
        "buffer": "ZZF.../fIJ7"  /// convert to Uint8 buffer in code below
      }
    ],
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
    "arCamera": true;
    "cameraOrientation": 0,  // orientation in degrees of image relative to display
                            // normally 0, but on video mixed displays that keep the camera in a fixed 
                            // orientation, but rotate the UI, like on some phones, this will change
                            // as the display orientation changes
    "projectionMatrix": [4x4 camera projection matrix]
  }
}

*/

// createCVMat
//
// this routine does two things (if needed) as part of copying the input buffer to a cv.Mat:
// - rotates the image so it is upright 
// - converts to greyscale 

var rotatedImage = null;
var img_gray = null;
var img_rgba = null;

function createCVMat2(rotation, buffer, pixelFormat) {
    var width = buffer.size.width
    var height = buffer.size.height

    if (!img_gray) img_gray = new cv.Mat();
    if (!img_rgba) img_rgba = new cv.Mat();
    // if (!rotatedImage) rotatedImage = new cv.Mat();

    switch(pixelFormat) {
        case XRVideoFrame.IMAGEFORMAT_YUV420P:
            var b = new Uint8Array(buffer.buffer);
            img_gray.create(height,width,cv.CV_8U)
            img_gray.data.set(b);        
            break;
        case XRVideoFrame.IMAGEFORMAT_RGBA32:
            var b = new Uint8Array(buffer.buffer);
            img_rgba.create(height,width,cv.CV_8UC4)
            img_rgba.data.set(b);
            cv.cvtColor(img_rgba, img_gray, cv.COLOR_RGBA2GRAY, 0);
            break;
    }
    return img_gray;            
}

///////////
var endTime = 0;

var camDistortion = null;
var dictionary = null;
var parameter = null;
var markerIds = null;
var markerCorners = null;
var rotMat = null;
var rVec = null;
var antiRotation = mat4.create();

self.addEventListener('message',  function(event){
    // send back some timing messages, letting the main thread know the message is 
    // received and CV processing has started
    postMessage({type: "cvStart", time: ( performance || Date ).now()});

    // create a videoFrame object frome the message.  Eventually, this may
    // be passed in by the browser, if we create something like a "vision worker"
    var videoFrame = XRVideoFrame.createFromMessage(event);

    // did we find any?
    var markers = []

    // don't do anything until opencv.js and WASM and support files are loaded
    if (openCVready) {   
        // some fixed values
        if (dictionary == null) {
            dictionary = new cv.Dictionary(cv.DICT_6X6_250);
            markerIds = new cv.Mat();
            markerCorners  = new cv.MatVector();
            rvecs = new cv.Mat();
            tvecs = new cv.Mat();
            rvec = new cv.Mat(3, 1, cv.CV_64F);

            camIntrinsics = new cv.Mat();
            rotMat = new cv.Mat();
            resizeMat = new cv.Mat();
            flipMat = new cv.Mat();

            parameter = new cv.DetectorParameters();
            parameter.adaptiveThreshWinSizeMin = 3,
            //parameter.adaptiveThreshWinSizeMin = 23;
            // parameter.adaptiveThreshWinSizeMax = 23,
            parameter.adaptiveThreshWinSizeMax = 23;
            parameter.adaptiveThreshWinSizeStep = 10,
            parameter.adaptiveThreshConstant = 7;
            // parameter.minMarkerPerimeterRate = 0.03;
            parameter.minMarkerPerimeterRate = 0.1;
            parameter.maxMarkerPerimeterRate = 3.5;
            parameter.polygonalApproxAccuracyRate = 0.05;
            parameter.minCornerDistanceRate = 0.05;
            parameter.minDistanceToBorder = 3;
            parameter.minMarkerDistanceRate = 0.05;
            parameter.cornerRefinementMethod = cv.CORNER_REFINE_SUBPIX; // cv.CORNER_REFINE_NONE;
            parameter.cornerRefinementWinSize = 5;
            parameter.cornerRefinementMaxIterations = 50;
            parameter.cornerRefinementMinAccuracy = 0.01;
            parameter.markerBorderBits = 1;
            parameter.perspectiveRemovePixelPerCell = 4;
            //parameter.perspectiveRemovePixelPerCell = 2;
            parameter.perspectiveRemoveIgnoredMarginPerCell = 0.13;
            parameter.maxErroneousBitsInBorderRate = 0.35;
            parameter.minOtsuStdDev = 5.0;
            parameter.errorCorrectionRate = 0.6;
        }

        var scale = 1;
        var buffer = videoFrame.buffer(0);
        var width = buffer.size.width;
        var height = buffer.size.height;

        // set up a camera coefficient matrices, for distortion and projection
        if (camDistortion == null) {
            // we assume we're getting no distortion for now, since our cameras appear rectaliner
            // we probably want to add distortion coefficients to the camera definition since I assume some
            // cameras will have it
            camDistortion = cv.matFromArray(5, 1, cv.CV_64F, [0, 0, 0, 0, 0]);
        }        
        //videoFrame.camera.cameraIntrinsics[8] = 1.0  // was broken in the app, should be fixed now
        camIntrinsics.create(3, 3, cv.CV_64F)
        camIntrinsics.data64F.set(videoFrame.camera.cameraIntrinsics);

        // put image into a cv.Mat and converts to 8bit grey scale if necessary
        var rotation = videoFrame.camera.cameraOrientation;
        var image = createCVMat2(rotation, videoFrame.buffer(0), videoFrame.pixelFormat)
        postMessage({type: "cvAfterMat", time: ( performance || Date ).now()});

        var imageToUse = image;
        // did we decide to scale?
        if (scale != 1) {
          cv.resize(image, resizeMat, new cv.Size(), scale, scale);
          for (var i = 0; i < 8; i++) {
            camIntrinsics.data64F[i] = camIntrinsics.data64F[i] * scale; 
          }
          imageToUse = resizeMat;
        }
        
        // While experimenting with the front facing camera on iOS, I realized that you need flip the image on the y
        // axis, since they flip it behind your back inside.  But, then the results are then wrong, and would need to
        // be scaled on the appropriate axis.  Not worth the effort right now.
        //
        //cv.flip(imageToUse, flipMat, 1);
        //imageToUse = flipMat

        // detect the aruco markers
        cv.detectMarkers(imageToUse, dictionary, markerCorners, markerIds, parameter);
        postMessage({type: "cvAfterDetect", time: ( performance || Date ).now()});

        // did we find any?
        if (markerIds.rows > 0) {
            // Need to adjust the corners to be around 0,0 at the center.
            // Weirdly, the aruco detector returns the values in image coordinates, 
            // even though pose estimation expects them relative to the center of the 
            // screen.  
            for(let i=0; i < markerIds.rows; ++i) {
              let cornervec = markerCorners.get(i).data32F
              cornervec[0] -= width/2;
              cornervec[0] *= -1
              cornervec[1] -= height/2;
              // cornervec[1] *= -1
              cornervec[2] -= width/2;
              cornervec[2] *= -1
              cornervec[3] -= height/2;
              // cornervec[3] *= -1
              cornervec[4] -= width/2;
              cornervec[4] *= -1
              cornervec[5] -= height/2;
              // cornervec[5] *= -1
              cornervec[6] -= width/2;
              cornervec[6] *= -1
              cornervec[7] -= height/2;
              // cornervec[7] *= -1
            }

            // estimate the poses of the found markers
            cv.estimatePoseSingleMarkers(markerCorners, 0.053, camIntrinsics, camDistortion, rvecs, tvecs);

            for(let i=0; i < markerIds.rows; ++i) {
                let id = markerIds.data32S[i]
                let cornervec = markerCorners.get(i).data32F
                rvec.data64F.set([rvecs.doublePtr(0, i)[0], rvecs.doublePtr(0, i)[1], rvecs.doublePtr(0, i)[2]]);

                // Convert rotation vector into matrix
                cv.Rodrigues(rvec, rotMat);
                var tm;
                if (rotMat.depth() == 4) {
                  tm = Array.from(rotMat.data32F)
                } else {
                  tm = Array.from(rotMat.data64F)
                }

                // construct a pose matrix from rotation and position
                var returnMat = [tm[0], tm[1], tm[2], 0, tm[3], tm[4], tm[5], 0, tm[6], tm[7], tm[8], 0,0,0,0, 1] 
                mat4.translate(returnMat, returnMat, [tvecs.doublePtr(0, i)[0], tvecs.doublePtr(0, i)[1], tvecs.doublePtr(0, i)[2]]);

                // invert it so it's marker relative to camera, not the usual camera relative to marker
                mat4.invert(returnMat,returnMat)

                // account for camera rotation relative to screen, which happens in video mixed handhelds
                mat4.fromZRotation(antiRotation, rotation * Math.PI/180); 
                mat4.multiply(returnMat, antiRotation, returnMat)

                // save the marker info!
                markers.push({ 
                  id: id, 
                  corners: [{x: cornervec[0], y: cornervec[1]}, {x: cornervec[2], y: cornervec[3]}, {x: cornervec[4], y: cornervec[5]}, {x: cornervec[6], y: cornervec[7]}],
                  pose: returnMat
                })
            }
        }
    }

    // reply, even if opencv isn't ready.
    endTime = ( performance || Date ).now()
    videoFrame.postReplyMessage({type: "cvFrame", markers: markers, time: endTime})
    
    videoFrame.release();
});
