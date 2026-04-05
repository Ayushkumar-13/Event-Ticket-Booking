const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        error = new ApiError(
            err.statusCode || 500,
            err.message || 'Something went wrong'
        );
    }

    res.status(error.statusCode).json({
        success: false,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
