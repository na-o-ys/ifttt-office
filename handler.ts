import { IncomingWebhook } from "@slack/client";
import { APIGatewayEvent, Callback, Context, Handler } from "aws-lambda";
import * as moment from "moment-timezone";

moment.tz.setDefault("Asia/Tokyo");

export const onDeparted: Handler = async (
  event: APIGatewayEvent,
  context: Context,
  cb: Callback
) => {
  const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

  const result = await webhook
    .send({
      text: generateText(event.body),
      username: "naoyoshi okamae(bot)"
    })
    .catch(cb);
  if (!result) {
    return;
  }

  const response = {
    body: JSON.stringify({
      input: event,
      message: "posted successfully"
    }),
    statusCode: 200
  };

  cb(null, response);
};

function generateText(body: string): string {
  const minutesToDestination = JSON.parse(body).minutesToDestination as number;
  const arrivesAt = moment().add(minutesToDestination, "m");
  const hourText =
    arrivesAt.minutes() < 30
      ? `${arrivesAt.hour()}時過ぎ`
      : `${arrivesAt.hour() + 1}時前`;

  return `${hourText}に着きます`;
}
