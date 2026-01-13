export interface TVStation {
    id: string;
    name: string; // e.g. "KFOR"
    callSign: string; // e.g. "News 4"
    channel: number;
    logoUrl?: string; // Path to logo asset
    scrapeUrl: string; // The specific page we scrape
    network: "NBC" | "CBS" | "ABC" | "FOX";
}

export interface CityConfig {
    id: string;
    name: string;
    state: string;
    coords: { lat: number; lng: number };
    timezone: string;
    nwsStationId: string;  // e.g. "KOKC" for NWS observations
    affiliates: TVStation[];
}

export const CITIES: CityConfig[] = [
    {
        id: "okc",
        name: "Oklahoma City",
        state: "OK",
        coords: { lat: 35.4676, lng: -97.5164 },
        timezone: "America/Chicago",
        nwsStationId: "KOKC",
        affiliates: [
            {
                id: "kfor",
                name: "KFOR",
                callSign: "News 4",
                channel: 4,
                network: "NBC",
                scrapeUrl: "https://kfor.com/weather/",
            },
            {
                id: "kwtv",
                name: "KWTV",
                callSign: "News 9",
                channel: 9,
                network: "CBS",
                scrapeUrl: "https://www.news9.com/weather",
            },
            {
                id: "koco",
                name: "KOCO",
                callSign: "KOCO 5",
                channel: 5,
                network: "ABC",
                scrapeUrl: "https://www.koco.com/weather",
            },
            {
                id: "kokh",
                name: "KOKH",
                callSign: "Fox 25",
                channel: 25,
                network: "FOX",
                scrapeUrl: "https://okcfox.com/weather",
            }
        ]
    },
    {
        id: "atl",
        name: "Atlanta",
        state: "GA",
        coords: { lat: 33.7490, lng: -84.3880 },
        timezone: "America/New_York",
        nwsStationId: "KATL",
        affiliates: [
            {
                id: "wsb",
                name: "WSB-TV",
                callSign: "Channel 2",
                channel: 2,
                network: "ABC",
                scrapeUrl: "https://www.wsbtv.com/weather/",
            },
            {
                id: "waga",
                name: "WAGA",
                callSign: "FOX 5",
                channel: 5,
                network: "FOX",
                scrapeUrl: "https://www.fox5atlanta.com/weather",
            }
        ]
    },
    {
        id: "tulsa",
        name: "Tulsa",
        state: "OK",
        coords: { lat: 36.1540, lng: -95.9928 },
        timezone: "America/Chicago",
        nwsStationId: "KTUL",
        affiliates: [
            {
                id: "kotv",
                name: "KOTV",
                callSign: "News on 6",
                channel: 6,
                network: "CBS",
                scrapeUrl: "https://www.newson6.com/weather",
            }
        ]
    },
    {
        id: "kearney",
        name: "Kearney",
        state: "NE",
        coords: { lat: 40.6995, lng: -99.0815 },
        timezone: "America/Chicago",
        nwsStationId: "KEAR",
        affiliates: [
            {
                id: "khgi",
                name: "KHGI",
                callSign: "NTV News",
                channel: 13,
                network: "ABC",
                scrapeUrl: "https://nebraska.tv/weather",
            }
        ]
    }
];
