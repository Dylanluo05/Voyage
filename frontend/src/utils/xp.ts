export const RANK_THRESHOLDS = [
    { name: 'Recruit',    value: 0 },
    { name: 'Wanderer',   value: 1000 },
    { name: 'Adventurer', value: 2000 },
    { name: 'Explorer',   value: 4000 },
    { name: 'Veteran',    value: 7000 },
    { name: 'Champion',   value: 10000 },
    { name: 'Legend',     value: 15000 },
    { name: 'Voyager',    value: 20000 },
];

export function getRankLabel(xp: number): string {
    for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= RANK_THRESHOLDS[i].value) return RANK_THRESHOLDS[i].name;
    }
    return 'Recruit';
}
