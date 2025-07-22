export interface BuildingData {
  screen: string;
  name: string;
  maxLevel: number;
  href: string;
}

export const BUILDINGS: readonly BuildingData[] = [
  {
    screen: 'main',
    name: 'Ratusz',
    maxLevel: 30,
    href: '/game.php?village={villageId}&screen=main'
  },
  {
    screen: 'barracks',
    name: 'Koszary',
    maxLevel: 25,
    href: '/game.php?village={villageId}&screen=barracks'
  },
  {
    screen: 'stable',
    name: 'Stajnia',
    maxLevel: 20,
    href: '/game.php?village={villageId}&screen=stable'
  },
  {
    screen: 'garage',
    name: 'Warsztat',
    maxLevel: 15,
    href: '/game.php?village={villageId}&screen=garage'
  },
  {
    screen: 'snob',
    name: 'Pałac',
    maxLevel: 1,
    href: '/game.php?village={villageId}&screen=snob'
  },
  {
    screen: 'smith',
    name: 'Kuźnia',
    maxLevel: 20,
    href: '/game.php?village={villageId}&screen=smith'
  },
  {
    screen: 'place',
    name: 'Plac',
    maxLevel: 1,
    href: '/game.php?village={villageId}&screen=place'
  },
  {
    screen: 'statue',
    name: 'Piedestał',
    maxLevel: 1,
    href: '/game.php?village={villageId}&screen=statue'
  },
  {
    screen: 'market',
    name: 'Rynek',
    maxLevel: 25,
    href: '/game.php?village={villageId}&screen=market'
  },
  {
    screen: 'wood',
    name: 'Tartak',
    maxLevel: 30,
    href: '/game.php?village={villageId}&screen=wood'
  },
  {
    screen: 'stone',
    name: 'Cegielnia',
    maxLevel: 30,
    href: '/game.php?village={villageId}&screen=stone'
  },
  {
    screen: 'iron',
    name: 'Huta żelaza',
    maxLevel: 30,
    href: '/game.php?village={villageId}&screen=iron'
  },
  {
    screen: 'farm',
    name: 'Zagroda',
    maxLevel: 30,
    href: '/game.php?village={villageId}&screen=farm'
  },
  {
    screen: 'storage',
    name: 'Spichlerz',
    maxLevel: 30,
    href: '/game.php?village={villageId}&screen=storage'
  },
  {
    screen: 'hide',
    name: 'Schowek',
    maxLevel: 10,
    href: '/game.php?village={villageId}&screen=hide'
  },
  {
    screen: 'wall',
    name: 'Mur',
    maxLevel: 20,
    href: '/game.php?village={villageId}&screen=wall'
  }
] as const; 