/*
	EventListener holds information about listeners on an object with the eventMixin
*/
export default class EventListener {
	constructor(eventName, callback, once=false){
		this.eventName = eventName
		this.callback = callback
		this.once = once
	}
	matches(eventName){
		return this.eventName === EventListener.ALL_EVENTS || eventName === this.eventName
	}
	distributeEvent(eventName, ...params){
		if(this.matches(eventName)){
			this.callback(eventName, ...params)
			return true
		}
		return false
	}
}

EventListener.ALL_EVENTS = Symbol('all events')