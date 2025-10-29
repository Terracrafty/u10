import express, { Router } from "express";
import { load } from "ts-dotenv";
import { userRouter } from "./controllers/User";
import { postRouter } from "./controllers/post";

const env = load({
    PORT:Number,
});

const mainRouter = Router();
mainRouter.use("/users", userRouter);
mainRouter.use("/posts", postRouter);

const app = express();
app.use("/api", mainRouter);

async function main() {
    app.listen(env.PORT, () => {
        console.log(`Server listening on port ${env.PORT}`);
    });
};

main().catch(err => console.log(err));