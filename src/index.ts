import express from "express";
import { componentsRouter } from "./components";
import { userRouter } from "./user";
import dotenv from "dotenv";

dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.use("/components", componentsRouter);
app.use("/user", userRouter);

export { app };
