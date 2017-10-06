import EventListener from './EventListener.js'

/*
	Mix EventMixin to enable the instances to track event listeners and send them events
	Use it like so: var YourClass = EventMixin(class { ... })
	See DataObject for an example.
*/

export default Base => class extends Base {
	// Send an event to listeners
	trigger(eventName, ...params){
		var listenersToRemove = [];
		for(let listener of this.listeners){
			if(listener.distributeEvent(eventName, ...params) && listener.once){
				listenersToRemove.push(listener);
			}
		}
		for(let listener of listenersToRemove){
			this.removeListener(listener.callback, listener.eventName)
		}
	}
	addListener(callback, eventName=EventListener.ALL_EVENTS, once=false){
		this.listeners.push(new EventListener(eventName, callback, once))
	}
	removeListener(callback, eventName=null){
		let remove = false
		for(var i=0; i < this.listeners.length; i++){
			remove = false
			if(this.listeners[i].callback === callback){
				if(eventName == null){
					remove = true
				} else if(this.listeners[i].matches(eventName)) {
					remove = true
				}
			}
			if(remove){
				this.listeners.splice(i, 1)
				i -= 1
			}
		}
	}
	get listeners(){
		// Returns an array of EventListener instances
		if(typeof this._listeners == 'undefined'){
			this._listeners = []
		}
		return this._listeners
	}
	clearListeners(){
		if(typeof this._listeners !== 'undefined'){
			this._listeners.length = 0
		}
	}
}