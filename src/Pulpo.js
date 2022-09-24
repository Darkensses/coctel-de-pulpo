const CDP = require('chrome-remote-interface');

module.exports = class Pulpo {
    constructor(port) {
        this.port = 9222;
    }

    async wakeUp() {
        this.client = await CDP({port: this.port});
        await this.client.Page.enable();
        await this.client.DOM.enable();
    }

    async goto(url) {
        await this.client.Page.navigate({url})  
        await this.client.Page.loadEventFired();
        await this.client.DOM.getDocument();
    }

    async getElement(query) {
        // TODO: Agregar clase element
    }
}