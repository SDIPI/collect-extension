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
    switch(request.message)
    {
        case 'event':
            console.log("EVENT !");
            sendEvent(request.data);
            break;

        case 'activity':
            var url = cleanUrl(request.data.url);
            console.log("Activity from " + url);
            var time = request.data.time;
            lastActivity[url] = time;
            break;

        default:
            sendResponse({data: 'Invalid arguments'});
            break;
    }
});

chrome.tabs.onUpdated.addListener(onFacebookLogin);

////////////////////
// Activity check //

lastActivity = {};
activeTime = {};
nbChecks = 0;
secondsForInactive = 30;

setInterval(function(){
    try {
        chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
            var tab = tabs[0];
            if (tab) {
                var url = cleanUrl(tab.url);
                if (url in activeTime) {
                    if ((new Date()).getTime() < lastActivity[url] + secondsForInactive * 1000) {
                        activeTime[url] += 1;
                    }
                } else {
                    activeTime[url] = 1;
                }
            }
            if (++nbChecks >= 60 && !(Object.keys(activeTime).length === 0)) {
                console.log("Sending activity to SDIPI");
                let accessToken = localStorage.getItem('accessToken');
                if (!accessToken) {
                    console.log("Activity to send, but user unregistered.");
                    return;
                }
                let payload = {
                    version: 1,
                    accessToken: accessToken,
                    type: 'watch',
                    value: activeTime
                };
                console.log("Sent the following activity :");
                console.log(activeTime);
                sendAPI('collectWatch', payload);
                activeTime = {};
                nbChecks = 0;
            }
        });
    } catch (error) {
        console.error(error);
    }
}, 1000);


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
    return fetch(apiURL + path,
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
            console.info("Sent '/" + path + "' data to SDIPI.");
            console.info(JSON.stringify(data));
        })
        .catch(function(error) {
            console.error("Problem sending data to '/" + path + "' of SDIPI.");
            console.error(error);
        });
}