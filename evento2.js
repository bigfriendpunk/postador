const { EventHubConsumerClient, EventHubProducerClient } = require("@azure/event-hubs");
const avro = require("avro-js");

const connectionString = "CONNECTION_STRING";
const sourceEventHubName = "SOURCE_EVENT_HUB_NAME";
const destinationEventHubName = "DESTINATION_EVENT_HUB_NAME";
const avroSchema = {...}; // Defina o esquema Avro aqui

// Criando o decodificador Avro com base no esquema
const avroDecoder = avro.parse(avroSchema);

async function main() {
  const producerCount = 4; // Número de instâncias do cliente produtor
  const batchSize = 100; // Tamanho do lote de eventos a serem enviados

  // Criando o cliente consumidor do Event Hub de origem
  const consumerClient = new EventHubConsumerClient("$Default", connectionString, sourceEventHubName);

  // Criando um pool de clientes produtores do Event Hub de destino
  const producerPool = [];
  for (let i = 0; i < producerCount; i++) {
    const producerClient = new EventHubProducerClient(connectionString, destinationEventHubName);
    producerPool.push(producerClient);
  }

  // Iniciando a leitura do Event Hub de origem
  const subscription = consumerClient.subscribe({
    processEvents: async (events, context) => {
      if (events.length === 0) {
        return;
      }

      // Transformando e codificando cada evento no formato Avro
      const transformedEvents = events.map((event) => {
        const decodedData = avroDecoder.fromBuffer(event.body);
        const transformedData = {...}; // Aplicar transformações ou lógica desejada ao evento
        const encodedData = avroDecoder.toBuffer(transformedData);
        return {
          body: encodedData,
          // Outras propriedades do evento que podem ser modificadas
        };
      });

      // Dividindo os eventos em lotes menores
      const eventBatches = splitIntoBatches(transformedEvents, batchSize);

      // Enviando os eventos em paralelo usando as instâncias do cliente produtor
      await Promise.all(
        eventBatches.map(async (batch) => {
          const producerClient = getNextProducerClient(); // Obtendo a próxima instância do cliente produtor
          await producerClient.sendBatch(batch);
        })
      );
    },
    processError: async (err, context) => {
      console.error(err);
    }
  });

  // Função para dividir um array em lotes menores
  function splitIntoBatches(array, batchSize) {
    const batches = [];
    let batch = [];
    for (let i = 0; i < array.length; i++) {
      batch.push(array[i]);
      if (batch.length === batchSize) {
        batches.push(batch);
        batch = [];
      }
    }
    if (batch.length > 0) {
      batches.push(batch);
    }
    return batches;
  }

  // Função para obter a próxima instância do cliente produtor usando uma estratégia de round-robin
  let producerIndex = 0;
  function getNextProducerClient() {
    const producerClient = producerPool[producerIndex];
    producerIndex = (producerIndex + 1) % producerCount;
    return producerClient;
  }

  // Esperando indefinidamente até que o programa seja interrompido
  await new Promise((resolve) => {
    const exitHandler = (reason) => {
      console.log(`Exiting due to ${reason}`);
      subscription.close();
      consumerClient.close();
      producerPool.forEach((producerClient) => producerClient.close());
      resolve();
    };

    process.on("SIGINT", () => exitHandler("SIGINT"));
    process.on("SIGTERM", () => exitHandler("SIGTERM"));
  });
}

main().catch((err) => {
  console.error("An error occurred:", err);
  process.exit(1);
});
