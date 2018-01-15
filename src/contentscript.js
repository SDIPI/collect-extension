/*
 * This file is part of wdf-extension.
 */

lastScroll = -1;
lastActivity = (new Date()).getTime();

document.addEventListener('mouseup', function (event) {
    var selected = window.getSelection().toString();
    var data = {
        'url' : window.location.href,
        'type' : 'selectText',
        'value' : selected
    };
    if (selected.length) {
        chrome.runtime.sendMessage(null, {'message': 'event', 'data': data}, function(response) {});
        sendActivity();
    }
});

document.addEventListener('mousemove', sendActivity);
document.addEventListener('keypress', sendActivity);
document.addEventListener('touchstart', sendActivity);
document.addEventListener('visibilitychange', function (event) {
    if (!document.hidden) {
        sendActivity();
    }
});

function sendActivity() {
    var now = (new Date()).getTime();
    if (now > lastActivity + 2000) {
        lastActivity = (new Date()).getTime();
        var data = {
            'url' : window.location.href,
            'time' : lastActivity
        };
        chrome.runtime.sendMessage(null, {'message': 'activity', 'data': data}, function(response) {});
    }
}