import mongoose from "mongoose"

const logSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
        },

        username: {
            type: String,
            required: true,
        },

        nickname: {
            type: String,
            required: true,
        },

        content: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
)

const Log = mongoose.model("Log", logSchema)

export default Log