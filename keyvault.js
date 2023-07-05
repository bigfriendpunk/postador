const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");
const fastify = require('fastify')({ logger: true });
const fs = require('fs');
const path = require('path');

const options = {
  port: 3000,
  host: 'localhost'
};

class KeyVaultService {
  constructor(vaultUrl) {
    this.vaultUrl = vaultUrl;
    this.credential = new DefaultAzureCredential();
    this.client = new SecretClient(this.vaultUrl, this.credential);
  }

  async importSecretToKeyVault(secretName, secretValue) {
    try {
      // create the secret in Key Vault
      const result = await this.client.setSecret(secretName, secretValue);

      console.log(`The secret ${result.name} was created.`);

      return Promise.resolve(result);
    } catch (err) {
      console.error("Error creating secret:", err);

      return Promise.reject(err);
    }
  }

  validateFileExtension(filename) {
    try {
      const ext = path.extname(filename);
      if (ext !== '.pem' && ext !== '.key') {
        throw new Error(`Invalid file extension. Only .pem or .key files are allowed.`);
      }
    } catch (err) {
      console.error('Error validating file extension:', err);
      throw { statusCode: 400, message: 'Invalid file extension. Only .pem or .key files are allowed.' };
    }
  }
  

  async uploadAndImportSecrets(parts) {
    for await (const part of parts) {
      if (part.filename) {
        // check if the file extension is .pem or .key
        const ext = path.extname(part.filename);
        this.validateFileExtension(part.filename);

      

        // remove the file extension from the filename
        const secretName = path.basename(part.filename, ext);

        // convert the uploaded buffer to utf8 string
        const secretValue = part.file.toString('utf8');

        // import the secret value to Key Vault
        await this.importSecretToKeyVault(secretName, secretValue);
      }
    }

    return { message: 'secrets created' }
  }
}

const vaultUrl = 'https://marvintst.vault.azure.net';
const keyVaultService = new KeyVaultService(vaultUrl);

fastify.register(require('@fastify/multipart'));

fastify.post('/upload', async (request, reply) => {
  const parts = request.parts();

  try {
    // upload and import the secrets to Key Vault
    await keyVaultService.uploadAndImportSecrets(parts);
    reply.code(201).send({ message: 'secrets created' });
  } catch (err) {
    console.error('Error uploading secrets:', err);
    reply.code(500).send({ message: 'error uploading secrets' });
  }
});

fastify.listen(options, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log(`Server listening on ${address}`);
});
