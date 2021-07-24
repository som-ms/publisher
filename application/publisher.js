const Message = require("./Message");
const MyRedis = require("./MyRedis");
const constants = require("./constants");
const appInsights = require("applicationinsights");
const { hostName, port, pwd, appInsightKey } = require("./config");
appInsights.setup(appInsightKey).start();
var client = appInsights.defaultClient;
var myargs = process.argv.slice(2); // channelName
var firstChannelId = myargs[0];

// create an array of 150 channels
// send message at every 200ms to all those 150 channels
var totalMessagesSent = new Array(constants.TOTAL_CHANNEL_PER_PUBLISHER).fill(
  0
);
var currentBatchCount = new Array(constatns.TOTAL_CHANNEL_PER_PUBLISHER).fill(
  0
);

var publisher = new MyRedis();
publisher.on("ready", function () {
  client.trackMetric({ name: "redisPubConnOpen", value: 1.0 });
  console.log("Redis connection Established");
});

function publishMessage() {
  for (var i = 0; i < constants.TOTAL_CHANNEL_PER_PUBLISHER; i++) {
    var messageObj = new Message(firstChannelId + i, totalMessagesSent[i]); // content is same as totalMessageSent
    publisher.publish(firstChannelId + i, JSON.stringify(messageObj));
    totalMessagesSent[i]++;
    currentBatchCount[i]++;
  }
}

function sendMetric() {
  for (var i = 0; i < constants.TOTAL_CHANNEL_PER_PUBLISHER; i++) {
    var propertySet = {
      TotalMessagesSent: totalMessagesSent[i],
      channelId: firstChannelId + i,
    };
    var metric = { MessageBatchSent: currentBatchCount[i] };
    client.trackEvent({
      name: "pubEvents",
      properties: propertySet,
      measurements: metric,
    });
    currentBatchCount[i] = 0;
  }
}

setInterval(publishMessage, constants.MESSAGE_PUBLISH_INTERVAL);
setInterval(sendMetric, constants.METRIC_SENT_INTERVAL); // send metric after every 1 minute
