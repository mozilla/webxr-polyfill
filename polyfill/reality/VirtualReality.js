import Reality from '../Reality.js'

/*
VirtualReality is a Reality that is empty and waiting for fanstastic CG scenes.
*/
export default class VirtualReality extends Reality {
	constructor(xr){
		super(xr, 'Virtual', false, false)
	}

	/*
	Called when at least one active XRSession is using this Reality
	*/
	_start(){
	}

	/*
	Called when no more active XRSessions are using this Reality
	*/
	_stop(){
	}

	/*
	Called by a session before it hands a new XRPresentationFrame to the app
	*/
	_handleNewFrame(){}

	/*
	Create an anchor hung in space
	*/
	_addAnchor(anchor, display){
		this._anchors.set(anchor.uid, anchor)
		return anchor.uid
	}

	/*
	Create an anchor attached to a surface, as found by a ray
	normalized screen x and y are in range 0..1, with 0,0 at top left and 1,1 at bottom right
	*/
	_findAnchor(normalizedScreenX, normalizedScreenY, display){
		return new Promise((resolve, reject) => {
			resolve(null)
		})
	}

	_removeAnchor(uid){
		this._anchors.delete(uid)
	}
}