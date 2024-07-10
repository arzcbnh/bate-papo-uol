const uuid = "164b3889-9dcc-4bb1-9788-228053415cdb";
const currentParticipants = [];
let lastMessage = {};
let username;

axios.defaults.validateStatus = () => true;
setupClient()

async function setupClient() {
    await joinRoom();
    setInterval(() => notifyPresence(), 5000);
    setInterval(() => updateMessages(), 3000);
    setInterval(() => updateParticipants(), 10000);
}

async function joinRoom() {
    let query = "Escolha um nome de usuário";
    let response;
    
    do {
        username = prompt(query);
        response = await axios.post("https://mock-api.driven.com.br/api/v6/uol/participants/" + uuid, {name: username});
        query = "Esse nome de usuário já está em uso! Escolha outro";
    } while (response.status === 400)

    currentParticipants.push(username);
}

async function notifyPresence() {
    axios.post("https://mock-api.driven.com.br/api/v6/uol/status/" + uuid, {name: username});
}


async function updateMessages() {
    const response = await axios.get("https://mock-api.driven.com.br/api/v6/uol/messages/" + uuid);
    const newMessages = response.data.slice(getLastMessageIndex(response.data) + 1, response.data.length)
    const elements = newMessages.filter(message => !isRestrictedMessage(message))
        .map(message => generateMessageElement(message));

    if (elements.length === 0)
        return;

    lastMessage = newMessages.pop();
    document.querySelector(".chat").append(...elements);
    document.querySelector(".message:last-child").scrollIntoView();
}

function getLastMessageIndex(list) {
    for (let i = list.length - 1; i >= 0; i--) {
        const sameTime = list[i].time === lastMessage.time;
        const sameFrom = list[i].from === lastMessage.from;
        const sameText = list[i].text === lastMessage.text;
        const sameType = list[i].type === lastMessage.type;
        const sameTo = list[i].to === lastMessage.to;

        if (sameTime && sameFrom && sameText && sameType && sameTo)
            return i;
    }

    return -1;
}

function generateMessageElement(message) {
    function spanify(text, className) {
        return `<span class="${className}">${text}</span>`;
    }

    const time = spanify(message.time, "message_time");
    const from = spanify(message.from, "message_name");
    const action = {
        status: "",
        message: `para ${spanify(message.to, "message_name")}: `,
        private_message: `reservadamente para ${spanify(message.to, "message_name")}: `
    };

    const element = document.createElement("div");
    element.classList.add("message", `-${message.type}`);
    element.innerHTML = `${time} ${from} ${action[message.type] + message.text}`;

    return element;
}

function isRestrictedMessage(message) {
    const isPrivateMessage = message.type === "private_message";
    const isFromUser = message.from === username;
    const isToUser = message.to === username;

    return isPrivateMessage && !isFromUser && !isToUser;
}


async function updateParticipants() {
    const response = await axios.get("https://mock-api.driven.com.br/api/v6/uol/participants/" + uuid);
    const serverList = response.data.map(p => p.name);
    const newParticipants = serverList.filter(p => !currentParticipants.includes(p));
    const oldParticipants = currentParticipants.filter(p => !serverList.includes(p));

    newParticipants.forEach(p => addParticipant(p));
    oldParticipants.forEach(p => removeParticipant(p));
}

function addParticipant(name) {
    const item = document.createElement("li");

    item.classList.add("settings_participant");
    item.setAttribute("id", name);
    item.setAttribute("onclick", "selectSetting('participant', this)");
    item.innerHTML = `<ion-icon name="person-circle" class="settings_icon"></ion-icon> ${name}`;
    document.querySelector(".settings_list").append(item);

    currentParticipants.push(name);
}

function removeParticipant(name) {
    const item = document.querySelector(`[id="${name}"]`);

    if (item.classList.contains("-selected")) {
        selectSetting("participant", document.querySelector("#Todos"));
    }

    item.remove();
    currentParticipants.splice(currentParticipants.indexOf(name), 1);
}


async function sendMessage(statusType) {
    const input = document.querySelector(".bottomBar_content");
    const data = {
        from: username,
        to:   document.querySelector(".settings_participant.-selected").getAttribute("id"),
        type: document.querySelector(".settings_privacy.-selected").getAttribute("id"),
        text: input.value,
    }

    input.value = "";
    const response = await axios.post("https://mock-api.driven.com.br/api/v6/uol/messages/" + uuid, data);

    if (response.status !== 200)
        window.location.reload();
}


function toggleSettingsPanel() {
    const settings = document.querySelector(".settings");
    settings.classList.toggle("-visible");
}

function selectSetting(type, item) {
    document.querySelector(`.settings_${type}.-selected`).classList.remove("-selected");
    item.classList.add("-selected");

    const participant = document.querySelector(".settings_participant.-selected").getAttribute("id");
    const privacy = document.querySelector(".settings_privacy.-selected").getAttribute("id") === "message" ? "público" : "reservadamente";

    document.querySelector(".bottomBar_recipient").textContent = `Enviando para ${participant} (${privacy})`;
}
