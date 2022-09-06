const CDP = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');
const { getElement, click } = require('./lib');

async function init() {
    let client;
    const chrome = await chromeLauncher.launch({
        chromeFlags: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream'
        ],
        port: 9222,
    });

    console.log('Chrome instance running on port ' + chrome.port); 

    try {
        client = await CDP({port: chrome.port});
        const {Page, DOM, DOMSnapshot, Runtime, Target } = client; 

        await Page.enable();
        await DOM.enable();
        await DOMSnapshot.enable();
                
        await Page.navigate({url: 'https://testpages.herokuapp.com/styled/find-by-playground-test.html'})  
        await Page.loadEventFired();
        await DOM.getDocument();
        let start = Date.now();

        let element = await getElement(client, '//li[@id="li2"]/a');        
        console.log(element);
        await click(client, element);
        console.log(element.node);
        
        console.log(Date.now() - start);
        await new Promise(resolve => setTimeout(resolve, 3000));


    } catch (err) {
        console.error("Error en init");
        console.log(err)
    } finally {
        if (client) {
            console.log("End Execution")
            await client.close();
            await chrome.kill();
        }
    }
}

init();