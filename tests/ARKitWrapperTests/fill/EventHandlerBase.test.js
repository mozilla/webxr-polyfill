import assert from 'assert';
import EventHandlerBase from '../../polyfill/fill/EventHandlerBase';

describe('EventHandlerBase', function() {
    const listener11 = function listener11() {};
    const listener12 = function listener12() {};
    const listener21 = function listener21() {};

    it('should initialize with an empty Map', function(){
        const instance = new EventHandlerBase();
        assert.ok(instance._listeners instanceof Map, '_listeners should be instanceof Map');
        assert.equal(instance._listeners.size, 0, '_listeners should be empty');
    });
    
    it('should add listeners', function(){
        const instance = new EventHandlerBase();
        
        instance.addEventListener('event1', listener11);
        
        assert.equal(instance._listeners.size, 1, 'one listener added');
        
        instance.addEventListener('event1', listener12);
        
        instance.addEventListener('event2', listener21);
        
        assert.equal(instance._listeners.size, 2, 'two listener arrays added');
        assert.equal(instance._listeners.get('event1').length, 2, 'should be two listeners of type event1');
        assert.equal(instance._listeners.get('event2').length, 1, 'should be one listener of type event2');
    });
    
    it('should remove listeners', function(){
        const instance = new EventHandlerBase();
        
        // add 2 listeners of type event1 and one listener of type event2
        instance.addEventListener('event1', listener11);
        instance.addEventListener('event1', listener12);
        instance.addEventListener('event2', listener21);
        
        // try to remove a listener of non-existing type
        instance.removeEventListener('event3', listener11);
        
        assert.equal(instance._listeners.get('event1').length, 2, 'should be two listeners of type event1');
        
        // try to remove a non-existing listener
        instance.removeEventListener('event1', function() {});
        
        assert.equal(instance._listeners.get('event1').length, 2, 'should still be two listeners of type event1');

        instance.removeEventListener('event1', listener12);
        instance.removeEventListener('event2', listener21);
        
        assert.equal(instance._listeners.get('event1').length, 1, 'should be only one listener of type event1');
        assert.equal(instance._listeners.get('event2').length, 0, 'should be no listeners of type event2');
    });
    
    it('should dispatchEvent', function(){
        const instance = new EventHandlerBase();
        var numberOfCorrectCalls = 0;
        
        instance.addEventListener('event1', function(e) {
            if (e.type == 'event1' && e.detail == 'detail1') {
                numberOfCorrectCalls++;
            }
        });
        instance.addEventListener('event1', function(e) {
            if (e.type == 'event1' && e.detail == 'detail1') {
                numberOfCorrectCalls++;
            }
        });
        instance.addEventListener('event2', function(e) {
            if (e.type == 'event2' && e.detail == 'detail2') {
                numberOfCorrectCalls++;
            }
        });

        instance.dispatchEvent({type: 'event1', detail: 'detail1'});
        instance.dispatchEvent({type: 'event2', detail: 'detail2'});
        
        assert.equal(numberOfCorrectCalls, 3, 'should be three correct calls');
    });
})
