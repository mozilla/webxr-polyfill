import EventHandlerBase from './fill/EventHandlerBase.js'

/*
A Reality represents a view of the world, be it the real world via sensors or a virtual world that is rendered with WebGL or WebGPU.
*/
export default class Reality extends EventHandlerBase {
	constructor(xr, name, isShared, isPassthrough){
		super()
		this._xr = xr
		this._name = name
		this._isShared = isShared
		this._isPassthrough = isPassthrough
		this._anchors = new Map()
	}

	get name(){ return this._name }

	get isShared(){ return this._isShared }

	get isPassthrough(){ return this._isPassthrough }

	getCoordinateSystem(...types){
		//XRCoordinateSystem? getCoordinateSystem(XRFrameOfReferenceType type, ...); // Tries the types in order, returning the first match or null if none is found
		throw 'Not implemented'
	}

	/*
	Called when at least one active XRSession is using this Reality
	*/
	_start(){
		throw 'Exending classes should implement _start'
	}

	/*
	Called when no more active XRSessions are using this Reality
	*/
	_stop(){
		throw 'Exending classes should implement _stop'
	}

	/*
	Called by a session before it hands a new XRPresentationFrame to the app
	*/
	_handleNewFrame(){}

	/*
	Create an anchor hung in space
	*/
	_addAnchor(anchor){
		// returns DOMString anchor UID
		throw 'Exending classes should implement _addAnchor'
	}

	/*
	Create an anchor attached to a surface, as found by a ray
	*/
	_findAnchor(coordinates){
		// returns DOMString anchor UID
		throw 'Exending classes should implement _findAnchor'
	}

	_getAnchor(uid){
		return this._anchors.get(uid) || null
	}

	_removeAnchor(uid){
		// returns void
		throw 'Exending classes should implement _removeAnchor'
	}

	// attribute EventHandler onchange;
}
