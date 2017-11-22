lastScroll = -1;

document.addEventListener('mouseup', function (event) {
    var selected = window.getSelection().toString();
    console.log("MOUSEUP");
    var data = {
        'url' : window.location.href,
        'type' : 'selectText',
        'value' : selected
    };
    if (selected.length) {
        chrome.runtime.sendMessage(null, {'message': 'event', 'data': data}, function(response) {});
    }
});

document.addEventListener('scroll', function (event) {
    var now = Math.floor(Date.now() / 1000);
    if (now - lastScroll >= 1) {
        lastScroll = now;
        console.log("SCROLL");
        var data = {
            'url' : window.location.href,
            'type' : 'scroll',
            'value' : window.scrollY
        };
        chrome.runtime.sendMessage(null, {'message': 'event', 'data': data}, function(response) {});
    }
});

document.addEventListener('visibilitychange', function (event) {
    console.log("VISIBILITY CHANGE");
    var visible;
    if (document[hidden]) {
        visible = 'out';
    } else {
        visible = 'in'
    }
    var data = {
        'url' : window.location.href,
        'type' : 'visibility',
        'value' : visible
    };
    chrome.runtime.sendMessage(null, {'message': 'event', 'data': data}, function(response) {});
});
