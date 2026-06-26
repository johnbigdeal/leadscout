import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  processSearch,
  trialReminder3Days,
  trialReminder1Day,
  trialExpiredNotification,
  trialDataWarning,
  trialCleanup,
} from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processSearch,
    trialReminder3Days,
    trialReminder1Day,
    trialExpiredNotification,
    trialDataWarning,
    trialCleanup,
  ],
});
