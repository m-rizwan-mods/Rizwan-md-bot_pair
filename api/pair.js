import express from 'express';
import { default: makeWASocket, useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import fs from 'fs';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.post('/code', async (req, res) => {
    try {
        let { number } = req.body;
        if(!number) return res.status(400).json({error: 'Number do bhai'});
        number = number.replace(/[^0-9]/g, '');
        const id = "rizwan_"+number;
        const { state, saveCreds } = await useMultiFileAuthState(`temp/${id}`);
        
        const sock = makeWASocket({ auth: state, logger: pino({level: 'silent'}), browser: ["RIZWAN-MDX", "Chrome", "1.0.0"] });
        sock.ev.on('creds.update', saveCreds);

        if (!sock.authState.creds.registered) {
            await delay(1500);
            const code = await sock.requestPairingCode(number);
            return res.json({ code: code?.match(/.{1,4}/g)?.join("-") || code });
        }

        const creds = fs.readFileSync(`temp/${id}/creds.json`);
        const SESSION_ID = Buffer.from(creds).toString('base64');
        sock.ws.close();
        fs.rmSync(`temp/${id}`, { recursive: true, force: true });
        return res.json({ session: SESSION_ID });
    } catch(e) {
        return res.status(500).json({error: e.message});
    }
});

export default app;
