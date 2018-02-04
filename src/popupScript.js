let id = localStorage.getItem('accessToken').substr(0, 8);
let fullId = localStorage.getItem('accessToken');

document.getElementById("user").innerHTML = id;
document.getElementById("fullId").innerHTML = fullId;

const apiURL = 'https://df.sdipi.ch/';

let accessToken = localStorage.getItem('accessToken');
if (!accessToken) {
    console.log("No accessToken ??");
}
let payload = {
    accessToken: accessToken,
};

function doReconnect(cb) {
    fetch(apiURL + 'reconnect',
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
        })
        .then(function(json) {
            if (cb) {
                cb(json);
            }
        });
}

// doReconnect();

function newId () {
    let lastToken = localStorage.getItem('accessToken');
    let newToken = prompt("Please enter the token");

    if (newToken == null || newToken == "") {
        txt = "User cancelled the prompt.";
    } else {
        fetch(apiURL + 'disconnect')
            .then(function (res) {
                let result = res.json();
                console.log(res);

                // Reconnecting
                let payload = {
                    accessToken: newToken,
                };
                fetch(apiURL + 'reconnect',
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
                    })
                    .then(function(json) {
                        if ('success' in json) {
                            console.log("ID change finished ! Correctly reconnected");
                            localStorage.setItem('accessToken', newToken);
                            chrome.cookies.set({
                                url: "https://df.sdipi.ch/",
                                domain: ".sdipi.ch",
                                name: "wdfToken",
                                expirationDate: 1577833200,
                                value: newToken
                            });
                            alert("Successfully connected as " + newToken);
                        } else {
                            console.log("FAILED !");
                            doReconnect();
                            alert("Connection failed.");
                        }
                    });
            });
    }
}

document.getElementById('newIdButton').addEventListener('click', newId);

function handkeKeyPress (event) {
    console.log(event.key);
    if (event.key == 'r') {
        doReconnect();
    }
    if (event.key == 'c') {
        newId();
    }
    if (event.key == 'u') {
        unhide();
    }
}

document.addEventListener("keypress", handkeKeyPress);

function unhide() {
    document.getElementById("hiddenAll").classList.remove("startHidden");
}

document.getElementById("user").addEventListener('click', unhide);

