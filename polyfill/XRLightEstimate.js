/*
XRLightEstimate represents the attributes of environmental light as supplied by the device's sensors.
*/
export default class XRLightEstimate {
	get ambientIntensity(){
		//readonly attribute double ambientIntensity;
		throw new Error('Not implemented')
	}

	getAmbientColorTemperature(){
		//readonly attribute double ambientColorTemperature;
		throw new Error('Not implemented')
	}
}