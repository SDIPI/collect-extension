/*
 * This file is part of wdf-extension.
 */

////////////////
// Parameters //

const successURL = 'df.sdipi.ch:5000/authsuccess';
const apiURL = 'http://df.sdipi.ch:5000/';

/////////////////////////
// API calls functions //

function sendPageView(url) {
    let accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.log("Page change, but user unregistered.");
    }
    let payload = {
        url: cleanUrl(url),
        version: 1,
        accessToken: accessToken
    };
    sendAPI('collect', payload);
}

function sendPageRequest(url, details) {
    let accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.log("Page request, but user unregistered.");
    }
    let payload = {
        url: cleanUrl(url),
        version: 1,
        accessToken: accessToken,
        request: cleanUrl(details.url),
        method: details.method
    };
    sendAPI('collectRequest', payload);
}

function sendEvent(eventData) {
    let accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.log("Event, but user unregistered.");
    }
    let payload = {
        url: cleanUrl(eventData.url),
        version: 1,
        accessToken: accessToken,
        type: eventData.type,
        value: eventData.value
    };
    sendAPI('collectEvent', payload);
}

////////////////////////////
// Chrome event listeners //

chrome.tabs.onUpdated.addListener(
    function(tabId, changeInfo, tab) {
        let url = changeInfo['url'];
        if (url) {
            sendPageView(changeInfo['url']);
        }
    }
);

chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        if (details.url.indexOf("df.sdipi.ch:5000/") == -1) {
            chrome.tabs.query({}, function(tabs) {
                for (let i = 0; i < tabs.length; i++) {
                    if (details.tabId == tabs[i].id) {
                        sendPageRequest(tabs[i].url, details);
                    }
                }
            });
        }
        return {};
    },
    { urls: ["<all_urls>"] },
    []
);

chrome.runtime.onInstalled.addListener(function (object) {
    chrome.tabs.create({url: "http://df.sdipi.ch:5000/facebookauth"}, function (tab) {
        console.log("New tab launched with http://df.sdipi.ch:5000");
    });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
    console.log("EVENT !!!");
    switch(request.message)
    {
        case 'event':
            sendEvent(request.data);
            break;

        default:
            sendResponse({data: 'Invalid arguments'});
            break;
    }
});

chrome.tabs.onUpdated.addListener(onFacebookLogin);

/////////////
// Utility //

function onFacebookLogin(){
    chrome.tabs.query({}, function(tabs) {
        for (let i = 0; i < tabs.length; i++) {
            if (tabs[i].url.indexOf(successURL) !== -1) {
                params = {};

                let parser = document.createElement('a');
                parser.href = tabs[i].url;
                parser.search.substr(1).split('&').map(a => {params[a.split('=')[0]] = a.split('=')[1]});
                console.log('LOGIN PAGE DETECTED ! Params : ' + params);

                localStorage.setItem('accessToken', params.code);

            }
        }
    });
}

function cleanUrl(url) {
    let parser = document.createElement("a");
    parser.href = url;
    return parser.origin + parser.pathname;
}

function sendAPI(path, payload) {
    fetch(apiURL + path,
        {
            method: 'post',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(function(res){
            return res.json();
        })
        .then(function(data){
            console.info("Sent '/" + path + "'  data to SDIPI.");
            console.info(JSON.stringify(data));
        })
        .catch(function(error) {
            console.error("Problem sending data to '/" + path + "' of SDIPI.");
            console.error(error);
        });
}