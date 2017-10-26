import DataObject from './DataObject.js'

/*
MockService attaches itself to DataObject and will service fetches if it has a matching endpoint, otherwise it uses window.fetch

	let service = new MockService()
	service.addEndpoint(/^blog\/([0-9a-z]+)$/, (...params) => {

		var debug = {hello: "world"}
		let blob = new Blob([JSON.stringify(debug, null, 2)], {type : 'application/json'});
		return new Response(blob, { "status" : 200 , "statusText" : "OK" })
	})
	service.attachToDataObject()

*/
export default class MockService {
	constructor(){
		this.endpoints = []
	}

	/*
	Add an endpoint with a service function that must return a Response 
	*/
	addEndpoint(urlRegex, serviceFunction){
		this.endpoints.push(new MockEndpoint(urlRegex, serviceFunction))
	}

	/*
	Add an endpoint with a service function that should return a JSON serializable data structure
	*/
	addJSONEndpoint(urlRegex, jsonServiceFunction){
		this.addEndpoint(urlRegex, (url, ...params) => {
			let json = jsonServiceFunction(url, ...params)
			if(json === null){
				return new Response(new Blob(), { "status" : 404, "statusText" : "File not found, yo" })
			} else {
				return new Response(
					new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }),
					{ "status" : 200 , "statusText" : "OK" }
				)
			}
		})
	}

	/*
	Take over DataObject.protocol._innerFetch to intercept fetches and service with endpoints if possible
	*/
	attachToDataObject(){
		DataObject.prototype._innerFetch = (url, ...params) => {
			for(let endpoint of this.endpoints){
				if(endpoint.match(url)){
					return new Promise((resolve, reject) => {
						let response = endpoint.service(url, ...params)
						resolve(response)
					})
				}
			}
			return fetch(url, ...params)
		}
	}
}

/*
MockEndpoint is instantiated during the MockService.addEndpoint call, just to wrap the data and provide handy URL matching and servicing
*/
let MockEndpoint = class {
	constructor(urlRegex, serviceFunction){
		this.urlRegex = urlRegex
		this.serviceFunction = serviceFunction
	}
	match(url){
		return url.match(this.urlRegex)
	}
	service(...params){
		return this.serviceFunction(...params)
	}
}
