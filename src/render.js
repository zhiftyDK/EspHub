const { exec } = require("node:child_process");
const { platform } = require("node:process");
const ping = require("./ping");
const Datastore = require("nedb");
const database = new Datastore("database.db");
database.loadDatabase();

// Default base of backend
let base;
if (platform === "win32") {
    base = `${platform}\\Scripts\\python.exe`
} else if (platform === "darwin" || platform === "linux") {
    base = `${platform}\\bin\\python`
}
let path = `${process.resourcesPath}\\app\\${base} ${process.resourcesPath}\\app\\backend\\main.py`;
const development = true; // Make this false when running "npm run make"
if(development){
    path = `${base} .\\backend\\main.py`;
}

if (platform === "darwin" || platform === "linux") {
    path = path.replaceAll("\\", "/");
}

console.log(path);

// Run backend on application startup
const py = exec(path);
py.stdout.on('data', (data) => {
    data.split("\n").forEach(line => {
        console.log(line);
        if (line.includes("[DATA_FROM_BACKEND]")) {
            const output = line.replace("[DATA_FROM_BACKEND]", "");
            // Do whatever you want with the output from the backend
        }
    });
});

document.getElementById("device-save-button").addEventListener("click", () => {    
    const deviceName = document.getElementById("device-name").value.toUpperCase();
    const deviceType = document.getElementById("device-type").options[document.getElementById("device-type").selectedIndex].text;
    const deviceIp = document.getElementById("device-ip").value;
    const deviceList = document.getElementById("device-list");
    const uuid = deviceIp.replaceAll(".", "-");

    const newDevice = document.createElement("div");
    newDevice.className = "col-4";
    newDevice.id = uuid;
    newDevice.innerHTML = `
    <div class="card">
        <div class="card-body">
            <h3 class="card-title fw-bold">${deviceName} <i class="fa-solid fa-microchip"></i></h3>
            <p class="card-text">
                <h5><strong>Board:</strong> ${deviceType}</h5>
                <h5><strong>Visit:</strong> <a href="http://${deviceIp}" target="_blank">http://${deviceIp}</a></h5>
                <h5><strong>Status:</strong> <span id="device-status-${uuid}">Loading...</span></h5>
            </p>
            <div class="row">
                <div class="col">
                    <button class="btn btn-secondary" onclick="openLogs('${uuid}')" data-bs-toggle="modal" data-bs-target="#logsModal"><i class="fa-solid fa-file-lines"></i></button>
                    <button class="btn btn-secondary" onclick="restartDevice('${uuid}')"><i class="fa-solid fa-rotate"></i></button>
                    <button class="btn btn-danger" onclick="deleteDevice('${uuid}')"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        </div>
    </div>
    `;
    deviceList.appendChild(newDevice);
    let databaseData = `<div class="col-4" id="${uuid}">${newDevice.innerHTML}</div>`
    database.insert({Data: databaseData, Id: uuid});
    checkDeviceStatus();
    document.getElementById("device-name").value = "";
    document.getElementById("device-ip").value = "";
});

database.find({}, (err, output) => {
    if (err) {
        console.error(err);
    }
    const deviceList = document.getElementById("device-list");
    output.forEach(device => {
        deviceList.innerHTML = deviceList.innerHTML + device.Data;
    });
    checkDeviceStatus();
});

let logsOn = false;
function openLogs(id) {
    logsOn = true;
    document.getElementById("logs-title").innerText = document.getElementById(id).querySelector(".card-title").innerText;
    if(isOnline(id)) {
        const deviceIp = id.replaceAll("-", ".");
        const logsOutput = document.getElementById("logs-output");
        document.getElementById("logs-pingbutton").innerHTML = `<button type="button" class="btn btn-secondary" onclick="pingDevice('${id}')">Ping</button>`;
        setInterval(() => {
            if(logsOn) {
                fetch(`http://${deviceIp}/weblog`)
                .then(response => response.text())
                .then(data => {
                    logsOutput.innerHTML = data;
                    logsOutput.scrollTop = logsOutput.scrollHeight;
                });
            }
        }, 1000);
    }
}
function closeLogs() {
    logsOn = false;
}

function pingDevice(id) {
    if(isOnline(id)) {
        const deviceIp = id.replaceAll("-", ".");
        fetch(`http://${deviceIp}/ping`)
        .then(response => response.text())
        .then(data => console.log(data));
    }
}

function restartDevice(id) {
    if(isOnline(id)) {
        const deviceIp = id.replaceAll("-", ".");
        const restart = 'restarting <i class="fa-solid fa-circle" style="color: gold;"></i>';
        document.getElementById(`device-status-${id}`).innerHTML = restart;
        fetch(`http://${deviceIp}/restart`)
        .then(response => response.text())
        .then(data => console.log(data));
    }
}

function deleteDevice(id) {
    document.getElementById(id).remove();
    database.remove({Id: id}, {}, (err, numRemoved) => {
        console.log("Removed device with index: " + numRemoved);
    });
}

function isOnline(id) {
    return document.getElementById(`device-status-${id}`).innerText.includes("online");
}

setInterval(() => {
    checkDeviceStatus();
}, 1000 * 30);
function checkDeviceStatus() {
    console.log("Checking device status...");
    const deviceList = document.getElementById("device-list").children;
    for (let i = 0; i < deviceList.length; i++) {
        const deviceIp = deviceList[i].id.replaceAll("-", ".");
        const online = 'online <i class="fa-solid fa-circle" style="color: green;"></i>';
        const offline = 'offline <i class="fa-solid fa-circle" style="color: red;"></i>';
        ping(`http://${deviceIp}`).then(() => {
            document.getElementById(`device-status-${deviceList[i].id}`).innerHTML = online;
        }).catch(() => {
            document.getElementById(`device-status-${deviceList[i].id}`).innerHTML = offline;
        });
    }
}