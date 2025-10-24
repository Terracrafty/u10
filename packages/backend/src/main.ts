import express, { Router } from "express";
import { load } from "ts-dotenv";
import { userRouter } from "./controllers/User";

const env = load({
    PORT:Number,
});

const mainRouter = Router();
mainRouter.use("/users", userRouter);

const app = express();
app.use("/api", mainRouter);

async function main() {
    app.listen(env.PORT, () => {
        console.log(`Server listening on port ${env.PORT}`);
    });
};

main().catch(err => console.log(err));