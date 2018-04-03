import * as glMatrix from "./fill/gl-matrix/common.js";
import * as mat4 from "./fill/gl-matrix/mat4.js";
import * as quat from "./fill/gl-matrix/quat.js";
import * as vec3 from "./fill/gl-matrix/vec3.js";
import base64 from "./fill/base64-binary.js";

/*
XRVideoFrame represents the a video frame from a camera.
*/

/* 
ARKit WebXR Viewer current injects this structure:
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

We'll just pass in frame and buffer.

frame.buffers.buffer[*] can be String (which will be lazily converted to ArrayBuffer) or ArrayBuffer.
frame.pixelFormatType will be ignored
pixelFormat should be one of XRVideoFrame.IMAGEFORMAT

*/

// store unused ArrayBuffers
// we'll push to it on release, pop from it when we need a new one.  In the common case, where the 
// same camera setup is running and the same cv is running, we should get some speed up by not reallocating
// because the same size and number of buffers will be pushed/popped in the same order
var _ab = [] 

export default class XRVideoFrame {
	constructor(buffers, pixelFormat, timestamp, camera){
		this._buffers = buffers
		this._pixelFormat = pixelFormat
		this._timestamp = timestamp
		this._camera = camera
	}

    static createFromMessage (event) {
        return new this(event.data.buffers, event.data.pixelFormat, event.data.timestamp, event.data.camera)
    }

    numBuffers() {this._buffers.length}

    buffer(index) { 
        if (index >= 0 && index < this._buffers.length) {
            var buff = this._buffers[index]
            if (typeof buff.buffer == "string") {
				var bufflen = buff.buffer.length;
				buff.buffer = base64.decodeArrayBuffer(buff.buffer, _ab.length > 0 ? _ab.pop() : null);
				var buffersize = buff.buffer.byteLength;
				var imagesize = buff.size.height * buff.size.bytesPerRow;                
            }       
            return buff;
        }
    }

	get pixelFormat(){ return this._pixelFormat }
	get timestamp(){ return this._timestamp }
	get camera(){ return this._camera }

    release () {
        // if buffers are passed in, check if they are ArrayBuffers, and if so, save
        // them for possible use on the next frame.
        //
        // we do this because passing buffers down into Workers invalidates them, so we need to
        // return them here when we get them back from the Worker, so they can be reused. 
        var buffers = this._buffers;
        for (var i=0; i< buffers.length; i++) {
            if (buffers[i].buffer instanceof ArrayBuffer) {
                _ab.push(buffers[i].buffer)
            }
        }      
    }

    postMessageToWorker (worker, options) {
        var msg = Object.assign({}, options || {})
        msg.buffers = this._buffers
        msg.timestamp = this._timestamp
        msg.pixelFormat = this._pixelFormat
        msg.camera = this._camera

        var buffs = []
        for (var i = 0; i < msg.buffers.length; i++) {
            if (msg.buffers[i].buffer instanceof ArrayBuffer) {
                buffs.push(msg.buffers[i].buffer)
            }
        }
        worker.postMessage(msg, buffs);
    }

    postReplyMessage (options) {
        var msg = Object.assign({}, options)
        msg.buffers = this._buffers
        msg.timestamp = this._timestamp
        msg.pixelFormat = this._pixelFormat
        msg.camera = this._camera

        var buffs = []
        for (var i = 0; i < msg.buffers.length; i++) {
            if (msg.buffers[i].buffer instanceof ArrayBuffer) {
                // any array buffers should be marked for transfer
                buffs.push(msg.buffers[i].buffer)
            } else {
                // if we passed in a string, and it didn't get accessed, we shouldn't pass it back out
                msg.buffers.buffer[i] = null
            }
        }
        postMessage(msg, buffs);
    }
}

/*
ImageFormat taken from
https://w3c.github.io/mediacapture-worker/#imagebitmap-extensions

enum ImageFormat {
    "RGBA32",
    "BGRA32",
    "RGB24",
    "BGR24",
    "GRAY8",
    "YUV444P",
    "YUV422P",
    "YUV420P",
    "YUV420SP_NV12",
    "YUV420SP_NV21",
    "HSV",
    "Lab",
    "DEPTH",
    // empty string 
    ""
};


*/
XRVideoFrame.IMAGEFORMAT_RGBA32 = "RGBA32"
XRVideoFrame.IMAGEFORMAT_BGRA32 = "BGRA32"
XRVideoFrame.IMAGEFORMAT_RGB24 = "RGB24"
XRVideoFrame.IMAGEFORMAT_BGR24 = "BGR24"
XRVideoFrame.IMAGEFORMAT_GRAY8 = "GRAY8"
XRVideoFrame.IMAGEFORMAT_YUV444P = "YUV444P"
XRVideoFrame.IMAGEFORMAT_YUV422P = "YUV422P"
XRVideoFrame.IMAGEFORMAT_YUV420P = "YUV420P"
XRVideoFrame.IMAGEFORMAT_YUV420SP_NV12 = "YUV420SP_NV12"
XRVideoFrame.IMAGEFORMAT_YUV420SP_NV21 = "YUV420SP_NV21"
XRVideoFrame.IMAGEFORMAT_HSV = "HSV"
XRVideoFrame.IMAGEFORMAT_Lab = "Lab"
XRVideoFrame.IMAGEFORMAT_DEPTH = "DEPTH"
XRVideoFrame.IMAGEFORMAT_NULL = ""

XRVideoFrame.IMAGEFORMAT = [
    XRVideoFrame.IMAGEFORMAT_RGBA32,
    XRVideoFrame.IMAGEFORMAT_BGRA32,
    XRVideoFrame.IMAGEFORMAT_RGB24,
    XRVideoFrame.IMAGEFORMAT_BGR24,
    XRVideoFrame.IMAGEFORMAT_GRAY8,
    XRVideoFrame.IMAGEFORMAT_YUV444P,
    XRVideoFrame.IMAGEFORMAT_YUV422P,
    XRVideoFrame.IMAGEFORMAT_YUV420P,
    XRVideoFrame.IMAGEFORMAT_YUV420SP_NV12,
    XRVideoFrame.IMAGEFORMAT_YUV420SP_NV21,
    XRVideoFrame.IMAGEFORMAT_HSV,
    XRVideoFrame.IMAGEFORMAT_Lab,
    XRVideoFrame.IMAGEFORMAT_DEPTH,
    XRVideoFrame.IMAGEFORMAT_NULL
]