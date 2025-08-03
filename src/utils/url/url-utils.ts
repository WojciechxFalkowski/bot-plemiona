export const buildingUrl = (
  serverCode: string,
  villageId: string,
  buildingName: string
) =>
  `https://${serverCode}.plemiona.pl/game.php?village=${villageId}&screen=${buildingName}`;
