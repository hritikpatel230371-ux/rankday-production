export const appConfig = {
  name: process.env.APP_NAME || "RankDay",
  get aiProvider() {
    return (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "mock")).toLowerCase();
  },
  authCookie: "rankday_session",
  sessionDays: 14
};
