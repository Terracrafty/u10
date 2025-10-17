import express from "express";
import { load } from "ts-dotenv";

const env = load({
    PORT:Number,
});

const app = express();

async function main() {
    app.listen(env.PORT, () => {
        console.log(`Server listening on port ${env.PORT}`);
    });
};

main().catch(err => console.log(err));