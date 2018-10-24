import { IncomingWebhook, IncomingWebhookSendArguments } from "@slack/client";
import { APIGatewayEvent, Callback, Context, Handler } from "aws-lambda";
import * as moment from "moment-timezone";

moment.tz.setDefault("Asia/Tokyo");

export const onDeparted: Handler = async (
  event: APIGatewayEvent,
  context: Context,
  cb: Callback
) => {
  const requestBody = parseRequestBody(event.body);

  if (!checkActive(requestBody, cb)) {
    return;
  }

  const slackSendArg = {
    text: generateText(requestBody.minutesToDestination),
    username: "naoyoshi okamae(bot)"
  };
  if (!requestBody.dryRun) {
    if (!(await sendToSlack(slackSendArg, cb))) {
      return;
    }
  }

  const response = {
    body: JSON.stringify({
      input: event,
      message: "posted successfully",
      slackSendArg
    }),
    statusCode: 200
  };

  cb(null, response);
};

async function sendToSlack(
  args: IncomingWebhookSendArguments,
  cb: Callback
): Promise<boolean> {
  return !!(await new IncomingWebhook(process.env.SLACK_WEBHOOK_URL)
    .send(args)
    .catch(err =>
      cb(null, JSON.stringify({ body: err.toString(), statusCode: 500 }))
    ));
}

function checkActive(requestBody: IRequsetBody, cb: Callback): boolean {
  const [from, to] = (requestBody.activeHours || "0-23")
    .split("-")
    .map(h => Number.parseInt(h, 10));
  const currentHour = moment().hours();
  if (
    currentHour < from ||
    currentHour > to ||
    (requestBody.activeDays && !requestBody.activeDays.includes(moment().day()))
  ) {
    cb(null, JSON.stringify({ body: "inactive hour", statusCode: 200 }));
    return false;
  }
  return true;
}

function generateText(minutesToDestination: number): string {
  const arrivesAt = moment().add(minutesToDestination, "m");
  const hourText =
    arrivesAt.minutes() < 15
      ? `${arrivesAt.hour()}時過ぎ`
      : `${arrivesAt.hour() + 1}時前`;

  return `${hourText}に着きます`;
}

function parseRequestBody(body: string): IRequsetBody {
  return JSON.parse(body);
}

interface IRequsetBody {
  activeHours?: string;
  activeDays?: number[];
  minutesToDestination: number;
  dryRun?: boolean;
}
