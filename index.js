
const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@adiwajshing/baileys")
const P = require("pino")

// Session sudah tersimpan, cukup copy file auth_info.json dari device lain
const { state, saveState } = useSingleFileAuthState('./auth_info.json')

async function startBot(pairingCode) {
    const { version } = await fetchLatestBaileysVersion()
    
    // Optional: cek pairing code
    if(pairingCode !== "YOUR_SECRET_CODE") {
        console.log("❌ Kode pairing salah! Bot tidak dijalankan.")
        return
    }

    const conn = makeWASocket({
        printQRInTerminal: false, // QR tidak tampil
        auth: state,
        version,
        logger: P({ level: 'silent' })
    })

    conn.ev.on('creds.update', saveState)

    let verifiedUsers = {}
    let userData = {}

    conn.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if(!msg.message || msg.key.fromMe) return

        const jid = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        const sender = msg.key.participant || msg.key.remoteJid

        // VERIFIKASI
        if(text.startsWith(".verify")) {
            verifiedUsers[sender] = true
            if(!userData[sender]) userData[sender] = { nama: msg.pushName || "User", level: 1, exp: 0 }
            await conn.sendMessage(jid, { text: "✅ Kamu sudah terverifikasi!" })
            return
        }

        if(!verifiedUsers[sender]) {
            await conn.sendMessage(jid, { text: "⚠️ Ketik .verify untuk bisa menggunakan bot." })
            return
        }

        // MENU
        if(text === ".menu") {
            let nama = msg.pushName || "User"
            let menu = `...` // copy menu dari script-mu
            await conn.sendMessage(jid, { text: menu })
            return
        }

        // ME
        if(text === ".me") {
            let profile = userData[sender]
            let meMsg = `
╭─「 USER PROFILE 」  
│ • Nama : ${profile.nama}  
│ • Level: ${profile.level}  
│ • Exp  : ${profile.exp}  
╰────────────────
            `
            await conn.sendMessage(jid, { text: meMsg })
            return
        }

    })
}

// Jalankan bot hanya jika memasukkan kode pairing
startBot("YOUR_SECRET_CODE")
