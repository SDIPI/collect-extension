/*
 * This file is part of wdf-extension.
 */

////////////////
// Parameters //

const successURL = 'df.sdipi.ch/authsuccess';
const apiURL = 'https://df.sdipi.ch/';

//////////////////
// Actions list //

let actions = [];

function addPageview(url) {
    // We don't want to see chrome pages or local traffic
    let parser = document.createElement("a");
    parser.href = url;
    if (parser.origin.startsWith("localhost") || parser.origin.startsWith("127.0.0.1") || parser.protocol.startsWith("chrome")) {
        return;
    }

    let payload = {
        url: cleanUrl(url),
        version: 1
    };
    addAction('view', payload);
}

function addPagerequest(url, details) {
    let parser = document.createElement("a");
    parser.href = url;
    let urlSize = (parser.pathname.length + parser.search.length) * 8;
    let contentSize = 0;
    if ('requestBody' in details) {
        // Looking for raw data first
        if ('raw' in details.requestBody) {
            try {
                for (let i = 0; i < details.requestBody.raw.length; i++) {
                    contentSize += details.requestBody.raw[i].bytes.byteLength;
                }
            } catch (e) {
                console.error("Error while getting raw content size of requestBody :");
                console.error(e);
            }
        }
        // Then looking for any form data
        if ('formData' in details.requestBody) {
            try {
                contentSize += JSON.stringify(details.requestBody.formData).length * 8;
            } catch (e) {
                console.error("Error while getting formData content size of requestBody :");
                console.error(e);
            }
        }
    }
    let byteSize = urlSize + contentSize;
    let payload = {
        url: cleanUrl(url),
        version: 1,
        request: cleanUrl(details.url),
        method: details.method,
        size: byteSize
    };
    addAction('request', payload);
}

function addEvent(eventData) {
    let payload = {
        url: cleanUrl(eventData['url']),
        version: 1,
        type: eventData.type,
        value: eventData.value
    };
    addAction('event', payload);
}

function addAction(type, data) {
    actions.push({'type': type, 'data': data});
}

/////////////////////////
// API calls functions //

function sendActions() {
    let accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.log("Want to send actions, but user unregistered.");
    }
    let payload = {
        version: 1,
        accessToken: accessToken,
        type: 'actions',
        value: actions.slice() // Copies the array so that we can empty it
    };
    actions = [];
    return sendAPI('collectActions', payload)
        .then(function (data) {
            console.info("Sent recent actions data to SDIPI.");
            console.info(JSON.stringify(data));
        })
        .catch(function (error) {
            console.error("Problem sending recent actions of SDIPI.");
            console.error(error);
        });
}

////////////////////////////
// Chrome event listeners //

chrome.tabs.onUpdated.addListener(
    function (tabId, changeInfo, tab) {
        let url = changeInfo['url'];
        if (url) {
            addPageview(url);
        }
    }
);

chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        if (details.url.indexOf("df.sdipi.ch/") == -1) {
            chrome.tabs.query({}, function (tabs) {
                for (let i = 0; i < tabs.length; i++) {
                    if (details.tabId == tabs[i].id) {
                        addPagerequest(tabs[i].url, details);
                    }
                }
            });
        }
        return {};
    },
    {urls: ["<all_urls>"]},
    ['requestBody']
);

chrome.runtime.onInstalled.addListener(function (object) {
    chrome.tabs.create({url: apiURL + "anonauth"}, function (tab) {
        console.log("New tab launched with " + apiURL + "anonauth");
    });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.message) {
        case 'event':
            console.log("EVENT !");
            addEvent(request.data);
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

chrome.tabs.onUpdated.addListener(onAnonLogin);

////////////////////
// Activity check //

lastActivity = {};
activeTime = {};
secondsForInactive = 30;

// Every sec, log which page is opened
setInterval(function () {
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
        });
    } catch (error) {
        console.error(error);
    }
}, 1000);

// Every 30 sec, send recent actions to SDIPI
setInterval(function () {
    try {
        // Look for token
        console.log("Sending activity to SDIPI");
        let accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.log("Activity to send, but user unregistered.");
            return;
        }

        // Aggregate and reset watch time
        activeTimeToSend = JSON.parse(JSON.stringify(activeTime));
        activeTime = {};

        addAction('watch', activeTimeToSend);

        // Finally send actions
        sendActions();
    } catch (error) {
        console.error(error);
    }
}, 30000);

/////////////
// Utility //

function onAnonLogin() {
    chrome.tabs.query({}, function (tabs) {
        for (let i = 0; i < tabs.length; i++) {
            if (tabs[i].url.indexOf(successURL) !== -1) {
                params = {};

                let parser = document.createElement('a');
                parser.href = tabs[i].url;
                parser.search.substr(1).split('&').map(a => {
                    params[a.split('=')[0]] = a.split('=')[1]
                });
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
        .then(function (res) {
            return res.json();
        });
}