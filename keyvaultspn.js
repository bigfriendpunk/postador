const { SecretClient } = require("@azure/keyvault-secrets");
const { ClientSecretCredential } = require("@azure/identity");
const fastify = require('fastify')({ logger: true });
const path = require('path');

const options = {
  port: 3000,
  host: 'localhost'
};

class KeyVaultService {
  constructor(vaultUrl, clientId, clientSecret, tenantId) {
    this.vaultUrl = vaultUrl;
    this.credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    this.client = new SecretClient(this.vaultUrl, this.credential);
  }

  async importSecretToKeyVault(secretName, secretValue) {
    try {
      const result = await this.client.setSecret(secretName, secretValue);
      console.log(`The secret ${result.name} was created.`);
      return result;
    } catch (err) {
      console.error("Error creating secret:", err);
      throw err;
    }
  }

  validateFileExtension(filename) {
    const validExtensions = ['.pem', '.key'];
    const ext = path.extname(filename);
    
    if (!validExtensions.includes(ext)) {
      throw new Error(`Invalid file extension. Only .pem or .key files are allowed.`);
    }
  }

  async uploadAndImportSecrets(parts) {
    for await (const part of parts) {
      if (part.filename) {
        this.validateFileExtension(part.filename);

        const ext = path.extname(part.filename);
        const secretName = path.basename(part.filename, ext);
        const secretValue = part.file.toString('utf8');

        await this.importSecretToKeyVault(secretName, secretValue);
      }
    }

    return { message: 'secrets created' };
  }
}

const vaultUrl = 'https://marvintst.vault.azure.net';
const clientId = 'YOUR_CLIENT_ID';
const clientSecret = 'YOUR_CLIENT_SECRET';
const tenantId = 'YOUR_TENANT_ID';

const keyVaultService = new KeyVaultService(vaultUrl, clientId, clientSecret, tenantId);

fastify.register(require('@fastify/multipart'));

fastify.post('/upload', async (request, reply) => {
  const parts = request.parts();

  try {
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
