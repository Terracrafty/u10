import express, { Router } from "express";
import cors from "cors";
import { load } from "ts-dotenv";
import { userRouter } from "./controllers/user";
import { postRouter } from "./controllers/post";

const env = load({
    PORT:Number,
    CORS_ORIGINS:String,
});


const mainRouter = Router();
mainRouter.use("/users", userRouter);
mainRouter.use("/posts", postRouter);

const app = express();
app.use(cors({
    origin: env.CORS_ORIGINS.split(" ")
}));
app.use("/api", mainRouter);

async function main() {
    app.listen(env.PORT, () => {
        console.log(`Server listening on port ${env.PORT}`);
    });
};

main().catch(err => console.log(err));