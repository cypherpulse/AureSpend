import { Queue, Worker, QueueEvents } from "bullmq";
import { env } from "../config/env.js";
import { redis } from "./redis.js";
import { orderRepository } from "../repositories/order.repository.js";
import { stacksService } from "./stacks.service.js";
import { darajaService } from "./daraja.service.js";

const queueName = "settlement";

export const settlementQueueInstance = new Queue(queueName, {
  connection: redis,
  prefix: env.QUEUE_PREFIX,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 3000
    },
    removeOnComplete: 500,
    removeOnFail: 1000
  }
});

const queueEvents = new QueueEvents(queueName, { connection: redis, prefix: env.QUEUE_PREFIX });
queueEvents.on("failed", async ({ jobId, failedReason }) => {
  if (!jobId) return;
  await orderRepository.appendLog(jobId, `Queue job failed: ${failedReason}`);
});

let workerStarted = false;

async function processOnrampRelease(orderId: string) {
  const order = await orderRepository.findByOrderId(orderId);
  if (!order || order.type !== "onramp") return;
  if (order.status !== "payment_received") return;
  if (!order.userStacksAddress) throw new Error("Missing userStacksAddress");

  const tx = await stacksService.sendFromVault({
    recipient: order.userStacksAddress,
    amountUSDCx: order.amountUSDCx,
    payoutId: order.orderId
  });

  await orderRepository.updateStatus(
    orderId,
    "completed",
    { serverTxHash: tx.txid },
    `USDCx sent to user (${tx.txid})`
  );
}

async function processOfframpSettlement(orderId: string) {
  const order = await orderRepository.findByOrderId(orderId);
  if (!order || order.type !== "offramp") return;
  if (!order.txid || !order.senderAddress || !order.userPhone) {
    throw new Error("Missing offramp fields");
  }

  const verified = await stacksService.verifyOfframpTx({
    txid: order.txid,
    senderAddress: order.senderAddress,
    expectedAmountUSDCx: order.amountUSDCx
  });

  if (!verified.valid) {
    await orderRepository.updateStatus(orderId, "failed", undefined, "Offramp tx verification failed");
    return;
  }

  const payout = await darajaService.b2cPayout({
    amountKES: order.amountKES,
    phone: order.userPhone,
    remarks: `Aurespend offramp ${order.orderId}`,
    occasion: "Aurespend Offramp"
  });

  await orderRepository.updateStatus(orderId, "fiat_sent", undefined, `Daraja B2C queued (${payout.conversationId})`);

  if (env.ENABLE_DARAJA_MOCK) {
    await orderRepository.updateStatus(orderId, "completed", undefined, "Mock Daraja payout marked complete");
  }
}

async function processOnrampTimeout(orderId: string) {
  const order = await orderRepository.findByOrderId(orderId);
  if (!order || order.type !== "onramp") return;
  if (order.status === "pay_offline" || order.status === "pending") {
    await orderRepository.updateStatus(orderId, "timeout", undefined, "Onramp timed out before payment confirmation");
  }
}

export const settlementQueue = {
  async enqueueOnrampRelease(orderId: string) {
    await settlementQueueInstance.add("onramp-release", { orderId }, { jobId: orderId });
  },

  async enqueueOfframpSettlement(orderId: string) {
    await settlementQueueInstance.add("offramp-settle", { orderId }, { jobId: orderId });
  },

  async scheduleOnrampTimeout(orderId: string) {
    await settlementQueueInstance.add(
      "onramp-timeout",
      { orderId },
      {
        jobId: `timeout-${orderId}`,
        delay: 12 * 60 * 1000
      }
    );
  }
};

export function startWorkers() {
  if (workerStarted) return;
  workerStarted = true;

  new Worker(
    queueName,
    async (job) => {
      const { orderId } = job.data as { orderId: string };
      if (job.name === "onramp-release") {
        await processOnrampRelease(orderId);
        return;
      }
      if (job.name === "offramp-settle") {
        await processOfframpSettlement(orderId);
        return;
      }
      if (job.name === "onramp-timeout") {
        await processOnrampTimeout(orderId);
      }
    },
    {
      connection: redis,
      concurrency: 4,
      prefix: env.QUEUE_PREFIX
    }
  );
}
