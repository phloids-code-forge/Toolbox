export type TrenchAsset = {
    id: string;
    name: string;
    type: 'ship' | 'silhouette' | 'structure';
    path: string; // SVG path data (d attribute)
    viewBox?: string; // Optional custom viewbox
};

export const TRENCH_ASSETS: TrenchAsset[] = [
    {
        id: 'x-wing-top',
        name: 'Incom T-65 (Top)',
        type: 'ship',
        path: 'M50,20 L55,10 L45,10 Z M48,20 L48,80 L52,80 L52,20 M20,60 L48,50 M80,60 L52,50 M20,60 L20,80 L25,80 L25,65 M80,60 L80,80 L75,80 L75,65',
        viewBox: '0 0 100 100'
    },
    {
        id: 'tie-fighter',
        name: 'Sienar TIE/ln',
        type: 'ship',
        path: 'M10,10 L10,90 M90,10 L90,90 M10,50 L90,50 M30,50 A20,20 0 1,0 70,50 A20,20 0 1,0 30,50 M40,50 L60,50 M50,40 L50,60',
        viewBox: '0 0 100 100'
    },
    {
        id: 'y-wing',
        name: 'Koensayr BTL',
        type: 'ship',
        path: 'M45,20 L55,20 L55,40 L65,50 L65,80 L55,80 L55,90 L45,90 L45,80 L35,80 L35,50 L45,40 Z M35,50 L25,50 L25,80 M65,50 L75,50 L75,80',
        viewBox: '0 0 100 100'
    },
    {
        id: 'bounty-silhouette',
        name: 'Target: Unknown',
        type: 'silhouette',
        path: 'M50,10 A30,30 0 1,0 50,70 A30,30 0 1,0 50,10 M30,80 L70,80 L80,100 L20,100 Z',
        viewBox: '0 0 100 100'
    },
    {
        id: 'death-star-trench',
        name: 'Surface Scan',
        type: 'structure',
        path: 'M0,80 L20,80 L20,90 L30,90 L30,80 L50,80 L50,70 L60,70 L60,80 L80,80 L80,90 L100,90 M0,50 L100,50',
        viewBox: '0 0 100 100'
    }
];
