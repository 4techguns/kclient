const ws = require("ws")
const t = require("terminal-kit").terminal
const fs = require("fs")

const silentJoin = process.argv.includes("-s")

let online = 0
let mute = false
let typethingy = false
let spinner

const markdowns = [
    [/\*\*\*(.*)\*\*\*/gm,"^/$1^:"],[/\*\*(.*)\*\*/gm,"^+$1^:"],
	[/(\\\*)/gm,"*"],
	[/~~(.*)~~/gm,"$1"],
	[/__(.*)__/gm,"^_$1^:"],
	[/(?<!\\)(@noOne)/g,'^#^y^b^+$1^:'],
	[/(?<!\\)(@everyone)/g,'^#^y^b^+$1^:'],
	[/(\\~)/gm,"~"],[/(\\_)/gm,"_"],[/\\@/g,"@"],
]

function addMarkDown(text) {
    var newText = text
    markdowns.forEach((regexs) => {
        newText = newText.replace(regexs[0],regexs[1])
    })
    return newText
}

function open() {
    t.eraseDisplay()
    if (silentJoin) { t.white.bgRed(" [silent join enabled] \n") }
    t.blue("Enter name: ")
t.inputField({
    default: ""
}, async (e, name) => {
    t(" ")

    const printOnline = () => {
        t.moveTo(1, 1).bgGreen(` ${name} | ${online} online | Press tab to open the menu `)
        t.moveTo(1, t.height)
    }

    let spin = await t.spinner('bitDots');
    t.yellow(" connecting...\n")
	markdowns[5][0] = new RegExp("(?<!\\\\)(@" + name + ")","g")
    const socket = new ws.WebSocket('wss://scholarlyblandbusinesses.karbis3.repl.co', {
        maxHeaderSize: 1000000000000
    });

    const openMenu = () => {
        const items = ['Exit', 'Logout/Change Name', 'Fetch Messages', 'Clear Chat', `Toggle Sound (${mute ? "Off" : "On"})`, 'Cancel'];

        const options = {
            y: t.height,
            selectedStyle: t.bgBlue,
            align: 'center'
        };

        t.singleLineMenu(items, options, (er, response) => {
            switch (response.selectedIndex) {
                case 0:
                    t("\nare you sure you wanna exit? ")
                    t.yesOrNo().promise.then((val) => {
                        if (val) {
                            if (!silentJoin) {
                                socket.send(JSON.stringify({
                                    type: "message",
                                    username: name,
                                    text: "[has disconnected]"
                                }))
                            }
                            socket.close()
                            t.processExit(0)
                        }
                        else {
                            t.eraseLineBefore("\r")
                        }
                    })
                    break;
                case 1:
                    t.eraseDisplay()
                    socket.close()
                    open()
                    break;
                case 2:
                    socket.send("{\"type\":\"retrieveMessages\"}")
                    printOnline()
                    break;
                case 3:
                    t.eraseDisplay()
                    printOnline()
                    break;
                case 4:
                    mute = !mute
                    break;
                case 5:
                    t.eraseLine("\r")
                    break;
            }
        })
    }

    t.grabInput()

    t.on('key', (name, matches, da) => {
        if (name === "TAB") {
            openMenu()
        }
    })

    socket.on('message', async (deeta) => {
        const d = deeta.toString();
        const s = d.matchAll(/(.*?)\/(.*)/g)
        const split = [...s];
        const type = split[0][1]

        if (type == "message") {
            const data = JSON.parse(split[0][2])
            t.eraseLineBefore()
            t.eraseLineAfter()
            t(`${data.username == "karbis" ? "^gkarbis^:" : data.username}: ${addMarkDown(data.text)}`)
            t.scrollUp(1)
            if (!mute) t.bell()
            t.notify("Message", `${data.username}: ${data.text}`)
            printOnline()
        } else if (type == "typing") {
            const data = JSON.parse(split[0][2])
            if (data.length > 0) {
                typethingy = true
                t.yellow(` ${data} ${data.length > 1 ? "are" : "is"} typing\r`)
            }
        } else if (type == "onlineCount") {
            const data = split[0][2]
            online = data
            printOnline()
        } else if (type == "recievedData") {
            try {
                const data = JSON.parse(split[0][2])
                data.forEach(msg => {
                    t(`${msg.username}: ${addMarkDown(msg.text)}\n`)
                })
            } catch (e) { t("(could not get message history)") }
            printOnline()
        }
    })

    const s = () => {
        t.moveTo(1, t.height)
        t.inputField(async (er, message) => {
            const payload = JSON.stringify({
                type: "message",
                username: name,
                text: message
            })
            socket.send(payload)
            printOnline()
            t("\r")
            s()
        })
    }

    socket.once('open', async () => {
        spin.destroy()
        t.eraseLineBefore()
        t.eraseLineAfter()
        socket.send("{\"type\":\"retrieveMessages\"}")
        
        if (!silentJoin) {
            socket.send(JSON.stringify({
                type: "message",
                username: name,
                text: "[has connected]"
            }))
        }
        
        printOnline()
        s()
    });

    

})
}

open()
