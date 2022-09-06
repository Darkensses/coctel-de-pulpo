const CDP = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');
const { getElement, click, write } = require('./lib');

async function init() {
    let client;
    const chrome = await chromeLauncher.launch({
        port: 9222,
    });

    console.log('Chrome instance running on port ' + chrome.port); 

    try {
        client = await CDP({port: chrome.port});
        const {Page, DOM, } = client; 

        await Page.enable();
        await DOM.enable();
                
        await Page.navigate({url: 'https://testpages.herokuapp.com/styled/basic-html-form-test.html'})  
        //textarea[name="t"]
        await Page.loadEventFired();
        await DOM.getDocument();
        let start = Date.now();

        let element = await getElement(client, 'input[name=username]');                
        await write(client, element, 'Generic User');

        element = await getElement(client, 'input[name=password]');
        await write(client, element, 'GenericPassword');

        element = await getElement(client, 'textarea[name=comments]');
        await write(client, element, 'King Gizzard & The Lizard Wizard 👑🐊🧙‍♂️');

        element = await getElement(client, 'input[value=cb1]');
        await click(client, element);

        element = await getElement(client, 'input[value=cb2]');
        await click(client, element);

        element = await getElement(client, 'input[value=cb3]');
        await click(client, element);
        
        console.log(Date.now() - start);
        //await new Promise(resolve => setTimeout(resolve, 3000));


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