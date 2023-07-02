const { EventHubProducerClient, EventHubConsumerClient } = require("@azure/event-hubs");

const connectionString = "YOUR_EVENTHUB_CONNECTION_STRING";
const sourceEventHubName = "YOUR_SOURCE_EVENTHUB_NAME";
const destinationEventHubName = "YOUR_DESTINATION_EVENTHUB_NAME";
const consumerGroup = "YOUR_CONSUMER_GROUP_NAME";

async function main() {
  const producerClient = new EventHubProducerClient(connectionString, destinationEventHubName);
  const consumerClient = new EventHubConsumerClient(consumerGroup, connectionString, sourceEventHubName);

  const partitionIds = await consumerClient.getPartitionIds();
  const checkpoints = {};

  // Função para processar os eventos recebidos
  async function processEvents(events, context) {
    if (events.length === 0) {
      return;
    }

    for (const event of events) {
      // Faça aqui a lógica de transformação ou processamento dos dados
      // event.body contém os dados do evento em formato JSON

      // Exemplo: Imprimir o corpo do evento no console
      console.log(event.body);

      // Enviar o evento transformado para o destino
      await producerClient.send(event.body);
    }

    // Fazer checkpoint para marcar o progresso do consumo
    const partitionId = context.partitionId;
    const eventHubName = context.eventHubName;
    checkpoints[`${eventHubName}/${partitionId}`] = context.offset;
    await consumerClient.updateCheckpoint(context);
  }

  // Função para lidar com erros no processamento dos eventos
  async function processError(err) {
    console.error(err);
  }

  // Iniciar o consumo dos eventos
  for (const partitionId of partitionIds) {
    consumerClient.subscribe({
      processEvents,
      processError,
      startingPosition: { offset: checkpoints[`${sourceEventHubName}/${partitionId}`] || "-1" },
      partitionId: partitionId
    });
  }
}

main().catch((err) => {
  console.error("Erro durante a execução:", err);
  process.exit(1);
});
