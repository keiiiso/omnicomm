const express = require('express');
const router = express.Router();
const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let messages = [];

router.get('/', function(req, res, next) {
    if (req.isAuthenticated()) {
        res.render('sms', { page: 'sms', user: req.user, messages: messages });
    } else {
        res.redirect('/auth');
    }
});

router.post('/send-sms', (req, res) => {
    const { to, body } = req.body;

    client.messages
        .create({
            body: body,
            from: twilioPhoneNumber,
            to: to
        })
        .then(message => {
            messages.push({
                sid: message.sid,
                body: message.body,
                from: message.from,
                to: message.to,
                direction: 'outbound'
            });
            res.redirect('/');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error sending message');
        });
});

router.post('/receive-sms', (req, res) => {

    console.log('inbound message coming!');

    const { Body, From } = req.body;

    messages.push({
        body: Body,
        from: From,
        to: twilioPhoneNumber,
        direction: 'inbound'
    });

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Message received');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
});

module.exports = router;

