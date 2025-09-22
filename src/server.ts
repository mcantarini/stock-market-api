import "dotenv/config";
import express from "express";
import { healthRouter } from "./api/health/health.routes";
import { instrumentsRouter } from "./api/instruments/instruments.routes";
import { ordersRouter } from "./api/orders/orders.routes";
import { userRouter } from "./api/users/users.routes";

const app = express();
app.use(express.json());
app.use("/health", healthRouter);
app.use("/instruments", instrumentsRouter);
app.use("/orders", ordersRouter);
app.use("/users", userRouter);

// start server
const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => console.log(`API http://localhost:${port}`));
