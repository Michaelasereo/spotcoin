export function buildHomeView(input: {
  coinsToGive: number;
  spotTokensEarned: number;
  tokenValueNaira: number;
  recent: Array<{ text: string }>;
}) {
  return {
    type: "home",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*🪙 Your Spotcoin Wallet*",
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Coins to Give*\n${input.coinsToGive}` },
          { type: "mrkdwn", text: `*Spot Tokens Earned*\n${input.spotTokensEarned}` },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `≈ ₦${(input.spotTokensEarned * input.tokenValueNaira).toLocaleString("en-NG")} at year-end`,
          },
        ],
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: "*Recent recognitions*" },
      },
      ...(input.recent.length
        ? input.recent.map((item) => ({
            type: "context",
            elements: [{ type: "mrkdwn", text: item.text }],
          }))
        : [
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: "No recent recognitions yet." }],
            },
          ]),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Recognise someone 🪙", emoji: true },
            action_id: "open_recognition_modal",
            value: "open_recognition_modal",
          },
        ],
      },
    ],
  };
}
