const validate = (validator) => {
    return (req, res, next) => {
        const valid = validator(req.body);

        if (!valid) {
            return res.status(400).json({
                message: "입력값이 올바르지 않습니다.",
                errors: validator.errors,
            });
        }

        next();
    };
};

export default validate;