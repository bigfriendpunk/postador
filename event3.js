import { EventHubConsumerClient, EventHubProducerClient } from "@azure/event-hubs";

// Configurações do Event Hub
const connectionString = "CONNECTION_STRING";
const sourceEventHubName = "SOURCE_EVENT_HUB_NAME";
const destinationEventHubName = "DESTINATION_EVENT_HUB_NAME";

// Função para processar os eventos
async function processEvents(events: any[]) {
  for (const event of events) {
    // Processar o evento conforme necessário
    const eventData = JSON.parse(event.body as string);
    console.log("Evento recebido:", eventData);

    // Postar o evento no tópico de destino
    await eventHubProducerClient.send(eventData);
    console.log("Evento enviado para o tópico de destino");
  }
}

// Criar um cliente do Event Hub para consumir eventos
const eventHubConsumerClient = new EventHubConsumerClient("$Default", connectionString, sourceEventHubName);

// Criar um cliente do Event Hub para produzir eventos
const eventHubProducerClient = new EventHubProducerClient(connectionString, destinationEventHubName);

// Iniciar o consumo de eventos
eventHubConsumerClient.receive("0", processEvents, { startingPosition: "latest" })
  .then(() => {
    console.log("Consumo de eventos iniciado.");
  })
  .catch((err) => {
    console.log("Erro ao iniciar o consumo de eventos:", err);
  });
