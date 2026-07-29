//middlewares/validate.js
module.exports = schema => (req, res, next) => {
    const locations = ['body', 'params', 'query'];

    for (const location of locations) {
        if (schema[location]) {
            const { error, value } = schema[location].validate(req[location], {
                abortEarly: false
            });

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(d => d.message)
                });
            }

            req[location] = value;
        }
    }

    next();
};