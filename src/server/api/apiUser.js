
module.exports = {
    login(req, res) {
        var credentials = req.body;
        if (credentials.login === 'test' && credentials.password === 'test123') {
            req.session.userLogin = credentials.login;
            res.json({message: 'ok'});
        } else {
            res.status(401);
            res.json({error: 'Invalid login or password'});
        }
    },

    logout(req, res) {
        req.session.destroy();
        res.redirect('/');
    }
};
