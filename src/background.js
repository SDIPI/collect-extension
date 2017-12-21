/*
 * This file is part of wdf-extension.
 */

////////////////
// Parameters //

const successURL = 'df.sdipi.ch:5000/authsuccess';
const apiURL = 'http://df.sdipi.ch:5000/';

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
    let payload = {
        url: cleanUrl(url),
        version: 1,
        request: cleanUrl(details.url),
        method: details.method
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

/*
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
    let parser = document.createElement("a");
    parser.href = url;
    if (parser.origin == "localhost" || parser.origin == "127.0.0.1" || parser.protocol == "chrome:") {
        return;
    }
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
*/

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
            //sendPageView(changeInfo['url']);
            addPageview(url);
        }
    }
);

chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        if (details.url.indexOf("df.sdipi.ch:5000/") == -1) {
            chrome.tabs.query({}, function (tabs) {
                for (let i = 0; i < tabs.length; i++) {
                    if (details.tabId == tabs[i].id) {
                        // sendPageRequest(tabs[i].url, details);
                        addPagerequest(tabs[i].url, details);
                    }
                }
            });
        }
        return {};
    },
    {urls: ["<all_urls>"]},
    []
);

chrome.runtime.onInstalled.addListener(function (object) {
    chrome.tabs.create({url: "http://df.sdipi.ch:5000/facebookauth"}, function (tab) {
        console.log("New tab launched with http://df.sdipi.ch:5000");
    });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.message) {
        case 'event':
            console.log("EVENT !");
            addEvent(request.data);
            //sendEvent(request.data);
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

function onFacebookLogin() {
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