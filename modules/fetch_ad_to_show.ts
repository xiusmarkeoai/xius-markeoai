import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  context.log.info("Processing request to increment ad impressions");

  const data = await request.json();
  const requiredFields = ["user_id", "gender", "country"];
  const missingFields = requiredFields.filter(field => !data || !data[field]);

  if (missingFields.length > 0) {
    context.log.error("Missing required fields: " + missingFields.join(", "));
    return new Response(`Error: Missing required fields: ${missingFields.join(", ")}`, { status: 400 });
  }

  const apiKey = request.params["publisher_name"];
  if (!apiKey) {
    context.log.error("No publisher_name provided in the path.");
    return new Response("Invalid publisher name", {status:400});
  }

  const supabaseKey = environment.SUPABASE_API_KEY;

  try {
    const chatbotUrl = `https://app.adtochatbot.com/rest/v1/chatbot?select=id&apiKey=eq.${apiKey}`;
    const chatbotResponse = await fetch(chatbotUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!chatbotResponse.ok) throw new Error(`Failed to fetch chatbot: ${chatbotResponse.statusText}`);

    const chatbots = await chatbotResponse.json();
    if (chatbots.length === 0) return new Response("Invalid publisher name", {status:400});

    const chatbotId = chatbots[0].id;
    const adsUrl = `https://app.adtochatbot.com/rest/v1/chatbot_ads?select=id,ad_id,impressions&chatbot_id=eq.${chatbotId}`;
    const adsResponse = await fetch(adsUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!adsResponse.ok) throw new Error(`Failed to fetch ads for chatbot: ${adsResponse.statusText}`);

    const ads = await adsResponse.json();
    if (ads.length === 0) throw new Error("No Ads found for this Publisher Name");

    const randomAdIndex = Math.floor(Math.random() * ads.length);
    const selectedAd = ads[randomAdIndex];

    const newImpressions = selectedAd.impressions + 1;
    const updateImpressionUrl = `https://app.adtochatbot.com/rest/v1/chatbot_ads?id=eq.${selectedAd.id}`;
    await fetch(updateImpressionUrl, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ impressions: newImpressions }),
    });

    const customURL = await (await fetch(updateImpressionUrl)).json();
    const URL = customURL[0].link;
    context.log.info("Successfully fetched custom URL");

    return new Response(JSON.stringify({
      destination_link: URL,
      image_link: ads[randomAdIndex].image_link
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    context.log.error(`Error: ${error.message}`);
    if (error.message.includes("No chatbot found") || error.message.includes("No Ads found")) {
      return new Response("Not Found: " + error.message, { status: 404 });
    }
    return new Response("Bad Request: " + error.message, { status: 400 });
  }
}
