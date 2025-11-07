import { Router, json, Request, Response, response, urlencoded } from "express";
import { prisma } from "../prisma";
import { createHash, randomBytes, UUID } from "node:crypto";
import { handleHttpError, HttpError } from "../httpError";
import { isEmail } from "validator";
import jwt from "jsonwebtoken";
import { load } from "ts-dotenv";
import { LoginResponse } from "../../../../types";
import { defaultPostSelects } from "./post";
import moment from "moment";

const env = load({
    JWT_SECRET:String
})

const userRouter = Router();

export const publicUserSelects = {
    createdAt: true,
    name: true,
    isBanned: true,
    profile: true,
    followedBy: { select: {
        id: true,
        name: true,
    }},
    posts: { select: defaultPostSelects },
}

export const privateUserSelects = {
    createdAt: true,
    name: true,
    email: true,
    isAdmin: true,
    isBanned: true,
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
    followedTags: { select: { name: true } },
    blockedTags: { select: { name: true } },
    feed: {
        select: defaultPostSelects, 
        where: { createdAt: { gt: moment().subtract(30, "days").format("YYYY-MM-DD")}}
    },
    posts: { select: defaultPostSelects },
    messageHistories: false
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
        const loginResponse = await login(email, password);
        res.status(200).json(loginResponse).end();
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

userRouter.get("/:userid", async (req:Request, res:Response) => {
    try {
        const user = await getUserProfilePublic(req.params.userid);
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

userRouter.post("/:userid", async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        const user = await getUserProfilePrivate(req.params.userid, token);
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
            },
            isBanned: {equals: false}
        },
        select: publicUserSelects
    })
}

userRouter.get("/search", async (req:Request, res:Response) => {
    try {
        const nameContains = (req.query.nameContains) as string;
        const result = await searchUser(nameContains);
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

userRouter.patch("/:userid", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        const {name, email, password, profile} = req.body;
        await updateUserProfile(req.params.userid, token, name, email, password, profile);
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

userRouter.post("/:userid/follow", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await follow(req.params.userid, token, req.body.targetId);
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

userRouter.post("/:userid/unfollow", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await unfollow(req.params.userid, token, req.body.targetId);
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

userRouter.post("/:userid/block", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await block(req.params.userid, token, req.body.targetId);
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

userRouter.post("/:userid/unblock", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await unblock(req.params.userid, token, req.body.targetId);
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

userRouter.post("/:userid/nukeblock", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await nuclearBlock(req.params.userid, token, req.body.targetId);
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

userRouter.delete("/:userid", async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        deleteUser(req.params.userid, token);
        res.status(204).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function banUser(userId:string, token:string, targetId:string) {
    auth(userId, token, true);
    await prisma.user.update({
        where: {id: targetId},
        data: {isBanned: true}
    })
}

userRouter.post("/:userid/ban", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await banUser(req.body.userId, token, req.params.userid);
        res.status(200).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function unbanUser(userId:string, token:string, targetId:string) {
    auth(userId, token, true);
    await prisma.user.update({
        where: {id: targetId},
        data: {isBanned: false}
    })
}

userRouter.post("/:userid/unban", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await banUser(req.body.userId, token, req.params.userid);
        res.status(200).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function checkIfUserBanned(userId:string) {
    const user = await prisma.user.findUniqueOrThrow({where: {id: userId}});
    return user.isBanned;
}

export {userRouter};