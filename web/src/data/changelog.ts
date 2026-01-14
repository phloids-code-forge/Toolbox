export interface Log {
    date: string;
    title: string;
    points: string[];
}

export const CHANGELOG: Log[] = [
    {
        date: "2026-01-13",
        title: "The Professor & The Garden",
        points: [
            "Implemented 'The University': Quirky educational modals.",
            "Added 'Green Thumb' panel: Morel Radar & Soil Moisture tracking.",
            "Wired Forecast Ticker to real NWS data.",
            "Inject 'The Professor's Wit' into ticker alerts.",
            "Refactored Dashboard to Fluid Grid (4K support)."
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
