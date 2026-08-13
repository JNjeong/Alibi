import Ajv from "ajv";

const ajv = new Ajv();

const signupSchema = {
    type: "object",
    properties: {
        username: {
            type: "string",
            minLength: 4,
            maxLength: 20,
        },
        password: {
            type: "string",
            minLength: 8,
        },
        confirmPassword: {
            type: "string",
            minLength: 8,
        },
        nickname: {
            type: "string",
            minLength: 2,
            maxLength: 20,
        },
    },
    required: [
        "username",
        "password",
        "confirmPassword",
        "nickname",
    ],
    additionalProperties: false,
};

const loginSchema = {
    type: "object",
    properties: {
        username: {
            type: "string",
        },
        password: {
            type: "string",
        },
    },
    required: [
        "username",
        "password",
    ],
    additionalProperties: false,
};

export const validateSignup = ajv.compile(signupSchema);
export const validateLogin = ajv.compile(loginSchema);