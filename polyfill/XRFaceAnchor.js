import XRAnchor from './XRAnchor.js'

/*
XRFaceAnchor represents a face anchor
*/
export default class XRFaceAnchor extends XRAnchor {
    constructor(coordinateSystem, uid=null, geometry) {
        super(coordinateSystem, uid)
        this.geometry = geometry
    }
}