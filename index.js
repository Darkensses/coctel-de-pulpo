const CDP = require('chrome-remote-interface');

async function init() {
    let client;

    try {
        client = await CDP();
        const {Network, Page, DOM, DOMDebugger, Input, Debugger, Runtime } = client;        

        /*Network.requestWillBeSent((params) => {
            console.log(params.request.url);
        });*/

        await Network.enable();
        await Page.enable();
        await Debugger.enable();
        await DOM.enable();
        Runtime.enable();
        
        await Page.navigate({url: 'https://github.com/Darkensses'})
        await Page.loadEventFired();        
        await DOMDebugger.setEventListenerBreakpoint({eventName: 'click', targetName: '*'});
        Debugger.on("paused", (e) => {
            console.log("HEEEEEEEEEEEEEEEEY")
        })
        
        const doc = await DOM.getDocument({pierce: true})
        console.log(doc)
        let element = await DOM.querySelector({nodeId: doc.root.nodeId, selector: "span[title='react-leap-visualizer']"});
        console.log(element)        

        // Get element using xpath
        let xelement = await DOM.performSearch({query: "//span[@title='react-leap-visualizer']"});
        console.log(xelement)
        let results = await DOM.getSearchResults({searchId: xelement.searchId, fromIndex: 0, toIndex: xelement.resultCount});
        console.log(results);

        // CLICK ELEMENT: Es necesario scrollear a donde esta el elemento 👀
        // Utilizar el método DOM.resolveNode para obtener un Runtime.remoteObject que tendrá el objectId
        let remoteObject = await DOM.resolveNode({nodeId: results.nodeIds[0]});
        // OPCION RUNTIME:
        //let runtime = await Runtime.evaluate({expression: `document.evaluate("//*[@id='year-link-2016']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;`});
        console.log(remoteObject)
        Runtime.callFunctionOn({objectId: remoteObject.object.objectId, functionDeclaration: "function(){this.scrollIntoViewIfNeeded(!0)}", silent: true});
        // Hay que liberar el elemento una vez se termina de utilizar.
        Runtime.releaseObject({objectId: remoteObject.object.objectId});



        // Primero se necesita obtener el BoxModel del elemento
        let boxModel = await DOM.getBoxModel({nodeId: results.nodeIds[0]});
        console.log(boxModel)
        // Luego obtener el centro del BoxModel
        let coords = {x: boxModel.model.content[0] + boxModel.model.width / 2, y: boxModel.model.content[1] + boxModel.model.height /2};
        // El evento del click se compone de 3 pasos:
        Input.dispatchMouseEvent({type: "mouseMoved", x: coords.x, y: coords.y});
        Input.dispatchMouseEvent({type: "mousePressed", x: coords.x, y: coords.y, button: "left", clickCount: 1})
        Input.dispatchMouseEvent({type: "mouseReleased", x: coords.x, y: coords.y, button: "left", clickCount: 1})



    } catch (err) {
        console.error(err);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

init();