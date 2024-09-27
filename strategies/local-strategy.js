const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const users = require("../users");

passport.serializeUser((user, done) => {
    done(null, user.username);
});

passport.deserializeUser( (username, done) => {
    try {
        const findUser = users.find((user) => user.username === username);
        if (!findUser) throw new Error("User not found");
        done(null, findUser);
    } catch (err) {
        done(err, null);
    }
});

passport.use(
    new LocalStrategy( (username, password, done) => {
        try {
            // console.log(username, password);
            const findUser = users.find((user) => user.username === username);
            if (!findUser) throw new Error("User not found");
            if (findUser.password !== password) throw new Error("Wrong password");
            done(null, findUser);
        } catch (err) {
            done(err, null);
        }
    })
);

module.exports = passport;