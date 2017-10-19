/*
The XRCartographicCoordinates are used in conjunction with the XRCoordinateSystem to represent a frame of reference that may optionally be positioned in relation to a geodetic frame like WGS84 for Earth, otherwise a sphere is assumed.
*/
export default class XRCartographicCoordinates {
	get geodeticFrame(){
		// attribute XRCartographicCoordinatesGeodeticFrame? geodeticFrame;
		throw new Error('Not implemented')
	}

	get latitude(){
		// attribute double latitude;
		throw new Error('Not implemented')
	}

	get longitude(){
		// attribute double longitude;
		throw new Error('Not implemented')
	}

	get positionAccuracy(){
		// attribute double positionAccuracy;
		throw new Error('Not implemented')
	}

	get altitude(){
		// attribute double altitude;
		throw new Error('Not implemented')
	}

	get altitudeAccuracy(){
		// attribute double altitudeAccuracy;
		throw new Error('Not implemented')
	}
	
	get orientation(){
		//attribute Float32Array orientation; // quaternion x,y,z,w from 0,0,0,1 of East/Up/South 
		throw new Error('Not implemented')
	}
}

XRCartographicCoordinates.WGS84 = "WGS84"
XRCartographicCoordinates.GEODETIC_FRAMES = [XRCartographicCoordinates.WGS84]