import DataObject from './DataObject.js'

/*
	DataModel holds a map of string,value pairs, sometimes fetched from or sent to a back-end server.
	It fires events when values are changed.

	options:
		fieldDataObjects ({}): a map of fieldName (string) to DataObject (class), used to create sub-object in this Model's data
*/
export default class extends DataObject {
	constructor(data={}, options={}){
		super(options)
		if(typeof this.options.fieldDataObjects === 'undefined'){
			this.options.fieldDataObjects = {}
		}
		this.data = {}
		this.setBatch(data)
	}
	cleanup() {
		super.cleanup()
		this.data = null
	}
	/* 
		Find a value held within this DataModel. 
		Return values may be native types or, if mapped by options.fieldDataObjects, another DataObject
	*/
	has(fieldName){
		return typeof this.data[fieldName] !== 'undefined'
	}
	get(fieldName, defaultValue=null){
		if(typeof this.data[fieldName] === 'undefined' || this.data[fieldName] === null || this.data[fieldName] === ''){
			return defaultValue
		}
		return this.data[fieldName]
	}
	// Set a key/value pair.
	set(fieldName, value){
		var batch = {}
		batch[fieldName] = value
		return this.setBatch(batch)
	}

	/*
		Set a group of values. The 'values' parameter should be an object that works in for(key in values) loops like a dictionary: {}
		If a key is in options.fieldDataObjects then the value will be used to contruct a DataObject and that will be the saved value.
	*/
	setBatch(values){
		let changes = {}
		let changed = false
		for(let key in values){
			let result = this._set(key, values[key])
			if(result !== DataObject._NO_CHANGE){
				changed = true
				changes[key] = result
				this.trigger(`changed:${key}`, this, key, result)
			}
		}
		if(changed){
			this.trigger('changed', this, changes)
		}
		return changes
	}
	increment(fieldName, amount=1){
		const currentVal = fieldName in this.data ? this.data[fieldName] : 0
		this.set(fieldName, currentVal + amount)
	}
	_set(fieldName, data){
		// _set does not fire any events, so you probably want to use set or setBatch
		if(data instanceof DataObject){
			if(this.data[fieldName] instanceof DataObject){
				this.data[fieldName].reset(data.data)
			} else {
				this.data[fieldName] = data
			}
		} else if(this.options.fieldDataObjects[fieldName]){
			if(this.data[fieldName]){
				this.data[fieldName].reset(data)
			} else {
				this.data[fieldName] = new this.options.fieldDataObjects[fieldName](data)
			}
		} else {
			if(this.data[fieldName] === data){
				return DataObject._NO_CHANGE
			}
			if(this.data[fieldName] instanceof DataObject){
				this.data[fieldName].reset(data)
			} else {
				this.data[fieldName] = data
			}
		}
		return this.data[fieldName]
	}
	reset(data={}){
		for(var key in this.data){
			if(typeof data[key] === 'undefined'){
				this.data[key] = null
			}
		}
		this.setBatch(data)
		this.trigger('reset', this)
	}
	equals(obj){
		if(obj === null || typeof obj === 'undefined') return false
		if(this === obj) return true
		if(typeof obj !== typeof this) return false
		if(obj.get('id') === this.get('id')) return true
		return false
	}
}