const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * Returns the caller's trusted Mini Program OPENID and whether that OPENID
 * has an enabled document in the ai_whitelist collection. OPENID is never
 * accepted from the client, so the caller cannot impersonate another user.
 */
exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  try {
    const enableWhitelist =
  process.env.ENABLE_WHITELIST !== "false";


let allowed = true;


// 开启白名单时才检查
if (enableWhitelist) {

  const result = await db.collection("ai_whitelist")
    .where({
      _id: OPENID,
      enabled: true
    })
    .limit(1)
    .get();


  allowed =
    Array.isArray(result.data)
    && result.data.length > 0;
}

    // Use the cloud-function log to obtain an applicant's OPENID before
    // adding it to the whitelist. Do not remove this line without replacing
    // it with an admin-only request workflow.
    console.log("AI whitelist check", { openid: OPENID, allowed });

    return { success: true, openid: OPENID, allowed };
  } catch (error) {
    console.error("authUser whitelist lookup failed", error);
    return {
      success: false,
      openid: OPENID,
      allowed: false,
      error: "白名单服务暂不可用"
    };
  }
};
