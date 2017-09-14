/*
XRAnchors provide per-frame coordinates which the Reality attempts to pin "in place".
In a virtual Reality these coordinates do not change. 
In a Reality based on environment mapping sensors, the anchors may change coordinates on a per-frame bases as the system refines its map.
*/
export default class XRAnchor {
	constructor(xrCoordinates, uid=null){
		this._uid = uid == null ? XRAnchor._generateUID() : uid
		this._coordinates = xrCoordinates
	}

	get uid(){ return this._uid }

	get coordinates(){	return this._coordinates }

	set coordinates(value) { this._coordinates = value }
	
	static _generateUID(){
		return 'anchor-' + new Date().getTime() + '-' + Math.floor((Math.random() * Number.MAX_SAFE_INTEGER))
	}
}