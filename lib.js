const CDP = require('chrome-remote-interface');

async function performSearch(client, query) {
    const {DOM} = client; 
    await DOM.getDocument();
    if(typeof query !== "string") throw new Error("Query must be a string")
    return await DOM.performSearch({ query: query, includeUserAgentShadowDOM: false });
    
}

/**
 * Get an element from a query.
 * This function does the same as the search bar in the Browser Devtools' element tab.
 * @param {*} client 
 * @param {*} query 
 * @returns element object: {
 * queryResult: { searchId: 'id string', resultCount: 1 },
 * results: { nodeIds: [] },
 * remoteObject: { object: { type: '', subtype: '', className: '', description: '', objectId: ''} },
 * node: { nodeId: number, backendNodeId: number, nodeType: number, nodeName: '', localName: '', nodeValue: '', childNodeCount: number, children: [], attributes: []}
 * }
 */
async function getElement(client, query, maxTime=5000) {
    const { DOM } = client;
    let start = Date.now();
    let queryResult;
    try {        
        while(true) {
            queryResult = await performSearch(client, query);

            if(queryResult.resultCount === 1) {            
                const results = await DOM.getSearchResults({searchId: queryResult.searchId, fromIndex: 0, toIndex: 1});
                const remoteObject = await DOM.resolveNode({nodeId: results.nodeIds[0]}); 
                const {node} = await DOM.describeNode({nodeId: results.nodeIds[0], depth: 1, pierce: true});
                return {query, queryResult: queryResult, results: results, remoteObject: remoteObject, node: node};
            }
            
            if(queryResult.resultCount > 1) {throw new Error("More than one element found. Improve your query.")};
            if(queryResult.resultCount === 0 && Date.now() > start + maxTime) {throw new Error("Element not found. TimeoutException")};
        }
        
    } catch (error) {
        console.log('\x1b[31m❌ %s\x1b[0m',error);
    }
}

async function getFrame(client, query, maxTime=5000) {
    const { Target } = client;
    const element = await getElement(client, query);

    const srcIdx = element.node.attributes.indexOf("src");
    if(srcIdx === -1) { throw new Error("src attribute is not present in the iframe 🤯")}

    const src = element.node.attributes[srcIdx + 1];

    const start = Date.now();
    let targets, resultTarget;
    while(true) {
        targets = await Target.getTargets();
        resultTarget = targets.targetInfos.filter(t => t.url === src);

        if(resultTarget.length > 0) {
            console.log(`Found Frame in ${new Date().getTime() - start} ms.`);
            return await CDP({target: `ws://127.0.0.1:9222/devtools/page/${resultTarget[0].targetId}`});
            //return resultTarget[0];
        }

        if(Date.now() > start + maxTime) {
            throw Error(`Frame TimeoutException`);
        }
    }
}

async function getText(client, element) {
    const { Runtime } = client;
    const props = await Runtime.getProperties({objectId: element.remoteObject.object.objectId});
    
    const text = props.result.find(prop => prop.name === 'textContent');
    return text ? text.value.value : undefined;
}

async function write(client, element, text) {
    const { DOM, Input } = client;
    await DOM.focus({backendNodeId: element.node.backendNodeId});

    // Clear the input before insert text
    await Input.dispatchKeyEvent({type: 'keyDown', modifiers: 2, text: 'a', unmodifiedText: 'a', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65});
    await Input.dispatchKeyEvent({type: 'keyUp', modifiers: 2, text: 'a', unmodifiedText: 'a', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65});
    await Input.dispatchKeyEvent({type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8});
    await Input.dispatchKeyEvent({type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8});   

    // simulate typing
    for (const key of text) {
        // Check if the char is an emoji: 
        // https://stackoverflow.com/a/64007175
        if(/\p{Extended_Pictographic}/u.test(key)) {
            await Input.insertText({text: key});
        } else {
            await Input.dispatchKeyEvent({type: 'char', text: key});
        }     
    }
}

async function click(client, element, maxTime=5000) {
    const { DOM, Input } = client;
            
    let boxModel = await DOM.getBoxModel({backendNodeId: element.node.backendNodeId}); 
    let coords = {x: Math.round(boxModel.model.width / 2 + boxModel.model.content[0]), y: Math.round(boxModel.model.height / 2 + boxModel.model.content[1])};            

    await DOM.scrollIntoViewIfNeeded({backendNodeId: element.node.backendNodeId});
    let actualElement;
    let start = Date.now();

    while(true) {        
        elementByCoords = await DOM.getNodeForLocation({x: coords.x, y: coords.y});
        actualElement = await DOM.describeNode({backendNodeId: elementByCoords.backendNodeId, depth: 1, pierce: true});

        if(JSON.stringify(actualElement.node) === JSON.stringify(element.node)) {
            console.log(`Found ${element.query}`);
            break;
        }
        else if(element.node.childNodeCount > 0 && element.node.children.find(child => child.backendNodeId === actualElement.node.backendNodeId)) {
            console.log("Child Found!");
            break;
        }

        if(Date.now() > start + maxTime) {
            throw Error(`Click TimeoutException`);
        }

    }

    boxModel = await DOM.getBoxModel({backendNodeId: element.node.backendNodeId});
    coords = {x: Math.round(boxModel.model.width / 2 + boxModel.model.content[0]), y: Math.round(boxModel.model.height / 2 + boxModel.model.content[1])};
    
    try {                          
        await Input.dispatchMouseEvent({type: "mouseMoved", x: coords.x, y: coords.y});
        await Input.dispatchMouseEvent({type: "mousePressed", x: coords.x, y: coords.y, button: "left", clickCount: 1});
        await Input.dispatchMouseEvent({type: "mouseReleased", x: coords.x, y: coords.y, button: "left", clickCount: 1});

    } catch (error) {
        console.log(error)
        if(error.response && error.response.message) {
            console.log(error.response.message);
        }
    }
    
   
    
}

module.exports = {
    getElement,
    getFrame,
    getText,
    click,
    write
}