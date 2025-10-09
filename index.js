// index.js
import baileys from "@whiskeysockets/baileys"
import P from "pino"
import { Boom } from "@hapi/boom"
import readline from "readline"
import qrcode from "qrcode-terminal"

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeInMemoryStore
} = baileys

async function start() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const { version } = await fetchLatestBaileysVersion()

    const conn = makeWASocket({
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      auth: state,
      version,
      browser: ['DizBot1', 'Chrome', '1.0.0']
    })

    const store = makeInMemoryStore({ logger: P({ level: 'silent' }) })
    store.bind(conn.ev)

    conn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, pairingCode } = update

      if (pairingCode) {
        console.log(`🔗 Pairing Code: ${pairingCode}`)
        console.log('Masukkan kode ini di WhatsApp > Perangkat tertaut > Tautkan dengan kode')
      } else if (qr) {
        qrcode.generate(qr, { small: true })
      }

      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error).output?.statusCode
        if (reason !== DisconnectReason.loggedOut) {
          console.log('Reconnect...')
          start()
        } else {
          console.log('Logged out, hapus folder auth_info dan pairing ulang.')
        }
      } else if (connection === 'open') {
        console.log('✅ DizBot1 connected via Pairing Code!')
      }
    })

    conn.ev.on('creds.update', saveCreds)

    // fitur .brat
    const bratTexts = [
      '💢 Kamu tuh ngeselin banget, tapi aku suka 😤',
      '🙄 Dasar si brat, ganggu terus!',
      '😾 Brat detected, siap-siap digigit!',
      '😤 Kamu pikir kamu lucu, hah brat?',
      '😒 Brat mode on, dunia siap berantakan~'
    ]

    conn.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0]
      if (!msg.message || msg.key.fromMe) return
      const from = msg.key.remoteJid
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        ''

      if (!text.startsWith('.')) return
      const command = text.slice(1).trim().toLowerCase()

      if (command === 'brat') {
        const reply = bratTexts[Math.floor(Math.random() * bratTexts.length)]
        await conn.sendMessage(from, { text: reply }, { quoted: msg })
      }
    })
  } catch (err) {
    console.error('Start failed:', err)
  }
}

start()
