export function apiMiddleware(req, res, next) {
    res.$success = (message) => {
        res.json({
            status: 'ok',
            message: message || 'Successfully processed your request'
        });
    };



    res.$serverError = (message) => {
        res.status(500);
        res.json({
            error: 'INTERNAL_SERVER_ERROR',
            message: message || 'Server Error. Sorry, couldn\'t handle the request'
        });
    }

    res.$apiBadRequest = (message) => {
        res.status(400);
        res.json({
            error: 'BAD_REQUEST',
            message: message || 'Bad Request'
        });
    };

    res.$apiNotFound = (message) => {
        res.status(404);
        res.json({
            error: 'NOT_FOUND',
            message: message || 'The resource was not found'
        });
    };
    next();
}