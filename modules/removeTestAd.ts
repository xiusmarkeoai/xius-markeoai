import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  if (request.method !== "DELETE") {
    return {
      status: 405,
      body: "Method Not Allowed",
    };
  }

  const requestBody = await request.json();
  const chatbotapiKey = requestBody.chatbotapiKey;
  const ad_id = 1; // This seems to be statically set to 1, consider making this dynamic if necessary

  if (!chatbotapiKey) {
    return {
      status: 400,
      body: "Bad Request: Missing chatbotapiKey",
    };
  }
  context.log.info(chatbotapiKey);
  const supabaseKey = environment.SUPABASE_API_KEY;
  const baseUrl = "https://app.adtochatbot.com";

  try {
    // Find the chatbot_id using the apiKey
    const chatbotUrl = `https://app.adtochatbot.com/rest/v1/chatbot?select=id&apiKey=eq.${chatbotapiKey}`;
    const chatbotResponse = await fetch(chatbotUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!chatbotResponse.ok) throw new Error(`Failed to fetch chatbot: ${chatbotResponse.statusText}`);

    const chatbots = await chatbotResponse.json();
    if (chatbots.length === 0) throw new Error("No chatbot found with the given apiKey");

    const chatbotID = chatbots[0].id;

    // Check if a record already exists with the given ad_id and chatbot_id
    const existingRecordUrl = `${baseUrl}/rest/v1/chatbot_ads?select=id&ad_id=eq.${ad_id}&chatbot_id=eq.${chatbotID}`;
    const existingRecordResponse = await fetch(existingRecordUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!existingRecordResponse.ok) throw new Error(`Failed to fetch existing records: ${existingRecordResponse.statusText}`);

    const existingRecords = await existingRecordResponse.json();
    if (existingRecords.length === 0) {
      // No record found to delete
      return {
        status: 404, // HTTP 404 Not Found
        body: { message: "No existing record found to delete" },
      };
    }

    // Delete the existing record
    const deleteResponse = await fetch(`${baseUrl}/rest/v1/chatbot_ads?id=eq.${existingRecords[0].id}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete record, status: ${deleteResponse.status}`);
    }

    context.log.info("Record deleted successfully");
    return {
      status: 200,
      body: { message: "Deleted successfully" },
    };
  } catch (error) {
    context.log.error(`Error: ${error.message}`);
    return {
      status: 500,
      body: `Server Error: ${error.message}`,
    };
  }
}
