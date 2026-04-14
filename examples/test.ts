import { runTask } from "../src/core/runTask";

let attempts = 0;

const unstable = async () => {
  attempts++;
  console.log("Attempt:", attempts);

  if (attempts < 3) {
    throw new Error("fail");
  }

  return "success";
};

async function main() {
  const result = await runTask(unstable, {
    retry: { attempts: 3 },
    debug: true,
  });

  console.log("Final Result:", result);
}

main();