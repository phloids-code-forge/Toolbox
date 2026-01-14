export interface Log {
    date: string;
    title: string;
    points: string[];
}

export const CHANGELOG: Log[] = [
    {
        date: "2026-01-13",
        title: "Light & Dark",
        points: [
            "New: Light/Dark theme toggle. Your eyes, your rules.",
            "New: Ko-fi support button. Buy us a coffee if you're feeling generous.",
            "Fixed: 4K layout now fills the screen properly.",
            "Fixed: Mobile header no longer crowded by debug buttons.",
            "Fixed: Bottom cards no longer hidden by the ticker.",
            "Added: 'The University' — tap any metric for a real explanation.",
            "Added: 'Green Thumb' panel — soil temp, moisture, morel hunting.",
            "Added: 'The Professor's Wit' — dry humor injected into weather alerts."
        ]
    },
    {
        date: "2026-01-12",
        title: "System Initialization",
        points: [
            "Deployed core Next.js architecture.",
            "Established 'Civilian App' vs 'War Room' hybrid polling strategy.",
            "Integrated Vercel Postgres for historical tracking.",
            "Created Scraper Engine for NWS & Local Stations."
        ]
    }
];
