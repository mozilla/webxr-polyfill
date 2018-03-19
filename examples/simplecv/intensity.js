// could not get workers working, so am not using this.
//
// Tried to use Transferable ArrayBuffers but kept getting DOM Error 25. 
// 


averageIntensity = function (buffer) {
    var w = buffer.size.width;
    var h = buffer.size.height;
    var pad = buffer.size.bytesPerRow - w;
    var pixels = new Uint8Array(buffer.buffer);

    var intensity = 0.0;
    var p = 0;
    for (var r = 0; r < h; r++) {
        var v = 0;
        for (var i = 0; i < w; i++) {
            if (p < pixels.length) {
                v += pixels[p++]
            } else {
                console.error("overflow pixel buffer")
            }
        }
        intensity += v / w;
        p += pad;
    }

    postMessage ((intensity / h) / 255.0);
}

self.addEventListener('message',  function(event){
    console.log("Help!")
    self.postMessage (Math.random() * 255.0);
    
    // var frame = detail.frame
    // var camera = detail.camera
    // switch (frame.pixelFormat) {
    //     case "YUV420P":
    // 	this.averageIntensity(frame.buffers[0])
    // }
});
setInterval( function(){
    console.log("Help me!")
 
    self.postMessage (Math.random() * 255.0);
 
    }, 500);