const express = require('express');
const router = express.Router();
const twilio = require('twilio');
// const path = require('path');
const multer = require('multer');

require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: async function (req, file, cb) {
        // await cb(null, file.originalname path.extname(file.originalname));
        await cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });


let messages = [];

router.get('/', function(req, res, next) {
    if (req.isAuthenticated()) {
        res.render('sms', { page: 'sms', user: req.user, messages: messages });
    } else {
        res.redirect('/auth');
    }
});

router.post('/send-sms', upload.single('file'), async (req, res) => {
    const {to, body} = req.body;
    // const mediaUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;
    const mediaUrl = req.file ? [`https://big-cat-plainly.ngrok-free.app/uploads/${req.file.originalname}`] : null;

    // console.log(req.file);
    // console.log(mediaUrl);
    const messageOptions = {
        body: body,
        from: twilioPhoneNumber,
        to: to
    };

    if (mediaUrl) {
        messageOptions.mediaUrl = [mediaUrl];
    }

    // console.log(messageOptions);


    await client.messages
        .create(messageOptions)
        .then(message => {
            messages.push({
                sid: message.sid,
                body: message.body,
                from: message.from,
                to: message.to,
                direction: 'outbound',
                mediaUrl: mediaUrl
            });
            res.redirect('/sms');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error sending message');
        });
});

router.post('/receive-sms', (req, res) => {

    // console.log('inbound message coming!');

    const { Body, From, MediaUrl } = req.body;

    console.log(Body);
    console.log(From);

    messages.push({
        body: Body,
        from: From,
        to: twilioPhoneNumber,
        direction: 'inbound',
        mediaUrl: MediaUrl
    });

    const twiml = new twilio.twiml.MessagingResponse();
    res.type('text/xml').send(twiml.toString());
});

module.exports = router;

