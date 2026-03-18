import { Router } from "express";
import { env } from "../config/env.js";
import { onrampChargeSchema, offrampSubmitSchema, mpesaCallbackSchema } from "../types/api.js";
import { orderService } from "../services/order.service.js";
import { orderRepository } from "../repositories/order.repository.js";
import { settlementQueue } from "../services/queue.js";
import { HttpError } from "../middleware/error-handler.js";

function callbackMetadataValue(items: Array<{ Name: string; Value?: string | number }>, key: string) {
  const found = items.find((i) => i.Name === key);
  return found?.Value;
}

export const apiRouter = Router();

apiRouter.get("/rate", (_req, res) => {
  res.json({ kesPerUSDCx: env.KES_PER_USDCX });
});

apiRouter.get("/server-address", (_req, res) => {
  res.json({ serverStacksAddress: env.SERVER_STACKS_ADDRESS });
});

apiRouter.post("/onramp/charge", async (req, res, next) => {
  try {
    const payload = onrampChargeSchema.parse(req.body);
    const created = await orderService.createOnrampOrder(payload);

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/onramp/verify/:orderId", async (req, res, next) => {
  try {
    const result = await orderService.verifyOnramp(req.params.orderId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/offramp/submit-tx", async (req, res, next) => {
  try {
    const payload = offrampSubmitSchema.parse(req.body);
    const result = await orderService.submitOfframpTx(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/orders/:orderId", async (req, res, next) => {
  try {
    const order = await orderService.getOrder(req.params.orderId);
    res.json(order);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/mpesa/callback", async (req, res, next) => {
  try {
    const callback = mpesaCallbackSchema.parse(req.body);
    const body = callback.Body.stkCallback;

    const order = await orderRepository.findByMpesaCheckoutRequestId(body.CheckoutRequestID);
    if (!order) throw new HttpError(404, "Order not found for CheckoutRequestID");

    if (body.ResultCode !== 0) {
      await orderRepository.updateStatus(order.orderId, "failed", undefined, `STK failed: ${body.ResultDesc}`);
      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
      return;
    }

    const metadata = body.CallbackMetadata?.Item ?? [];
    const mpesaReceiptNumber = callbackMetadataValue(metadata, "MpesaReceiptNumber");

    await orderRepository.updateStatus(
      order.orderId,
      "payment_received",
      {
        mpesaReceiptNumber: typeof mpesaReceiptNumber === "string" ? mpesaReceiptNumber : undefined
      },
      "M-PESA payment confirmed"
    );

    await settlementQueue.enqueueOnrampRelease(order.orderId);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/mpesa/b2c/result", async (req, res, next) => {
  try {
    const result = req.body as {
      Result?: {
        OriginatorConversationID?: string;
        ResultCode?: number;
        ResultDesc?: string;
      };
    };

    console.log("B2C callback received", {
      correlation: result?.Result?.OriginatorConversationID,
      code: result?.Result?.ResultCode,
      description: result?.Result?.ResultDesc
    });

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/mpesa/b2c/timeout", async (_req, res) => {
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});
