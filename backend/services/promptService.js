const { SHARED_PROMPT } = require("../prompts/sharedPrompt");
const { SYSTEM_PROMPT } = require("../prompts/generalPrompt");
const { CODING_PROMPT } = require("../prompts/codingPrompt");

function getSystemPrompt(modelType = "general") {
  switch (modelType) {
    case "general":
      return `${SHARED_PROMPT}\n\n${SYSTEM_PROMPT}`;

    case "coding":
      return `${SHARED_PROMPT}\n\n${CODING_PROMPT}`;

    default:
      throw new Error(`Unsupported model type: ${modelType}`);
  }
}

module.exports = { getSystemPrompt };
