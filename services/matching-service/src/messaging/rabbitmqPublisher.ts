/**
 * Minimal RabbitMQ topic publisher for domain events.
 * No connection on module load — first publish connects lazily.
 * If `RABBITMQ_URL` is unset, publishing is a no-op (no throw).
 */
import amqplib, { type Channel, type ChannelModel } from "amqplib";

export const MATCHING_EVENTS_EXCHANGE = "matching.events";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

function resetConnection(): void {
  channel = null;
  connection = null;
}

async function ensureChannel(url: string): Promise<Channel | null> {
  if (!connection) {
    const conn = await amqplib.connect(url);
    connection = conn;
    conn.on("error", (err: Error) => {
      console.error("[rabbitmq] connection error:", err.message);
      resetConnection();
    });
    conn.on("close", () => {
      resetConnection();
    });
  }
  const conn = connection;
  if (!channel) {
    channel = await conn.createChannel();
    channel.on("error", (err: Error) => {
      console.error("[rabbitmq] channel error:", err.message);
      channel = null;
    });
    await channel.assertExchange(MATCHING_EVENTS_EXCHANGE, "topic", {
      durable: true,
    });
  }
  return channel;
}

/**
 * Publish JSON to `matching.events` with the given routing key.
 * - Missing `RABBITMQ_URL`: resolves without doing anything.
 * - Broker errors: throws (caller should catch and log; do not fail user flows).
 */
export async function publishToMatchingExchange(
  routingKey: string,
  body: Record<string, unknown>,
): Promise<void> {
  const url = process.env.RABBITMQ_URL?.trim();
  if (!url) {
    return;
  }

  try {
    const ch = await ensureChannel(url);
    if (!ch) {
      return;
    }
    ch.publish(
      MATCHING_EVENTS_EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(body)),
      {
        persistent: true,
        contentType: "application/json",
      },
    );
  } catch (err) {
    resetConnection();
    throw err;
  }
}
