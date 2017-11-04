/*
This file contains the DataModel and DataCollection definitions for the geo-content service.
Look in mockData.js for the MockService endpoints and mocked data.
*/
import DataModel from  '../libs/potassium/DataModel.js'
import DataCollection from  '../libs/potassium/DataCollection.js'

let apiBaseURL = '/api/'

/*
User is used for both authentication and identity
Fields:
	uuid
	first_name (''): string
	last_name (''): string
*/
let User = class extends DataModel {
	get url(){
		if(this.isNew) return apiBaseURL + 'user/'
		return apiBaseURL + 'user/' + this.get('uuid')
	}
}
let Users = class extends DataCollection {
	constructor(data=[], options={}){
		super(data, Object.assign({ dataObject: User }, options))
	}
	get url(){ return apiBaseURL + 'user/'}
}

/*
Reality represents an environment like actual reality or a virtual reality
Fields:
	uuid
	name (''): string
*/
let Reality = class extends DataModel {
	get url(){
		if(this.isNew) return apiBaseURL + 'reality/'
		return apiBaseURL + 'reality/' + this.get('uuid')
	}
}
let Realities = class extends DataCollection {
	constructor(data=[], options={}){
		super(data, Object.assign({ dataObject: Reality }, options))
	}
	get url(){ return apiBaseURL + 'reality/' }
}

/*
Layer represents a view onto a Reality.
Fields:
	uuid
	name (''): string
	reality: Reality uuid
	owner: User uuid
*/
let Layer = class extends DataModel {
	get url(){
		if(this.isNew) return apiBaseURL + 'layer/'
		return apiBaseURL + 'layer/' + this.get('uuid')
	}
}
let Layers = class extends DataCollection {
	constructor(data=[], options={}){
		super(data, Object.assign({ dataObject: Layer }, options))
	}
	get url(){ return apiBaseURL + 'layer/' }
}

/*
Anchor represents a specific location.
Each Anchor is linked to a Layer.
Fields:
	uuid
	layer: Layer uuid
	point: [latitude, longitude]
	elevation: float
	orientation: quaternion
*/
let Anchor = class extends DataModel {
	get url(){
		if(this.isNew) return apiBaseURL + 'anchor/'
		return apiBaseURL + 'anchor/' + this.get('uuid')
	}
}
let Anchors = class extends DataCollection {
	constructor(data=[], options={}){
		super(data, Object.assign({ dataObject: Anchor }, options))
	}
	get url(){
		if(typeof this.options.layerUUID !== 'undefined'){
			return apiBaseURL + 'layer/' + this.options.layerUUID + '/anchors'
		}
		return apiBaseURL + 'anchor/'
	}
}

/*
Content represents information about a set of ContentAssets, which could represent assets for a glTF model or a simple text file.
Fields:
	uuid
	name (''): string
	owner: User uuid

If the Content is returned as part of a list of Content for an Anchor, it also includes a relative pose matrix named `transform`. 
*/
let Content = class extends DataModel {
	get url(){
		if(this.isNew) return apiBaseURL + 'content/'
		return apiBaseURL + 'content/' + this.get('uuid')
	}
	fetchPrimary(){
		if(this.get('uuid', null) === null){
			return new Promise((resolve, reject) => { reject() })
		}
		return new Promise((resolve, reject) => {
			let contentAsset = new ContentAsset({}, { contentUUID: this.get('uuid') })
			contentAsset.fetch().then(() => {
				contentAsset.fetchData().then(data => {
					resolve(data)
				}).catch(err => {
					reject(err)
				})
			}).catch(err => {
				reject(err)
			})
		})
	}
}
let Contents = class extends DataCollection {
	constructor(data=[], options={}){
		super(data, Object.assign({ dataObject: Content }, options))
	}
	get url(){
		if(typeof this.options.anchorUUID !== 'undefined'){
			return apiBaseURL + 'anchor/' + this.options.anchorUUID + '/contents'
		}
		return apiBaseURL + 'content/'
	}
}

/*
ContentAsset represents a single blob of data for a Content, for example a single texture for a glTF model or a text file
Fields:
	uuid
	primary (false): true if this is the initial asset, like a .gltf file or a .txt file for a textual Content 
	content: Content uuid
	name: string
	mimetype: string
	size: integer
	uri: a data: or https: URI for the blob
*/
let ContentAsset = class extends DataModel {
	get url(){
		if(typeof this.options.contentUUID !== 'undefined'){
			return apiBaseURL + 'content/' + this.options.contentUUID + '/primary'
		}
		if(this.isNew) return apiBaseURL + 'content-asset/'
		return apiBaseURL + 'content-asset/' + this.get('uuid')
	}
	fetchData(){
		if(!this.get('uri')){
			return new Promise((resolve, reject) => {
				reject('ContentAsset has no uri field')
			})
		}
		return new Promise((resolve, reject) => {
			// This should work with both data and http URIs
			fetch(this.get('uri')).then(response => response.blob()).then(blob => {
				var reader = new FileReader();
				reader.addEventListener("loadend", () => {
					resolve(reader.result)
				})
				if(this.get('mimetype', '').indexOf('text/') === 0){
					reader.readAsText(blob) // TODO assuming UTF-8 for now
				} else {
					reader.readAsArrayBuffer(blob)
				}
			}).catch(err => {
				reject(err)
			})
		})
	}
}
let ContentAssets = class extends DataCollection {
	constructor(data=[], options={}){
		super(data, Object.assign({ dataObject: ContentAsset }, options))
	}
	get url(){ return apiBaseURL + 'content-asset/'}
}

/*
AnchoredContent links Content to an Anchor
Fields:
	uuid
	content: Content uuid
	anchor: Anchor uuid
	transform: a column first affine transform matrix
*/
let AnchoredContent = class extends DataModel {
	get url(){
		if(this.isNew) return apiBaseURL + 'anchored-content/'
		return apiBaseURL + 'anchored-content/' + this.get('uuid')
	}
}
let AnchoredContents = class extends DataCollection {
	constructor(data=[], options={}){
		super(data, Object.assign({ dataObject: AnchoredContent }, options))
	}
	get url(){ apiBaseURL + 'anchored-content/'}
}

export {
	User, Users,
	Layer, Layers,
	Anchor, Anchors,
	Content, Contents,
	Reality, Realities,
	ContentAsset, ContentAssets,
	AnchoredContent, AnchoredContents
}
