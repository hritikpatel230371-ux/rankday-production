export const appConfig = {
  name: process.env.APP_NAME || "RankDay",
  aiProvider: process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "mock"),
  authCookie: "rankday_session",
  sessionDays: 14
};
