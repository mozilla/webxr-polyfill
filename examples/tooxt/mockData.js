/*
populateService fills the MockService with endpoints that emulate a working geo-content database.
The mock data served by these endpoints is at the bottom of this file.
*/
let populateService = function(service){
	// The list of all users
	service.addJSONEndpoint(/^\/api\/user\/$/, (...params) => { return users })

	// The current user (always returns the first user in the users list)
	service.addJSONEndpoint(/^\/api\/user\/current$/, (...params) => { return Object.assign({ apiToken: userAPIToken }, users[0]) })

	// The list of all realities
	service.addJSONEndpoint(/^\/api\/reality\/$/, (...params) => { return realities })

	// The list of all layers owned by the first user in the users list
	service.addJSONEndpoint(/^\/api\/layer\/$/, (...params) => {
		return layers.filter(layer => {
			return layer.owner === users[0].uuid
		})
	})

	// The list of all layers owned by the first user in the users list
	service.addJSONEndpoint(/^\/api\/layer\/([0-9a-z\-]+)\/anchors$/, (url, ...params) => {
		let layer = firstWithUUID(pathElement(url, 1), layers)
		if(layer === null) return null
		if(layer.owner !== users[0].uuid) return null
		return anchors.filter(anchor => {
			return anchor.layer === layer.uuid
		})
	})

	// The list of content associated with an anchor (does not check ownership)
	service.addJSONEndpoint(/^\/api\/anchor\/([0-9a-z\-]+)\/contents$/, (url, ...params) => {
		let anchor = firstWithUUID(pathElement(url, 1), anchors)
		if(anchor === null) return null
		let result = []
		for(let ac of anchoredContent.filter(ac => { return ac.anchor === anchor.uuid })){
			let content = firstWithUUID(ac.content, contents)
			result.push(Object.assign({ transform: ac.transform }, content))
		}
		return result
	})

	// The primary ContentAsset associated with a Content (does not check ownership)
	service.addJSONEndpoint(/^\/api\/content\/([0-9a-z\-]+)\/primary$/, (url, ...params) => {
		let content = firstWithUUID(pathElement(url, 1), contents)
		if(content === null) return null
		for(let contentAsset of contentAssets){
			if(contentAsset.primary === false) continue
			if(contentAsset.content === content.uuid){
				return contentAsset
			}
		}
		return null
	})
}

let pathElement = (url, offset=0) => {
	return url.split('/')[url.split('/').length - 1 - offset]
}
let lastPathElement = (url) => { return pathElement(url) }

let firstWithUUID = (uuid, list) => {
	for(let item of list){
		if(item.uuid === uuid) return item
	}
	return null
}

let uuid = () => {
	// Not really a uuid
	return 'uid-' + new Date().getTime() + '-' + Math.floor((Math.random() * Number.MAX_SAFE_INTEGER))
}

let createContentAsset = function(contentUUID, name, value, primary=false){
	contentAssets.push({
		uuid: uuid(),
		primary: primary,
		content: contentUUID, 
		name: name,
		mimetype: 'text/plain',
		size: value.length,
		uri: dString(value)
	})
}

let dString = function(value){
	return 'data:text/plain;base64,' + btoa(value)
}

let identity = () => {
	return [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]
}

// Below are the data structures that are used by the endpoints created in populateService

let userAPIToken = '1234'

let users = [
	{ uuid: uuid(), first_name: 'Alice', last_name: 'Smith' },
	{ uuid: uuid(), first_name: 'Sefa', last_name: 'Fliraz' },
]

let realities = [
	{ uuid: uuid(), name: 'Reality' },
	{ uuid: uuid(), name: 'A virtual reality' },
]

let layers = [
	{ uuid: uuid(), name: 'Layer 1', owner: users[0].uuid, reality: realities[0].uuid },
	{ uuid: uuid(), name: 'Layer 2', owner: users[0].uuid, reality: realities[0].uuid },
	{ uuid: uuid(), name: 'Layer 3', owner: users[0].uuid, reality: realities[1].uuid },

	{ uuid: uuid(), name: 'Layer 4', owner: users[1].uuid, reality: realities[0].uuid }
]

let anchors = [
	{ uuid: uuid(), layer: layers[0].uuid, point: [-71.1, 42.3], elevation: 0.0, orientation: [0,0,0,1] },
	{ uuid: uuid(), layer: layers[0].uuid, point: [-71.2, 42.3], elevation: 1.0, orientation: [0,0,0,1] },
	{ uuid: uuid(), layer: layers[0].uuid, point: [-71.3, 42.3], elevation: 2.0, orientation: [0,0,0,1] },

	{ uuid: uuid(), layer: layers[3].uuid, point: [-71.4, 42.3], elevation: 3.0, orientation: [0,0,0,1] }
]

let contents = [
	{ uuid: uuid(), name: 'First', owner: users[0].uuid },
	{ uuid: uuid(), name: 'Second', owner: users[0].uuid },
	{ uuid: uuid(), name: 'Third', owner: users[0].uuid },
	{ uuid: uuid(), name: 'Fourth', owner: users[0].uuid },
	{ uuid: uuid(), name: 'Fifth', owner: users[0].uuid },

	{ uuid: uuid(), name: 'Sixth', owner: users[1].uuid },
	{ uuid: uuid(), name: 'Seventh', owner: users[1].uuid }
]

let contentAssets = []
createContentAsset(contents[0].uuid, 'One', 'This is one', true)
createContentAsset(contents[1].uuid, 'Two', 'This is two', true)
createContentAsset(contents[2].uuid, 'Three', 'This is three', true)
createContentAsset(contents[3].uuid, 'Four', 'This is four', true)
createContentAsset(contents[4].uuid, 'Five', 'This is five', true)
createContentAsset(contents[5].uuid, 'Six', 'This is six', true)
createContentAsset(contents[6].uuid, 'Seven', 'This is seven', true)

let anchoredContent = [
	{ uuid: uuid(), content: contents[0].uuid, anchor: anchors[0].uuid, transform: identity() },
	{ uuid: uuid(), content: contents[1].uuid, anchor: anchors[1].uuid, transform: identity() },
	{ uuid: uuid(), content: contents[2].uuid, anchor: anchors[2].uuid, transform: identity() },
	{ uuid: uuid(), content: contents[3].uuid, anchor: anchors[0].uuid, transform: identity() },
	{ uuid: uuid(), content: contents[4].uuid, anchor: anchors[1].uuid, transform: identity() },

	{ uuid: uuid(), content: contents[5].uuid, anchor: anchors[3].uuid, transform: identity() },
	{ uuid: uuid(), content: contents[6].uuid, anchor: anchors[3].uuid, transform: identity() },
]

export default populateService