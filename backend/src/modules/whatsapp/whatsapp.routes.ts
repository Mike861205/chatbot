import { Router } from "express";
import { handleVerify, handleWebhook } from "./whatsapp.controller";

const router = Router();

// Meta webhook verification
router.get("/webhook", handleVerify);

// Incoming messages from Meta
router.post("/webhook", handleWebhook);

export default router;
