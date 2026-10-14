export type RacecourseGroup = { id: string; title: string; description: string; courses: { name: string; slug: string }[] };

// Legacy route snapshot from the 13 September 2026 crawl. Reconcile the live
// racecourse index before launch; a missing crawl row is not proof of removal.
export const racecourseGroups: RacecourseGroup[] = [
  { id: 'uk-all-weather', title: 'UK all-weather tracks', description: 'The all-weather racing guides, including the Kempton pilot.', courses: [
    { name: 'Chelmsford City', slug: 'chelmsford-city' }, { name: 'Kempton', slug: 'kempton' }, { name: 'Lingfield', slug: 'lingfield' }, { name: 'Newcastle', slug: 'newcastle' }, { name: 'Southwell', slug: 'southwell' }, { name: 'Wolverhampton', slug: 'wolverhampton' },
  ] },
  { id: 'ireland-all-weather', title: 'Irish all-weather track', description: 'The Dundalk course guide and filtered tips.', courses: [ { name: 'Dundalk', slug: 'dundalk' } ] },
  { id: 'uk-turf', title: 'UK turf racecourses', description: 'Flat and jumps courses in the current guide inventory.', courses: [
    { name: 'Ayr', slug: 'ayr' }, { name: 'Bath', slug: 'bath' }, { name: 'Beverley', slug: 'beverley' }, { name: 'Brighton', slug: 'brighton' }, { name: 'Carlisle', slug: 'carlisle' }, { name: 'Catterick', slug: 'catterick' }, { name: 'Chepstow', slug: 'chepstow' }, { name: 'Chester', slug: 'chester' }, { name: 'Doncaster', slug: 'doncaster' }, { name: 'Fakenham', slug: 'fakenham' }, { name: 'Ffos Las', slug: 'ffos-las' }, { name: 'Hamilton Park', slug: 'hamilton-park' }, { name: 'Haydock', slug: 'haydock' }, { name: 'Leicester', slug: 'leicester' }, { name: 'Musselburgh', slug: 'musselburgh' }, { name: 'Newbury', slug: 'newbury' }, { name: 'Redcar', slug: 'redcar' }, { name: 'Sandown', slug: 'sandown' }, { name: 'Wetherby', slug: 'wetherby' },
  ] },
  { id: 'ireland-turf', title: 'Irish turf racecourses', description: 'Guides and tips for Irish flat and jumps meetings.', courses: [
    { name: 'Ballinrobe', slug: 'ballinrobe' }, { name: 'Bellewstown', slug: 'bellewstown' }, { name: 'Clonmel', slug: 'clonmel' }, { name: 'Cork', slug: 'cork' }, { name: 'Curragh', slug: 'curragh' }, { name: 'Down Royal', slug: 'down-royal' }, { name: 'Downpatrick', slug: 'downpatrick' }, { name: 'Fairyhouse', slug: 'fairyhouse' }, { name: 'Galway', slug: 'galway' }, { name: 'Gowran Park', slug: 'gowran-park' }, { name: 'Killarney', slug: 'killarney' }, { name: 'Leopardstown', slug: 'leopardstown' }, { name: 'Limerick', slug: 'limerick' }, { name: 'Listowel', slug: 'listowel' }, { name: 'Naas', slug: 'naas' }, { name: 'Navan', slug: 'navan' }, { name: 'Roscommon', slug: 'roscommon' }, { name: 'Sligo', slug: 'sligo' }, { name: 'Tipperary', slug: 'tipperary' },
  ] },
];

export function racecourseHref(slug: string) { return slug === 'kempton' ? '/pilot/racecourses/kempton-racing-tips/' : `https://www.everytip.co.uk/racecourses/${slug}-racing-tips`; }
