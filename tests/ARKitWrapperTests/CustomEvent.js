export default class CustomEvent {
    constructor(type, params) {
        this.type = type;
        this.detail = null;
        
        if (typeof(params) == 'object' && typeof(params.detail) != 'undefined') {
            this.detail = params.detail;
        }
    }
}
