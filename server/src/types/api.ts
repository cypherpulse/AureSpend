import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+254|254|0)?7\d{8}$/, "Invalid Kenyan phone number");

export const onrampChargeSchema = z.object({
  amountKES: z.coerce.number().positive(),
  email: z.string().email(),
  phone: phoneSchema,
  userStacksAddress: z.string().min(10)
});

export const offrampSubmitSchema = z.object({
  txid: z.string().min(8),
  senderAddress: z.string().min(10),
  expectedAmountUSDCx: z.coerce.number().positive(),
  userPhone: phoneSchema,
  orderId: z.string().min(6).optional()
});

export const mpesaCallbackSchema = z.object({
  Body: z
    .object({
      stkCallback: z.object({
        CheckoutRequestID: z.string(),
        ResultCode: z.number(),
        ResultDesc: z.string(),
        CallbackMetadata: z
          .object({
            Item: z.array(
              z.object({
                Name: z.string(),
                Value: z.union([z.string(), z.number()]).optional()
              })
            )
          })
          .optional()
      })
    })
    .passthrough()
});
