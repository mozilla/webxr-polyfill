import XRView from './XRView.js'
import XRLayer from './XRLayer.js'
import XRDevice from './XRDevice.js'
import XRSession from './XRSession.js'
import XRViewport from './XRViewport.js'
import XRDevicePose from './XRDevicePose.js'
import XRWebGLLayer from './XRWebGLLayer.js'
import XRStageBounds from './XRStageBounds.js'
import XRCoordinateSystem from './XRCoordinateSystem.js'
import XRFrameOfReference from './XRFrameOfReference.js'
import XRStageBoundsPoint from './XRStageBoundsPoint.js'
import XRPresentationFrame from './XRPresentationFrame.js'
import XRPresentationContext from './XRPresentationContext.js'

import ImmersiveDevice from './device/ImmersiveDevice.js'

import EventHandlerBase from './fill/EventHandlerBase.js'

/*
XRPolyfill implements the navigator.xr functionality as a polyfill

Code below will check for navigator.xr and if it doesn't exist will install this polyfill,
so you can safely include this script in any page.
*/
class XRPolyfill extends EventHandlerBase {
	constructor(){
		super()
		window.XRView = XRView
		window.XRLayer = XRLayer
		window.XRDevice = XRDevice
		window.XRSession = XRSession
		window.XRViewport = XRViewport
		window.XRWebGLLayer = XRWebGLLayer
		window.XRDevicePose = XRDevicePose
		window.XRStageBounds = XRStageBounds
		window.XRStageBoundsPoint = XRStageBoundsPoint
		window.XRFrameOfReference = XRFrameOfReference
		window.XRCoordinateSystem = XRCoordinateSystem
		window.XRPresentationFrame = XRPresentationFrame
		window.XRPresentationContext = XRPresentationContext

		this._devices = []

		if(typeof navigator.getVRDisplays === 'function'){
			navigator.getVRDisplays().then(devices => {
				for(let device of devices){
					if(device === null) continue
					if(device.capabilities.canPresent){
						this._devices.push(new ImmersiveDevice(this, device))
					}
				}
			})
		}
	}

	getDevices(){
		return new Promise((resolve, reject) => {
			resolve(this._devices)
		})
	}

	//attribute EventHandler ondeviceconnect;
	//attribute EventHandler ondevicedisconnect;
}

/* Install XRPolyfill if window.XR does not exist */
if(typeof navigator.xr === 'undefined') navigator.xr = new XRPolyfill()
