import type { AIProvider, InsightInput, ReelInput } from "@/ai/provider";
import { aiDailyLogSchema, type AIDailyLog } from "@/validation/ai";

function minutesFrom(text: string, keyword: string) {
  const pattern = new RegExp(`(?:${keyword}).{0,40}?(\\d+(?:\\.\\d+)?)\\s*(hour|hours|hr|hrs|minutes|mins|min)`, "i");
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1]);
  return match[2].startsWith("h") ? Math.round(value * 60) : Math.round(value);
}

export class MockProvider implements AIProvider {
  async analyzeDailyLog(text: string): Promise<AIDailyLog> {
    const lower = text.toLowerCase();
    const activities = [];
    const subjects = ["DBMS", "Operating Systems", "OS", "Computer Networks", "DSA", "Maths"];
    for (const subject of subjects) {
      if (lower.includes(subject.toLowerCase())) {
        const duration = minutesFrom(text, subject) ?? minutesFrom(text, "studied") ?? null;
        activities.push({
          title: `Studied ${subject}`,
          category: "Education",
          subject: subject === "OS" ? "Operating Systems" : subject,
          durationMinutes: duration,
          plannedMinutes: minutesFrom(text, "planned"),
          sentiment: "POSITIVE",
          importance: lower.includes("exam") ? "HIGH" : "MEDIUM",
          confidence: duration ? 0.86 : 0.62,
          needsConfirmation: !duration
        });
      }
    }

    const projectMinutes = minutesFrom(text, "project");
    if (lower.includes("project")) {
      activities.push({
        title: "Project work",
        category: "Project",
        subject: null,
        durationMinutes: projectMinutes,
        plannedMinutes: null,
        sentiment: "POSITIVE",
        importance: "HIGH",
        confidence: 0.82,
        needsConfirmation: !projectMinutes
      });
    }

    const wasted = minutesFrom(text, "wasted") ?? minutesFrom(text, "reels");
    const timeWaste = wasted
      ? [{
          title: lower.includes("reels") ? "Watched reels" : "Wasted time",
          category: "Entertainment",
          subject: null,
          durationMinutes: wasted,
          plannedMinutes: null,
          sentiment: "NEGATIVE",
          importance: "MEDIUM",
          confidence: 0.84,
          needsConfirmation: false
        }]
      : [];

    const scoreMatch = text.match(/(?:scored|score|got)\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+(?:\.\d+)?))?|(\d+(?:\.\d+)?)\s*%/i);
    const tests = scoreMatch
      ? [{
          name: lower.includes("math") ? "Maths test" : "Recorded test",
          subject: lower.includes("math") ? "Maths" : null,
          obtainedMarks: Number(scoreMatch[3] ?? scoreMatch[1]),
          totalMarks: scoreMatch[3] ? 100 : Number(scoreMatch[2] ?? 100),
          difficulty: 3,
          needsConfirmation: false
        }]
      : [];

    const pendingItems = Array.from(text.matchAll(/(?:pending|left|missed)\s+([^.!]+)/gi)).map((match) => match[1].trim());
    const completed = Array.from(text.matchAll(/(?:completed|finished|solved)\s+([^.!]+)/gi)).map((match) => match[1].trim());

    return aiDailyLogSchema.parse({
      activities: activities.length ? activities : [{
        title: "Manual activity from daily reflection",
        category: "Other",
        subject: null,
        durationMinutes: null,
        sentiment: "NEUTRAL",
        importance: "MEDIUM",
        confidence: 0.45,
        needsConfirmation: true
      }],
      goals: completed.map((title) => ({ title, status: "COMPLETED", progressDelta: 100, importance: "MEDIUM", needsConfirmation: true })),
      tests,
      syllabusUpdates: [],
      timeWaste,
      pendingItems,
      summary: {
        completed,
        pending: pendingItems,
        bestAchievement: completed[0] ?? activities[0]?.title ?? null,
        mainConcern: pendingItems[0] ?? (wasted ? "Time lost to distractions" : null)
      }
    });
  }

  async generateInsights(input: InsightInput) {
    const insights = [`Your rank moved ${input.rankDelta >= 0 ? "+" : ""}${input.rankDelta} to ${input.rankScore}.`];
    if (input.studyMinutes > 0) insights.push(`You logged ${Math.round(input.studyMinutes / 60)} focused study hours in this period.`);
    if (input.wastedMinutes > 0) insights.push(`Distraction time was ${Math.round(input.wastedMinutes / 60)} hours; keep tomorrow's first block protected.`);
    if (input.upcomingExam) insights.push(`${input.upcomingExam} should stay near the top of your plan.`);
    if (input.pendingTasks) insights.push(`${input.pendingTasks} pending tasks need a realistic recovery plan.`);
    return insights;
  }

  async generateReelScript(input: ReelInput) {
    const factsList = input.facts.length ? input.facts.join(", ") : "Productive focus block";
    const tone = input.tone || "natural";

    if (tone === "funny") {
      return `🎬 [AUDIO / MUSIC IDEA]: Upbeat quirky lo-fi or trending relatable meme sound

⚡ [HOOK] (0:00 - 0:03)
• Visual: Staring blankly at the screen with an empty coffee mug, dramatic slow zoom
• On-Screen Text: "Me promising I'll only study for 10 minutes..."
• Voiceover: "I told myself I’d just do a quick 10-minute revision. Fast forward to now..."

📖 [SCENE 1: THE GRIND] (0:03 - 0:15)
• Visual: Fast-paced montage of aggressive keyboard typing, whiteboard notes, flipping textbook pages
• On-Screen Text: ${factsList}
• Voiceover: "Ended up locking in: ${factsList}. My brain cells were genuinely fighting for their lives."

📈 [SCENE 2: THE METRICS] (0:15 - 0:25)
• Visual: Close-up screen shot of the RankDay dashboard and rank meter updating
• On-Screen Text: "Rank update: The numbers don't lie"
• Voiceover: "Checked my RankDay score... we actually moved up. Turns out panic and caffeine are an elite combination."

🚀 [OUTRO & CTA] (0:25 - 0:30)
• Visual: Shutting laptop lid with satisfaction, giving a quick peace sign
• On-Screen Text: "What are you procrastinating right now? 👇"
• Voiceover: "Drop a comment with the task you're currently avoiding. Go conquer it tomorrow!"

📝 [CAPTION & HASHTAGS]:
Surviving one study session at a time 💀 Today's actual log: ${factsList}. Track your daily consistency with RankDay!
#studentlife #studymotivation #devhumor #dayinthelife #studygram #rankday #grindset`;
    }

    if (tone === "emotional") {
      return `🎬 [AUDIO / MUSIC IDEA]: Cinematic ambient piano or emotional build-up (e.g., Interstellar / Ludovico Einaudi style)

⚡ [HOOK] (0:00 - 0:03)
• Visual: Dimly lit room, warm desk lamp, camera panning over open notes and keyboard
• On-Screen Text: "Nobody sees the quiet days..."
• Voiceover: "Nobody claps for the quiet work you do when nobody is around to see it."

📖 [SCENE 1: THE SACRIFICE] (0:03 - 0:15)
• Visual: Slow cinematic B-roll of highlighting key concepts, writing code, deep focus
• On-Screen Text: ${factsList}
• Voiceover: "${input.rangeLabel}: ${factsList}. Some sessions are effortless, others are a grind. But showing up is the only rule."

📈 [SCENE 2: THE COMPOUND EFFECT] (0:15 - 0:25)
• Visual: Looking at the steady upward rank progression graph in RankDay
• On-Screen Text: "Consistency > Intensity"
• Voiceover: "Every single minute stacks up. The momentum is building, even when you can't feel it yet."

🚀 [OUTRO & CTA] (0:25 - 0:30)
• Visual: Taking a calm breath, tidying the desk, preparing for tomorrow
• On-Screen Text: "Keep going. Tomorrow counts."
• Voiceover: "If you needed a sign to keep going today—this is it. Protect your streak."

📝 [CAPTION & HASHTAGS]:
The silent work always speaks the loudest in the end. Logged for ${input.rangeLabel.toLowerCase()}: ${factsList}. Trust the process.
#discipline #growthmindset #consistency #studyinspiration #deepwork #rankday #focus`;
    }

    if (tone === "professional") {
      return `🎬 [AUDIO / MUSIC IDEA]: Clean minimal deep-house or low-bpm tech background beat

⚡ [HOOK] (0:00 - 0:03)
• Visual: Clean aesthetic dual-monitor setup, split screen showing task backlog and terminal/IDE
• On-Screen Text: "Daily Output Audit: ${input.rangeLabel}"
• Voiceover: "Here is my exact productivity breakdown and output audit for ${input.rangeLabel.toLowerCase()}."

📖 [SCENE 1: DEEP WORK EXECUTION] (0:03 - 0:15)
• Visual: Screen recording of completed syllabus modules and timed pomodoro sessions
• On-Screen Text: ${factsList}
• Voiceover: "Executed key focus blocks: ${factsList}. Prioritized high-leverage milestones with zero multitasking."

📈 [SCENE 2: DETERMINISTIC METRICS] (0:15 - 0:25)
• Visual: Close-up on RankDay performance dashboard, delta breakdown, and consistency streak
• On-Screen Text: "Deterministic Rank Metrics"
• Voiceover: "By tracking output deterministically through RankDay, we eliminate emotional guesswork and maintain optimal velocity."

🚀 [OUTRO & CTA] (0:25 - 0:30)
• Visual: Checking off final items in tomorrow's planner schedule
• On-Screen Text: "Systems > Motivation"
• Voiceover: "Build systems that outlast fleeting motivation. What's your top target for tomorrow?"

📝 [CAPTION & HASHTAGS]:
High-leverage execution review for ${input.rangeLabel.toLowerCase()}: ${factsList}. Precision tracking powered by RankDay.
#deepwork #productivitysystem #performance #timemanagement #softwareengineering #rankday #focus`;
    }

    // Default: natural
    return `🎬 [AUDIO / MUSIC IDEA]: Chill lofi beats / aesthetic study vlog sound

⚡ [HOOK] (0:00 - 0:03)
• Visual: Setting down an iced coffee, tapping spacebar to wake screen, warm cozy lighting
• On-Screen Text: "Realistic ${input.rangeLabel.toLowerCase()} in my life ✨"
• Voiceover: "Here is an honest, unfiltered look at my ${input.rangeLabel.toLowerCase()}."

📖 [SCENE 1: GETTING TO WORK] (0:03 - 0:15)
• Visual: B-roll of study session, notebook highlights, focus timer ticking down
• On-Screen Text: ${factsList}
• Voiceover: "Started by diving into: ${factsList}. Kept the phone in the other room to stay locked in."

📈 [SCENE 2: THE PROGRESS] (0:15 - 0:25)
• Visual: Opening RankDay dashboard and reviewing the rank score delta
• On-Screen Text: "Tracking real progress with RankDay"
• Voiceover: "Logged everything into RankDay to see where my rank moved. Seeing tangible progress makes the effort worth it."

🚀 [OUTRO & CTA] (0:25 - 0:30)
• Visual: Stretching, shutting down laptop, packing bag
• On-Screen Text: "What did you get done today? 👇"
• Voiceover: "What’s one thing you crossed off your list today? Let me know in the comments below!"

📝 [CAPTION & HASHTAGS]:
An honest look at ${input.rangeLabel.toLowerCase()}'s focus session: ${factsList}. Slow progress is still progress! ☕📖
#dayinthelife #studywithme #realisticday #productivity #studygram #rankday #routine`;
  }
}
