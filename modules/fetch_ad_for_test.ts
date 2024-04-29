import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
    return {
      destination_link: "https://getidol.com/membership",
      image_link: "https://app.adtochatbot.com/storage/v1/object/public/i/getidolad.png"
    };
}

