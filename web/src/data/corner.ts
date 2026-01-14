export interface Post {
    id: string;
    date: string;
    title: string;
    content: string; // Formatting: Markdown-ish (we'll render simple paragraphs)
}

export const CORNER_POSTS: Post[] = [
    {
        id: "philosophy-001",
        date: "2026-01-13",
        title: "Why This Exists",
        content: `Most weather apps want your attention. We want you to get your answer and leave.

No cookies. No sign-up. No ads. No tracking. Just weather.

Four forecasts. Side by side. The National Weather Service is the referee. Local news stations, APIs, and aggregators are the contestants. Over time, we score them. You'll know who to trust.

This dashboard is built for people who actually use weather data: gardeners checking soil temp for morel season, photographers chasing golden hour, and anyone who's tired of being lied to by a cartoon sun.

We call it Weather Wars because accuracy is a battle. And we're keeping score.`
    }
];
