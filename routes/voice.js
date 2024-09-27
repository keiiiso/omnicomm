const express = require('express');
const router = express.Router();
const twilio = require('twilio');

const VoiceResponse = require("twilio").twiml.VoiceResponse;
const AccessToken = require("twilio").jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

var identity;

router.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('voice', {page: 'voice', user: req.user});
    } else {
        res.redirect('/auth');
    }
})

// Handle outgoing voice calls
/*router.post('/', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.dial({
        callerId: twilioPhoneNumber
    }, req.body.number);
    res.type('text/xml');
    res.send(twiml.toString());
});*/

router.get("/token", (req, res) => {
    res.send(tokenGenerator());
});

router.post("/incoming", (req, res) => {
    res.set("Content-Type", "text/xml");
    res.send(voiceResponse(req.body));
});

function tokenGenerator() {
    console.log('Generating token...');
    identity = 'user_' + Math.random().toString(36).substring(2, 15);

    const accessToken = new AccessToken(
        accountSid,
        apiKey,
        apiSecret,
        {identity: identity}
    );

    // accessToken.identity = identity;
    const grant = new VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: true,
    });
    accessToken.addGrant(grant);

    // console.log('identity', accessToken.identity);
    // console.log('token', accessToken.toJwt());

    return {
        identity: identity,
        token: accessToken.toJwt(),
    };
}

// Handle incoming voice calls
function voiceResponse(requestBody) {
    const toNumber = requestBody.To;
    const callerId = twilioPhoneNumber;
    let twiml = new VoiceResponse();

    if (requestBody.To) {
        // This is an outgoing call

        // set the callerId
        let dial = twiml.dial({callerId});
        dial.number({}, toNumber);
    } else {
        let dial = twiml.dial();

        // This will connect the inbound call with your Twilio.Device/client
        dial.client(identity);
    }

    return twiml.toString();
}

module.exports = router;
