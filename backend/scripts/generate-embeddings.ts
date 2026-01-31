import { config } from "dotenv";
config({ path: "../.env" });
config({ path: "../.env.local" });

import { generateJobEmbedding } from "../services/matching";

const jobIds = [
  "be2bc7b3-ae97-4328-8c14-7a7c6be16e62",
  "79c62803-b865-4f7f-adfd-8eb3fb8c771f",
  "643f2244-b188-4303-9dc9-7e9194c7bb67",
  "5d8f0862-c2c6-43ff-ad77-7945922eb36b",
  "a1f8cf0b-adc2-490f-befe-0b7683efe0db",
  "60b3a125-d358-41b3-8bd3-4e489149990a",
  "f92a703e-ba7d-4775-9403-f3f36ebc7c9a",
  "1b97a5d2-3883-43a4-a453-9b2c4337505e",
  "b51519df-f6fa-45a9-8ecd-3952204c60d0",
  "d3d7f11c-c7fc-453c-9624-a8fc29bae30d",
  "0c36d827-a76a-44f1-8ac4-bd9fd1629e53",
  "50aec36e-f424-4ffe-a9b6-b515c1467a93",
  "9c3e4a8d-5201-4a49-a945-2db3191141dd",
  "4b94dc24-8906-4a02-b816-5d71e1fd8f81",
];

async function main() {
  console.log(`Generating embeddings for ${jobIds.length} jobs...`);
  for (const id of jobIds) {
    console.log(`Generating embedding for job ${id}...`);
    const success = await generateJobEmbedding(id);
    console.log(success ? `  Done` : `  Failed`);
  }
  console.log("All done!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
