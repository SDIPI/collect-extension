function sendPageView(url) {

    var accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
        var payload = {
            url: url,
            version: 1,
            accessToken: accessToken
        };

        console.log("Page changed : " + url);

        var data = new FormData();
        data.append( "json", JSON.stringify( payload ) );

        fetch("http://df.sdipi.ch:5000/collect",
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
                console.log("Sent data to SDIPI.");
                console.log(JSON.stringify(data));
            })
            .catch(function(error) {
                console.error("Problem sending data to SDIPI.");
                console.error(error);
            });
    } else {
        console.log("Page change, but user unregistered.");
    }
}

function sendPageRequest(url, details) {

    var accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
        var payload = {
            url: url,
            version: 1,
            accessToken: accessToken,
            request: details.url,
            method: details.method
        };

        console.log("Page requested : " + details.url);

        var data = new FormData();
        data.append( "json", JSON.stringify( payload ) );

        fetch("http://df.sdipi.ch:5000/collectRequest",
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
                console.log("Sent data to SDIPI.");
                console.log(JSON.stringify(data));
            })
            .catch(function(error) {
                console.error("Problem sending data to SDIPI.");
                console.error(error);
            });
    } else {
        console.log("Page request, but user unregistered.");
    }
}

function sendEvent(eventData) {
    var accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
        var payload = {
            url: eventData.url,
            version: 1,
            accessToken: accessToken,
            type: eventData.type,
            value: eventData.value
        };

        console.log("Event happened : " + eventData['type']);

        var data = new FormData();
        data.append( "json", JSON.stringify( payload ) );

        fetch("http://df.sdipi.ch:5000/collectEvent",
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
                console.log("Sent data to SDIPI.");
                console.log(JSON.stringify(data));
            })
            .catch(function(error) {
                console.error("Problem sending data to SDIPI.");
                console.error(error);
            });
    } else {
        console.log("Event, but user unregistered.");
    }
}

chrome.tabs.onUpdated.addListener(
    function(tabId, changeInfo, tab) {
        var url = changeInfo['url'];
        if (url) {
            sendPageView(changeInfo['url']);
        }
    }
);

chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        if (details.url.indexOf("df.sdipi.ch:5000/") == -1) {
            chrome.tabs.query({}, function(tabs) {
                for (var i = 0; i < tabs.length; i++) {
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

var successURL = 'df.sdipi.ch:5000/authsuccess';

function onFacebookLogin(){
    chrome.tabs.query({}, function(tabs) {
        for (var i = 0; i < tabs.length; i++) {
            if (tabs[i].url.indexOf(successURL) !== -1) {
                params = {};

                var parser = document.createElement('a');
                parser.href = tabs[i].url;
                parser.search.substr(1).split('&').map(a => {params[a.split('=')[0]] = a.split('=')[1]});
                console.log('LOGIN PAGE DETECTED ! Params : ' + params);

                localStorage.setItem('accessToken', params.code);

            }
        }
    });
}

chrome.tabs.onUpdated.addListener(onFacebookLogin);
