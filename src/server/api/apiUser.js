const AUTH_TOKEN_COOKIE_NAME = 'authToken';


module.exports = {
    login(req, res) {
        var credentials = req.body;
        if (credentials.login === 'test' && credentials.password === 'test123') {
            res.cookie(AUTH_TOKEN_COOKIE_NAME, 'supersecret', {maxAge: 900000000});
            res.json({message: 'ok'});
        } else {
            res.status(401);
            res.json({error: 'Invalid login or password'});
        }
    },

    logout(req, res) {
        res.clearCookie(AUTH_TOKEN_COOKIE_NAME);
        res.redirect('/');
    }
};
