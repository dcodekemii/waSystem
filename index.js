/*
  *  Script By Kemii
  *  Forbidden to delete my wm
  *  Github : dcodekemii
  *  Telegram : t.me/dcodekemi
  *  WhatsApp : wa.me/628816609112
*/

const { default: makeWASocket, jidDecode, Browsers, DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const readline = require("readline")
const pino = require("pino")
require('./settings')

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return new Promise((resolve) => {
        rl.question(text, (answer) => {
            resolve(answer.trim())
        })
    })
}

async function System() {
    const { state, saveCreds } = await useMultiFileAuthState('sessions')
    const sock = makeWASocket({ 
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        browser: Browsers.windows("Edge")
    })

    if (!sock.authState.creds.registered) {
        process.stdout.write('\x1b[2J\x1b[0f')
        const phoneNumber = await question("Masukan nomer whatsapp kamu (62): ")
        let code = await sock.requestPairingCode(phoneNumber.trim())
        code = code.match(/.{1,4}/g)?.join("-") || code
        console.log("Pairing code: ", code)
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'connecting') {
            console.log('Koneksi pending')
        } else if (connection === 'close') {
            console.log('Koneksi terputus')
            System()
        } else if (connection === 'open') {
            process.stdout.write('\x1b[2J\x1b[0f')
            console.log('Koneksi tersambung')
            console.log('- Name: ', sock.user.name ? sock.user.name : "Kemii")
        }
    })

    sock.ev.on('messages.upsert', async (update) => {
        const msg = update.messages[0]
        const maxTime = 5 * 60 * 1000
        sock.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                const decode = jidDecode(jid) || {}
                return (
                    (decode.user && decode.server && decode.user + "@" + decode.server) || jid
                )
            } else return jid
        }

        if (global.settings.autoreact && msg.key.remoteJid === 'status@broadcast') {
            if (msg.key.fromMe) return
            const currentTime = Date.now()
            const messageTime = msg.messageTimestamp * 1000
            const timeDiff = currentTime - messageTime

            if (timeDiff <= maxTime) {
                if (msg.pushName && msg.pushName.trim() !== "") {
                    await sock.readMessages([msg.key])
                    const timestamp = Date.now()
                    const dateObject = new Date(timestamp)
                    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
                    const dayName = days[dateObject.getDay()]
                    const date = dateObject.getDate()
                    const month = dateObject.getMonth() + 1
                    const year = dateObject.getFullYear()
                    const key = msg.key
                    const status = msg.key.remoteJid
                    const me = await sock.decodeJid(sock.user.id)
                    const emoji = global.emoji[Math.floor(Math.random() * global.emoji.length)]
                    await sock.sendMessage(status, { react: { key: key, text: emoji } }, { statusJidList: [key.participant, me] }).catch(() => {})
                    process.stdout.write('\x1b[2J\x1b[0f')
                    console.log("Reaction Story")
                    console.log(`- Name: `, msg.pushName)
                    console.log(`- Date: `, `${dayName}, ${date}/${month}/${year}`)
                    console.log(`- React: `, emoji)
                } 
            }
        } else if (global.settings.autoread && msg.key.remoteJid !== 'status@broadcast') {
            if (msg.key.fromMe) return
            await sock.readMessages([msg.key])
            const timestamp = Date.now()
            const dateObject = new Date(timestamp)
            const dayName = days[dateObject.getDay()]
            const date = dateObject.getDate()
            const month = dateObject.getMonth() + 1
            const year = dateObject.getFullYear()
            process.stdout.write('\x1b[2J\x1b[0f')
            console.log("Reading Message")
            console.log("- Name: ", msg.pushName ? msg.pushName : "Unknown")
            console.log(`- Date: `, `${dayName}, ${date}/${month}/${year}`)
            console.log("- Pesan: ", msg.message.extendedTextMessage?.text || null)
        }
    })

    sock.ev.on('call', async (update) => {
        const jid = update[0].chatId
        if (global.settings.anticall) {
            return sock.sendMessage(jid, { text: 'Saat ini saya tidak dapat menerima panggilan anda.'})
        }       
    })

    sock.ev.on('creds.update', saveCreds)
}

System()
