const express = require('express');
const router = express.Router();

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const multer = require('multer');
const upload = multer({dest: 'uploads/'})

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.readonly'
];
// const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/* GET 10 most recent messages. */
router.get('/', ensureAuthenticated, async function (req, res, next) {
    try {
        // Run the authorization and listMessages every time the route is accessed
        // console.log(req.user);
        // console.log(req.session);
        const tokenPath = getTokenPath(req.user.username);
        const auth = await authorize(tokenPath);  // Ensure authorization is done
        const messages = await listMessages(auth);  // Fetch messages
        // res.json(messages);  // Send the array as a JSON response
        res.render('email', {page: 'email', messages: messages});
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred');
    }
});

router.get('/compose', ensureAuthenticated, async function (req, res, next) {
    try {
        res.render('compose-email', {page: 'email'});
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred');
    }
});

router.post('/compose', ensureAuthenticated, upload.single('file'), async function (req, res, next) {
    try {
        const tokenPath = getTokenPath(req.user.username);
        const auth = await authorize(tokenPath);

        console.log(req.file);


        const message = req.body;

        const gmail = google.gmail({version: 'v1', auth});

        let email = [];

        if (req.file) {
            email = [
                `From: ${req.user.email}`,
                `To: ${message.recipient}`,
                `Subject: ${message.subject}`,
                'MIME-Version: 1.0',
                'Content-Type: multipart/mixed; boundary="boundary"',
                '',
                '--boundary',
                'Content-Type: text/plain; charset="UTF-8"',
                'Content-Transfer-Encoding: 7bit',
                '',
                `${message.body}`,
                '',
                '--boundary',
                `Content-Type: ${req.file.mimetype}; name="${req.file.originalname}"`,
                'Content-Transfer-Encoding: base64',
                `Content-Disposition: attachment; filename="${req.file.originalname}"`,
                '',
                await getBase64Data(`./uploads/${req.file.filename}`),  // Replace with your file path
                '',
                '--boundary--',
            ].join('\n');

        } else {
            email = [
                `From: ${req.user.email}`,
                `To: ${message.recipient}`,
                `Subject: ${message.subject}`,
                '',
                `${message.body}`,
            ].join('\n');
        }

        const base64EncodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'); // Encode the email

        const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: base64EncodedEmail,
            },
        });

        console.log('Email sent:', result.data);

        res.redirect('/mail');

    } catch (err) {
        console.error(err);
        return res.redirect('/mail');
    }


});

router.get('/download/:messageId/:attachmentId/:filename', ensureAuthenticated, async (req, res) => {
    const { messageId, attachmentId, filename } = req.params;
    const tokenPath = getTokenPath(req.user.username);
    const auth = await authorize(tokenPath);  // Ensure authorization is done

    try {
        // Fetch attachment using the getAttachment function
        const attachmentBuffer = await getAttachment(auth, messageId, attachmentId);

        // Set appropriate headers for the download
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Send the attachment data as response
        res.send(attachmentBuffer);
    } catch (err) {
        console.error('Failed to download attachment:', err);
        res.status(500).send('Failed to download attachment');
    }
});

async function getBase64Data(filePath) {
    const fileData = await fs.readFile(filePath);
    return fileData.toString('base64');
}

/**
 * Lists the 5 most recent messages in the user's account.
 *
 * @param {OAuth2Client|OAuth2Client} auth An authorized OAuth2 client.
 */
async function listMessages(auth) {
    let messages = [];

    const gmail = google.gmail({version: 'v1', auth});
    const res = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 5,
        labelIds: ['CATEGORY_PERSONAL', 'UNREAD']
    });

    const list = res.data.messages;

    if (!list || list.length === 0) {
        console.log('No messages found.');
        return;
    }

    for (const message of list) {
        const {data} = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
        });

        let body;
        let attachment;

        if (data.payload.mimeType.includes('text')) {
            body = Buffer.from(data.payload.body.data, 'base64').toString('utf-8');
        } else if (data.payload.mimeType.includes('multipart')) {

            // console.log(data.payload.parts[0].parts[0]);

            if (data.payload.parts.length === 1) {
                body = Buffer.from(data.payload.parts[0].body.data, 'base64').toString('utf-8');
            } else if (!data.payload.parts[1].mimeType.includes('text')) { // has attachment

                if (data.payload.parts[0].parts) {
                    body = Buffer.from(data.payload.parts[0].parts[0].body.data, 'base64').toString('utf-8');
                } else {
                    body = Buffer.from(data.payload.parts[0].body.data, 'base64').toString('utf-8');
                }

                const attachmentId = data.payload.parts[1].body.attachmentId;
                const filename = data.payload.parts[1].filename;

                // console.log(file);

                attachment = {
                    filename: filename,
                    attachmentId: attachmentId,
                    messageId: data.id,
                };

                // console.log(attachment);

            } else {
                body = Buffer.from(data.payload.parts[1].body.data, 'base64').toString('utf-8');
            }
        } else {
            body = Buffer.from(data.payload.parts[1].body.data, 'base64').toString('utf-8');
        }

        // console.log(body);

        const mes = {
            sender: data.payload.headers.filter(header => header.name === 'From')[0].value,
            subject: data.payload.headers.filter(header => header.name === 'Subject')[0].value,
            body: body,
            attachment: attachment,
            date: new Date(Number(data.internalDate)).toDateString()
        }

        messages.push(mes);
        // console.log(mes);
    }

    return messages;

}

async function getAttachment(auth, messageId, attachmentId) {
    const gmail = google.gmail({version: 'v1', auth});

    const result = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId,
        auth: auth,
    });

    return result.data.data;
    // return Buffer.from(attachmentData, 'base64');
}

function getTokenPath(username) {
    return path.join(process.cwd(), `/tokens/${username}_token.json`);
}

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist(tokenPath) {
    try {
        const content = await fs.readFile(tokenPath);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @param {String} tokenPath
 * @return {Promise<void>}
 */
async function saveCredentials(client, tokenPath) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;

    // console.log(key);
    // console.log(client);

    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        access_token: client.credentials.access_token,
        refresh_token: client.credentials.refresh_token,
        expiry_date: client.credentials.expiry_date
    });
    await fs.writeFile(tokenPath, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize(tokenPath) {
    let client = await loadSavedCredentialsIfExist(tokenPath);
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client, tokenPath);
    }

    return client;
}

async function loadUserToken(tokenPath) {
    try {
        const content = await fs.readFile(tokenPath);
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading token: ${tokenPath}:`, error);
        return null; // Return null if there's an error reading the file
    }
}

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth');
}

module.exports = router;
