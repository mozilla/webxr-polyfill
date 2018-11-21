/* if there is a navigator.xr, clear it out */
if(typeof navigator.xr != 'undefined') {
    if(typeof XRDisplay != 'undefined') { XRDisplay = null }
    if(typeof XRSession != 'undefined') { XRSession = null }
    if(typeof XRSessionCreateParameters != 'undefined') { XRSessionCreateParameters = null }
    if(typeof Reality != 'undefined') { Reality = null }
    if(typeof XRPointCloud != 'undefined') { XRPointCloud = null }
    if(typeof XRLightEstimate != 'undefined') { XRLightEstimate = null }
    if(typeof XRAnchor != 'undefined') { XRAnchor = null }
    if(typeof XRPlaneAnchor != 'undefined') { XRPlaneAnchor = null }
    if(typeof XRFaceAnchor != 'undefined') { XRFaceAnchor = null }
    if(typeof XRImageAnchor != 'undefined') { XRImageAnchor = null }
    if(typeof XRAnchorOffset != 'undefined') { XRAnchorOffset = null }
    if(typeof XRStageBounds != 'undefined') { XRStageBounds = null }
    if(typeof XRStageBoundsPoint != 'undefined') { XRStageBoundsPoint = null }
    if(typeof XRPresentationFrame != 'undefined') { XRPresentationFrame = null }
    if(typeof XRView != 'undefined') { XRView = null }
    if(typeof XRViewport != 'undefined') { XRViewport = null }
    if(typeof XRCoordinateSystem != 'undefined') { XRCoordinateSystem = null }
    if(typeof XRViewPose != 'undefined') { XRViewPose = null }
    if(typeof XRLayer != 'undefined') { XRLayer = null }
    if(typeof XRWebGLLayer != 'undefined') { XRWebGLLayer = null }
    if(typeof XRVideoFrame != 'undefined') { XRVideoFrame = null }
    //navigator.xr = null;
}