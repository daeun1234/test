const crypto = require('crypto');
const User = require("./models/User");

const encryptPassword = (password) => {
    return crypto.createHash('sha512').update(password).digest('base64');
}

const setAuth = async (req, res, next) => {
    const authorization = req.cookies.authorization;
    const [bearer, key] = authorization.split(' ');
    if (bearer !== 'Bearer') {
        return res.redirect('/login');
    } else {
        const user = await User.findOne({ key });
        if (!user) {
            return res.redirect('/login');
        } else {
            req.user = user;
            return next();
        }
    }
}
module.exports = {
    encryptPassword,
    setAuth,
}