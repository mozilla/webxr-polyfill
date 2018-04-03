/*
Copyright (c) 2011, Daniel Guerrero
All rights reserved.
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL DANIEL GUERRERO BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Uses the new array typed in javascript to binary base64 encode/decode
 * at the moment just decodes a binary base64 encoded
 * into either an ArrayBuffer (decodeArrayBuffer)
 * or into an Uint8Array (decode)
 * 
 * References:
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/Uint8Array
 */

var Base64Binary = {
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
      
      /* will return a  Uint8Array type */
      decodeArrayBuffer: function(input, buffer) {
		var bytes = (input.length/4) * 3;
		if (!buffer || buffer.byteLength != bytes) {
			// replace the buffer with a new, appropriately sized one
			buffer = new ArrayBuffer(bytes);
		}
		this.decode(input, buffer);
		
		return buffer;
	  },      


      decode: function(input, arrayBuffer) {
          //get last chars to see if are valid
          var lkey1 = this._keyStr.indexOf(input.charAt(input.length-1));		 
          var lkey2 = this._keyStr.indexOf(input.charAt(input.length-2));		 
      
          var bytes = (input.length/4) * 3;
          if (lkey1 == 64) bytes--; //padding chars, so skip
          if (lkey2 == 64) bytes--; //padding chars, so skip
          
          var uarray;
          var chr1, chr2, chr3;
          var enc1, enc2, enc3, enc4;
          var i = 0;
          var j = 0;
          
          if (arrayBuffer)
              uarray = new Uint8Array(arrayBuffer);
          else
              uarray = new Uint8Array(bytes);
          
          input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
          
          for (i=0; i<bytes; i+=3) {	
              //get the 3 octects in 4 ascii chars
              enc1 = this._keyStr.indexOf(input.charAt(j++));
              enc2 = this._keyStr.indexOf(input.charAt(j++));
              enc3 = this._keyStr.indexOf(input.charAt(j++));
              enc4 = this._keyStr.indexOf(input.charAt(j++));
      
              chr1 = (enc1 << 2) | (enc2 >> 4);
              chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
              chr3 = ((enc3 & 3) << 6) | enc4;
      
              uarray[i] = chr1;			
              if (enc3 != 64) uarray[i+1] = chr2;
              if (enc4 != 64) uarray[i+2] = chr3;
          }
      
          return uarray;	
      }
  }
  
  //importScripts('webxr-worker.js');
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// store unused ArrayBuffers
// we'll push to it on release, pop from it when we need a new one.  In the common case, where the 
// same camera setup is running and the same cv is running, we should get some speed up by not reallocating
// because the same size and number of buffers will be pushed/popped in the same order
var _ab = [];

var XRVideoFrame = function () {
    function XRVideoFrame(buffers, pixelFormat, timestamp, camera) {
        _classCallCheck(this, XRVideoFrame);

        this._buffers = buffers;
        this._pixelFormat = pixelFormat;
        this._timestamp = timestamp;
        this._camera = camera;
    }

    _createClass(XRVideoFrame, [{
        key: "numBuffers",
        value: function numBuffers() {
            this._buffers.length;
        }
    }, {
        key: "buffer",
        value: function buffer(index) {
            if (index >= 0 && index < this._buffers.length) {
                var buff = this._buffers[index];
                if (typeof buff.buffer == "string") {
                    var bufflen = buff.buffer.length;
                    buff.buffer = Base64Binary.decodeArrayBuffer(buff.buffer, _ab.length > 0 ? _ab.pop() : null);
                    var buffersize = buff.buffer.byteLength;
                    var imagesize = buff.size.height * buff.size.bytesPerRow;
                }
                return buff;
            }
        }
    }, {
        key: "release",
        value: function release() {
            // if buffers are passed in, check if they are ArrayBuffers, and if so, save
            // them for possible use on the next frame.
            //
            // we do this because passing buffers down into Workers invalidates them, so we need to
            // return them here when we get them back from the Worker, so they can be reused. 
            var buffers = this._buffers;
            for (var i = 0; i < buffers.length; i++) {
                if (buffers[i].buffer instanceof ArrayBuffer) {
                    _ab.push(buffers[i].buffer);
                }
            }
        }
    }, {
        key: "postMessageToWorker",
        value: function postMessageToWorker(worker, options) {
            var msg = Object.assign({}, options || {});
            msg.buffers = this._buffers;
            msg.timestamp = this._timestamp;
            msg.pixelFormat = this._pixelFormat;
            msg.camera = this._camera;

            var buffs = [];
            for (var i = 0; i < msg.buffers.length; i++) {
                if (msg.buffers[i].buffer instanceof ArrayBuffer) {
                    buffs.push(msg.buffers[i].buffer);
                }
            }
            worker.postMessage(msg, buffs);
        }
    }, {
        key: "postReplyMessage",
        value: function postReplyMessage(options) {
            var msg = Object.assign({}, options);
            msg.buffers = this._buffers;
            msg.timestamp = this._timestamp;
            msg.pixelFormat = this._pixelFormat;
            msg.camera = this._camera;

            var buffs = [];
            for (var i = 0; i < msg.buffers.length; i++) {
                if (msg.buffers[i].buffer instanceof ArrayBuffer) {
                    // any array buffers should be marked for transfer
                    buffs.push(msg.buffers[i].buffer);
                } else {
                    // if we passed in a string, and it didn't get accessed, we shouldn't pass it back out
                    msg.buffers.buffer[i] = null;
                }
            }
            postMessage(msg, buffs);
        }
    }, {
        key: "pixelFormat",
        get: function get() {
            return this._pixelFormat;
        }
    }, {
        key: "timestamp",
        get: function get() {
            return this._timestamp;
        }
    }, {
        key: "camera",
        get: function get() {
            return this._camera;
        }
    }], [{
        key: "createFromMessage",
        value: function createFromMessage(event) {
            return new this(event.data.buffers, event.data.pixelFormat, event.data.timestamp, event.data.camera);
        }
    }]);

    return XRVideoFrame;
}();
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


XRVideoFrame.IMAGEFORMAT_RGBA32 = "RGBA32";
XRVideoFrame.IMAGEFORMAT_BGRA32 = "BGRA32";
XRVideoFrame.IMAGEFORMAT_RGB24 = "RGB24";
XRVideoFrame.IMAGEFORMAT_BGR24 = "BGR24";
XRVideoFrame.IMAGEFORMAT_GRAY8 = "GRAY8";
XRVideoFrame.IMAGEFORMAT_YUV444P = "YUV444P";
XRVideoFrame.IMAGEFORMAT_YUV422P = "YUV422P";
XRVideoFrame.IMAGEFORMAT_YUV420P = "YUV420P";
XRVideoFrame.IMAGEFORMAT_YUV420SP_NV12 = "YUV420SP_NV12";
XRVideoFrame.IMAGEFORMAT_YUV420SP_NV21 = "YUV420SP_NV21";
XRVideoFrame.IMAGEFORMAT_HSV = "HSV";
XRVideoFrame.IMAGEFORMAT_Lab = "Lab";
XRVideoFrame.IMAGEFORMAT_DEPTH = "DEPTH";
XRVideoFrame.IMAGEFORMAT_NULL = "";

XRVideoFrame.IMAGEFORMAT = [XRVideoFrame.IMAGEFORMAT_RGBA32, XRVideoFrame.IMAGEFORMAT_BGRA32, XRVideoFrame.IMAGEFORMAT_RGB24, XRVideoFrame.IMAGEFORMAT_BGR24, XRVideoFrame.IMAGEFORMAT_GRAY8, XRVideoFrame.IMAGEFORMAT_YUV444P, XRVideoFrame.IMAGEFORMAT_YUV422P, XRVideoFrame.IMAGEFORMAT_YUV420P, XRVideoFrame.IMAGEFORMAT_YUV420SP_NV12, XRVideoFrame.IMAGEFORMAT_YUV420SP_NV21, XRVideoFrame.IMAGEFORMAT_HSV, XRVideoFrame.IMAGEFORMAT_Lab, XRVideoFrame.IMAGEFORMAT_DEPTH, XRVideoFrame.IMAGEFORMAT_NULL];
