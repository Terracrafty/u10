import { Router, json, Request, Response, response } from "express";
import { prisma } from "../prisma";
import { createHash, randomBytes, UUID } from "node:crypto";
import { handleHttpError, HttpError } from "../httpError";
import { isEmail } from "validator";
import jwt from "jsonwebtoken";
import { load } from "ts-dotenv";
import { LoginResponse } from "../../../../types";
import { connect } from "node:http2";

const env = load({
    JWT_SECRET:String
})

const userRouter = Router();

export const publicUserSelects = {
    createdAt: true,
    name: true,
    profile: true,
    followedBy: { select: {
        id: true,
        name: true,
    }},
    posts: true,
}

export const privateUserSelects = {
    createdAt: true,
    name: true,
    email: true,
    isAdmin: true,
    profile: true,
    blockedUsers: { select: {
        id: true,
        name: true,
    }},
    followedBy: { select: {
        id: true,
        name: true,
    }},
    following: { select: {
        id: true,
        name: true,
    }},
    followedTags: true,
    blockedTags: true,
    feed: true,
    posts: true,
    messageHistories: true
}

function hashAndSaltPassword(password:string) {
    const salt = randomBytes(128).toString("hex");
    const hashedPassword = createHash("sha256").update(password + salt).digest("hex");
    return {
        hashedPassword: hashedPassword,
        salt: salt
    };
}

export async function createUser(name:string, email:string, password:string) {
    const hash = hashAndSaltPassword(password);
    if (!isEmail(email)) {
        throw new HttpError(400, "Invalid email");
    }
    await prisma.user.create({
        data: {
            name: name,
            email: email,
            password: hash.hashedPassword,
            salt: hash.salt,
        }
    });
}

userRouter.post("/", json(), async (req:Request, res:Response) => {
    try {
        const {name, email, password} = req.body;
        await createUser(name, email, password);
        res.status(201).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function login(email:string, password:string):Promise<LoginResponse> {
    const user = await prisma.user.findUniqueOrThrow({
        where: { email: email }
    });
    if (user.password == createHash("sha256").update(password + user.salt).digest("hex")) {
        const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: "8h"})
        return {
            id: user.id,
            token: token
        };
    } else {
        throw new HttpError(400, "Incorrect credentials");
    }
}

userRouter.post("/login", json(), async (req:Request, res:Response) => {
    try {
        const {email, password} = req.body;
        const token = await login(email, password);
        res.status(200).json({ token: token }).end();
    } catch (e) {
        if ((e as Error).name == "PrismaClientKnownRequestError") {
            res.status(400).json({ error: "Incorrect credentials" }).end();
        } else {
            handleHttpError(e, res);
        }
    }
});

export async function auth(userId:string, token:string, admin:boolean = false) {
    const user = await prisma.user.findUniqueOrThrow({
        where: { id:userId }
    });
    if (admin && (!user.isAdmin)) {
        throw new HttpError(403, "Requires admin privileges");
    }
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (user.id != decoded.sub) {
        throw new HttpError(403, "Not authorized");
    }
}

export function getTokenFromHeader(req:Request) {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
        throw new HttpError(401, "Authorization required");
    }
    return token;
}

export async function getUserProfilePublic(userId:string) {
    const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: publicUserSelects
    });
    return JSON.stringify(user);
}

userRouter.get("/:id", async (req:Request, res:Response) => {
    try {
        const user = await getUserProfilePublic(req.params.id);
        res.status(200).json(user).end();
    } catch (e) {
        handleHttpError(e, res)
    }
});

export async function getUserProfilePrivate(userId:string, token:string) {
    await auth(userId, token);
    const user = await prisma.user.findUniqueOrThrow({
        where: { id:userId },
        select: privateUserSelects
    });
    return JSON.stringify(user);
}

userRouter.post("/:id", async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        const user = await getUserProfilePrivate(req.params.id, token);
        res.status(200).json(user).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function searchUser(nameContains:string) {
    return await prisma.user.findMany({
        where: {
            name: {
                contains: nameContains,
                mode: "insensitive"
            }
        },
        select: publicUserSelects
    })
}

userRouter.get("/search", json(), async (req:Request, res:Response) => {
    try {
        const result = await searchUser(req.body.searchString);
        res.status(200).json(result).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function updateUserProfile(userId:string, token:string, name?:string, email?:string, password?:string, profile?:string) {
    await auth(userId, token);
    let hash;
    if (password) {
        hash = hashAndSaltPassword(password);
    }
    if (email && (!isEmail(email))) {
        throw new HttpError(400, "Invalid email");
    }
    await prisma.user.update({
        where: { id: userId },
        data: {
            name: name,
            email: email,
            password: hash?.hashedPassword,
            salt: hash?.salt,
            profile: profile,
        }
    });
}

userRouter.patch("/:id", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        const {name, email, password, profile} = req.body;
        await updateUserProfile(req.params.id, token, name, email, password, profile);
        res.status(200).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function follow(userId:string, token:string, targetId:string) {
    await auth(userId, token);
    await prisma.user.update({
        where: { id: userId },
        data: {
            following: {
                connect: { id: targetId }
            }
        }
    });
}

userRouter.post("/:id/follow", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await follow(req.params.id, token, req.body.targetId);
        res.status(200).end;
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function unfollow(userId:string, token:string, targetId:string) {
    await auth(userId, token);
    await prisma.user.update({
        where: { id: userId },
        data: {
            following: {
                disconnect: { id: targetId }
            }
        }
    });
}

userRouter.post("/:id/unfollow", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await unfollow(req.params.id, token, req.body.targetId);
        res.status(200).end;
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function block(userId:string, token:string, targetId:string) {
    await auth(userId, token);
    await prisma.user.update({
        where: { id: userId },
        data: {
            blockedUsers: {
                connect: { id: targetId }
            }
        }
    });
}

userRouter.post("/:id/block", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await block(req.params.id, token, req.body.targetId);
        res.status(200).end;
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function unblock(userId:string, token:string, targetId:string) {
    await auth(userId, token);
    await prisma.user.update({
        where: { id: userId },
        data: {
            blockedUsers: {
                disconnect: { id: targetId }
            }
        }
    });
}

userRouter.post("/:id/unblock", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await unblock(req.params.id, token, req.body.targetId);
        res.status(200).end;
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function nuclearBlock(userId:string, token:string, targetId:string) {
    await auth(userId, token);
    const target = await prisma.user.update({
        where: { id: targetId },
        data: {
            blockedBy: {
                connect: { id: userId }
            }
        },
        select: {
            followedBy: true
        }
    });
    target.followedBy.forEach(async (user) => {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                blockedBy: {
                    connect: { id: userId }
                }
            }
        })
    });
}

userRouter.post("/:id/nukeblock", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await nuclearBlock(req.params.id, token, req.body.targetId);
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function deleteUser(userId:string, token:string) {
    await auth(userId, token);
    await prisma.user.delete({
        where: { id: userId }
    });
}

userRouter.delete("/:id", async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        deleteUser(req.params.id, token);
        res.status(204).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export {userRouter};