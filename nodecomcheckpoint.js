const { EventHubProducerClient, EventHubConsumerClient } = require("@azure/event-hubs");
const { DefaultAzureCredential } = require("@azure/identity");

async function main() {
  const connectionString = "<CONNECTION_STRING>";
  const sourceEventHubName = "<SOURCE_EVENT_HUB_NAME>";
  const targetEventHubName = "<TARGET_EVENT_HUB_NAME>";

  const producerClient = new EventHubProducerClient(connectionString, targetEventHubName, new DefaultAzureCredential());

  async function sendEvent(eventData) {
    const batchOptions = {
      partitionKey: eventData.partitionKey // Opcional: substitua por uma chave de partição personalizada se desejar
    };

    const batch = await producerClient.createBatch(batchOptions);
    batch.tryAdd({ body: eventData });

    await producerClient.sendBatch(batch);
  }

  const consumerClient = new EventHubConsumerClient(EventHubConsumerClient.defaultConsumerGroupName, connectionString, sourceEventHubName, new DefaultAzureCredential());

  async function processEvents(events) {
    for (const event of events) {
      console.log("Evento recebido:", event.body);

      await sendEvent(event.body);

      await event.updateCheckpoint();
    }
  }

  async function startConsumer() {
    console.log("Iniciando o consumidor do Event Hub de origem...");

    const subscription = consumerClient.subscribe({
      processEvents: processEvents,
      processError: (err) => {
        console.error("Erro ao receber eventos:", err);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, Infinity));
  }

  await startConsumer();
}

main().catch((err) => {
  console.error("Erro ao executar o código:", err);
});
