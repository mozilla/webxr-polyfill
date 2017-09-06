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
	_addAnchor(anchor){
		this._anchors.set(anchor.uid, anchor)
		return anchor.uid
	}

	/*
	Create an anchor attached to a surface, as found by a ray
	*/
	_findAnchor(coordinates){
		// How can we give apps the ability to handle looking into the scene?
		return null
	}

	_getAnchor(uid){
		return this._anchors.get(uid) || null
	}

	_removeAnchor(uid){
		this._anchors.delete(uid)
	}
}