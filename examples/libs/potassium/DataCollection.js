import DataObject from './DataObject.js'
import DataModel from './DataModel.js'

/*
	DataCollection represents an ordered list of DataModel instances

	options:
		dataObject (DataModel): the DataObject extending class to use to wrap each data item in this collection
*/
let DataCollection = class extends DataObject {
	constructor(data=[], options={}){
		super(options)
		if(data == null) data = []
		this._inReset = false
		this._inAddBatch = false
		this._boundRelayListener = this._relayListener.bind(this)
		this.dataObjects = []
		for(let datum of data){
			this.add(this.generateDataObject(datum))
		}
	}
	cleanup(){
		super.cleanup()
		for(let obj of this.dataObjects){
			obj.removeListener(this._boundRelayListener)
		}
		this.dataObjects.length = 0
	}
	at(index){
		if(index < 0 || index > this.dataObjects.length - 1){
			throw new Error(`Index out of range: ${index}`)
		}
		return this.dataObjects[index]
	}
	create(data, options={}){
		// Creates an child instance and POSTs it to the collection
		return new Promise(function(resolve, reject){
			let fetchOptions = Object.assign(options, this.fetchOptions)
			fetchOptions.method = 'post'
			fetchOptions.body = JSON.stringify(data)
			fetch(this.url, fetchOptions).then(response => {
				if(response.status != 200){
					throw 'Create failed with status ' + response.status
				}
				return response.json()
			}).then(data => {
				let dataObject = this.generateDataObject(data)
				this.add(dataObject)
				resolve(dataObject)
			}).catch(reject)
		}.bind(this))
	}
	add(dataObject){
		if(dataObject instanceof DataObject == false){
			dataObject = this.generateDataObject(dataObject)
		}
		if(this.dataObjects.indexOf(dataObject) !== -1){ // TODO stop using indexOf because equality doesn't work
			return
		}
		this.dataObjects.push(dataObject)
		dataObject.collection = this
		this.trigger('added', this, dataObject)
		if(this._comparator && this._inReset == false && this._inAddBatch == false){
			this.sort(this._comparator)
		}
		dataObject.addListener(this._boundRelayListener)
	}
	_relayListener(...params){
		this.trigger(...params)
	}
	// Add an array of DataObjects to the end of the collection
	addBatch(dataObjects){
		this._inAddBatch = true
		for(let dataObject in dataObjects){
			if(dataObject instanceof DataObject == false){
				dataObject = this.generateDataObject(dataObject)
			}
			this.add(dataObject)
		}
		this._inAddBatch = false
	}
	indexOf(dataObject){
		for(var i=0; i < this.dataObjects.length; i++){
			if(this.dataObjects[i].equals(dataObject)){
				return i
			}
		}
		return -1
	}
	firstByField(fieldName, value){
		for(let model of this){
			if(model.get(fieldName) === value){
				return model
			}
		}
		return null
	}
	remove(dataObject){
		let index = this.indexOf(dataObject)
		if(index === -1){
			return
		}
		this.dataObjects[index].removeListener(this._boundRelayListener)
		this.dataObjects.splice(index, 1)
		dataObject.collection = null
		this.trigger('removed', this, dataObject)
	}
	reset(data){
		this._inReset = true
		for(let obj of this.dataObjects.slice()){
			this.remove(obj)
		}
		for(let datum of data){
			this.add(this.generateDataObject(datum))
		}
		this._inReset = false
		if(this._comparator){
			this.sort(this._comparator)
		}
		this.trigger('reset', this)
	}
	sort(comparator=DataCollection.defaultComparator){
		this.dataObjects.sort(comparator)
		this.trigger('sorted', this)
	}
	sortByAttribute(attributeName, comparator=DataCollection.defaultComparator){
		this.sort((obj1, obj2) => {
			return comparator(obj1.get(attributeName), obj2.get(attributeName))
		})
	}
	keepSortedByField(fieldName, comparator=DataCollection.defaultComparator){
		this._comparator = (obj1, obj2) => {
			return comparator(obj1.get(fieldName), obj2.get(fieldName))
		}
		this.addListener(() => {
			if(this._comparator && this._inReset == false && this._inAddBatch == false){
				this.sort(this._comparator)
			}
		}, 'changed:' + fieldName)
	}
	*[Symbol.iterator](){
		for(let obj of this.dataObjects){
			yield obj
		}
	}
	get length(){
		return this.dataObjects.length
	}
	generateDataObject(data){
		let options = { collection: this }
		if(this.options.dataObject){
			var dataObj = new this.options.dataObject(data, options)
		} else {
			var dataObj = new DataModel(data, options)
		}
		dataObj._new = false
		return dataObj
	}
}

DataCollection.defaultComparator = function(dataObject1, dataObject2){
	if(dataObject1 === dataObject2) return 0
	if(typeof dataObject1.equals === 'function' && dataObject1.equals(dataObject2)) return 0
	if(typeof dataObject1.get === 'function' && typeof dataObject2.get === 'function'){
		let val1 = dataObject1.get('id', -1)
		let val2 = dataObject2.get('id', -1) 
		if(val1 === val2) return 0
		if(val1 < val2) return -1
		return 1
	}
	if(dataObject1 < dataObject2) return -1
	return 1
}

export default DataCollection
