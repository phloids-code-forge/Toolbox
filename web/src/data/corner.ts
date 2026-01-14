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
        title: "The Signal in the Noise",
        content: `I built Weather Wars because modern weather apps are loud, wrong, and cluttered. 
        
        They want you to click ads. I want you to know if you need an umbrella. 
        
        This dashboard isn't about 'user retention' or 'click-through rates'. It's about data density and visual calm. It's about knowing the soil temperature at a glance so you can hunt for Morels. It's about knowing if the NWS is beating the local news stations.
        
        We call it 'Weather Wars' because accuracy is a battle. And we are keeping score.`
    }
];
