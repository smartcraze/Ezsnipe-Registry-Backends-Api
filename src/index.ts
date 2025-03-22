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

app.get("/", (req, res) => {
  res.send("Hello World! from vercel");
});

app.listen(3000,()=>{console.log("server is running on 3000")});
// export default app;
