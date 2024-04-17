import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  context.log.info(`Fetching advertisement details and associated metrics`);

  const adId = request.params["adId"];
  if (!adId) {
    context.log.error("No adId provided in the path.");
    return "Error: No adId provided.";
  }

  // Supabase API Key
  const supabaseKey = environment.SUPABASE_API_KEY;

  try {
    // Fetch the advertisement details
    const adDetailsUrl = `https://app.adtochatbot.com/rest/v1/advertisement?ad_id=eq.${adId}&select=*`;
    let response = await fetch(adDetailsUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Failed to fetch advertisement details: ${response.statusText}`);

    const adDetails = await response.json();
    if (adDetails.length === 0) throw new Error("No details found for the provided adId");

    const ad = adDetails[0];

    // Fetch all related chatbot_ads to aggregate impressions and clicks
    const chatbotAdsUrl = `https://app.adtochatbot.com/rest/v1/chatbot_ads?ad_id=eq.${ad.id}&select=impressions,clicks`;
    response = await fetch(chatbotAdsUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Failed to fetch related chatbot_ads: ${response.statusText}`);

    const chatbotAds = await response.json();

    // Aggregate impressions and clicks
    const totalImpressions = chatbotAds.reduce((acc, curr) => acc + curr.impressions, 0);
    const totalClickCount = chatbotAds.reduce((acc, curr) => acc + curr.clicks, 0);
    const ctr = totalImpressions !== 0 ? parseFloat((totalClickCount / totalImpressions * 100).toFixed(1)) : 0.0;
    const total_spend = totalClickCount*ad.bid;
    

    // Construct and return the desired output
    const result = {
      id: adId,
      text: ad.text,
      link: ad.link,
      highlight: ad.highlight,
      total_impressions: totalImpressions,
      total_click_count: totalClickCount,
      budget: ad.budget,
      bid: ad.bid,
      payperclick: ad.payperclick,
      ctr: ctr,
      total_spend: total_spend,
      recent_payment:ad.recent_payment,
      total_paid: ad.total_paid,
      status: ad.status,
      show_exact_text: ad.show_exact_text,
      coupon_code: ad.coupon_code,
      target: ad.target,
      intro_text: ad.intro_text
    };  

    context.log.info(`Successfully fetched advertisement details and metrics`);
    return result;
  } catch (error) {
    context.log.error(`Error: ${error.message}`);
    return `Error: ${error.message}`;
  }
}
