export interface HierarchyStep {
  id: string;
  level: 'universe' | 'galaxy' | 'solar_system' | 'earth' | 'continent' | 'country' | 'state' | 'city' | 'locality';
  name: string;
  parentName?: string;
  lat?: number;
  lng?: number;
  zoomLevel: number; // 0 (deep universe) to 18 (street locality)
  description: string;
}

export const HIERARCHY_STEPS: HierarchyStep[] = [
  {
    id: 'universe',
    level: 'universe',
    name: 'Observable Universe',
    zoomLevel: 0,
    description: 'The cosmic web spanning 93 billion light-years containing trillions of galaxies.',
  },
  {
    id: 'galaxy',
    level: 'galaxy',
    name: 'Milky Way Galaxy',
    parentName: 'Observable Universe',
    zoomLevel: 1,
    description: 'Barred spiral galaxy spanning 100,000 light-years with 200+ billion stars.',
  },
  {
    id: 'solar_system',
    level: 'solar_system',
    name: 'Solar System',
    parentName: 'Milky Way Galaxy',
    zoomLevel: 2,
    description: 'Heliosphere centered on Sol, governing 8 planets, dwarf worlds, and the Kuiper Belt.',
  },
  {
    id: 'earth',
    level: 'earth',
    name: 'Planet Earth',
    parentName: 'Solar System',
    lat: 20.5937,
    lng: 78.9629,
    zoomLevel: 3,
    description: 'Terrestrial blue marble, third rock from the Sun.',
  },
  {
    id: 'asia',
    level: 'continent',
    name: 'Asia',
    parentName: 'Planet Earth',
    lat: 29.8406,
    lng: 89.2969,
    zoomLevel: 4,
    description: 'Earth’s largest and most populous continent, bounded by the Pacific and Indian Oceans.',
  },
  {
    id: 'india',
    level: 'country',
    name: 'India',
    parentName: 'Asia',
    lat: 20.5937,
    lng: 78.9629,
    zoomLevel: 5,
    description: 'Republic of India, spanning the Himalayas to the Indian Ocean.',
  },
  {
    id: 'tamil_nadu',
    level: 'state',
    name: 'Tamil Nadu',
    parentName: 'India',
    lat: 11.1271,
    lng: 78.6569,
    zoomLevel: 7,
    description: 'Southern Indian state famous for ancient Dravidian temple architecture and coastline.',
  },
  {
    id: 'chennai',
    level: 'city',
    name: 'Chennai',
    parentName: 'Tamil Nadu',
    lat: 13.0827,
    lng: 80.2707,
    zoomLevel: 11,
    description: 'Capital of Tamil Nadu, on the Coromandel Coast of the Bay of Bengal.',
  },
  {
    id: 'marina_beach',
    level: 'locality',
    name: 'Marina Beach & Lighthouse',
    parentName: 'Chennai',
    lat: 13.0500,
    lng: 80.2824,
    zoomLevel: 15,
    description: 'World’s second-longest natural urban beach stretching along the Bay of Bengal.',
  },
];

export const TAMIL_NADU_CITIES: Array<{
  name: string;
  lat: number;
  lng: number;
  description: string;
}> = [
  { name: 'Chennai (Madras)', lat: 13.0827, lng: 80.2707, description: 'Capital city & Coromandel Coast tech metropolis' },
  { name: 'Madurai', lat: 9.9252, lng: 78.1198, description: 'Temple City & historic Meenakshi Amman Temple' },
  { name: 'Coimbatore', lat: 11.0168, lng: 76.9558, description: 'Manchester of South India & foothills of Western Ghats' },
  { name: 'Thanjavur (Tanjore)', lat: 10.7870, lng: 79.1378, description: 'Cradle of Chola culture & Brihadisvara Temple' },
  { name: 'Kanyakumari', lat: 8.0883, lng: 77.5385, description: 'Southernmost tip of Indian subcontinent at three seas confluence' },
  { name: 'Tiruchirappalli (Trichy)', lat: 10.7905, lng: 78.7047, description: 'Historic Rockfort Temple on the Cauvery River' },
];
