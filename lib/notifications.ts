interface NotificationPayload {
  title: string;
  message: string;
  severity: "critical" | "recovery";
  timestamp: string;
  details?: Record<string, string | number | null>;
}

async function sendDiscordNotification(payload: NotificationPayload): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const color = payload.severity === "critical" ? 0xff0000 : 0x00ff00;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: payload.title,
          description: payload.message,
          color,
          timestamp: payload.timestamp,
          fields: payload.details
            ? Object.entries(payload.details).map(([name, value]) => ({
                name,
                value: String(value ?? "N/A"),
                inline: true,
              }))
            : [],
        }],
      }),
    });
    return res.ok;
  } catch {
    console.error("Discord notification failed");
    return false;
  }
}

async function sendSlackNotification(payload: NotificationPayload): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const emoji = payload.severity === "critical" ? ":red_circle:" : ":large_green_circle:";

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `${emoji} *${payload.title}*\n${payload.message}`,
      }),
    });
    return res.ok;
  } catch {
    console.error("Slack notification failed");
    return false;
  }
}

async function sendEmailNotification(payload: NotificationPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.NOTIFICATION_EMAIL_TO;
  if (!apiKey || !toEmail) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "WatchAtlas Status <onboarding@resend.dev>",
        to: toEmail,
        subject: `[WatchAtlas] ${payload.title}`,
        html: `<h2>${payload.title}</h2><p>${payload.message}</p><p><small>${payload.timestamp}</small></p>`,
      }),
    });
    return res.ok;
  } catch {
    console.error("Email notification failed");
    return false;
  }
}

export async function sendAllNotifications(payload: NotificationPayload): Promise<void> {
  await Promise.allSettled([
    sendDiscordNotification(payload),
    sendSlackNotification(payload),
    sendEmailNotification(payload),
  ]);
}
